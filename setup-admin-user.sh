#!/bin/bash

# Setup Admin User Script
# This script will help you create an admin user for thelostandunfounds.com

set -e

EMAIL="admin@thelostandunfounds.com"
SUPABASE_URL="https://nonaqhllakrckbtbawrb.supabase.co"

echo "🔐 Admin User Setup for THE LOST+UNFOUNDS"
echo "=========================================="
echo ""

# Step 1: Generate secure password
echo "Step 1: Generating secure password..."
PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)
echo "✅ Password generated: $PASSWORD"
echo ""
echo "📝 SAVE THIS PASSWORD NOW!"
echo "   Email: $EMAIL"
echo "   Password: $PASSWORD"
echo ""
read -p "Press Enter after you've saved the password..."

# Step 2: Check if Supabase CLI is available
echo ""
echo "Step 2: Checking Supabase CLI..."
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI found"
    SUPABASE_CLI=true
else
    echo "⚠️  Supabase CLI not found"
    echo "   We'll use the REST API instead"
    SUPABASE_CLI=false
fi

# Step 3: Get Supabase credentials
echo ""
echo "Step 3: Supabase Configuration"
echo "   URL: $SUPABASE_URL"
echo ""

# Check for .env.local
if [ -f ".env.local" ]; then
    echo "📄 Found .env.local"
    ANON_KEY=$(grep "VITE_SUPABASE_ANON_KEY" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    SERVICE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    
    if [ -z "$ANON_KEY" ]; then
        echo "⚠️  VITE_SUPABASE_ANON_KEY not found in .env.local"
        read -p "Enter your Supabase Anon Key: " ANON_KEY
    else
        echo "✅ Found Anon Key"
    fi
    
    if [ -z "$SERVICE_KEY" ]; then
        echo "⚠️  SUPABASE_SERVICE_ROLE_KEY not found in .env.local"
        echo "   We'll need this to create the user"
        read -p "Enter your Supabase Service Role Key: " SERVICE_KEY
    else
        echo "✅ Found Service Role Key"
    fi
else
    echo "⚠️  .env.local not found"
    read -p "Enter your Supabase Anon Key: " ANON_KEY
    read -p "Enter your Supabase Service Role Key: " SERVICE_KEY
fi

# Step 4: Create user via Supabase Admin API
echo ""
echo "Step 4: Creating admin user..."
echo "   Email: $EMAIL"
echo "   Password: [hidden]"
echo ""

# Use Supabase Admin API to create user
RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"email_confirm\": true,
    \"user_metadata\": {
      \"role\": \"admin\",
      \"is_admin\": true
    }
  }")

# Check if user was created
if echo "$RESPONSE" | grep -q "id"; then
    USER_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "✅ User created successfully!"
    echo "   User ID: $USER_ID"
else
    # Check if user already exists
    if echo "$RESPONSE" | grep -q "already registered\|User already registered"; then
        echo "⚠️  User already exists, fetching user ID..."
        USER_RESPONSE=$(curl -s -X GET "$SUPABASE_URL/auth/v1/admin/users?email=$EMAIL" \
          -H "apikey: $SERVICE_KEY" \
          -H "Authorization: Bearer $SERVICE_KEY")
        USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo "✅ Found existing user"
        echo "   User ID: $USER_ID"
        
        # Update password
        echo "   Updating password..."
        UPDATE_RESPONSE=$(curl -s -X PUT "$SUPABASE_URL/auth/v1/admin/users/$USER_ID" \
          -H "apikey: $SERVICE_KEY" \
          -H "Authorization: Bearer $SERVICE_KEY" \
          -H "Content-Type: application/json" \
          -d "{\"password\": \"$PASSWORD\"}")
        echo "✅ Password updated"
    else
        echo "❌ Error creating user:"
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
        exit 1
    fi
fi

# Step 5: Set user as admin in database
echo ""
echo "Step 5: Setting user as admin in database..."

# Create SQL file
SQL_FILE=$(mktemp)
cat > "$SQL_FILE" << EOF
-- Set admin@thelostandunfounds.com as admin
INSERT INTO user_roles (user_id, email, is_admin)
SELECT id, email, true
FROM auth.users
WHERE email = '$EMAIL'
ON CONFLICT (user_id) 
DO UPDATE SET is_admin = true, email = EXCLUDED.email;

-- Verify
SELECT 
  ur.user_id,
  ur.email,
  ur.is_admin,
  u.email as auth_email
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE ur.email = '$EMAIL' OR u.email = '$EMAIL';
EOF

echo "📄 SQL to run in Supabase SQL Editor:"
echo "======================================"
cat "$SQL_FILE"
echo ""
echo "======================================"
echo ""
echo "✅ Copy the SQL above and run it in Supabase SQL Editor"
echo ""
echo "📋 Summary:"
echo "   Email: $EMAIL"
echo "   Password: $PASSWORD"
echo "   User ID: $USER_ID"
echo ""
echo "🎉 Setup complete! You can now log in with these credentials."

# Cleanup
rm "$SQL_FILE"

