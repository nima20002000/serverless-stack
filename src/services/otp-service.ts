import 'server-only';
import { redis } from '@/lib/redis/client';
import { sendOTPEmail } from '@/lib/email/client';
import { log } from '@/lib/logger';

type OTPPurpose = 'register' | 'login' | 'checkout';

type OTPRecord = {
  code: string;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  expiresAt: number;
};

type SendOTPSuccess = {
  success: true;
  expiresAt: number;
};

type SendOTPFailure = {
  success: false;
  expiresAt: number;
  error: string;
  errorCode: 'RATE_LIMIT' | 'SEND_FAILED';
};

const OTP_EXPIRY_SECONDS = 5 * 60;
const OTP_EXPIRY_MS = OTP_EXPIRY_SECONDS * 1000;
const OTP_RATE_LIMIT_MS = 2 * 60 * 1000;
const OTP_MAX_SENDS_PER_WINDOW = 3;
const OTP_MAX_ATTEMPTS = 5;

// Fallback store for environments without Redis.
const memoryStore = new Map<string, { value: string; expiresAt: number }>();

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

function isPhoneIdentifier(identifier: string): boolean {
  return identifier.startsWith('09');
}

function isEmailIdentifier(identifier: string): boolean {
  return identifier.includes('@');
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function keyForRecord(identifier: string, purpose: OTPPurpose): string {
  return `otp:record:${purpose}:${identifier}`;
}

function keyForSendLog(identifier: string, purpose: OTPPurpose): string {
  return `otp:sendlog:${purpose}:${identifier}`;
}

async function getStoreValue<T>(key: string): Promise<T | null> {
  if (redis) {
    const raw = await redis.get<string>(key);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  const entry = memoryStore.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }

  try {
    return JSON.parse(entry.value) as T;
  } catch {
    return null;
  }
}

async function setStoreValue<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const payload = JSON.stringify(value);

  if (redis) {
    await redis.setex(key, ttlSeconds, payload);
    return;
  }

  memoryStore.set(key, {
    value: payload,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

async function deleteStoreValue(key: string): Promise<void> {
  if (redis) {
    await redis.del(key);
    return;
  }

  memoryStore.delete(key);
}

async function sendPhoneOTP(
  identifier: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Lazy-load Kavenegar so local startup doesn't fail unless SMS path is used.
    const { sendOTPSMS } = await import('@/lib/kavenegar/client');
    const result = await sendOTPSMS(identifier, code);
    return {
      success: result.success,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function sendOTP(
  identifier: string,
  purpose: OTPPurpose = 'register'
): Promise<SendOTPSuccess | SendOTPFailure> {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  const now = Date.now();

  try {
    const sendLogKey = keyForSendLog(normalizedIdentifier, purpose);
    const recordKey = keyForRecord(normalizedIdentifier, purpose);
    const recentRaw =
      (await getStoreValue<number[]>(sendLogKey))?.filter(
        (timestamp) => now - timestamp < OTP_RATE_LIMIT_MS
      ) || [];

    if (recentRaw.length >= OTP_MAX_SENDS_PER_WINDOW) {
      const latestSend = Math.max(...recentRaw);
      const retryAt = latestSend + OTP_RATE_LIMIT_MS;
      const waitSeconds = Math.max(1, Math.ceil((retryAt - now) / 1000));

      return {
        success: false,
        expiresAt: retryAt,
        error: `لطفاً ${waitSeconds} ثانیه صبر کنید`,
        errorCode: 'RATE_LIMIT',
      };
    }

    const code = generateOTP();
    const expiresAt = now + OTP_EXPIRY_MS;
    const record: OTPRecord = {
      code,
      attempts: 0,
      maxAttempts: OTP_MAX_ATTEMPTS,
      createdAt: now,
      expiresAt,
    };

    await setStoreValue(recordKey, record, OTP_EXPIRY_SECONDS);
    await setStoreValue(sendLogKey, [...recentRaw, now], 2 * 60);

    let deliveryResult: { success: boolean; error?: string };
    if (isPhoneIdentifier(normalizedIdentifier)) {
      deliveryResult = await sendPhoneOTP(normalizedIdentifier, code);
    } else if (isEmailIdentifier(normalizedIdentifier)) {
      const emailResult = await sendOTPEmail(normalizedIdentifier, code);
      deliveryResult = {
        success: emailResult.success,
        error: emailResult.error,
      };
    } else {
      deliveryResult = {
        success: false,
        error: 'فرمت ایمیل یا شماره تلفن نامعتبر است',
      };
    }

    if (!deliveryResult.success) {
      await deleteStoreValue(recordKey);
      return {
        success: false,
        expiresAt,
        error:
          deliveryResult.error ||
          'خطا در ارسال کد تایید. لطفاً دوباره تلاش کنید.',
        errorCode: 'SEND_FAILED',
      };
    }

    log.info('OTP sent successfully', {
      identifier: normalizedIdentifier,
      purpose,
      expiresAt,
    });

    return {
      success: true,
      expiresAt,
    };
  } catch (error) {
    log.error('Failed to send OTP', {
      identifier: normalizedIdentifier,
      purpose,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      success: false,
      expiresAt: now + OTP_EXPIRY_MS,
      error: 'خطا در ارسال کد تایید',
      errorCode: 'SEND_FAILED',
    };
  }
}

export async function verifyOTP(
  identifier: string,
  code: string,
  purpose: OTPPurpose = 'register'
): Promise<{ success: boolean; error?: string; attemptsLeft?: number }> {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  const recordKey = keyForRecord(normalizedIdentifier, purpose);

  try {
    const record = await getStoreValue<OTPRecord>(recordKey);
    if (!record) {
      return {
        success: false,
        error: 'کد تایید یافت نشد یا منقضی شده است',
      };
    }

    const now = Date.now();
    if (now > record.expiresAt) {
      await deleteStoreValue(recordKey);
      return {
        success: false,
        error: 'کد تایید منقضی شده است. لطفاً کد جدید درخواست کنید',
      };
    }

    if (record.attempts >= record.maxAttempts) {
      await deleteStoreValue(recordKey);
      return {
        success: false,
        error:
          'تعداد تلاش‌های شما به حداکثر رسیده است. لطفاً کد جدید درخواست کنید',
      };
    }

    const nextAttempts = record.attempts + 1;
    const attemptsLeft = Math.max(0, record.maxAttempts - nextAttempts);
    const remainingTTLSeconds = Math.max(
      1,
      Math.ceil((record.expiresAt - now) / 1000)
    );

    if (code === record.code) {
      await deleteStoreValue(recordKey);
      return { success: true };
    }

    if (attemptsLeft === 0) {
      await deleteStoreValue(recordKey);
      return {
        success: false,
        error:
          'تعداد تلاش‌های شما به حداکثر رسیده است. لطفاً کد جدید درخواست کنید',
        attemptsLeft,
      };
    }

    await setStoreValue(
      recordKey,
      {
        ...record,
        attempts: nextAttempts,
      },
      remainingTTLSeconds
    );

    return {
      success: false,
      error: `کد تایید اشتباه است. ${attemptsLeft} تلاش باقی‌مانده`,
      attemptsLeft,
    };
  } catch (error) {
    log.error('Failed to verify OTP', {
      identifier: normalizedIdentifier,
      purpose,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error: 'خطا در تایید کد',
    };
  }
}
