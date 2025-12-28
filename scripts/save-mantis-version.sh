#!/bin/bash
# Save a new version of MANTIS with auto-incrementing version numbers
# Usage: ./scripts/save-mantis-version.sh [message]
# Example: ./scripts/save-mantis-version.sh "Fixed admin dashboard errors"

set -e

cd "$(dirname "$0")/.."

# Get the commit message (optional)
COMMIT_MSG="${1:-Update MANTIS version}"

# Find the latest MANTIS version tag
LATEST_TAG=$(git tag -l "MANTIS-*" | sort -V | tail -1)

if [ -z "$LATEST_TAG" ]; then
  # No MANTIS version tags exist, start with 1.0.0
  NEW_VERSION="1.0.0"
  echo "🦗 No existing MANTIS versions found. Starting with MANTIS-1.0.0"
else
  # Extract version number and increment patch version
  VERSION_NUM=$(echo "$LATEST_TAG" | sed 's/MANTIS-//')
  MAJOR=$(echo "$VERSION_NUM" | cut -d. -f1)
  MINOR=$(echo "$VERSION_NUM" | cut -d. -f2)
  PATCH=$(echo "$VERSION_NUM" | cut -d. -f3)
  
  # Increment patch version
  PATCH=$((PATCH + 1))
  NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
  
  echo "📦 Latest MANTIS version: $LATEST_TAG"
  echo "🆕 New MANTIS version: MANTIS-${NEW_VERSION}"
fi

# Stage all changes
echo ""
echo "📝 Staging changes..."
git add -A

# Check if there are changes to commit
if git diff --staged --quiet; then
  echo "⚠️  No changes to commit. Creating tag only..."
else
  # Commit changes
  echo "💾 Committing changes..."
  git commit -m "MANTIS-${NEW_VERSION}: ${COMMIT_MSG}" || {
    echo "❌ Commit failed. Make sure you have changes to commit."
    exit 1
  }
fi

# Create version tag
echo "🏷️  Creating tag MANTIS-${NEW_VERSION}..."
git tag -a "MANTIS-${NEW_VERSION}" -m "MANTIS Version ${NEW_VERSION}: ${COMMIT_MSG}"

# Also update the base MANTIS tag to point to latest
echo "🔄 Updating MANTIS tag to latest version..."
git tag -d MANTIS 2>/dev/null || true
git tag -a MANTIS -m "MANTIS Latest: ${NEW_VERSION}" -f

echo ""
echo "✅ MANTIS-${NEW_VERSION} saved successfully!"
echo ""
echo "📋 Version Info:"
echo "   Tag: MANTIS-${NEW_VERSION}"
echo "   Commit: $(git rev-parse --short HEAD)"
echo ""
echo "🚀 To run this version:"
echo "   npm run dev:mantis"
echo ""
echo "📦 To checkout this specific version:"
echo "   git checkout MANTIS-${NEW_VERSION}"



