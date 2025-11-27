#!/bin/bash

echo "🔍 Testing Login Rate Limiting (NextAuth endpoint)"
echo "==================================================="
echo ""

BASE_URL="http://localhost:3000"
# NextAuth uses this endpoint for credential login
ENDPOINT="/api/auth/callback/credentials"

echo "Sending 7 login requests to $BASE_URL$ENDPOINT"
echo ""

for i in {1..7}; do
  echo "--- Request $i ---"

  response=$(curl -si -X POST "$BASE_URL$ENDPOINT" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "email=test@example.com&password=wrongpassword&csrfToken=test&callbackUrl=/&json=true")

  http_code=$(echo "$response" | grep -i "HTTP/" | head -1)
  rate_limit=$(echo "$response" | grep -i "x-ratelimit-limit:" || echo "No rate limit header")
  rate_remaining=$(echo "$response" | grep -i "x-ratelimit-remaining:" || echo "No remaining header")

  echo "Status: $http_code"
  echo "$rate_limit"
  echo "$rate_remaining"
  echo ""

  sleep 0.5
done

echo "✅ Test completed!"
