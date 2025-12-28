/**
 * Request utility functions for extracting client information
 * Used for activity logging and analytics
 */

import { NextRequest } from 'next/server';
import { log } from '@/lib/logger';

/**
 * Extract client IP address from request headers
 * Checks multiple headers in order of preference:
 * 1. x-forwarded-for (proxy/load balancer)
 * 2. x-real-ip (nginx)
 * 3. connection.remoteAddress (direct connection)
 *
 * @param req Next.js request object
 * @returns IP address string or null if unavailable
 */
export function getClientIp(req: NextRequest): string | null {
  try {
    // Try x-forwarded-for first (most common with proxies/CDN)
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
      // May contain multiple IPs (client, proxy1, proxy2, ...)
      // First IP is the original client
      const ips = forwardedFor.split(',').map((ip) => ip.trim());
      if (ips[0] && ips[0] !== '') {
        return ips[0];
      }
    }

    // Try x-real-ip (nginx)
    const realIp = req.headers.get('x-real-ip');
    if (realIp && realIp !== '') {
      return realIp;
    }

    // Fallback: try to get from request context (may not exist in Next.js)
    const ip = req.ip;
    if (ip && ip !== '') {
      return ip;
    }

    // No IP found
    return null;
  } catch (error) {
    log.warn('Failed to extract client IP', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Extract user agent from request headers
 *
 * @param req Next.js request object
 * @returns User agent string or null if unavailable
 */
export function getUserAgent(req: NextRequest): string | null {
  try {
    const userAgent = req.headers.get('user-agent');
    if (userAgent && userAgent !== '') {
      // Truncate to 2000 chars to prevent extremely long user-agents
      return userAgent.substring(0, 2000);
    }
    return null;
  } catch (error) {
    log.warn('Failed to extract user agent', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Extract both IP and user agent in a single call
 * Convenience function for activity logging
 *
 * @param req Next.js request object
 * @returns Object with ipAddress and userAgent (both nullable)
 */
export function getClientInfo(req: NextRequest): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  return {
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
  };
}

/**
 * Validate IPv4 address format
 * @param ip IP address string
 * @returns true if valid IPv4
 */
export function isValidIPv4(ip: string): boolean {
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Regex.test(ip);
}

/**
 * Validate IPv6 address format (basic check)
 * @param ip IP address string
 * @returns true if looks like IPv6
 */
export function isValidIPv6(ip: string): boolean {
  // Very basic IPv6 check (contains colons and hex chars)
  return /^[0-9a-fA-F:]+$/.test(ip) && ip.includes(':');
}

/**
 * Sanitize IP address for storage
 * Ensures IP is valid and not a local/private address (for security)
 *
 * @param ip IP address string
 * @returns Sanitized IP or null if invalid/private
 */
export function sanitizeIp(ip: string | null): string | null {
  if (!ip || ip === '') {
    return null;
  }

  const trimmed = ip.trim();

  // Handle whitespace-only input
  if (trimmed === '') {
    return null;
  }

  // Skip localhost
  if (trimmed === '127.0.0.1' || trimmed === '::1' || trimmed === 'localhost') {
    return null;
  }

  // Skip private IPv4 ranges (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
  if (
    trimmed.startsWith('10.') ||
    trimmed.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(trimmed)
  ) {
    return null;
  }

  // Validate format
  if (isValidIPv4(trimmed) || isValidIPv6(trimmed)) {
    return trimmed;
  }

  return null;
}
