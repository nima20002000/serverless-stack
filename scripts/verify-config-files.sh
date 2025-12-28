#!/bin/bash

# Script to verify critical config files are not symlinks
# Symlinks cause webpack runtime errors: "Cannot read properties of undefined (reading 'call')"
# Next.js/webpack doesn't reliably resolve symlinks for config files during HMR

echo "🔍 Verifying config files are not symlinks..."
echo ""

CRITICAL_FILES=(
  "postcss.config.js"
  "tailwind.config.ts"
  "next.config.js"
  "tsconfig.json"
  "package.json"
)

SYMLINK_FILES=()
MISSING_FILES=()

for file in "${CRITICAL_FILES[@]}"; do
  if [ -L "$file" ]; then
    SYMLINK_FILES+=("$file")
  elif [ ! -f "$file" ]; then
    MISSING_FILES+=("$file")
  fi
done

# Report results
if [ ${#SYMLINK_FILES[@]} -gt 0 ]; then
  echo "❌ Found symlinked config files (will cause webpack runtime errors):"
  echo ""
  for file in "${SYMLINK_FILES[@]}"; do
    target=$(readlink "$file")
    echo "  - $file -> $target"
  done
  echo ""
  echo "Fix: Replace symlinks with actual files:"
  echo "  rm <symlink> && cp <target> <symlink>"
  echo ""
  exit 1
fi

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
  echo "⚠️  Missing config files (may cause build issues):"
  for file in "${MISSING_FILES[@]}"; do
    echo "  - $file"
  done
  echo ""
fi

echo "✅ All critical config files are regular files (not symlinks)"
echo ""
exit 0
