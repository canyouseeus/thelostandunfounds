#!/bin/bash
# Quick script to set Vercel environment variables
# Run this from the thelostandunfounds directory

set -e

echo "🔐 Setting Vercel Environment Variables"
echo ""
echo "This will set the Supabase credentials in Vercel."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Please run this script from the thelostandunfounds directory"
  exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
  echo "❌ Error: .env.local not found. Please run ./scripts/setup-supabase-env.sh first"
  exit 1
fi

# Extract values from .env.local
SUPABASE_URL=$(grep "^VITE_SUPABASE_URL=" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'")
SUPABASE_KEY=$(grep "^VITE_SUPABASE_ANON_KEY=" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'")

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "❌ Error: Could not find VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local"
  exit 1
fi

echo "📝 Found environment variables:"
echo "   VITE_SUPABASE_URL: $SUPABASE_URL"
echo "   VITE_SUPABASE_ANON_KEY: ${SUPABASE_KEY:0:20}..."
echo ""

# Check if project is linked
if ! npx vercel env ls &>/dev/null; then
  echo "⚠️  Project not linked to Vercel. Linking now..."
  echo "   (You may need to authenticate)"
  npx vercel link
fi

echo ""
echo "📝 Setting Vercel environment variables..."
echo ""
echo "⚠️  Note: Vercel CLI requires interactive input for env vars."
echo "   You'll be prompted to enter each value."
echo ""
echo "Press Enter to continue, or Ctrl+C to cancel..."
read

# Set VITE_SUPABASE_URL for all environments
echo ""
echo "📝 Setting VITE_SUPABASE_URL..."
echo "   When prompted, paste: $SUPABASE_URL"
echo ""
printf "%s\n" "$SUPABASE_URL" | npx vercel env add VITE_SUPABASE_URL production --force 2>&1 || {
  echo "⚠️  Failed to set for production, trying interactive mode..."
  echo "$SUPABASE_URL" | npx vercel env add VITE_SUPABASE_URL production
}

printf "%s\n" "$SUPABASE_URL" | npx vercel env add VITE_SUPABASE_URL preview --force 2>&1 || {
  echo "$SUPABASE_URL" | npx vercel env add VITE_SUPABASE_URL preview
}

printf "%s\n" "$SUPABASE_URL" | npx vercel env add VITE_SUPABASE_URL development --force 2>&1 || {
  echo "$SUPABASE_URL" | npx vercel env add VITE_SUPABASE_URL development
}

# Set VITE_SUPABASE_ANON_KEY for all environments
echo ""
echo "📝 Setting VITE_SUPABASE_ANON_KEY..."
echo "   When prompted, paste: ${SUPABASE_KEY:0:30}..."
echo ""
printf "%s\n" "$SUPABASE_KEY" | npx vercel env add VITE_SUPABASE_ANON_KEY production --force --sensitive 2>&1 || {
  echo "$SUPABASE_KEY" | npx vercel env add VITE_SUPABASE_ANON_KEY production --sensitive
}

printf "%s\n" "$SUPABASE_KEY" | npx vercel env add VITE_SUPABASE_ANON_KEY preview --force --sensitive 2>&1 || {
  echo "$SUPABASE_KEY" | npx vercel env add VITE_SUPABASE_ANON_KEY preview --sensitive
}

printf "%s\n" "$SUPABASE_KEY" | npx vercel env add VITE_SUPABASE_ANON_KEY development --force --sensitive 2>&1 || {
  echo "$SUPABASE_KEY" | npx vercel env add VITE_SUPABASE_ANON_KEY development --sensitive
}

echo ""
echo "✅ Environment variables set!"
echo ""
echo "📋 Current Vercel environment variables:"
npx vercel env ls

echo ""
echo "🚀 Next step: Redeploy your project"
echo "   Run: npx vercel --prod"
echo "   Or trigger a redeploy from the Vercel dashboard"

