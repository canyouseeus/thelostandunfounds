#!/bin/bash

# Script to fix Homebrew Node.js linking permissions
# Run this script on your MacBook Pro to fix the permission error

echo "Fixing Homebrew Node.js linking permissions..."
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "Error: This script is designed for macOS only."
    exit 1
fi

# Get the current user
CURRENT_USER=$(whoami)

echo "Current user: $CURRENT_USER"
echo ""

# Fix ownership of /usr/local directories
echo "Fixing ownership of /usr/local directories..."
sudo chown -R "$CURRENT_USER:admin" /usr/local/include
sudo chown -R "$CURRENT_USER:admin" /usr/local/lib
sudo chown -R "$CURRENT_USER:admin" /usr/local/bin
sudo chown -R "$CURRENT_USER:admin" /usr/local/share

# Fix permissions
echo "Fixing permissions..."
sudo chmod -R u+w /usr/local/include
sudo chmod -R u+w /usr/local/lib
sudo chmod -R u+w /usr/local/bin
sudo chmod -R u+w /usr/local/share

echo ""
echo "Permissions fixed! Now try running: brew link node"
echo ""
