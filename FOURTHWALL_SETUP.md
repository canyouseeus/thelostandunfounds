# Fourthwall Shop Integration Setup

This guide will help you set up the integration between your site and your Fourthwall store.

## Overview

The shop integration allows you to display products from your Fourthwall store (`thelostandunfounds-shop.fourthwall.com`) directly on your website.

## Features

- ✅ Product grid display
- ✅ Product images, titles, descriptions, and prices
- ✅ Direct links to product pages on Fourthwall
- ✅ Responsive design matching your site's aesthetic
- ✅ Automatic product availability status

## Setup Instructions

### 1. Access Your Shop

Your shop is accessible at:
- **Shop Page**: `/shop` on your website
- **Fourthwall Store**: https://thelostandunfounds-shop.fourthwall.com

### 2. API Configuration (If Needed)

The integration attempts to fetch products using multiple API endpoint formats. If products don't appear:

1. **Check Fourthwall Developer Settings**:
   - Go to: https://thelostandunfounds-shop.fourthwall.com/admin/dashboard/settings/for-developers
   - Look for API access settings
   - Enable API access if available
   - Note any API keys or endpoints provided

2. **Update API Endpoints** (if needed):
   - Edit `/api/fourthwall/products.ts`
   - Add your specific API endpoint or API key
   - The code tries multiple common endpoint formats automatically

### 3. Alternative: Direct Store Link

If API access isn't available, users can still access your store via the "View full store on Fourthwall" link on the shop page.

## File Structure

```
/api/fourthwall/
  ├── products.ts              # API endpoint for fetching all products
  └── collections/[handle].ts  # API endpoint for fetching collection products

/src/
  ├── services/
  │   └── fourthwall.ts        # Service for fetching products
  └── pages/
      └── Shop.tsx             # Shop page component
```

## Customization

### Change Store Slug

If your store slug changes, update it in:
- `/src/services/fourthwall.ts` - `storeSlug` property
- `/api/fourthwall/products.ts` - `storeSlug` variable
- `/api/fourthwall/collections/[handle].ts` - `storeSlug` variable

### Styling

The shop page uses Tailwind CSS and matches your site's dark theme. To customize:
- Edit `/src/pages/Shop.tsx`
- Modify product card styles, grid layout, or colors

## Troubleshooting

### Products Not Showing

1. **Check Browser Console**: Look for API errors
2. **Check Network Tab**: Verify API requests are being made
3. **Verify Store URL**: Ensure the store slug is correct
4. **Check API Access**: Fourthwall may require API keys or special permissions

### CORS Errors

The API endpoints include CORS headers. If you still see CORS errors:
- Ensure the API endpoints are deployed correctly
- Check Vercel function logs for errors

### Image Loading Issues

Product images are loaded directly from Fourthwall. If images don't load:
- Check if Fourthwall allows hotlinking
- Verify image URLs in the API response
- Check browser console for image loading errors

## Support

For Fourthwall-specific API questions, refer to:
- Fourthwall Developer Documentation
- Your Fourthwall admin dashboard settings
