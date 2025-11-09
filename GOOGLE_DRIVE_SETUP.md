# Google Drive Folders Lister

This script lists all folders in your Google Drive.

## Setup Instructions

### 1. Install Dependencies

```bash
pip3 install -r requirements.txt
```

### 2. Get Google API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Drive API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Desktop app" as the application type
   - Download the credentials JSON file
5. Rename the downloaded file to `credentials.json` and place it in the project root directory

### 3. Run the Script

```bash
python3 list_google_drive_folders.py
```

The first time you run it, it will open a browser window for you to authenticate with your Google account. After authentication, a `token.pickle` file will be created to store your credentials for future runs.

## Output

The script will display:
- Folder name
- Folder ID
- Creation date
- Last modified date
- Parent folder ID (if applicable)

## Notes

- The script uses read-only access to your Google Drive
- Your credentials are stored locally in `token.pickle`
- You can delete `token.pickle` to force re-authentication
