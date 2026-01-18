#!/bin/bash

# Define paths
ENV_FILE=".env"
MCP_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

echo "=============================================="
echo "  PAYPAL CLIENT ID CHECK"
echo "=============================================="

# 1. Check Local Project .env
echo ""
echo "📂 Checking Local Project (.env):"
if [ -f "$ENV_FILE" ]; then
    LOCAL_ID=$(grep "PAYPAL_CLIENT_ID" "$ENV_FILE" | cut -d '=' -f2)
    if [ -n "$LOCAL_ID" ]; then
        echo "   ✅ Found: $LOCAL_ID"
    else
        echo "   ❌ Not found or empty."
    fi
else
    echo "   ❌ .env file missing in current directory."
fi

# 2. Check MCP Configuration
echo ""
echo "🤖 Checking MCP Config ($MCP_CONFIG):"
if [ -f "$MCP_CONFIG" ]; then
    # Simple grep to find the line with PAYPAL_CLIENT_ID
    # We use grep context to try and find it specifically for paypal-mcp-server if possible, 
    # but a simple grep is safer/easier for a quick check.
    MCP_ID_LINE=$(grep "PAYPAL_CLIENT_ID" "$MCP_CONFIG")
    
    if [ -n "$MCP_ID_LINE" ]; then
        # clean up the line to just show the value roughly
        echo "   ✅ Found entry:"
        echo "      $MCP_ID_LINE"
    else
        echo "   ❌ 'PAYPAL_CLIENT_ID' not found in config file."
    fi
else
    echo "   ❌ Config file not found at default location."
fi

echo ""
echo "=============================================="
