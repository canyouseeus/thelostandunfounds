#!/bin/bash

# Security Monitoring System - Agent Initialization Script
# This script helps initialize the security monitoring system for www.thelostandunfounds.com

set -e

echo "🔐 Security Monitoring System Initialization"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run this script from the thelostandunfounds directory.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found project directory${NC}"
echo ""

# Step 1: Run npm audit
echo "Step 1: Running dependency security audit..."
npm audit --audit-level=moderate || {
    echo -e "${YELLOW}⚠️  npm audit found vulnerabilities. Review the output above.${NC}"
}
echo ""

# Step 2: Check for exposed secrets
echo "Step 2: Scanning for exposed secrets..."
SECRETS_FOUND=0

if grep -r "SUPABASE_SERVICE_ROLE_KEY" src/ 2>/dev/null; then
    echo -e "${RED}❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY found in source code!${NC}"
    SECRETS_FOUND=1
fi

if grep -r "TURNSTILE_SECRET_KEY" src/ 2>/dev/null; then
    echo -e "${RED}❌ CRITICAL: TURNSTILE_SECRET_KEY found in source code!${NC}"
    SECRETS_FOUND=1
fi

if grep -r "sk-" src/ 2>/dev/null | grep -v "node_modules"; then
    echo -e "${RED}❌ CRITICAL: Potential Supabase service keys found in source code!${NC}"
    SECRETS_FOUND=1
fi

if [ $SECRETS_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ No exposed secrets found in source code${NC}"
fi
echo ""

# Step 3: Check environment variables setup
echo "Step 3: Checking environment variable configuration..."
if [ -f ".env.local" ] || [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file found. Make sure it's in .gitignore!${NC}"
    if grep -q ".env" .gitignore 2>/dev/null; then
        echo -e "${GREEN}✅ .env is in .gitignore${NC}"
    else
        echo -e "${RED}❌ WARNING: .env not in .gitignore!${NC}"
    fi
else
    echo -e "${GREEN}✅ No .env file in repository (good for security)${NC}"
fi
echo ""

# Step 4: Check for security documentation
echo "Step 4: Verifying security documentation..."
if [ -f "SECURITY_MONITORING_SYSTEM.md" ]; then
    echo -e "${GREEN}✅ Security monitoring system documentation found${NC}"
else
    echo -e "${YELLOW}⚠️  SECURITY_MONITORING_SYSTEM.md not found${NC}"
fi

if [ -f "SECURITY_QUICK_START.md" ]; then
    echo -e "${GREEN}✅ Security quick start guide found${NC}"
else
    echo -e "${YELLOW}⚠️  SECURITY_QUICK_START.md not found${NC}"
fi
echo ""

# Step 5: Check Supabase configuration
echo "Step 5: Checking Supabase configuration..."
if grep -q "VITE_SUPABASE_URL" src/ 2>/dev/null || grep -q "SUPABASE_URL" src/ 2>/dev/null; then
    echo -e "${GREEN}✅ Supabase configuration found${NC}"
    
    # Check if service role key might be exposed
    if grep -r "VITE_SUPABASE_SERVICE_ROLE_KEY" src/ 2>/dev/null; then
        echo -e "${RED}❌ CRITICAL: Service role key in VITE_ variable (will be exposed to client)!${NC}"
    else
        echo -e "${GREEN}✅ No service role key in VITE_ variables${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Supabase configuration not found in source${NC}"
fi
echo ""

# Step 6: Check Cloudflare Turnstile configuration
echo "Step 6: Checking Cloudflare Turnstile configuration..."
if grep -q "VITE_TURNSTILE_SITE_KEY" src/ 2>/dev/null; then
    echo -e "${GREEN}✅ Turnstile site key configuration found${NC}"
    
    # Check if secret key might be exposed
    if grep -r "VITE_TURNSTILE_SECRET_KEY" src/ 2>/dev/null; then
        echo -e "${RED}❌ CRITICAL: Turnstile secret key in VITE_ variable (will be exposed to client)!${NC}"
    else
        echo -e "${GREEN}✅ No Turnstile secret key in VITE_ variables${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Turnstile configuration not found${NC}"
fi
echo ""

# Step 7: Generate initial security report
echo "Step 7: Generating initial security report..."
REPORT_FILE="security-initial-report-$(date +%Y%m%d-%H%M%S).md"

cat > "$REPORT_FILE" << EOF
# Initial Security Report - $(date)

## System Information
- Project: thelostandunfounds
- Domain: www.thelostandunfounds.com
- Report Generated: $(date)

## Dependency Security
\`\`\`
$(npm audit --json 2>/dev/null | head -20 || echo "npm audit output")
\`\`\`

## Secret Exposure Check
- Service Role Keys: $(if grep -r "SUPABASE_SERVICE_ROLE_KEY" src/ 2>/dev/null; then echo "❌ FOUND"; else echo "✅ Not found"; fi)
- Turnstile Secrets: $(if grep -r "TURNSTILE_SECRET_KEY" src/ 2>/dev/null; then echo "❌ FOUND"; else echo "✅ Not found"; fi)

## Environment Variables
- .env file in repo: $(if [ -f ".env" ] || [ -f ".env.local" ]; then echo "⚠️  Found"; else echo "✅ Not found"; fi)
- .env in .gitignore: $(if grep -q ".env" .gitignore 2>/dev/null; then echo "✅ Yes"; else echo "❌ No"; fi)

## Next Steps
1. Review npm audit output
2. Address any CRITICAL findings immediately
3. Set up automated security monitoring
4. Configure security agents as per SECURITY_MONITORING_SYSTEM.md

EOF

echo -e "${GREEN}✅ Initial security report generated: $REPORT_FILE${NC}"
echo ""

# Summary
echo "=============================================="
echo "Initialization Complete!"
echo ""
echo "Next Steps:"
echo "1. Review the security report: $REPORT_FILE"
echo "2. Read SECURITY_MONITORING_SYSTEM.md for full system setup"
echo "3. Deploy security agents as described in SECURITY_QUICK_START.md"
echo "4. Set up automated monitoring"
echo ""
echo -e "${GREEN}🔐 Security monitoring system ready for deployment!${NC}"


