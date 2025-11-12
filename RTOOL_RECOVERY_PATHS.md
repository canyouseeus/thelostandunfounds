# Full Paths for R-Tool Recovery

## Main Workspace Storage Directory

```
/Users/canyouseeus/Library/Application Support/Cursor/User/workspaceStorage/
```

## Existing Workspace Folders

### Folder 1 (Timestamp-based)
```
/Users/canyouseeus/Library/Application Support/Cursor/User/workspaceStorage/1762986751689/
```

### Folder 2 (Hash-based)
```
/Users/canyouseeus/Library/Application Support/Cursor/User/workspaceStorage/ab121924d1bd1a5c18c41e14c662f275/
```

## For R-Tool Recovery

### Option 1: Scan the Parent Directory
Scan this directory for deleted files:
```
/Users/canyouseeus/Library/Application Support/Cursor/User/workspaceStorage/
```

This will find any deleted workspace folders that were in this location.

### Option 2: Scan the Entire Cursor User Directory
For a broader recovery scan:
```
/Users/canyouseeus/Library/Application Support/Cursor/User/
```

This will find deleted files from:
- workspaceStorage/
- globalStorage/
- Other Cursor user directories

### Option 3: Scan the Entire Cursor Directory
For maximum recovery:
```
/Users/canyouseeus/Library/Application Support/Cursor/
```

## What to Look For

When scanning with R-Tool, look for:
- Folders with hash names (like `a1b2c3d4e5f6...`)
- Files named `workspace.json`
- Files named `state.vscdb`
- Files with `.json` extension
- Files containing "agent" in the name

## Recovery Tips

1. **Scan the parent directory** (`workspaceStorage/`) first - this is where deleted workspace folders would be
2. **Look for recently deleted files** - filter by deletion date around when you ran the clear commands
3. **Recover entire folders** - workspace folders contain multiple files, so recover the whole folder structure
4. **Check file sizes** - workspace folders are typically several KB to MB in size

## Verify Your Username

To confirm the exact path, run:
```bash
echo $HOME
```

Then the path would be:
```
$HOME/Library/Application Support/Cursor/User/workspaceStorage/
```

If your username is different, replace `canyouseeus` with your actual username in the paths above.
