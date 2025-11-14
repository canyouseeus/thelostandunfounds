# Recovering Cursor Agents After Cache Clear

## What Happened

The cache clear commands removed Cursor's storage, which may have included agent configurations. However, agents are typically stored in different locations.

## Check if Agents Can Be Recovered

### 1. Check Time Machine Backup (if enabled)

If you have Time Machine backups, you might be able to recover:

```bash
# Check if Time Machine has a backup of Cursor's Application Support folder
tmutil listbackups | grep -i cursor
```

If Time Machine is enabled, you can restore from:
`~/Library/Application Support/Cursor/`

### 2. Check if Agents Are Stored Elsewhere

Agents might be stored in:
- `~/Library/Application Support/Cursor/User/globalStorage/` (we may have cleared this)
- `~/Library/Application Support/Cursor/User/settings.json` (should still exist)
- Workspace-specific settings in your project folder

### 3. Check Your Project Folder

Agents might be configured in your workspace:
- `.cursorrules` files
- `.cursor/` directory
- Project-specific settings

## What We Should Have Done Instead

Instead of clearing everything, we should have only cleared:
- `workspaceStorage` (session restore)
- Cache directories only

## Next Steps

1. **Check if agents are in your workspace files** - Look for `.cursorrules` files
2. **Check Cursor settings** - Open Cursor → Settings and see if agent settings are still there
3. **Restore from Time Machine** if available
4. **Reconfigure agents** - You may need to set them up again

## More Targeted Cache Clear (For Future)

If you need to clear cache again without losing agents:

```bash
# Only clear session restore (safe)
rm -rf ~/Library/Application\ Support/Cursor/User/workspaceStorage

# Only clear cache (safe)
rm -rf ~/Library/Application\ Support/Cursor/Cache
rm -rf ~/Library/Application\ Support/Cursor/CachedData
rm -rf ~/Library/Application\ Support/Cursor/Code\ Cache
rm -rf ~/Library/Application\ Support/Cursor/GPUCache

# DO NOT clear globalStorage unless you're sure
```

## Check What's Left

Run this to see what Cursor folders still exist:

```bash
ls -la ~/Library/Application\ Support/Cursor/User/
```

This will show what survived the clear.
