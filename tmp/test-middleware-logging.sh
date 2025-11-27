#!/bin/bash

echo "🔍 Testing if middleware is being called for auth routes"
echo "========================================================="
echo ""

# Add a simple console.log test to see if middleware runs

echo "Test 1: /api/auth/register (custom route)"
curl -s -w "\nHTTP: %{http_code}\n" \
  -X POST "http://localhost:3000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"middlewaretest@example.com","password":"12345678","name":"Test"}' \
  | head -3

echo ""
echo "Test 2: /api/auth/callback/credentials (NextAuth route)"
curl -s -w "\nHTTP: %{http_code}\n" \
  -X POST "http://localhost:3000/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=test@example.com&password=test" \
  | head -3

echo ""
echo "Test 3: /api/products (public route)"
curl -s -w "\nHTTP: %{http_code}\n" \
  -X GET "http://localhost:3000/api/products" \
  | head -3

echo ""
echo "Check dev server logs for middleware console output"
