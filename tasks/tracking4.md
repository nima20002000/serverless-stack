# Task 4: User Activity Tracking - Review & Fixes

## Overview

This document contains the review findings from the previous implementation (Tasks 1-3) and outlines the issues that need to be fixed before the tracking system is fully operational.

**Status**: Code implemented but NOT yet deployed to VPS. Production database has the schema but no activity logs (expected - code not deployed yet).

**Reviewer**: Claude Code Agent
**Date**: 2025-12-29

---

## Implementation Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Database Migration (Preview) | ✅ Applied | `user_activity_logs` table exists |
| Database Migration (Production) | ✅ Applied | `user_activity_logs` table exists |
| Database Migration (Local Dev) | ❌ NOT Applied | Must apply before local testing |
| Request Utils | ✅ Implemented | Minor improvements needed |
| Activity Log Service | ✅ Implemented | Working correctly |
| API Route Integrations | ✅ Implemented | 7 routes integrated |
| TypeScript Types | ✅ Regenerated | Types match schema |
| VPS Deployment | ❌ Pending | Code not pushed yet |

---

## Critical Issues to Fix

### Issue 1: Local Database Migration NOT Applied

**Severity**: 🔴 Critical (blocks local development)

**Problem**: The migration file exists at `migrations/add_user_activity_tracking.sql` but was NOT applied to the local PostgreSQL database. The remote databases (preview and production) have the migration applied.

**Symptoms**:
- `user_activity_logs` table doesn't exist locally
- `transactions` table missing `ip_address` and `user_agent` columns locally
- Activity logging will fail silently during local development

**Verification**:
```sql
-- Run this to check if table exists locally
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'user_activity_logs';
-- Returns 0 rows = NOT applied
```

**Fix**:
```bash
# Apply migration to local database
PGPASSWORD="kitia_password" psql -h localhost -U kitia_user -d kitia -f migrations/add_user_activity_tracking.sql
```

**Post-fix Verification**:
```bash
# Should return 1 row with 'user_activity_logs'
PGPASSWORD="kitia_password" psql -h localhost -U kitia_user -d kitia -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_activity_logs';"
```

---

### Issue 2: `sanitizeIp()` Function Not Used

**Severity**: 🟡 Medium (security/data quality)

**Problem**: The `sanitizeIp()` function in `src/lib/request-utils.ts` is implemented but **never called**. This means:
- Private IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x) will be stored in database
- Localhost IPs (127.0.0.1, ::1) will be stored
- Invalid IP formats won't be filtered

**Current Code** (`src/lib/request-utils.ts:19-52`):
```typescript
export function getClientIp(req: NextRequest): string | null {
  // ... extracts IP but doesn't sanitize it
  return ips[0]; // Returns raw IP without sanitization
}
```

**Fix Option A** - Sanitize in `getClientIp()`:
```typescript
export function getClientIp(req: NextRequest): string | null {
  try {
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
      const ips = forwardedFor.split(',').map((ip) => ip.trim());
      if (ips[0] && ips[0] !== '') {
        return sanitizeIp(ips[0]); // ADD THIS
      }
    }
    // ... rest of function with sanitizeIp() calls
  }
}
```

**Fix Option B** - Sanitize in `getClientInfo()`:
```typescript
export function getClientInfo(req: NextRequest): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  return {
    ipAddress: sanitizeIp(getClientIp(req)), // ADD sanitizeIp wrapper
    userAgent: getUserAgent(req),
  };
}
```

**Recommendation**: Use Option B - it's less invasive and keeps `getClientIp()` returning raw values for cases where you might want the original IP.

---

### Issue 3: Missing Cloudflare `cf-connecting-ip` Header

**Severity**: 🟡 Medium (accuracy)

**Problem**: The site uses Cloudflare CDN. Cloudflare provides the original client IP in the `cf-connecting-ip` header, which is more reliable than `x-forwarded-for` (which can be spoofed or contain multiple IPs).

**Current Header Priority**:
1. `x-forwarded-for`
2. `x-real-ip`
3. `req.ip`

**Recommended Header Priority**:
1. `cf-connecting-ip` (Cloudflare's verified client IP)
2. `x-forwarded-for`
3. `x-real-ip`
4. `req.ip`

**Fix** - Update `getClientIp()` in `src/lib/request-utils.ts`:
```typescript
export function getClientIp(req: NextRequest): string | null {
  try {
    // Cloudflare's verified client IP (most reliable when using Cloudflare)
    const cfConnectingIp = req.headers.get('cf-connecting-ip');
    if (cfConnectingIp && cfConnectingIp !== '') {
      return cfConnectingIp;
    }

    // Try x-forwarded-for (proxy/load balancer)
    const forwardedFor = req.headers.get('x-forwarded-for');
    // ... rest of existing code
  }
}
```

---

### Issue 4: Missing Error Logging in send-otp Route

**Severity**: 🟢 Low (completeness)

**Problem**: In `src/app/api/auth/send-otp/route.ts`, when OTP sending fails (rate limit or send failure), no activity is logged. Only successful OTP sends are logged.

**Current Behavior** (lines 93-125):
```typescript
if (!result.success) {
  // Returns error but doesn't log activity
  return NextResponse.json({ error: result.error }, { status: statusCode });
}

// Only logs on success
logUserActivity({
  activityType: 'OTP_SENT',
  // ...
});
```

**Fix** - Add logging for failed OTP sends:
```typescript
if (!result.success) {
  // Log failed OTP send
  logUserActivity({
    userId: existingUser?.id || null,
    activityType: 'OTP_SENT',
    ipAddress,
    userAgent,
    success: false,
    errorMessage: result.error,
    metadata: {
      identifier_type: isEmail ? 'email' : 'phone',
      purpose,
      errorCode: result.errorCode,
    },
  }).catch(() => {});

  return NextResponse.json({ error: result.error }, { status: statusCode });
}
```

---

### Issue 5: LOGOUT Activity Type Not Used

**Severity**: 🟢 Low (completeness)

**Problem**: The `LOGOUT` activity type exists in the database enum but is never used in any route. If there's a logout mechanism (NextAuth signOut), it should log the activity.

**Location to Check**: Look for logout handling in:
- `src/app/api/auth/[...nextauth]/route.ts`
- Any client-side logout handlers
- NextAuth events configuration

**Fix** - If using NextAuth events, add to `src/lib/auth/options.ts`:
```typescript
events: {
  signOut: async ({ session, token }) => {
    // Note: Can't get request headers in NextAuth events
    // Consider logging with just userId
    if (token?.sub) {
      await logUserActivity({
        userId: token.sub,
        activityType: 'LOGOUT',
        success: true,
      });
    }
  },
},
```

**Note**: NextAuth events don't have access to the request object, so IP/user-agent won't be available for logout events unless you implement a custom logout endpoint.

---

### Issue 6: checkout-verify-otp Route Not Checked

**Severity**: 🟢 Low (completeness)

**Problem**: The file `src/app/api/auth/checkout-verify-otp/route.ts` exists but wasn't verified for activity logging integration.

**Action Required**: Review this file and add activity logging if missing.

---

### Issue 7: IPv6-Mapped IPv4 Addresses

**Severity**: 🟢 Low (edge case)

**Problem**: IPv6-mapped IPv4 addresses like `::ffff:192.168.1.1` will pass the `isValidIPv6()` check but actually contain a private IPv4 address.

**Current `isValidIPv6()` Function**:
```typescript
export function isValidIPv6(ip: string): boolean {
  return /^[0-9a-fA-F:]+$/.test(ip) && ip.includes(':');
}
```

**Fix** - Update `sanitizeIp()` to handle IPv6-mapped IPv4:
```typescript
export function sanitizeIp(ip: string | null): string | null {
  if (!ip || ip === '') return null;

  let trimmed = ip.trim();
  if (trimmed === '') return null;

  // Handle IPv6-mapped IPv4 (::ffff:192.168.1.1)
  if (trimmed.toLowerCase().startsWith('::ffff:')) {
    trimmed = trimmed.substring(7); // Extract the IPv4 part
  }

  // Skip localhost
  if (trimmed === '127.0.0.1' || trimmed === '::1' || trimmed === 'localhost') {
    return null;
  }

  // ... rest of existing private IP checks
}
```

---

## Future Considerations (Not Blocking)

### 1. Database Growth & Cleanup

**Problem**: Without automated cleanup, `user_activity_logs` will grow indefinitely.

**Current State**: `cleanupOldActivityLogs()` function exists in `activity-log-service.ts` but no automation.

**Recommended Solution**: Create a cron job on VPS:
```bash
# Add to crontab on VPS (runs monthly on the 1st at 2 AM)
0 2 1 * * cd /path/to/kitia && node -e "require('./src/services/activity-log-service').cleanupOldActivityLogs(90)"
```

Or create a dedicated script `scripts/cleanup-activity-logs.mjs`:
```javascript
import { cleanupOldActivityLogs } from '../src/services/activity-log-service.js';

const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || '90');
const deleted = await cleanupOldActivityLogs(retentionDays);
console.log(`Deleted ${deleted} old activity logs`);
```

### 2. Missing RLS Policies

**Problem**: The `user_activity_logs` table has no Row Level Security policies. If the Supabase client is ever used with user tokens (client-side), users could potentially query other users' activity.

**Note**: Currently the app uses server-side Supabase client with secret key, so this isn't an immediate risk. But for defense in depth:

```sql
-- Add RLS policy (run in Supabase SQL Editor)
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can only read their own activity logs
CREATE POLICY "Users can read own activity logs"
  ON user_activity_logs
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Only service role can insert
CREATE POLICY "Service role can insert activity logs"
  ON user_activity_logs
  FOR INSERT
  WITH CHECK (true);
```

### 3. IP Address Index

**Problem**: No index on `ip_address` column. If you later need to query by IP (e.g., "show all activity from this IP" for security analysis), queries will be slow.

**Fix** (optional, add if needed):
```sql
CREATE INDEX idx_user_activity_ip_address ON user_activity_logs(ip_address);
```

### 4. Metadata Field Size

**Problem**: The `metadata` JSONB field has no size validation. Extremely large payloads could be stored accidentally.

**Recommendation**: Add validation in `logUserActivity()`:
```typescript
const metadataStr = JSON.stringify(data.metadata || {});
if (metadataStr.length > 10000) {
  log.warn('Metadata too large, truncating', { size: metadataStr.length });
  data.metadata = { error: 'metadata_truncated', original_size: metadataStr.length };
}
```

---

## Files Modified by Previous Agent

| File | Type | Changes |
|------|------|---------|
| `migrations/add_user_activity_tracking.sql` | New | Database migration |
| `src/lib/request-utils.ts` | New | IP/user-agent extraction utilities |
| `src/services/activity-log-service.ts` | New | Activity logging service |
| `src/types/supabase.ts` | Modified | Regenerated types |
| `src/app/api/auth/login/route.ts` | Modified | Added activity logging |
| `src/app/api/auth/register/route.ts` | Modified | Added activity logging |
| `src/app/api/auth/send-otp/route.ts` | Modified | Added activity logging |
| `src/app/api/auth/verify-otp/route.ts` | Modified | Added activity logging |
| `src/app/api/user/profile/route.ts` | Modified | Added activity logging |
| `src/app/api/user/password/route.ts` | Modified | Added activity logging |
| `src/app/api/transactions/create/route.ts` | Modified | Added IP/user-agent storage |
| `src/services/transaction-service.ts` | Modified | Added IP/user-agent parameters |

---

## Deployment Checklist

Before deploying to VPS:

- [ ] Apply migration to local database and test
- [ ] Fix `sanitizeIp()` usage (Issue 2)
- [ ] Add Cloudflare header check (Issue 3)
- [ ] Review and fix send-otp error logging (Issue 4)
- [ ] Check checkout-verify-otp route (Issue 6)
- [ ] Run `npm run build` to verify no TypeScript errors
- [ ] Test locally:
  - [ ] Login logs activity
  - [ ] Registration logs activity
  - [ ] OTP send/verify logs activity
  - [ ] Profile update logs activity
  - [ ] Password change logs activity
  - [ ] Transaction creation stores IP/user-agent

After deploying to VPS:

- [ ] Push code to repository
- [ ] SSH to VPS and pull latest code
- [ ] Restart PM2: `pm2 restart kitia`
- [ ] Verify logs: `pm2 logs kitia --lines 50`
- [ ] Test login on production and check Supabase Dashboard for activity log
- [ ] Set up cleanup cron job (optional, can do later)

---

## Quick Fix Commands

```bash
# 1. Apply migration to local database
PGPASSWORD="kitia_password" psql -h localhost -U kitia_user -d kitia -f migrations/add_user_activity_tracking.sql

# 2. Verify migration applied
PGPASSWORD="kitia_password" psql -h localhost -U kitia_user -d kitia -c "SELECT * FROM user_activity_logs LIMIT 1;"

# 3. Build and test
npm run build
npm run dev

# 4. Test login endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpass"}'

# 5. Check local database for activity log
PGPASSWORD="kitia_password" psql -h localhost -U kitia_user -d kitia -c "SELECT * FROM user_activity_logs ORDER BY created_at DESC LIMIT 5;"
```

---

## Priority Order for Fixes

1. 🔴 **Critical**: Apply local database migration (Issue 1)
2. 🟡 **Medium**: Fix `sanitizeIp()` usage (Issue 2)
3. 🟡 **Medium**: Add Cloudflare header (Issue 3)
4. 🟢 **Low**: Add send-otp error logging (Issue 4)
5. 🟢 **Low**: Check checkout-verify-otp route (Issue 6)
6. 🟢 **Low**: Handle IPv6-mapped IPv4 (Issue 7)
7. ⚪ **Optional**: Add LOGOUT logging (Issue 5)

---

## Next Steps

The next agent should:

1. Fix the critical and medium priority issues listed above
2. Apply the local database migration
3. Test the complete flow locally
4. Commit the fixes
5. Coordinate VPS deployment when ready
