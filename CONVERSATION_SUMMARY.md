# Conversation Summary: Fourthwall Merch Shop Integration & Email System

## Main Goal
Build a **MERCH SHOP** page that integrates products from the user's existing Fourthwall store (https://thelostandunfounds-shop.fourthwall.com) and allows them to manage products from their admin/settings page.

**IMPORTANT**: This is a **MERCH SHOP** (t-shirts, hats, physical products) - separate from the tools/subscription pricing system.

## What Was Built

### 1. Fourthwall Merch Shop Integration
- **Merch Shop Page** (`/shop` route) - Displays MERCH products (t-shirts, hats, etc.) from Fourthwall store
- **Separate from Tools/Subscriptions** - This shop is for physical merchandise, not tool pricing
- **API Endpoints** (`/api/fourthwall/products.ts` and `/api/fourthwall/collections/[handle].ts`)
  - Uses official Fourthwall Storefront API: `https://storefront-api.fourthwall.com/v1/collections/{handle}/offers`
  - Requires `FOURTHWALL_STOREFRONT_TOKEN` environment variable
- **Service** (`src/services/fourthwall.ts`) - Client-side service to fetch products
- **Navigation** - Added "Shop" link to main navigation menu

### 2. Product Management System
- **Database Schema** (`products-schema.sql`) - Products table with RLS policies
- **API Endpoints** (`/api/products/index.ts`) - CRUD operations for products
- **Product Service** (`src/services/products.ts`) - Client-side service
- **Product Manager Component** (`src/components/products/ProductManager.tsx`)
  - View all products
  - Create new products
  - Edit products
  - Delete products
  - Import from Fourthwall (one-click)
- **Settings Integration** - Added Product Management section to Settings page

### 3. Welcome Email System
- **API Endpoint** (`/api/send-welcome-email.ts`) - Sends branded welcome emails via Zoho Mail API
- **Email Template** - Branded HTML email with:
  - Logo from `/logo.png`
  - "CAN YOU SEE US?" header
  - Black background, white text (matches brand)
  - Welcome message and updates list
- **Auto-send Integration** - Updated `EmailSignup.tsx` to automatically send welcome email after signup
- **Standalone Script** (`scripts/send-welcome-email-now.js`) - Can send emails independently

### 4. Environment Variable Scripts
- `scripts/setup-fourthwall-env.js` - Interactive setup for Fourthwall token
- `scripts/set-env.js` - Generic environment variable setter
- Updated `.env.example` with `FOURTHWALL_STOREFRONT_TOKEN`

## Current Status

### ✅ Completed
- Shop page created and routed
- Product management UI in Settings
- Database schema for products
- API endpoints for products and Fourthwall
- Welcome email system with branding
- Navigation updated

### ⚠️ Current Issues

1. **API Routes Don't Work in Vite Dev**
   - `/api/fourthwall/products` and `/api/send-welcome-email` are Vercel serverless functions
   - They don't execute with `npm run dev` (Vite) - only return source code
   - **Solution**: Use `vercel dev` instead of `npm run dev` for local development

2. **Missing Storefront Token**
   - Need `FOURTHWALL_STOREFRONT_TOKEN` from: https://thelostandunfounds-shop.fourthwall.com/admin/dashboard/settings/for-developers
   - Without it, API returns empty products array

3. **Shop Showing Wrong Products**
   - User reports shop is showing "made up stuff" instead of real Fourthwall products
   - Likely because API routes aren't executing (see issue #1)
   - Or showing local database products instead of Fourthwall products

4. **Welcome Email Not Sent**
   - User signed up (thelostandunfounds@gmail.com) but didn't receive welcome email
   - Email system is ready but needs Zoho credentials configured
   - Script exists to send it: `scripts/send-welcome-email-now.js`

## Technical Details

### Fourthwall API Integration
- **API Endpoint**: `https://storefront-api.fourthwall.com/v1/collections/{handle}/offers`
- **Authentication**: Uses `storefront_token` query parameter (not API key in headers)
- **Environment Variable**: `FOURTHWALL_STOREFRONT_TOKEN`
- **Documentation**: https://docs.fourthwall.com/storefront-api/

### Product Data Structure
- Products fetched from Fourthwall are called "offers"
- Each offer has variants with pricing (`unitPrice.value`, `unitPrice.currency`)
- Products transformed to match local interface

### Email System
- Uses Zoho Mail API
- Requires: `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_FROM_EMAIL`
- Email template uses logo from site URL (`/logo.png`)

## What Needs to Be Done

### Immediate Actions

1. **Fix Shop Display**
   - Get `FOURTHWALL_STOREFRONT_TOKEN` from Fourthwall admin dashboard
   - Add to `.env.local`: `FOURTHWALL_STOREFRONT_TOKEN=your_token`
   - Use `vercel dev` instead of `npm run dev` to test locally
   - OR deploy to Vercel where API routes work automatically

2. **Send Welcome Email**
   - Configure Zoho email credentials in `.env.local`
   - Run: `node scripts/send-welcome-email-now.js thelostandunfounds@gmail.com`
   - OR deploy to Vercel and call the API endpoint

3. **Verify Products Display**
   - Once API routes work, verify products show correctly
   - Check that product names are in ALL CAPS (user mentioned this)
   - Ensure prices are correct

### Files Created/Modified

**New Files:**
- `api/fourthwall/products.ts` - Fetch products from Fourthwall
- `api/fourthwall/collections/[handle].ts` - Fetch collection products
- `api/products/index.ts` - CRUD for local products
- `api/send-welcome-email.ts` - Send welcome emails
- `src/services/fourthwall.ts` - Fourthwall service
- `src/services/products.ts` - Products service
- `src/pages/Shop.tsx` - Shop page component
- `src/components/products/ProductManager.tsx` - Product management UI
- `products-schema.sql` - Database schema
- `scripts/send-welcome-email-now.js` - Standalone email sender
- Various setup/documentation files

**Modified Files:**
- `src/App.tsx` - Added `/shop` route
- `src/components/Layout.tsx` - Added "Shop" navigation link
- `src/pages/Settings.tsx` - Added ProductManager component
- `src/components/EmailSignup.tsx` - Added welcome email trigger
- `.env.example` - Added `FOURTHWALL_STOREFRONT_TOKEN`
- `package.json` - Added `setup:fourthwall` script

## Key Commands

```bash
# Setup Fourthwall token
npm run setup:fourthwall
# OR manually add to .env.local: FOURTHWALL_STOREFRONT_TOKEN=your_token

# Run dev server with API support (REQUIRED for API routes)
vercel dev

# Send welcome email to existing subscriber
node scripts/send-welcome-email-now.js thelostandunfounds@gmail.com

# Set environment variables
npm run env:set KEY=value
```

## Important Notes

1. **MERCH SHOP vs TOOLS**
   - `/shop` = MERCH SHOP (physical products: t-shirts, hats, etc. from Fourthwall)
   - `/tools` = Tools/Subscriptions (separate pricing system)
   - These are completely separate systems

2. **API Routes Only Work With Vercel**
   - `/api/*` routes are Vercel serverless functions
   - Use `vercel dev` for local development, not `npm run dev`
   - Or deploy to Vercel for production

3. **Fourthwall Storefront Token Required**
   - Get from: https://thelostandunfounds-shop.fourthwall.com/admin/dashboard/settings/for-developers
   - Without it, shop will show empty or error message

4. **Product Names Are ALL CAPS**
   - User mentioned product names should be in all caps
   - API should preserve the original casing from Fourthwall

5. **Welcome Email Needs Zoho Setup**
   - Requires Zoho Mail API credentials
   - Email template is ready with brand styling
   - Can be sent via script or API endpoint

## Next Steps for Another Agent

1. **Understand the distinction**: `/shop` = MERCH SHOP (t-shirts, hats, physical products), `/tools` = Tools/Subscriptions (separate system)
2. **Help user get their project path** - They're in `~/Desktop/SCOT33` but project location unclear
3. **Set up Fourthwall token** - Get token and add to `.env.local`
4. **Test shop with `vercel dev`** - Verify MERCH products display correctly
5. **Send welcome email** - Either via script or after deployment
6. **Verify product names/prices** - Ensure they match Fourthwall store exactly (product names are ALL CAPS)

## User's Current Situation

- ✅ Node.js installed (v25.2.0) and working
- ✅ npm installed (11.6.2) and working  
- ✅ Project exists but exact location unclear
- ⚠️ Shop page showing wrong products
- ⚠️ Welcome email not received
- ⚠️ Need to use `vercel dev` instead of `npm run dev`

---

**Goal**: Get the MERCH SHOP displaying real Fourthwall products (t-shirts, hats, etc.) and send the welcome email to thelostandunfounds@gmail.com with proper branding.

**Key Distinction**: The `/shop` route is for MERCHANDISE (physical products), not tools/subscriptions. Keep this separate from the tools pricing system.
