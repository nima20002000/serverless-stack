/**
 * Integration test setup
 *
 * Verifies external dependencies are reachable so integration suites fail fast
 * instead of passing when services are unavailable.
 */

import { beforeAll } from 'vitest';
import nodemailer from 'nodemailer';
import Kavenegar from 'kavenegar';
import {
  verifySupabaseConnection,
  verifyRedisConnection,
  createTestRedisClient,
} from '../utils/test-client';

async function requireSupabaseConnection() {
  await verifySupabaseConnection();
}

async function requireRedisConnectionIfConfigured() {
  const redis = createTestRedisClient();
  if (!redis) {
    return;
  }

  const ok = await verifyRedisConnection();
  if (!ok) {
    throw new Error(
      'Redis is configured but not reachable for integration tests'
    );
  }
}

async function requireResendConnectionIfConfigured() {
  if (!process.env.RESEND_API_KEY) {
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch('https://api.resend.com/', {
      method: 'GET',
      signal: controller.signal,
    });
    if (!response.ok && response.status >= 500) {
      throw new Error(`Resend API unavailable: HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function requireSmtpConnectionIfConfigured() {
  if (process.env.RESEND_API_KEY) {
    return;
  }

  if (process.env.EMAIL_SMTP_HOST) {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SMTP_HOST,
      port: parseInt(process.env.EMAIL_SMTP_PORT || '587', 10),
      secure: process.env.EMAIL_SMTP_SECURE === 'true',
      auth: process.env.EMAIL_SMTP_USER
        ? {
            user: process.env.EMAIL_SMTP_USER,
            pass: process.env.EMAIL_SMTP_PASS,
          }
        : undefined,
    });

    const ok = await transporter.verify();
    if (!ok) {
      throw new Error(
        'SMTP transport is configured but not reachable for integration tests'
      );
    }
    return;
  }

  await nodemailer.createTestAccount();
}

async function requireKavenegarConnectionIfConfigured() {
  if (!process.env.KAVENEGAR_API_KEY) {
    return;
  }

  const api = Kavenegar.KavenegarApi({
    apikey: process.env.KAVENEGAR_API_KEY,
  });

  await new Promise<void>((resolve, reject) => {
    api.AccountInfo({}, function (response, status, message) {
      if (status === 200) {
        resolve();
      } else {
        reject(
          new Error(
            `Kavenegar API check failed: ${message || `status ${status}`}`
          )
        );
      }
    });
  });
}

async function requireR2ConnectionIfConfigured() {
  if (
    !process.env.R2_ACCOUNT_ID ||
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY
  ) {
    return;
  }

  const { storage } = await import('../../src/lib/storage');
  const result = await storage.list({ maxKeys: 1 });
  if (!result.success) {
    throw new Error(
      `R2 storage check failed: ${result.error || 'unknown error'}`
    );
  }
}

beforeAll(async () => {
  await requireSupabaseConnection();
  await requireRedisConnectionIfConfigured();
  await requireResendConnectionIfConfigured();
  await requireSmtpConnectionIfConfigured();
  await requireKavenegarConnectionIfConfigured();
  await requireR2ConnectionIfConfigured();
});
