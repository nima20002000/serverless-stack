#!/bin/bash

echo "🔍 VERBOSE Auth Rate Limiting Test with Full Headers"
echo "======================================================"
echo ""

BASE_URL="http://localhost:3000"
ENDPOINT="/api/auth/register"

for i in {1..6}; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Request #$i"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  curl -v -X POST "$BASE_URL$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test$i@example.com\",\"password\":\"12345678\",\"name\":\"Test User $i\"}" \
    2>&1 | grep -E "(HTTP/|< X-RateLimit|< Retry-After|error|retryAfter)"

  echo ""
  sleep 0.5
done

echo "✅ Verbose test completed!"
