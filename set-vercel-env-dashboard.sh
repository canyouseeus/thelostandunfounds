#!/bin/bash
# Alternative: Set Vercel environment variables via dashboard
# This script provides the values and opens the Vercel dashboard

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# If script is in thelostandunfounds directory, use it; otherwise go up one level
if [ -f "$SCRIPT_DIR/package.json" ]; then
  PROJECT_DIR="$SCRIPT_DIR"
else
  PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
fi

cd "$PROJECT_DIR"
echo "📁 Working directory: $PROJECT_DIR"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
  echo "❌ Error: .env.local not found"
  exit 1
fi

# Extract values from .env.local
SUPABASE_URL=$(grep "^VITE_SUPABASE_URL=" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'")
SUPABASE_KEY=$(grep "^VITE_SUPABASE_ANON_KEY=" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'")

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "❌ Error: Could not find environment variables in .env.local"
  exit 1
fi

echo "🔐 Vercel Environment Variables Setup"
echo ""
echo "📋 Copy these values to Vercel Dashboard:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Variable 1:"
echo "  Key: VITE_SUPABASE_URL"
echo "  Value: $SUPABASE_URL"
echo "  Environments: Production, Preview, Development"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Variable 2:"
echo "  Key: VITE_SUPABASE_ANON_KEY"
echo "  Value: $SUPABASE_KEY"
echo "  Environments: Production, Preview, Development"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Try to open Vercel dashboard
VERCEL_DASHBOARD_URL="https://vercel.com/joshua-greenes-projects/thelostandunfounds/settings/environment-variables"

if command -v open &> /dev/null; then
  echo "🌐 Opening Vercel dashboard..."
  open "$VERCEL_DASHBOARD_URL"
elif command -v xdg-open &> /dev/null; then
  echo "🌐 Opening Vercel dashboard..."
  xdg-open "$VERCEL_DASHBOARD_URL"
else
  echo "🌐 Open this URL in your browser:"
  echo "   $VERCEL_DASHBOARD_URL"
fi

echo ""
echo "📝 Instructions:"
echo "   1. Click 'Add New' for each variable"
echo "   2. Paste the Key and Value from above"
echo "   3. Select all environments (Production, Preview, Development)"
echo "   4. Click 'Save'"
echo "   5. Redeploy your project"
echo ""

