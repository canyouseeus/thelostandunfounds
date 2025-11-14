# Fourthwall Storefront Token Setup Guide

## Option 1: Install Node.js/npm (Recommended)

### Using Homebrew (easiest):
```bash
brew install node
```

### Using the official installer:
1. Go to: https://nodejs.org/
2. Download the LTS version for macOS
3. Install it
4. Restart your terminal

Then run:
```bash
npm run setup:fourthwall
```

## Option 2: Manual Setup (No npm needed)

### Step 1: Create or edit `.env.local` file

```bash
cd /path/to/thelostandunfounds
nano .env.local
# or
code .env.local
```

### Step 2: Add these lines:

```env
# Fourthwall Shop Integration
FOURTHWALL_STOREFRONT_TOKEN=your_storefront_token_here
FOURTHWALL_STORE_SLUG=thelostandunfounds-shop
```

### Step 3: Get your Storefront Token

1. Go to: https://thelostandunfounds-shop.fourthwall.com/admin/dashboard/settings/for-developers
2. Look for your **Storefront Token**
3. Copy the token
4. Replace `your_storefront_token_here` in `.env.local` with your actual token

**Note:** This uses the official Fourthwall Storefront API. See docs: https://docs.fourthwall.com/storefront/

## Option 3: Using the script directly (if you have Node.js but npm path issue)

```bash
# Find where node is installed
which node

# Run the script directly
node scripts/setup-fourthwall-env.js
```

## Verify Setup

After setting up, check your `.env.local` file contains:

```env
FOURTHWALL_API_KEY=your_actual_key
FOURTHWALL_STORE_SLUG=thelostandunfounds-shop
```

## Troubleshooting

### If npm command not found:
- Make sure Node.js is installed: `node --version`
- Check if npm is in your PATH: `which npm`
- You may need to restart your terminal after installing Node.js

### If you're using nvm:
```bash
nvm install node
nvm use node
```

### Quick check:
```bash
# Check if Node.js is installed
node --version

# Check if npm is installed  
npm --version
```

If both commands work, you're good to go!
