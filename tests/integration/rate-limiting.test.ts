/**
 * Integration Tests for Rate Limiting
 *
 * Validates Upstash rate limit behavior and client ID generation.
 */

import { describe, it, expect } from 'vitest';
import { randomUUID } from 'crypto';
import {
  getClientId,
  checkRateLimit,
  strictLimiter,
} from '../../src/lib/rate-limit';

function buildRequest(headers: Record<string, string>) {
  return new Request('https://commerce.test/api', { headers });
}

describe('Rate Limiting Integration Tests', () => {
  it('should scope client id to user id when present', () => {
    const req = buildRequest({ 'x-user-id': 'user-123' });
    const clientId = getClientId(req, 'auth');

    expect(clientId).toBe('user:user-123:auth');
  });

  it('should enforce strict limiter after 5 requests', async () => {
    const ip = `203.0.113.${Math.floor(Math.random() * 100)}`;
    const endpoint = `strict-${randomUUID()}`;
    const req = buildRequest({ 'x-forwarded-for': ip });

    const results = [];
    for (let i = 0; i < 6; i += 1) {
      results.push(await checkRateLimit(req, strictLimiter, endpoint));
    }

    const firstFive = results.slice(0, 5);
    expect(firstFive.every((result) => result.success)).toBe(true);
    expect(firstFive.every((result) => result.limit === 5)).toBe(true);
    expect(results[5].success).toBe(false);
    expect(results[5].limit).toBe(5);
  });

  it('should isolate rate limits per endpoint', async () => {
    const ip = `198.51.100.${Math.floor(Math.random() * 100)}`;
    const endpointA = `endpoint-a-${randomUUID()}`;
    const endpointB = `endpoint-b-${randomUUID()}`;
    const req = buildRequest({ 'x-forwarded-for': ip });

    const resultsA = [];
    const resultsB = [];

    for (let i = 0; i < 4; i += 1) {
      resultsA.push(await checkRateLimit(req, strictLimiter, endpointA));
      resultsB.push(await checkRateLimit(req, strictLimiter, endpointB));
    }

    expect(resultsA.every((result) => result.success)).toBe(true);
    expect(resultsB.every((result) => result.success)).toBe(true);
    expect(resultsA[3].remaining).toBeLessThan(resultsA[0].remaining);
    expect(resultsB[3].remaining).toBeLessThan(resultsB[0].remaining);
  });
});
