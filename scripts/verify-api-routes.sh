#!/bin/bash

# Script to verify all API routes and Server Component pages have 'export const dynamic' declaration
# This prevents Vercel build failures for routes requiring dynamic rendering

echo "🔍 Verifying dynamic exports..."
echo ""

MISSING_ROUTES=()
MISSING_PAGES=()
TOTAL_ROUTES=0
TOTAL_PAGES=0

# Check all API route.ts files
while IFS= read -r file; do
  TOTAL_ROUTES=$((TOTAL_ROUTES + 1))
  if ! grep -q "export const dynamic" "$file"; then
    MISSING_ROUTES+=("$file")
  fi
done < <(find src/app/api -name "route.ts" -type f)

# Check Server Component pages with dynamic params (pages in [param] folders)
# Exclude client components (files with 'use client')
while IFS= read -r file; do
  # Skip client components
  if grep -q "^'use client'" "$file" || grep -q '^"use client"' "$file"; then
    continue
  fi

  TOTAL_PAGES=$((TOTAL_PAGES + 1))
  if ! grep -q "export const dynamic" "$file"; then
    MISSING_PAGES+=("$file")
  fi
done < <(find src/app -name "page.tsx" -path "*/\[*\]/*" -type f)

echo "API routes checked: $TOTAL_ROUTES"
echo "Server Component pages checked: $TOTAL_PAGES"
echo ""

TOTAL_MISSING=$((${#MISSING_ROUTES[@]} + ${#MISSING_PAGES[@]}))

if [ $TOTAL_MISSING -eq 0 ]; then
  echo "✅ All routes have 'export const dynamic' declaration!"
  echo ""
  echo "Build should succeed on Vercel."
  exit 0
else
  echo "❌ Found $TOTAL_MISSING file(s) missing 'export const dynamic':"
  echo ""

  if [ ${#MISSING_ROUTES[@]} -gt 0 ]; then
    echo "API Routes:"
    for route in "${MISSING_ROUTES[@]}"; do
      echo "  - $route"
    done
    echo ""
  fi

  if [ ${#MISSING_PAGES[@]} -gt 0 ]; then
    echo "Server Component Pages:"
    for page in "${MISSING_PAGES[@]}"; do
      echo "  - $page"
    done
    echo ""
  fi

  echo "Add this line after imports in each file:"
  echo "  export const dynamic = 'force-dynamic';"
  echo ""
  exit 1
fi
