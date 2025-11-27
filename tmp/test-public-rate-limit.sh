#!/bin/bash

echo "🧪 Testing Public Endpoint Rate Limiting (publicLimiter: 1000 req / min)"
echo "========================================================================"
echo ""

BASE_URL="http://localhost:3000"
ENDPOINT="/api/products"

echo "Sending 10 requests to $BASE_URL$ENDPOINT"
echo "(Should all succeed since limit is 1000/min)"
echo ""

success_count=0
for i in {1..10}; do
  response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X GET "$BASE_URL$ENDPOINT")

  http_code=$(echo "$response" | grep "HTTP_STATUS:" | cut -d':' -f2)

  if [ "$http_code" = "200" ]; then
    ((success_count++))
    echo "Request $i: ✅ $http_code"
  else
    echo "Request $i: ❌ $http_code"
  fi
done

echo ""
echo "Results: $success_count/10 requests succeeded"
echo ""

# Check headers on one request
echo "Checking rate limit headers:"
curl -s -I "$BASE_URL$ENDPOINT" | grep -i "x-ratelimit"

echo ""
echo "✅ Test completed!"
