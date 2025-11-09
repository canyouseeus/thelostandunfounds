#!/usr/bin/env python3
"""
List Google Drive Folders

This script lists all folders in your Google Drive.
Requires Google API credentials to be set up.
"""

import os
import json
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import pickle

# If modifying these scopes, delete the file token.pickle.
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

def get_credentials():
    """Get valid user credentials from storage or prompt for authorization."""
    creds = None
    token_path = 'token.pickle'
    credentials_path = 'credentials.json'
    
    # The file token.pickle stores the user's access and refresh tokens.
    if os.path.exists(token_path):
        with open(token_path, 'rb') as token:
            creds = pickle.load(token)
    
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(credentials_path):
                print(f"Error: {credentials_path} not found!")
                print("\nTo use this script, you need to:")
                print("1. Go to https://console.cloud.google.com/")
                print("2. Create a new project or select an existing one")
                print("3. Enable the Google Drive API")
                print("4. Create credentials (OAuth 2.0 Client ID)")
                print("5. Download the credentials as 'credentials.json'")
                print("6. Place it in the same directory as this script")
                return None
            
            flow = InstalledAppFlow.from_client_secrets_file(
                credentials_path, SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Save the credentials for the next run
        with open(token_path, 'wb') as token:
            pickle.dump(creds, token)
    
    return creds

def list_folders():
    """List all folders in Google Drive."""
    creds = get_credentials()
    if not creds:
        return
    
    try:
        service = build('drive', 'v3', credentials=creds)
        
        # Query to get only folders
        query = "mimeType='application/vnd.google-apps.folder' and trashed=false"
        
        results = service.files().list(
            q=query,
            pageSize=100,
            fields="nextPageToken, files(id, name, createdTime, modifiedTime, parents)"
        ).execute()
        
        folders = results.get('files', [])
        
        if not folders:
            print("No folders found in Google Drive.")
            return
        
        print(f"\nFound {len(folders)} folder(s) in Google Drive:\n")
        print("-" * 80)
        
        for folder in folders:
            folder_id = folder.get('id')
            name = folder.get('name')
            created = folder.get('createdTime', 'N/A')
            modified = folder.get('modifiedTime', 'N/A')
            parents = folder.get('parents', [])
            
            print(f"Name: {name}")
            print(f"ID: {folder_id}")
            print(f"Created: {created}")
            print(f"Modified: {modified}")
            if parents:
                print(f"Parent Folder ID: {parents[0]}")
            print("-" * 80)
        
        # Handle pagination if there are more results
        while 'nextPageToken' in results:
            results = service.files().list(
                q=query,
                pageSize=100,
                pageToken=results['nextPageToken'],
                fields="nextPageToken, files(id, name, createdTime, modifiedTime, parents)"
            ).execute()
            
            additional_folders = results.get('files', [])
            folders.extend(additional_folders)
            
            for folder in additional_folders:
                folder_id = folder.get('id')
                name = folder.get('name')
                created = folder.get('createdTime', 'N/A')
                modified = folder.get('modifiedTime', 'N/A')
                parents = folder.get('parents', [])
                
                print(f"Name: {name}")
                print(f"ID: {folder_id}")
                print(f"Created: {created}")
                print(f"Modified: {modified}")
                if parents:
                    print(f"Parent Folder ID: {parents[0]}")
                print("-" * 80)
        
        print(f"\nTotal folders: {len(folders)}")
        
    except HttpError as error:
        print(f"An error occurred: {error}")

if __name__ == '__main__':
    list_folders()
