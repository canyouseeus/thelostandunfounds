# Cursor Recovery Tutorial for Mac (Adapted from Windows Tutorial)

## Step 1: Locate Your Cursor Data

On Mac, the path is:
```
/Users/canyouseeus/Library/Application Support/Cursor/User/workspaceStorage
```

If your folder is empty, corrupted, or missing — don't worry, we can recover it.

## Step 2: Use R-Studio to Recover Lost Files

**Note:** R-Studio is a file recovery tool (NOT the R programming language)

1. **Download R-Studio** (Demo version is enough)
   - Go to: https://www.r-studio.com/
   - Download R-Studio for Mac
   - Install it

2. **Open R-Studio**

3. **Scan your Mac's drive** (usually Macintosh HD or your main drive)

4. **Recover your workspace folder:**
   - Navigate to: `/Users/canyouseeus/Library/Application Support/Cursor/User/workspaceStorage/`
   - Look for deleted folders with hash names
   - Select the deleted workspace folder(s)
   - Recover to a safe place (like `~/Desktop/Cursor_backup/`)

## Step 3: Inspect with DB Browser for SQLite

1. **Download DB Browser for SQLite**
   - Go to: https://sqlitebrowser.org/
   - Download for Mac
   - Install it

2. **Open the recovered file:**
   - Navigate to your recovered workspace folder
   - Open: `state.vscdb`

3. **Look for data like:**
   - `workbench.panel.aichat.view...`
   - `workbench.panel.composerChatViewPanel...`

This means your chat data still exists — it's just not visible inside Cursor.

## Step 4: Extract and Rebuild Your Chat

1. **Look for .json or .md files inside:**
   ```
   anysphere.cursor-retrieval/
   ```

2. **These often contain:**
   - Your chat content
   - Images
   - Prompts

3. **Rename or restore them as:**
   ```
   chat.md
   ```

4. **Move them into:**
   ```
   .specstory/history/
   ```

5. **Restart Cursor** → your recovered chat will appear again.

## Step 5: If You Only Have a Markdown File

You can still continue your session manually:

1. **Create a New Chat in Cursor**

2. **Ask the AI:**
   ```
   Can you read a Markdown file?
   ```

3. **When it says "Yes", reply:**
   ```
   Okay, then read this MD file completely and continue exactly where we left off. 
   Make sure you understand all context before continuing.
   ```

4. **Attach or paste your recovered .md file** → done.

## Tools You'll Need

1. **R-Studio Demo** - File recovery tool
   - Download: https://www.r-studio.com/
   - **Note:** This is NOT the R programming language!

2. **DB Browser for SQLite** - Database viewer
   - Download: https://sqlitebrowser.org/

3. **SpecStory extension** - For automatic backups (optional)
   - Install in Cursor for future backups

## Mac-Specific Notes

- Paths use forward slashes `/` not backslashes `\`
- User folder is `/Users/canyouseeus/` not `C:\Users\`
- Application Support is in `Library/Application Support/`

## Alternative: Use Time Machine (Easier!)

If you have Time Machine enabled:

1. **Open Time Machine**
2. **Navigate to:** `/Users/canyouseeus/Library/Application Support/Cursor/User/workspaceStorage/`
3. **Go back in time** to before you cleared the cache
4. **Select deleted workspace folders**
5. **Click "Restore"**

This is much easier than using R-Studio if Time Machine is available!
