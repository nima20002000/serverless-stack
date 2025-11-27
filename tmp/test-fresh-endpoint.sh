#!/bin/bash

echo "🔍 Testing a DIFFERENT endpoint (should have fresh rate limit)"
echo "=============================================================="
echo ""

BASE_URL="http://localhost:3000"
ENDPOINT="/api/auth/signin"

echo "Testing /api/auth/signin (GET request for CSRF token)"
echo ""

for i in {1..7}; do
  echo -n "Request $i: "

  # Use GET instead of POST to avoid triggering auth
  response=$(curl -si "$BASE_URL$ENDPOINT" 2>&1)

  http_code=$(echo "$response" | grep "HTTP/" | head -1 | awk '{print $2}')
  rate_remaining=$(echo "$response" | grep -i "x-ratelimit-remaining:" | awk '{print $2}' | tr -d '\r')

  if [ "$http_code" = "429" ]; then
    echo "❌ RATE LIMITED (429)"
  else
    echo "✓ $http_code (Remaining: $rate_remaining)"
  fi

  sleep 0.3
done

echo ""
echo "Expected: Should show countdown from 4 to 0, then 429"
