# Testing Admin API Endpoints

This document describes how to test admin API endpoints locally using curl.

## Prerequisites

- Dev server running on a port (e.g., `npm run dev`)
- Admin user in the database

## Test Admin Credentials (Local Development)

**Email:** nimarezapoor@gmail.com
**Password:** asdfadsf

## Testing Steps

### 1. Start the dev server

```bash
npm run dev
# Note the port (e.g., 3002 if 3000/3001 are in use)
```

### 2. Get CSRF Token and Login

```bash
# Get CSRF token
rm -f /tmp/cookies.txt
CSRF=$(curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt 'http://localhost:3002/api/auth/csrf' | jq -r '.csrfToken')
echo "CSRF Token: $CSRF"

# Login (note: use 'identifier' not 'email' field)
curl -s -X POST -c /tmp/cookies.txt -b /tmp/cookies.txt 'http://localhost:3002/api/auth/callback/credentials' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "csrfToken=$CSRF" \
  -d 'identifier=nimarezapoor@gmail.com' \
  -d 'password=asdfadsf'

# Verify login by checking cookies
cat /tmp/cookies.txt
# Should see 'next-auth.session-token'
```

### 3. Test Admin Endpoints

```bash
# Test transactions API
curl -s -b /tmp/cookies.txt 'http://localhost:3002/api/admin/transactions?page=1&limit=5'

# Test users API
curl -s -b /tmp/cookies.txt 'http://localhost:3002/api/admin/users'

# Test stats API
curl -s -b /tmp/cookies.txt 'http://localhost:3002/api/admin/stats'
```

## Important Notes

- The auth system uses `identifier` field (not `email`) for login
- Cookies are stored in `/tmp/cookies.txt`
- Session tokens expire after some time - re-login if you get 403
- Replace port 3002 with your actual dev server port

## Updating Test Password

If you need to reset the test admin password:

```bash
# Generate new bcrypt hash
node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash('asdfadsf', 10).then(hash => console.log('Hash:', hash));
"

# Update in database (preview)
PGPASSWORD="PawK0YK7sYbCzzMi" psql \
  -h aws-1-ap-northeast-2.pooler.supabase.com \
  -U postgres.gozxjxtnrbuurmstjydo \
  -d postgres -p 6543 \
  -c "UPDATE users SET password = '<NEW_HASH>' WHERE email = 'nimarezapoor@gmail.com';"
```
