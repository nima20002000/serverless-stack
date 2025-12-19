# Kitia Integration Tests

This directory contains the integration testing suite for the Kitia e-commerce platform. Tests are isolated from the main codebase with their own `package.json` to ensure clean separation and prevent circular dependencies.

## Architecture

```
tests/
├── integration/          # Real integration tests against live services
├── mocks/               # MSW handlers and mock implementations
├── fixtures/            # Test data and scenarios
├── utils/               # Test utilities and helpers
├── tasks/               # Task definitions for AI agents
└── contracts/           # Recorded API contracts (frozen)
```

## Philosophy

These tests are designed to:
1. **Verify real service integration** - Test actual communication with Supabase, Redis, Email/SMS providers, etc.
2. **Create frozen contracts** - Record real responses and use them as MSW mocks for fast, deterministic tests
3. **Prevent reward hacking** - Tests are designed with anti-gaming measures (see task files)

## Installation

```bash
cd tests
npm install
```

## Running Tests

```bash
# Run all tests
npm test

# Watch mode for development
npm test:watch

# Run with UI (browser interface)
npm test:ui

# Integration tests only (against real services)
npm run test:integration

# Contract validation tests (using MSW mocks)
npm run test:contract

# Generate coverage report
npm run test:coverage
```

## Test Categories

### Integration Tests
Tests that communicate with real services:
- Supabase database operations
- Redis caching and rate limiting
- Email/SMS delivery
- Payment gateway integration
- File storage (R2)

### Contract Tests
Tests that use frozen MSW mocks based on recorded real responses:
- Fast execution
- Deterministic results
- No external dependencies
- Validates API contract compliance

## Recording Contracts

To update contract mocks with fresh real responses:

```bash
# Set environment variable
export RECORD_CONTRACTS=true

# Run integration tests to record responses
npm run test:integration

# Recorded contracts are saved to ./contracts/*.recorded.json
```

⚠️ **Warning**: Never commit `.recorded.json` files as they may contain sensitive data. Review and sanitize before creating contract mocks.

## Environment Setup

1. Copy `.env.example` to `.env`
2. Configure test environment credentials (use test/sandbox instances!)
3. Ensure test database has separate schema or uses preview environment

## Writing Tests

See `tasks/task000.md` for comprehensive guidelines on:
- Avoiding reward hacking
- Writing meaningful assertions
- Preventing test gaming
- Contract validation patterns

## CI/CD Integration

Tests can be run in CI pipelines:
- Integration tests: Run against staging environment
- Contract tests: Run on every PR (fast, no external deps)
- Coverage reports: Uploaded to coverage services

## Troubleshooting

**Tests failing with connection errors:**
- Verify `.env` credentials are correct
- Check service availability (Supabase, Redis, etc.)
- Ensure network connectivity

**Contract validation failures:**
- Real API may have changed
- Re-record contracts: `RECORD_CONTRACTS=true npm run test:integration`
- Review diffs and update expectations

**Rate limiting errors:**
- Tests may hit rate limits on shared services
- Use dedicated test instances
- Implement test-specific rate limit bypasses
