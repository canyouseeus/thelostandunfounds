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
  CHANGED_FILES=$(git diff --name-only HEAD^ HEAD 2>/dev/null)
else
  CHANGED_FILES=$(git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA 2>/dev/null)
fi

echo "Changed files:"
echo "$CHANGED_FILES"

# Safety net: if we can't determine changed files (shallow clone, missing SHA,
# etc.), BUILD anyway rather than silently skip. Skipping a legitimate preview
# is much worse than running an occasional unneeded build.
if [ -z "$CHANGED_FILES" ]; then
  echo "⚠️  Could not determine changed files. Proceeding with build as a safe default."
  exit 1
fi

# Define important patterns that SHOULD trigger a build.
# Any code that affects the deployed app or serverless functions belongs here.
#
# These are ANCHORED, and that matters. git diff --name-only prints paths
# relative to the repo root, so an unanchored "lib/" matches anywhere in a
# path — which meant every edit under microsites/lib/ contained the substring
# and triggered a full seven-minute rebuild of an app it cannot affect. Same
# for a nested index.html. The directory group needs a trailing slash so it
# matches a directory rather than a prefix, and the root-file group is pinned
# at both ends with its dots escaped so package.json cannot be matched by
# packageXjson or by some/nested/package.json.
#
# The flip side of anchoring: if this repo is ever restructured so the app
# lives under a prefix (apps/web/src/, say), these patterns stop matching and
# real changes get skipped. Update them at the same time as the move.
IMPORTANT_DIRS='^(src|public|scripts|api|lib|supabase)/'
IMPORTANT_ROOT_FILES='^(package\.json|package-lock\.json|vite\.config\.ts|tsconfig\.json|vercel\.json|tailwind\.config\.js|postcss\.config\.js|index\.html)$'

if echo "$CHANGED_FILES" | grep -qE "$IMPORTANT_DIRS|$IMPORTANT_ROOT_FILES"; then
  echo "✅ Important files changed. Proceeding with build."
  exit 1
fi

# If we get here, only non-essential files changed (like MD files, docs, etc.)
echo "🛑 Only documentation or non-essential files changed. Ignoring build."
exit 0
