# MANTIS Version History

## MANTIS-1.0.1 - Vercel Serverless Functions Deployment Fix
**Date:** 2025-11-16 19:53:45  
**Commit:** `28c0383` (Trigger deployment: remove redundant routes config)  
**Status:** ✅ Production Ready

### Changes
- ✅ Fixed Vercel serverless functions deployment
- ✅ Removed 7 test/admin utility functions to comply with Vercel 12 function limit
- ✅ Removed 2 Telegram integration functions
- ✅ Updated `vercel.json` configuration (removed redundant routes)
- ✅ Added Node.js version (`20.x`) to `package.json`
- ✅ All 10 serverless functions deployed and working

### Deployed Functions (10 total)
1. `/api/webhooks/fourthwall` - Fourthwall webhook handler ✅
2. `/api/signup` - User signup
3. `/api/newsletter-subscribe` - Newsletter functionality
4. `/api/payments/paypal` - Payment processing
5. `/api/affiliates/track-click` - Affiliate tracking
6. `/api/fourthwall/products` - Product API
7. `/api/king-midas/distribute` - Distribution system
8. `/api/admin/product-costs` - Admin functionality
9. `/api/admin/reset-password` - Password reset
10. `/api/tiktok/[...path]` - TikTok proxy

### Removed Functions
- `api/admin/reset-newsletter-list.ts`
- `api/admin/reset-newsletter-simple.ts`
- `api/resend-welcome-email.ts`
- `api/reset-newsletter-direct.ts`
- `api/reset-newsletter.ts`
- `api/test-email-config.ts`
- `api/db.js`
- `api/services/telegram-handler.ts`
- `api/telegram/webhook.ts`

### Verification
- ✅ Build completed successfully (18 seconds)
- ✅ All functions deployed without errors
- ✅ API endpoint `/api/webhooks/fourthwall` tested and working
- ✅ Response: `{"message":"Fourthwall webhook endpoint is active","methods":["POST"]}`

### Deployment Details
- **Platform:** Vercel (Hobby Plan)
- **Node.js Version:** 20.x
- **Framework:** Vite
- **Build Output:** `dist/`
- **Function Count:** 10/12 (under limit)

---
