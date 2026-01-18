import json
import os
import sys
import getpass

# Common Default Paths for MCP Config on macOS
POSSIBLE_PATHS = [
    os.path.expanduser("~/Library/Application Support/Claude/claude_desktop_config.json"),
    os.path.expanduser("~/.config/Claude/claude_desktop_config.json"),
]

def find_config():
    for path in POSSIBLE_PATHS:
        if os.path.exists(path):
            return path
    return None

def main():
    print("==============================================")
    print("  UPDATE PAYPAL MCP CONFIGURATION")
    print("==============================================")

    config_path = find_config()
    
    if not config_path:
        print("❌ Could not automatically find 'claude_desktop_config.json'.")
        print("Please enter the full path to your MCP config file:")
        config_path = input("Path: ").strip()
        if not os.path.exists(config_path):
            print("❌ File not found.")
            sys.exit(1)
    
    print(f"📂 Found config file: {config_path}")
    
    try:
        with open(config_path, 'r') as f:
            data = json.load(f)
    except json.JSONDecodeError:
        print("❌ Error parsing JSON. The file might be corrupted or empty.")
        sys.exit(1)

    # Check for paypal-mcp-server entry
    mcp_servers = data.get("mcpServers", {})
    if "paypal-mcp-server" not in mcp_servers:
        print("❌ 'paypal-mcp-server' not found in config.")
        print("Do you want to verify the name? keys found:", list(mcp_servers.keys()))
        sys.exit(1)

    print("\nPaste your NEW Secret (hidden input):")
    new_secret = getpass.getpass("Secret: ").strip()

    if not new_secret:
        print("❌ No secret entered. Exiting.")
        sys.exit(1)

    # Update the value
    try:
        # Ensure env dict exists
        if "env" not in mcp_servers["paypal-mcp-server"]:
            mcp_servers["paypal-mcp-server"]["env"] = {}
        
        mcp_servers["paypal-mcp-server"]["env"]["PAYPAL_CLIENT_SECRET"] = new_secret
        
        # Verify Environment is LIVE since we are updating keys
        current_env = mcp_servers["paypal-mcp-server"]["env"].get("PAYPAL_ENVIRONMENT", "SANDBOX")
        if current_env != "LIVE":
            print(f"⚠️  Current Environment is set to: {current_env}")
            update_env = input("Switch to LIVE? (y/n): ").lower()
            if update_env == 'y':
                mcp_servers["paypal-mcp-server"]["env"]["PAYPAL_ENVIRONMENT"] = "LIVE"
                print("✅ Switched to LIVE mode.")

        # Save back to file
        with open(config_path, 'w') as f:
            json.dump(data, f, indent=2)
            
        print("\n✅ MCP Config updated successfully!")
        print("👉 Please RESTART your AI Client (Claude Desktop/Cursor) for changes to take effect.")

    except Exception as e:
        print(f"❌ Error updating config: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
