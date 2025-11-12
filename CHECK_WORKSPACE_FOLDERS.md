# Check Your Workspace Storage Folders

You have two workspace folders in workspaceStorage. Let's check what's in them:

## Check Folder Contents

Run these commands to see what's inside each folder:

```bash
# Check first folder (timestamp-based)
ls -laR ~/Library/Application\ Support/Cursor/User/workspaceStorage/1762986751689/

# Check second folder (hash-based)
ls -laR ~/Library/Application\ Support/Cursor/User/workspaceStorage/ab121924d1bd1a5c18c41e14c662f275/
```

## What to Look For

Look for files like:
- `workspace.json` - Workspace configuration
- `state.vscdb` - Workspace state database
- `*.json` files - May contain agent configurations
- Any files with "agent" in the name

## Find Which Folder Is Your Current Workspace

To find which folder corresponds to your current workspace:

1. **Note the current time** - The timestamp folder `1762986751689` might be from when you last opened Cursor
2. **Check modification dates** - The folder with the most recent modification is likely your active workspace
3. **Check folder contents** - The folder with more files/data is likely your main workspace

## Recover Agents

If you find agent-related files in either folder, you can:
1. Copy them to a safe location
2. Check their contents
3. Restore them if needed

Run the `ls -laR` commands above to see what's in each folder!
