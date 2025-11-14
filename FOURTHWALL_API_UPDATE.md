# Fourthwall API Integration Update

## What Changed

I've updated the integration to use the **official Fourthwall Storefront API** based on their documentation: https://docs.fourthwall.com/storefront/

### Key Changes:

1. **API Endpoint**: Now using `https://storefront-api.fourthwall.com/v1/collections/{handle}/offers`
2. **Authentication**: Uses `storefront_token` query parameter (not API key in headers)
3. **Environment Variable**: Changed from `FOURTHWALL_API_KEY` to `FOURTHWALL_STOREFRONT_TOKEN`

## Setup Instructions

### Get Your Storefront Token

1. Go to: https://thelostandunfounds-shop.fourthwall.com/admin/dashboard/settings/for-developers
2. Find your **Storefront Token**
3. Copy it

### Set the Token

**Option 1: Using the script**
```bash
npm run setup:fourthwall
# or
bash scripts/setup-fourthwall-manual.sh
```

**Option 2: Manual setup**
Add to `.env.local`:
```env
FOURTHWALL_STOREFRONT_TOKEN=your_token_here
```

## API Endpoints

The integration now uses:
- **Products**: `GET /v1/collections/all/offers?storefront_token={token}`
- **Collection**: `GET /v1/collections/{handle}/offers?storefront_token={token}`

## Documentation

- Storefront API Docs: https://docs.fourthwall.com/storefront-api/
- Getting Started: https://docs.fourthwall.com/storefront/getting-started/
- Collection Handles: https://docs.fourthwall.com/storefront/collection/

## Migration

If you had `FOURTHWALL_API_KEY` set, you'll need to:
1. Get your Storefront Token from the admin dashboard
2. Update `.env.local` to use `FOURTHWALL_STOREFRONT_TOKEN` instead
