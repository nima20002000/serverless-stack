import 'server-only';
import crypto from 'crypto';

export type OtpTokenPurpose = 'login' | 'checkout' | 'register';

type OtpTokenPayload = {
  v: 1;
  identifier: string;
  purpose: OtpTokenPurpose;
  iat: number;
  exp: number;
};

const DEFAULT_TTL_MS = 5 * 60 * 1000;

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

function signPayload(payloadB64: string, secret: string) {
  return crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64url');
}

export function createOtpToken(
  identifier: string,
  purpose: OtpTokenPurpose,
  secret: string,
  ttlMs: number = DEFAULT_TTL_MS
) {
  const now = Date.now();
  const payload: OtpTokenPayload = {
    v: 1,
    identifier,
    purpose,
    iat: now,
    exp: now + ttlMs,
  };

  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

export function verifyOtpToken(options: {
  token: string;
  identifier: string;
  secret: string;
  allowedPurposes: OtpTokenPurpose[];
}): { valid: boolean; payload?: OtpTokenPayload } {
  const { token, identifier, secret, allowedPurposes } = options;

  if (!token || !secret || !identifier) {
    return { valid: false };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false };
  }

  const [payloadB64, signature] = parts;
  const expectedSignature = signPayload(payloadB64, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return { valid: false };
  }

  let payload: OtpTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return { valid: false };
  }

  if (
    payload.v !== 1 ||
    payload.identifier !== identifier ||
    !allowedPurposes.includes(payload.purpose)
  ) {
    return { valid: false };
  }

  if (Date.now() > payload.exp) {
    return { valid: false };
  }

  return { valid: true, payload };
}
