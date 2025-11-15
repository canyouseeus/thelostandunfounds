#!/bin/bash
# Set Vercel Environment Variables with Deployment Rules
# SCOT33 CLASSIC - Automated Environment Variable Setup

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/package.json" ]; then
  PROJECT_DIR="$SCRIPT_DIR"
else
  PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
fi

cd "$PROJECT_DIR"

echo "🔐 SCOT33 CLASSIC - Vercel Environment Variables Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
  echo "❌ Error: .env.local not found"
  echo "   Run: ./scripts/setup-supabase-env.sh first"
  exit 1
fi

# Extract values from .env.local
SUPABASE_URL=$(grep "^VITE_SUPABASE_URL=" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'")
SUPABASE_KEY=$(grep "^VITE_SUPABASE_ANON_KEY=" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'")

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "❌ Error: Could not find environment variables in .env.local"
  exit 1
fi

echo "📝 Environment Variables Found:"
echo "   VITE_SUPABASE_URL: $SUPABASE_URL"
echo "   VITE_SUPABASE_ANON_KEY: ${SUPABASE_KEY:0:30}..."
echo ""

# Check if project is linked
if ! npx vercel env ls &>/dev/null 2>&1; then
  echo "⚠️  Project not linked to Vercel. Linking now..."
  echo "   (You may need to authenticate)"
  npx vercel link --yes
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Setting Environment Variables with Deployment Rules"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📌 Deployment Rules:"
echo "   • Production: Applied to production deployments (main branch)"
echo "   • Preview: Applied to preview deployments (all branches/PRs)"
echo "   • Development: Applied to local development (vercel dev)"
echo ""
echo "⚠️  You'll be prompted to enter each value. Copy from above."
echo "   Press Enter to continue..."
read

# Set VITE_SUPABASE_URL for all environments
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Setting VITE_SUPABASE_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Value to paste: $SUPABASE_URL"
echo ""

echo "📝 Adding to Production..."
echo "$SUPABASE_URL" | npx vercel env add VITE_SUPABASE_URL production 2>&1 || echo "⚠️  Production: May already exist or need manual entry"

echo ""
echo "📝 Adding to Preview..."
echo "$SUPABASE_URL" | npx vercel env add VITE_SUPABASE_URL preview 2>&1 || echo "⚠️  Preview: May already exist or need manual entry"

echo ""
echo "📝 Adding to Development..."
echo "$SUPABASE_URL" | npx vercel env add VITE_SUPABASE_URL development 2>&1 || echo "⚠️  Development: May already exist or need manual entry"

# Set VITE_SUPABASE_ANON_KEY for all environments
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Setting VITE_SUPABASE_ANON_KEY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Value to paste: $SUPABASE_KEY"
echo ""

echo "📝 Adding to Production (sensitive)..."
echo "$SUPABASE_KEY" | npx vercel env add VITE_SUPABASE_ANON_KEY production --sensitive 2>&1 || echo "⚠️  Production: May already exist or need manual entry"

echo ""
echo "📝 Adding to Preview (sensitive)..."
echo "$SUPABASE_KEY" | npx vercel env add VITE_SUPABASE_ANON_KEY preview --sensitive 2>&1 || echo "⚠️  Preview: May already exist or need manual entry"

echo ""
echo "📝 Adding to Development (sensitive)..."
echo "$SUPABASE_KEY" | npx vercel env add VITE_SUPABASE_ANON_KEY development --sensitive 2>&1 || echo "⚠️  Development: May already exist or need manual entry"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Verifying environment variables..."
npx vercel env ls

echo ""
echo "🚀 Next Steps:"
echo "   1. Variables are set with deployment rules (Production, Preview, Development)"
echo "   2. New deployments will automatically use these variables"
echo "   3. To trigger a redeploy: npx vercel --prod"
echo "   4. Or push a commit to trigger automatic deployment"
echo ""
echo "💡 Deployment Rules Applied:"
echo "   ✅ Production: Main branch deployments"
echo "   ✅ Preview: All branch/PR deployments"
echo "   ✅ Development: Local vercel dev"
echo ""
