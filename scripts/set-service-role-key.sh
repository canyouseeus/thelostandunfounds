#!/bin/bash
# Safely update SUPABASE_SERVICE_ROLE_KEY in .env.local
# Get the key from: https://supabase.com/dashboard/project/nonaqhllakrckbtbawrb/settings/api

ENV_FILE="$(dirname "$0")/../.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env.local not found at $ENV_FILE"
  exit 1
fi

echo ""
echo "Paste your Supabase service_role key (from Project Settings → API)."
echo "Input is hidden. Press Enter when done."
echo ""
read -rs -p "SUPABASE_SERVICE_ROLE_KEY: " KEY
echo ""

if [ -z "$KEY" ]; then
  echo "Error: No key entered. Aborting."
  exit 1
fi

# Replace the existing line in-place
sed -i '' "s|^SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=\"$KEY\"|" "$ENV_FILE"

echo "Done. Key updated in .env.local"
echo "(Restart the dev server for the change to take effect.)"
