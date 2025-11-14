#!/bin/bash

# Setup Environment Variables Script
# This script helps you set up your .env.local file

ENV_FILE=".env.local"
EXAMPLE_FILE=".env.example"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up environment variables...${NC}\n"

# Create .env.local from .env.example if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$EXAMPLE_FILE" ]; then
        cp "$EXAMPLE_FILE" "$ENV_FILE"
        echo -e "${GREEN}Created $ENV_FILE from $EXAMPLE_FILE${NC}\n"
    else
        touch "$ENV_FILE"
        echo -e "${YELLOW}Created empty $ENV_FILE${NC}\n"
    fi
fi

# Function to set or update an environment variable
set_env_var() {
    local key=$1
    local value=$2
    local file=$ENV_FILE
    
    # Check if key already exists
    if grep -q "^${key}=" "$file" 2>/dev/null; then
        # Update existing key (works on both Linux and macOS)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
        else
            # Linux
            sed -i "s|^${key}=.*|${key}=${value}|" "$file"
        fi
        echo -e "${GREEN}Updated ${key}${NC}"
    else
        # Add new key
        echo "${key}=${value}" >> "$file"
        echo -e "${GREEN}Added ${key}${NC}"
    fi
}

# Interactive setup
echo "Enter your environment variables (press Enter to skip and keep existing values):"
echo ""

# Supabase URL
read -p "Supabase URL [VITE_SUPABASE_URL]: " supabase_url
if [ ! -z "$supabase_url" ]; then
    set_env_var "VITE_SUPABASE_URL" "$supabase_url"
fi

# Supabase Anon Key
read -p "Supabase Anon Key [VITE_SUPABASE_ANON_KEY]: " supabase_anon_key
if [ ! -z "$supabase_anon_key" ]; then
    set_env_var "VITE_SUPABASE_ANON_KEY" "$supabase_anon_key"
fi

# Supabase Service Role Key (for server-side)
read -p "Supabase Service Role Key [SUPABASE_SERVICE_ROLE_KEY] (optional): " supabase_service_key
if [ ! -z "$supabase_service_key" ]; then
    set_env_var "SUPABASE_SERVICE_ROLE_KEY" "$supabase_service_key"
fi

# Turnstile Site Key
read -p "Cloudflare Turnstile Site Key [VITE_TURNSTILE_SITE_KEY] (optional): " turnstile_key
if [ ! -z "$turnstile_key" ]; then
    set_env_var "VITE_TURNSTILE_SITE_KEY" "$turnstile_key"
fi

echo ""
echo -e "${GREEN}Environment variables set in $ENV_FILE${NC}"
echo -e "${YELLOW}Note: Make sure $ENV_FILE is in your .gitignore${NC}\n"
