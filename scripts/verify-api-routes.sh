#!/bin/bash

# Script to verify all API routes have 'export const dynamic' declaration
# This prevents Vercel build failures for routes requiring dynamic rendering

echo "🔍 Checking API routes for dynamic export..."
echo ""

MISSING_ROUTES=()
TOTAL_ROUTES=0

# Find all route.ts files in src/app/api
while IFS= read -r file; do
  TOTAL_ROUTES=$((TOTAL_ROUTES + 1))

  if ! grep -q "export const dynamic" "$file"; then
    MISSING_ROUTES+=("$file")
  fi
done < <(find src/app/api -name "route.ts" -type f)

echo "Total API routes found: $TOTAL_ROUTES"
echo ""

if [ ${#MISSING_ROUTES[@]} -eq 0 ]; then
  echo "✅ All API routes have 'export const dynamic' declaration!"
  echo ""
  echo "Build should succeed on Vercel."
  exit 0
else
  echo "❌ Found ${#MISSING_ROUTES[@]} route(s) missing 'export const dynamic':"
  echo ""
  for route in "${MISSING_ROUTES[@]}"; do
    echo "  - $route"
  done
  echo ""
  echo "Add this line after imports in each file:"
  echo "  export const dynamic = 'force-dynamic';"
  echo ""
  exit 1
fi
