#!/bin/bash

echo "🧪 Testing Auth Rate Limiting (strictLimiter: 5 req / 15 min)"
echo "============================================================"
echo ""

BASE_URL="http://localhost:3000"
ENDPOINT="/api/auth/register"

echo "Sending 7 requests to $BASE_URL$ENDPOINT"
echo ""

for i in {1..7}; do
  echo "--- Request $i ---"

  response=$(curl -s -w "\nHTTP_STATUS:%{http_code}\nHEADERS:\n" \
    -X POST "$BASE_URL$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test$i@example.com\",\"password\":\"12345678\",\"name\":\"Test User $i\"}")

  http_code=$(echo "$response" | grep "HTTP_STATUS:" | cut -d':' -f2)
  rate_limit=$(echo "$response" | grep -i "x-ratelimit-limit" || echo "No rate limit header")
  rate_remaining=$(echo "$response" | grep -i "x-ratelimit-remaining" || echo "No remaining header")

  echo "HTTP Status: $http_code"
  echo "$rate_limit"
  echo "$rate_remaining"

  # Extract body (everything before HTTP_STATUS line)
  body=$(echo "$response" | sed '/HTTP_STATUS:/Q')
  echo "Response: $body"
  echo ""

  sleep 0.5
done

echo "✅ Test completed!"
echo ""
echo "Expected behavior:"
echo "- Requests 1-5: Should succeed (200 or 400 with validation errors)"
echo "- Requests 6-7: Should return 429 (Too Many Requests)"
echo "- All requests should have X-RateLimit-* headers"
