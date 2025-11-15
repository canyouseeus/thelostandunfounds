# Product Management Setup Guide

This guide explains how to set up and use the product management system that allows you to list products from your admin page.

## Overview

The product management system allows you to:
- ✅ Create custom products directly from your Settings page
- ✅ Import products from your Fourthwall store
- ✅ Edit and delete products
- ✅ Display products alongside Fourthwall products on your shop page

## Setup Steps

### 1. Database Setup

Run the products table schema in your Supabase SQL Editor:

```sql
-- See products-schema.sql for the complete schema
```

The schema includes:
- Products table with all necessary fields
- Row Level Security (RLS) policies
- Indexes for performance
- Automatic timestamp updates

### 2. Access Product Management

1. Sign in to your account
2. Navigate to **Settings** (`/settings`)
3. You'll see the **Product Management** section at the top

## Using Product Management

### Creating a New Product

1. Click **"Add Product"** button
2. Fill in the form:
   - **Title*** (required): Product name
   - **Description**: Product description
   - **Price*** (required): Product price
   - **Compare At Price**: Original price (for showing discounts)
   - **Currency**: USD, EUR, or GBP
   - **Handle*** (required): URL-friendly slug (auto-generated from title)
   - **Image URL**: Link to product image
   - **Available**: Checkbox to mark product as available
3. Click **"Create Product"**

### Importing from Fourthwall

1. Click **"Import from Fourthwall"** button
2. The system will fetch products from your Fourthwall store
3. The first product will be imported automatically
4. You can manually import more products by creating them and linking to Fourthwall URLs

### Editing a Product

1. Click the **Edit** icon (pencil) on any product
2. Modify the fields you want to change
3. Click **"Update Product"**

### Deleting a Product

1. Click the **Delete** icon (trash) on any product
2. Confirm the deletion
3. The product will be removed from your shop

## Shop Page Integration

Products you create will automatically appear on your shop page (`/shop`) alongside products from Fourthwall:

- **Fourthwall products**: Link to your Fourthwall store (opens in new tab)
- **Local products**: Link to `/products/{handle}` (stays on your site)

## Product Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Product name |
| `description` | string | No | Product description |
| `price` | number | Yes | Product price |
| `compare_at_price` | number | No | Original price for discounts |
| `currency` | string | No | Currency code (default: USD) |
| `handle` | string | Yes | URL-friendly slug |
| `image_url` | string | No | Main product image URL |
| `images` | array | No | Array of image URLs |
| `available` | boolean | No | Whether product is available (default: true) |
| `fourthwall_product_id` | string | No | Link to Fourthwall product ID |
| `fourthwall_url` | string | No | Link to product on Fourthwall |

## API Endpoints

The system uses the following API endpoints:

- `GET /api/products` - Get all available products (public)
- `POST /api/products` - Create a new product (requires auth)
- `PUT /api/products` - Update a product (requires auth)
- `DELETE /api/products?id={id}` - Delete a product (requires auth)

## Security

- Products are protected by Row Level Security (RLS)
- Only authenticated users can create products
- Users can only edit/delete their own products
- Public users can only view available products

## Troubleshooting

### Products Not Appearing

1. **Check Database**: Ensure the products table exists and RLS policies are set
2. **Check Authentication**: Make sure you're signed in
3. **Check Availability**: Ensure products are marked as `available: true`
4. **Check Browser Console**: Look for any error messages

### Import from Fourthwall Not Working

1. **Check Fourthwall API**: Ensure your Fourthwall store is accessible
2. **Check Network Tab**: Verify API requests are being made
3. **Check Console**: Look for error messages

### Can't Edit/Delete Products

1. **Check Ownership**: You can only edit/delete products you created
2. **Check Authentication**: Ensure you're signed in
3. **Check Permissions**: Verify RLS policies allow your user to modify products

## Next Steps

- Add product categories/collections
- Add product variants (sizes, colors, etc.)
- Add inventory tracking
- Add product reviews
- Add product search and filtering
