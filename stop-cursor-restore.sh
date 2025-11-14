#!/bin/bash
# Script to prevent Cursor from auto-restoring previous session

echo "=========================================="
echo "Preventing Cursor Session Restore"
echo "=========================================="
echo ""
echo "This will clear Cursor's workspace storage so it can't restore the previous session."
echo ""
echo "IMPORTANT: Make sure Cursor is COMPLETELY QUIT (Cmd+Q) before running this!"
echo ""

read -p "Is Cursor completely quit? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please quit Cursor first (Cmd+Q), then run this script again."
    exit 1
fi

echo ""
echo "Clearing workspace storage..."
rm -rf ~/Library/Application\ Support/Cursor/User/workspaceStorage
echo "✓ Workspace storage cleared"

echo ""
echo "Clearing cache..."
rm -rf ~/Library/Application\ Support/Cursor/Cache
rm -rf ~/Library/Application\ Support/Cursor/CachedData
rm -rf ~/Library/Application\ Support/Cursor/Code\ Cache
rm -rf ~/Library/Application\ Support/Cursor/GPUCache
echo "✓ Cache cleared"

echo ""
echo "Clearing recent workspaces list..."
rm -f ~/Library/Application\ Support/Cursor/User/globalStorage/storage.json
rm -f ~/Library/Application\ Support/Cursor/User/globalStorage/storage.db
echo "✓ Recent workspaces cleared"

echo ""
echo "=========================================="
echo "✓ Done! Now:"
echo "1. Open Cursor"
echo "2. When it opens, immediately press Cmd+W to close any auto-opened windows"
echo "3. Go to File → Open Folder and manually select your workspace"
echo "=========================================="
