#!/bin/bash

echo "🔍 Testing Login Rate Limiting AFTER FIX"
echo "=========================================="
echo ""
echo "Waiting 5 seconds for hot reload..."
sleep 5
echo ""

BASE_URL="http://localhost:3000"
# Test both endpoints
NEXTAUTH_ENDPOINT="/api/auth/callback/credentials"
SIGNIN_ENDPOINT="/api/auth/signin"

echo "Test 1: NextAuth Callback Endpoint"
echo "-----------------------------------"
for i in {1..7}; do
  echo -n "Request $i: "

  response=$(curl -s -w "HTTP_%{http_code}" \
    -X POST "$BASE_URL$NEXTAUTH_ENDPOINT" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "email=test@example.com&password=wrongpassword")

  http_code=$(echo "$response" | grep -o "HTTP_[0-9]*" | cut -d'_' -f2)

  if [ "$http_code" = "429" ]; then
    echo "❌ RATE LIMITED (429) ✅"
  else
    echo "✓ $http_code"
  fi

  sleep 0.3
done

echo ""
echo "Expected: First 5 should succeed, request 6-7 should be 429"
echo ""
echo "✅ Test completed!"
