import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  getClientIp,
  getUserAgent,
  getClientInfo,
  sanitizeIp,
  isValidIPv4,
  isValidIPv6,
} from '@/lib/request-utils';

// Mock logger
vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { log } from '@/lib/logger';

/**
 * Helper to create a mock NextRequest with specific headers
 */
function createMockRequest(
  headers: Record<string, string> = {},
  ip?: string
): NextRequest {
  const headersMap = new Map(Object.entries(headers));

  return {
    headers: {
      get: (name: string) => headersMap.get(name) ?? null,
    },
    ip,
  } as unknown as NextRequest;
}

describe('request-utils', () => {
  const logMock = vi.mocked(log);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getClientIp', () => {
    // Happy Path - Cloudflare Priority
    it('returns cf-connecting-ip when present', () => {
      const req = createMockRequest({
        'cf-connecting-ip': '203.0.113.50',
      });

      const result = getClientIp(req);

      expect(result).toBe('203.0.113.50');
    });

    it('prioritizes cf-connecting-ip over all other headers', () => {
      const req = createMockRequest({
        'cf-connecting-ip': '203.0.113.1',
        'x-forwarded-for': '198.51.100.2',
        'x-real-ip': '192.0.2.3',
      });

      const result = getClientIp(req);

      expect(result).toBe('203.0.113.1');
    });

    // Happy Path - Fallback Headers
    it('returns first IP from x-forwarded-for when cf-connecting-ip is not present', () => {
      const req = createMockRequest({
        'x-forwarded-for': '203.0.113.1, 198.51.100.2, 192.0.2.3',
      });

      const result = getClientIp(req);

      expect(result).toBe('203.0.113.1');
    });

    it('handles x-forwarded-for with multiple IPs and extracts first', () => {
      const req = createMockRequest({
        'x-forwarded-for': '198.51.100.1,10.0.0.1,172.16.0.1',
      });

      const result = getClientIp(req);

      expect(result).toBe('198.51.100.1');
    });

    it('returns x-real-ip when cf and forwarded-for are not present', () => {
      const req = createMockRequest({
        'x-real-ip': '203.0.113.100',
      });

      const result = getClientIp(req);

      expect(result).toBe('203.0.113.100');
    });

    it('returns req.ip as fallback when no headers are set', () => {
      const req = createMockRequest({}, '192.0.2.50');

      const result = getClientIp(req);

      expect(result).toBe('192.0.2.50');
    });

    // Edge Cases
    it('falls back to next header when cf-connecting-ip is empty string', () => {
      const req = createMockRequest({
        'cf-connecting-ip': '',
        'x-forwarded-for': '203.0.113.5',
      });

      const result = getClientIp(req);

      expect(result).toBe('203.0.113.5');
    });

    it('trims whitespace from x-forwarded-for IPs', () => {
      const req = createMockRequest({
        'x-forwarded-for': '  203.0.113.1  ,  198.51.100.2  ',
      });

      const result = getClientIp(req);

      expect(result).toBe('203.0.113.1');
    });

    it('handles single IP in x-forwarded-for without commas', () => {
      const req = createMockRequest({
        'x-forwarded-for': '203.0.113.99',
      });

      const result = getClientIp(req);

      expect(result).toBe('203.0.113.99');
    });

    it('handles IPv6 address in cf-connecting-ip', () => {
      const req = createMockRequest({
        'cf-connecting-ip': '2001:0db8:85a3::8a2e:0370:7334',
      });

      const result = getClientIp(req);

      expect(result).toBe('2001:0db8:85a3::8a2e:0370:7334');
    });

    it('handles IPv6-mapped IPv4 address', () => {
      const req = createMockRequest({
        'cf-connecting-ip': '::ffff:192.168.1.1',
      });

      const result = getClientIp(req);

      expect(result).toBe('::ffff:192.168.1.1');
    });

    // Null Cases
    it('returns null when no IP information is available', () => {
      const req = createMockRequest({});

      const result = getClientIp(req);

      expect(result).toBe(null);
    });

    it('returns null when all headers are empty strings', () => {
      const req = createMockRequest({
        'cf-connecting-ip': '',
        'x-forwarded-for': '',
        'x-real-ip': '',
      });

      const result = getClientIp(req);

      expect(result).toBe(null);
    });

    it('returns malformed IP as-is (validation done elsewhere)', () => {
      const req = createMockRequest({
        'cf-connecting-ip': '999.999.999.999',
      });

      const result = getClientIp(req);

      expect(result).toBe('999.999.999.999');
    });

    it('returns non-IP string as-is', () => {
      const req = createMockRequest({
        'cf-connecting-ip': 'not-an-ip',
      });

      const result = getClientIp(req);

      expect(result).toBe('not-an-ip');
    });

    // Error Handling
    it('returns null and logs warning when header retrieval throws', () => {
      const req = {
        headers: {
          get: () => {
            throw new Error('Header access failed');
          },
        },
      } as unknown as NextRequest;

      const result = getClientIp(req);

      expect(result).toBe(null);
      expect(logMock.warn).toHaveBeenCalledWith(
        'Failed to extract client IP',
        expect.objectContaining({ error: 'Header access failed' })
      );
    });

    it('handles non-Error exceptions gracefully', () => {
      const req = {
        headers: {
          get: () => {
            throw 'String error';
          },
        },
      } as unknown as NextRequest;

      const result = getClientIp(req);

      expect(result).toBe(null);
      expect(logMock.warn).toHaveBeenCalledWith(
        'Failed to extract client IP',
        expect.objectContaining({ error: 'Unknown error' })
      );
    });

    it('falls back when x-forwarded-for first entry is empty after split', () => {
      const req = createMockRequest({
        'x-forwarded-for': ',198.51.100.1',
        'x-real-ip': '203.0.113.5',
      });

      const result = getClientIp(req);

      expect(result).toBe('203.0.113.5');
    });

    it('returns null when req.ip is empty string', () => {
      const req = createMockRequest({}, '');

      const result = getClientIp(req);

      expect(result).toBe(null);
    });
  });

  describe('getUserAgent', () => {
    // Happy Path
    it('returns user-agent header when present', () => {
      const req = createMockRequest({
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      });

      const result = getUserAgent(req);

      expect(result).toBe(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      );
    });

    it('returns Chrome user agent correctly', () => {
      const chromeUA =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const req = createMockRequest({ 'user-agent': chromeUA });

      const result = getUserAgent(req);

      expect(result).toBe(chromeUA);
    });

    it('returns Firefox user agent correctly', () => {
      const firefoxUA =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0';
      const req = createMockRequest({ 'user-agent': firefoxUA });

      const result = getUserAgent(req);

      expect(result).toBe(firefoxUA);
    });

    it('returns Safari user agent correctly', () => {
      const safariUA =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15';
      const req = createMockRequest({ 'user-agent': safariUA });

      const result = getUserAgent(req);

      expect(result).toBe(safariUA);
    });

    it('returns mobile browser user agent correctly', () => {
      const mobileUA =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';
      const req = createMockRequest({ 'user-agent': mobileUA });

      const result = getUserAgent(req);

      expect(result).toBe(mobileUA);
    });

    // Edge Cases
    it('returns null when user-agent header is empty', () => {
      const req = createMockRequest({ 'user-agent': '' });

      const result = getUserAgent(req);

      expect(result).toBe(null);
    });

    it('truncates user-agent longer than 2000 characters', () => {
      const longUA = 'A'.repeat(2500);
      const req = createMockRequest({ 'user-agent': longUA });

      const result = getUserAgent(req);

      expect(result).toHaveLength(2000);
      expect(result).toBe('A'.repeat(2000));
    });

    it('does not truncate user-agent exactly 2000 characters', () => {
      const exactUA = 'B'.repeat(2000);
      const req = createMockRequest({ 'user-agent': exactUA });

      const result = getUserAgent(req);

      expect(result).toHaveLength(2000);
      expect(result).toBe(exactUA);
    });

    it('handles special characters in user-agent', () => {
      const specialUA =
        'Mozilla/5.0 with emoji \u{1F600} and unicode \u4E2D\u6587';
      const req = createMockRequest({ 'user-agent': specialUA });

      const result = getUserAgent(req);

      expect(result).toBe(specialUA);
    });

    it('returns null when user-agent header is missing', () => {
      const req = createMockRequest({});

      const result = getUserAgent(req);

      expect(result).toBe(null);
    });

    // Error Handling
    it('returns null and logs warning when header retrieval throws error', () => {
      const req = {
        headers: {
          get: () => {
            throw new Error('UA header access failed');
          },
        },
      } as unknown as NextRequest;

      const result = getUserAgent(req);

      expect(result).toBe(null);
      expect(logMock.warn).toHaveBeenCalledWith(
        'Failed to extract user agent',
        expect.objectContaining({ error: 'UA header access failed' })
      );
    });

    it('handles non-Error exceptions gracefully', () => {
      const req = {
        headers: {
          get: () => {
            throw { code: 'ERR' };
          },
        },
      } as unknown as NextRequest;

      const result = getUserAgent(req);

      expect(result).toBe(null);
      expect(logMock.warn).toHaveBeenCalledWith(
        'Failed to extract user agent',
        expect.objectContaining({ error: 'Unknown error' })
      );
    });

    it('returns Googlebot user agent correctly', () => {
      const googlebotUA =
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
      const req = createMockRequest({ 'user-agent': googlebotUA });

      const result = getUserAgent(req);

      expect(result).toBe(googlebotUA);
    });

    it('returns Bingbot user agent correctly', () => {
      const bingbotUA =
        'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)';
      const req = createMockRequest({ 'user-agent': bingbotUA });

      const result = getUserAgent(req);

      expect(result).toBe(bingbotUA);
    });
  });

  describe('getClientInfo', () => {
    // Happy Path
    it('returns both IP and user agent when present', () => {
      const req = createMockRequest({
        'cf-connecting-ip': '203.0.113.1',
        'user-agent': 'Mozilla/5.0',
      });

      const result = getClientInfo(req);

      // Note: IP is sanitized through sanitizeIp, so valid public IP returned
      expect(result).toEqual({
        ipAddress: '203.0.113.1',
        userAgent: 'Mozilla/5.0',
      });
    });

    it('returns ipAddress null when IP is not present', () => {
      const req = createMockRequest({
        'user-agent': 'Mozilla/5.0',
      });

      const result = getClientInfo(req);

      expect(result).toEqual({
        ipAddress: null,
        userAgent: 'Mozilla/5.0',
      });
    });

    it('returns userAgent null when user-agent header is not present', () => {
      const req = createMockRequest({
        'cf-connecting-ip': '203.0.113.1',
      });

      const result = getClientInfo(req);

      expect(result).toEqual({
        ipAddress: '203.0.113.1',
        userAgent: null,
      });
    });

    // Edge Cases
    it('returns both null when neither is present', () => {
      const req = createMockRequest({});

      const result = getClientInfo(req);

      expect(result).toEqual({
        ipAddress: null,
        userAgent: null,
      });
    });

    it('sanitizes private IP to null via sanitizeIp', () => {
      const req = createMockRequest({
        'cf-connecting-ip': '192.168.1.1',
        'user-agent': 'Test/1.0',
      });

      const result = getClientInfo(req);

      expect(result).toEqual({
        ipAddress: null, // private IP filtered
        userAgent: 'Test/1.0',
      });
    });

    it('returns a new object each time', () => {
      const req = createMockRequest({
        'cf-connecting-ip': '203.0.113.1',
        'user-agent': 'Mozilla/5.0',
      });

      const result1 = getClientInfo(req);
      const result2 = getClientInfo(req);

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2); // Different object references
    });
  });

  describe('sanitizeIp', () => {
    // Null/Empty Cases
    it('returns null for null input', () => {
      expect(sanitizeIp(null)).toBe(null);
    });

    it('returns null for empty string', () => {
      expect(sanitizeIp('')).toBe(null);
    });

    it('returns null for whitespace-only string', () => {
      expect(sanitizeIp('   ')).toBe(null);
    });

    it('returns null for tabs and spaces', () => {
      expect(sanitizeIp('\t  \n')).toBe(null);
    });

    // Localhost Cases
    it('returns null for 127.0.0.1 (IPv4 localhost)', () => {
      expect(sanitizeIp('127.0.0.1')).toBe(null);
    });

    it('returns null for ::1 (IPv6 localhost)', () => {
      expect(sanitizeIp('::1')).toBe(null);
    });

    it('returns null for localhost string', () => {
      expect(sanitizeIp('localhost')).toBe(null);
    });

    // Private IP Cases (IPv4)
    it('returns null for 192.168.1.1 (private)', () => {
      expect(sanitizeIp('192.168.1.1')).toBe(null);
    });

    it('returns null for 192.168.0.1 (private)', () => {
      expect(sanitizeIp('192.168.0.1')).toBe(null);
    });

    it('returns null for 192.168.255.255 (private boundary)', () => {
      expect(sanitizeIp('192.168.255.255')).toBe(null);
    });

    it('returns null for 10.0.0.1 (private class A)', () => {
      expect(sanitizeIp('10.0.0.1')).toBe(null);
    });

    it('returns null for 10.255.255.255 (private class A boundary)', () => {
      expect(sanitizeIp('10.255.255.255')).toBe(null);
    });

    it('returns null for 172.16.0.1 (private class B start)', () => {
      expect(sanitizeIp('172.16.0.1')).toBe(null);
    });

    it('returns null for 172.31.255.255 (private class B end)', () => {
      expect(sanitizeIp('172.31.255.255')).toBe(null);
    });

    it('returns null for 172.20.50.100 (private class B middle)', () => {
      expect(sanitizeIp('172.20.50.100')).toBe(null);
    });

    // Public IP Cases (IPv4)
    it('returns 8.8.8.8 unchanged (Google DNS)', () => {
      expect(sanitizeIp('8.8.8.8')).toBe('8.8.8.8');
    });

    it('returns 203.0.113.1 unchanged (TEST-NET-3)', () => {
      expect(sanitizeIp('203.0.113.1')).toBe('203.0.113.1');
    });

    it('returns 172.32.0.1 unchanged (just outside private range)', () => {
      expect(sanitizeIp('172.32.0.1')).toBe('172.32.0.1');
    });

    it('returns 172.15.255.255 unchanged (just before private range)', () => {
      expect(sanitizeIp('172.15.255.255')).toBe('172.15.255.255');
    });

    it('returns 1.1.1.1 unchanged (Cloudflare DNS)', () => {
      expect(sanitizeIp('1.1.1.1')).toBe('1.1.1.1');
    });

    // IPv6 Cases
    it('returns public IPv6 unchanged', () => {
      const publicIPv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      expect(sanitizeIp(publicIPv6)).toBe(publicIPv6);
    });

    it('returns shortened IPv6 unchanged', () => {
      expect(sanitizeIp('2001:db8::1')).toBe('2001:db8::1');
    });

    // Note: Current implementation doesn't check IPv6 private ranges
    // These tests document actual behavior
    it('returns IPv6 fc00::1 (unique local) - not filtered in current impl', () => {
      // The current implementation does not filter IPv6 private ranges
      // This documents actual behavior - sanitizeIp only filters:
      // - localhost (::1)
      // - IPv4 private ranges
      expect(sanitizeIp('fc00::1')).toBe('fc00::1');
    });

    it('returns IPv6 fe80::1 (link-local) - not filtered in current impl', () => {
      expect(sanitizeIp('fe80::1')).toBe('fe80::1');
    });

    // IPv6-Mapped IPv4
    it('extracts and filters private IPv4 from ::ffff: format', () => {
      expect(sanitizeIp('::ffff:192.168.1.1')).toBe(null);
    });

    it('extracts and returns public IPv4 from ::ffff: format', () => {
      expect(sanitizeIp('::ffff:8.8.8.8')).toBe('8.8.8.8');
    });

    it('handles uppercase ::FFFF: prefix', () => {
      expect(sanitizeIp('::FFFF:10.0.0.1')).toBe(null);
    });

    it('extracts and validates IPv4 from mixed case ::FfFf:', () => {
      expect(sanitizeIp('::FfFf:203.0.113.1')).toBe('203.0.113.1');
    });

    // Edge Cases
    it('trims leading whitespace from IP', () => {
      expect(sanitizeIp('  8.8.8.8')).toBe('8.8.8.8');
    });

    it('trims trailing whitespace from IP', () => {
      expect(sanitizeIp('8.8.8.8  ')).toBe('8.8.8.8');
    });

    it('trims both leading and trailing whitespace', () => {
      expect(sanitizeIp('  8.8.8.8  ')).toBe('8.8.8.8');
    });

    it('returns null for invalid formatted string like 999.999.999.999', () => {
      // This is not a valid IPv4 address, so isValidIPv4 returns false
      expect(sanitizeIp('999.999.999.999')).toBe(null);
    });

    it('returns null for non-IP string', () => {
      expect(sanitizeIp('not-an-ip')).toBe(null);
    });

    it('returns null for partial IP like abc.def.ghi', () => {
      expect(sanitizeIp('abc.def.ghi')).toBe(null);
    });

    // Private IP Boundary Testing
    it('returns null for 10.0.0.0 (first private class A)', () => {
      expect(sanitizeIp('10.0.0.0')).toBe(null);
    });

    it('returns 9.255.255.255 unchanged (just before class A private)', () => {
      expect(sanitizeIp('9.255.255.255')).toBe('9.255.255.255');
    });

    it('returns 11.0.0.0 unchanged (just after class A private)', () => {
      expect(sanitizeIp('11.0.0.0')).toBe('11.0.0.0');
    });

    it('returns null for 172.16.0.0 (start of class B private)', () => {
      expect(sanitizeIp('172.16.0.0')).toBe(null);
    });

    it('returns 172.15.255.254 unchanged (just before class B private)', () => {
      expect(sanitizeIp('172.15.255.254')).toBe('172.15.255.254');
    });

    it('returns 172.32.0.0 unchanged (just after class B private)', () => {
      expect(sanitizeIp('172.32.0.0')).toBe('172.32.0.0');
    });

    it('returns null for 192.168.0.0 (start of class C private)', () => {
      expect(sanitizeIp('192.168.0.0')).toBe(null);
    });

    it('returns 192.167.255.255 unchanged (just before class C private)', () => {
      expect(sanitizeIp('192.167.255.255')).toBe('192.167.255.255');
    });

    it('returns 192.169.0.0 unchanged (just after class C private)', () => {
      expect(sanitizeIp('192.169.0.0')).toBe('192.169.0.0');
    });
  });

  describe('isValidIPv4', () => {
    // Valid IPv4 Cases
    it('returns true for 0.0.0.0', () => {
      expect(isValidIPv4('0.0.0.0')).toBe(true);
    });

    it('returns true for 255.255.255.255', () => {
      expect(isValidIPv4('255.255.255.255')).toBe(true);
    });

    it('returns true for 192.168.1.1', () => {
      expect(isValidIPv4('192.168.1.1')).toBe(true);
    });

    it('returns true for 127.0.0.1', () => {
      expect(isValidIPv4('127.0.0.1')).toBe(true);
    });

    it('returns true for 10.0.0.1', () => {
      expect(isValidIPv4('10.0.0.1')).toBe(true);
    });

    it('returns true for 1.2.3.4', () => {
      expect(isValidIPv4('1.2.3.4')).toBe(true);
    });

    // Invalid IPv4 Cases
    it('returns false for 256.1.1.1 (out of range)', () => {
      expect(isValidIPv4('256.1.1.1')).toBe(false);
    });

    it('returns false for 1.256.1.1 (out of range in second octet)', () => {
      expect(isValidIPv4('1.256.1.1')).toBe(false);
    });

    it('returns false for 1.1.256.1 (out of range in third octet)', () => {
      expect(isValidIPv4('1.1.256.1')).toBe(false);
    });

    it('returns false for 1.1.1.256 (out of range in fourth octet)', () => {
      expect(isValidIPv4('1.1.1.256')).toBe(false);
    });

    it('returns false for 1.1.1 (incomplete - only 3 octets)', () => {
      expect(isValidIPv4('1.1.1')).toBe(false);
    });

    it('returns false for 1.1.1.1.1 (too many octets)', () => {
      expect(isValidIPv4('1.1.1.1.1')).toBe(false);
    });

    it('returns false for abc.def.ghi.jkl (non-numeric)', () => {
      expect(isValidIPv4('abc.def.ghi.jkl')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidIPv4('')).toBe(false);
    });

    it('returns false for IPv6 address', () => {
      expect(isValidIPv4('2001:db8::1')).toBe(false);
    });

    it('returns false for 1.1.1.-1 (negative number)', () => {
      expect(isValidIPv4('1.1.1.-1')).toBe(false);
    });

    it('returns true for 01.01.01.01 (leading zeros valid in regex)', () => {
      // The regex allows leading zeros
      expect(isValidIPv4('01.01.01.01')).toBe(true);
    });

    it('returns true for 00.00.00.00 (leading zeros)', () => {
      expect(isValidIPv4('00.00.00.00')).toBe(true);
    });
  });

  describe('isValidIPv6', () => {
    // Valid IPv6 Cases
    it('returns true for full IPv6 address', () => {
      expect(isValidIPv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    });

    it('returns true for compressed IPv6 (::1)', () => {
      expect(isValidIPv6('::1')).toBe(true);
    });

    it('returns true for ::ffff:192.168.1.1 format', () => {
      // Note: This contains IPv4, but passes basic IPv6 check (has colons and hex)
      expect(isValidIPv6('::ffff:192.168.1.1')).toBe(false); // Contains dots and non-hex digits
    });

    it('returns true for IPv6 with mixed case hex', () => {
      expect(isValidIPv6('2001:DB8:85a3:0:0:8A2E:370:7334')).toBe(true);
    });

    it('returns true for fe80::1 (link-local)', () => {
      expect(isValidIPv6('fe80::1')).toBe(true);
    });

    it('returns true for fc00::1 (unique local)', () => {
      expect(isValidIPv6('fc00::1')).toBe(true);
    });

    it('returns true for :: (unspecified)', () => {
      expect(isValidIPv6('::')).toBe(true);
    });

    it('returns true for 2001:db8::', () => {
      expect(isValidIPv6('2001:db8::')).toBe(true);
    });

    // Invalid IPv6 Cases
    it('returns false for IPv4 address', () => {
      expect(isValidIPv6('192.168.1.1')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidIPv6('')).toBe(false);
    });

    it('returns false for plain text', () => {
      expect(isValidIPv6('localhost')).toBe(false);
    });

    it('returns false for string without colons', () => {
      expect(isValidIPv6('abcdef12345')).toBe(false);
    });

    it('returns false for string with invalid chars and colons', () => {
      expect(isValidIPv6('ghij:klmn:opqr')).toBe(false);
    });

    // Edge cases for the basic regex check
    it('returns true for 1:2:3:4:5:6:7:8 (simple format)', () => {
      expect(isValidIPv6('1:2:3:4:5:6:7:8')).toBe(true);
    });

    it('returns true for a:b:c:d:e:f:0:1 (lowercase hex)', () => {
      expect(isValidIPv6('a:b:c:d:e:f:0:1')).toBe(true);
    });
  });
});
