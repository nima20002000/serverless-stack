#!/bin/bash

echo "🔍 Testing Single Request - Full Response Headers"
echo "=================================================="
echo ""

BASE_URL="http://localhost:3000"
ENDPOINT="/api/auth/register"

echo "Making ONE request and showing ALL response headers:"
echo ""

curl -i -X POST "$BASE_URL$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"email":"singletest@example.com","password":"12345678","name":"Single Test"}'

echo ""
echo "✅ Done!"
