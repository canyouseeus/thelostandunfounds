#!/bin/bash
# Environment Variables Validation Script
# Checks all required environment variables are set correctly
# Usage: ./scripts/validate-env.sh [--local|--vercel|--all]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validation functions
validate_url() {
  local value=$1
  [[ $value =~ ^https?:// ]] && return 0 || return 1
}

validate_supabase_key() {
  local value=$1
  [[ $value =~ ^sb_publishable_ ]] || [[ $value =~ ^eyJ ]] && return 0 || return 1
}

validate_turnstile_key() {
  local value=$1
  [[ $value =~ ^0x ]] || [[ ${#value} -gt 10 ]] && return 0 || return 1
}

validate_openai_key() {
  local value=$1
  [[ $value =~ ^sk- ]] && return 0 || return 1
}

validate_telegram_token() {
  local value=$1
  [[ $value =~ : ]] && [[ ${#value} -gt 20 ]] && return 0 || return 1
}

# Check local .env.local file
check_local_env() {
  echo -e "${BLUE}📋 Checking local .env.local file...${NC}"
  echo ""
  
  if [ ! -f .env.local ]; then
    echo -e "${RED}❌ .env.local file not found!${NC}"
    echo "   Run: ./scripts/setup-supabase-env.sh"
    return 1
  fi
  
  local errors=0
  local warnings=0
  
  # Required variables
  if grep -q "^VITE_SUPABASE_URL=" .env.local; then
    SUPABASE_URL=$(grep "^VITE_SUPABASE_URL=" .env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    if [ -z "$SUPABASE_URL" ] || [ "$SUPABASE_URL" = "your_supabase_url_here" ] || [ "$SUPABASE_URL" = "YOUR_KEY_HERE" ]; then
      echo -e "${RED}❌ VITE_SUPABASE_URL is not set or has placeholder value${NC}"
      errors=$((errors + 1))
    elif ! validate_url "$SUPABASE_URL"; then
      echo -e "${RED}❌ VITE_SUPABASE_URL has invalid format${NC}"
      errors=$((errors + 1))
    else
      echo -e "${GREEN}✅ VITE_SUPABASE_URL is set${NC}"
    fi
  else
    echo -e "${RED}❌ VITE_SUPABASE_URL is missing${NC}"
    errors=$((errors + 1))
  fi
  
  if grep -q "^VITE_SUPABASE_ANON_KEY=" .env.local; then
    SUPABASE_KEY=$(grep "^VITE_SUPABASE_ANON_KEY=" .env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    if [ -z "$SUPABASE_KEY" ] || [ "$SUPABASE_KEY" = "your_supabase_anon_key_here" ] || [ "$SUPABASE_KEY" = "YOUR_KEY_HERE" ]; then
      echo -e "${RED}❌ VITE_SUPABASE_ANON_KEY is not set or has placeholder value${NC}"
      errors=$((errors + 1))
    elif ! validate_supabase_key "$SUPABASE_KEY"; then
      echo -e "${RED}❌ VITE_SUPABASE_ANON_KEY has invalid format${NC}"
      errors=$((errors + 1))
    else
      echo -e "${GREEN}✅ VITE_SUPABASE_ANON_KEY is set${NC}"
    fi
  else
    echo -e "${RED}❌ VITE_SUPABASE_ANON_KEY is missing${NC}"
    errors=$((errors + 1))
  fi
  
  # Optional variables (warnings only)
  if grep -q "^VITE_TURNSTILE_SITE_KEY=" .env.local; then
    TURNSTILE_KEY=$(grep "^VITE_TURNSTILE_SITE_KEY=" .env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    if [ -z "$TURNSTILE_KEY" ] || [ "$TURNSTILE_KEY" = "your_turnstile_site_key_here" ]; then
      echo -e "${YELLOW}⚠️  VITE_TURNSTILE_SITE_KEY is not set (optional)${NC}"
      warnings=$((warnings + 1))
    elif ! validate_turnstile_key "$TURNSTILE_KEY"; then
      echo -e "${YELLOW}⚠️  VITE_TURNSTILE_SITE_KEY has invalid format${NC}"
      warnings=$((warnings + 1))
    else
      echo -e "${GREEN}✅ VITE_TURNSTILE_SITE_KEY is set${NC}"
    fi
  fi
  
  echo ""
  if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
    echo -e "${GREEN}✅ All required environment variables are set correctly!${NC}"
    return 0
  elif [ $errors -eq 0 ]; then
    echo -e "${YELLOW}⚠️  All required variables are set, but some optional variables are missing${NC}"
    return 0
  else
    echo -e "${RED}❌ Found $errors error(s)${NC}"
    return 1
  fi
}

# Check Vercel environment variables
check_vercel_env() {
  echo -e "${BLUE}📋 Checking Vercel environment variables...${NC}"
  echo ""
  
  # Check if Vercel CLI is available
  if command -v vercel &> /dev/null; then
    VERCEL_CMD="vercel"
  elif command -v npx &> /dev/null; then
    VERCEL_CMD="npx vercel"
  else
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Install with: npm install -g vercel${NC}"
    echo -e "${YELLOW}   Or use: npx vercel${NC}"
    return 1
  fi
  
  # Check if logged in
  if ! $VERCEL_CMD whoami &>/dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Vercel. Run: $VERCEL_CMD login${NC}"
    return 1
  fi
  
  # Get environment variables
  local env_vars=$($VERCEL_CMD env ls 2>/dev/null || echo "")
  
  if [ -z "$env_vars" ]; then
    echo -e "${RED}❌ Could not retrieve Vercel environment variables${NC}"
    return 1
  fi
  
  local errors=0
  
  # Check required variables
  if echo "$env_vars" | grep -q "VITE_SUPABASE_URL"; then
    echo -e "${GREEN}✅ VITE_SUPABASE_URL is set in Vercel${NC}"
  else
    echo -e "${RED}❌ VITE_SUPABASE_URL is missing in Vercel${NC}"
    errors=$((errors + 1))
  fi
  
  if echo "$env_vars" | grep -q "VITE_SUPABASE_ANON_KEY"; then
    echo -e "${GREEN}✅ VITE_SUPABASE_ANON_KEY is set in Vercel${NC}"
  else
    echo -e "${RED}❌ VITE_SUPABASE_ANON_KEY is missing in Vercel${NC}"
    errors=$((errors + 1))
  fi
  
  echo ""
  if [ $errors -eq 0 ]; then
    echo -e "${GREEN}✅ All required Vercel environment variables are set!${NC}"
    return 0
  else
    echo -e "${RED}❌ Found $errors missing variable(s) in Vercel${NC}"
    return 1
  fi
}

# Main
MODE=${1:-"--all"}

case $MODE in
  --local)
    check_local_env
    ;;
  --vercel)
    check_vercel_env
    ;;
  --all)
    echo -e "${BLUE}🔍 Validating Environment Variables${NC}"
    echo ""
    check_local_env
    LOCAL_STATUS=$?
    echo ""
    check_vercel_env
    VERCEL_STATUS=$?
    echo ""
    if [ $LOCAL_STATUS -eq 0 ] && [ $VERCEL_STATUS -eq 0 ]; then
      echo -e "${GREEN}✅ All environment variables are configured correctly!${NC}"
      exit 0
    else
      echo -e "${RED}❌ Some environment variables need attention${NC}"
      exit 1
    fi
    ;;
  *)
    echo "Usage: $0 [--local|--vercel|--all]"
    echo ""
    echo "Options:"
    echo "  --local   Check only local .env.local file"
    echo "  --vercel  Check only Vercel environment variables"
    echo "  --all     Check both local and Vercel (default)"
    exit 1
    ;;
esac

