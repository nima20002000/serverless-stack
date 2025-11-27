# Structured Logging Implementation

## Status: ⏳ PENDING
**Priority**: Medium
**Estimated Complexity**: Low
**Estimated Time**: 2-3 hours

---

## Overview
Implement structured logging system using Pino to improve debugging, monitoring, and observability across the application. This will provide detailed insights into API requests, errors, and application behavior.

---

## Business Value
- **Better Debugging**: Quickly identify and fix issues in production
- **Performance Monitoring**: Track API response times and bottlenecks
- **Security Auditing**: Log authentication attempts and suspicious activity
- **Production Visibility**: Understand how users interact with the system

---

## Prerequisites
- Node.js and npm installed
- Access to Vercel deployment
- Basic understanding of logging concepts

---

## Tasks

### 1. Install Dependencies
- [ ] Install Pino logger
  ```bash
  npm install pino pino-pretty
  ```
- [ ] Verify package.json updated

### 2. Create Logger Utility
- [ ] Create `src/lib/logger/index.ts`
- [ ] Configure Pino with environment-based settings
  - Development: Pretty-printed, colorized logs
  - Production: Structured JSON logs
- [ ] Add log level configuration (info, warn, error, debug)
- [ ] Add default fields (environment, service name)
- [ ] Export helper functions: `log.info()`, `log.error()`, `log.warn()`, `log.debug()`

**File**: `src/lib/logger/index.ts`
```typescript
import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  base: {
    env: process.env.NODE_ENV,
    service: 'kitia',
  },
});

export const log = {
  info: (msg: string, data?: object) => logger.info(data, msg),
  error: (msg: string, error?: Error | object) => logger.error(error, msg),
  warn: (msg: string, data?: object) => logger.warn(data, msg),
  debug: (msg: string, data?: object) => logger.debug(data, msg),
};
```

### 3. Create API Logging Wrapper
- [ ] Create `src/lib/api/with-logging.ts`
- [ ] Implement request/response logging wrapper
- [ ] Log request method, URL, duration
- [ ] Log response status code
- [ ] Catch and log errors with stack traces
- [ ] Add request ID for tracing

**File**: `src/lib/api/with-logging.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';

type ApiHandler = (req: NextRequest, context?: any) => Promise<NextResponse>;

export function withLogging(handler: ApiHandler, routeName: string): ApiHandler {
  return async (req: NextRequest, context?: any) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    log.info('API Request Started', {
      requestId,
      route: routeName,
      method: req.method,
      url: req.url,
      userAgent: req.headers.get('user-agent'),
    });

    try {
      const response = await handler(req, context);

      log.info('API Request Completed', {
        requestId,
        route: routeName,
        method: req.method,
        status: response.status,
        duration: `${Date.now() - startTime}ms`,
      });

      return response;
    } catch (error) {
      log.error('API Request Failed', {
        requestId,
        route: routeName,
        method: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        duration: `${Date.now() - startTime}ms`,
      });

      throw error;
    }
  };
}
```

### 4. Add Logging to Services
- [ ] Update `src/services/user-service.ts`
  - Log user creation, login attempts
  - Log validation failures
  - Log errors with context
- [ ] Update `src/services/product-service.ts`
  - Log product CRUD operations
  - Log stock updates
- [ ] Update `src/services/transaction-service.ts`
  - Log transaction creation
  - Log payment verification
  - Log stock reduction

**Example Pattern**:
```typescript
import { log } from '@/lib/logger';

export async function createUser(data: { email: string; password: string; name: string }) {
  log.info('Creating user', { email: data.email, name: data.name });

  try {
    // Validation
    if (!validateEmail(data.email)) {
      log.warn('Invalid email format', { email: data.email });
      throw new Error('فرمت ایمیل نامعتبر است');
    }

    // Create user
    const user = await prisma.user.create({ data });

    log.info('User created successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return user;
  } catch (error) {
    log.error('Failed to create user', {
      email: data.email,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
```

### 5. Add Logging to API Routes
- [ ] Wrap critical API routes with `withLogging`
  - `/api/auth/register`
  - `/api/auth/login`
  - `/api/transactions/create`
  - `/api/transactions/verify`
  - `/api/products` (GET, POST)
- [ ] Test each wrapped route

**Example**:
```typescript
// src/app/api/products/route.ts
import { withLogging } from '@/lib/api/with-logging';

const getHandler = async (req: NextRequest) => {
  const products = await getActiveProducts();
  return NextResponse.json(products);
};

export const GET = withLogging(getHandler, 'GET /api/products');
```

### 6. Environment Configuration
- [ ] Add to `.env.example`
  ```env
  LOG_LEVEL=info
  ```
- [ ] Add to `.env` (local development)
  ```env
  LOG_LEVEL=debug
  ```
- [ ] Configure Vercel environment variables
  ```env
  LOG_LEVEL=info
  ```

### 7. Error Handling Enhancement
- [ ] Update error responses to include request IDs
- [ ] Ensure sensitive data is never logged (passwords, tokens)
- [ ] Add try-catch blocks around logging to prevent logging failures from breaking app

---

## Testing Checklist

### Local Testing
- [ ] Start development server: `npm run dev`
- [ ] Test API request logging
  ```bash
  curl http://localhost:3000/api/products
  ```
  Expected: See colorized logs in terminal with request/response details

- [ ] Test error logging
  ```bash
  curl -X POST http://localhost:3000/api/products -H "Content-Type: application/json" -d '{"invalid": "data"}'
  ```
  Expected: See error log with stack trace

- [ ] Verify log levels work
  - Set `LOG_LEVEL=debug` → Should see debug logs
  - Set `LOG_LEVEL=error` → Should only see errors

- [ ] Check that logs don't contain sensitive data
  - Create user with password → Verify password not logged
  - Login request → Verify password not logged

### Git Workflow
- [ ] Create feature branch
  ```bash
  git checkout -b feature/09-structured-logging
  ```

- [ ] Commit changes
  ```bash
  git add .
  git commit -m "feat: add structured logging with Pino

  - Add Pino logger with environment-based configuration
  - Create API logging wrapper for request/response tracking
  - Add logging to user, product, and transaction services
  - Wrap critical API routes with logging
  - Add request IDs for tracing
  - Configure log levels for dev/production

  Refs: 2do/09-structured-logging.md"
  ```

- [ ] Push to GitHub
  ```bash
  git push origin feature/09-structured-logging
  ```

### Vercel Preview Testing
- [ ] Wait for Vercel preview deployment
- [ ] Test preview URL endpoints
- [ ] Check Vercel logs dashboard
  - Go to Vercel Dashboard → Deployments → Select preview
  - Click "Logs" tab
  - Verify structured JSON logs appear
  - Check log format is correct

### Production Deployment
- [ ] Create pull request on GitHub
- [ ] Review changes
- [ ] Merge to main branch
- [ ] Verify production deployment
- [ ] Monitor Vercel production logs for 24 hours

---

## Database Changes
**None** - This task does not require database migrations.

---

## Rollback Plan
If issues occur:
1. Revert the merge commit
   ```bash
   git revert HEAD
   git push origin main
   ```
2. Or remove logging wrapper from API routes
3. Logs are non-critical, so app continues working even if logging fails

---

## Success Criteria
- [x] ✅ Pino logger installed and configured
- [x] ✅ Logger utility created with helper functions
- [x] ✅ API logging wrapper created
- [x] ✅ Logging added to at least 3 services
- [x] ✅ At least 5 API routes wrapped with logging
- [x] ✅ Logs visible in local development (pretty format)
- [x] ✅ Logs visible in Vercel dashboard (JSON format)
- [x] ✅ No sensitive data logged
- [x] ✅ App continues working if logging fails
- [x] ✅ Request IDs present for tracing

---

## Monitoring After Deployment
- Check Vercel logs daily for first week
- Monitor error rate (should not increase)
- Verify log volume is reasonable
- Check for any performance impact (should be minimal)

---

## Documentation
- [ ] Update README.md with logging information
- [ ] Document log levels and when to use them
- [ ] Document how to view logs in Vercel
- [ ] Add examples of common log queries

---

## Related Tasks
- Task 10: Redis Caching (will use logging)
- Task 11: Rate Limiting (will use logging)

---

## Notes
- Logging is non-breaking - if it fails, app continues
- Start with critical endpoints, expand gradually
- Use appropriate log levels (debug in dev, info in prod)
- Never log: passwords, API keys, credit card numbers
- Always log: user actions, errors, performance metrics
