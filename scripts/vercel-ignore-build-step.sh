#!/bin/bash

# Vercel Ignored Build Step Script
# This script determines if a build should proceed or be ignored.
#
# EXIT CODES:
# 1 (Failure): Build PROCEEDS (We want to build)
# 0 (Success): Build IGNORED (We skip the build)

echo "VERCEL_GIT_COMMIT_REF: $VERCEL_GIT_COMMIT_REF"

# Always build for main or master branch to ensure production is always up to date
if [[ "$VERCEL_GIT_COMMIT_REF" == "main" || "$VERCEL_GIT_COMMIT_REF" == "master" ]]; then
  echo "✅ Branch is main/master. Proceeding with build."
  exit 1
fi

# Get list of changed files
# VERCEL_GIT_PREVIOUS_SHA is not always available on first build, so fallback to HEAD^
if [ -z "$VERCEL_GIT_PREVIOUS_SHA" ]; then
  CHANGED_FILES=$(git diff --name-only HEAD^ HEAD)
else
  CHANGED_FILES=$(git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA)
fi

echo "Changed files:"
echo "$CHANGED_FILES"

# Define important patterns that SHOULD trigger a build
# If any file matches these, we build (exit 1)
IMPORTANT_PATTERNS="src/|public/|scripts/|package.json|vite.config.ts|tsconfig.json|vercel.json|tailwind.config.js|postcss.config.js|index.html"

if echo "$CHANGED_FILES" | grep -qE "$IMPORTANT_PATTERNS"; then
  echo "✅ Important files changed. Proceeding with build."
  exit 1
fi

# If we get here, only non-essential files changed (like MD files, docs, etc.)
echo "🛑 Only documentation or non-essential files changed. Ignoring build."
exit 0
