# Local Development Guide

This guide will help you run the affiliate program locally for testing and development.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **Supabase account** (for database)
4. **Vercel CLI** (for running API endpoints locally)

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Vercel CLI (for API endpoints)

```bash
npm install -g vercel
```

Or use npx (no global install needed):
```bash
npx vercel dev
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# API URL (for local development, use Vercel dev server)
VITE_API_URL=http://localhost:3001

# Supabase Service Role Key (for API endpoints)
# Get this from Supabase Dashboard → Settings → API → service_role key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: Cloudflare Turnstile (for forms)
VITE_TURNSTILE_SITE_KEY=your_turnstile_site_key

# Optional: PayPal (for payout integration)
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
```

**Important**: 
- `VITE_API_URL` should be `http://localhost:3001` when running locally with Vercel CLI
- The `SUPABASE_SERVICE_ROLE_KEY` is needed for API endpoints to work properly
- Never commit `.env.local` to git (it's already in `.gitignore`)

### 4. Set Up Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run `database-schema.sql` first (if not already done)
4. Run `affiliate-schema.sql` to create affiliate tables

### 5. Start Development Servers

You'll need **two terminals**:

#### Terminal 1: Frontend (Vite)
```bash
npm run dev
```
This starts the frontend on `http://localhost:3000`

#### Terminal 2: API Endpoints (Vercel)
```bash
vercel dev
```
Or if you don't have Vercel CLI installed globally:
```bash
npx vercel dev
```

This starts the API server on `http://localhost:3001`

**Note**: The first time you run `vercel dev`, it will ask you to link your project. You can:
- Link to existing Vercel project, OR
- Skip linking (it will still work locally)

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Affiliate Dashboard**: http://localhost:3000/affiliate

## Testing the Affiliate Program

### 1. Register as Affiliate

1. Sign up or log in at http://localhost:3000
2. Navigate to `/affiliate` or click "Affiliate Program" in the menu
3. Click "Register as Affiliate"
4. Copy your referral code (e.g., `AFF123456`)

### 2. Test Referral Tracking

1. Open an incognito/private window
2. Visit: `http://localhost:3000/?ref=YOUR_REFERRAL_CODE`
3. Sign up with a new account
4. Check the `referrals` table in Supabase to verify tracking

### 3. Test Commission Calculation

1. Have a referred user subscribe to Premium or Pro tier
2. Check the `commissions` table in Supabase
3. View the affiliate dashboard to see pending commissions

### 4. Test Cost Tracking

Use the API endpoint to add costs:

```bash
curl -X POST http://localhost:3001/api/affiliate/add-cost \
  -H "Content-Type: application/json" \
  -d '{
    "subscription_id": "your-subscription-id",
    "cost_type": "payment_processing",
    "amount": 0.50,
    "description": "PayPal processing fee"
  }'
```

### 5. Test Dashboard

1. Visit http://localhost:3000/affiliate
2. View stats, commissions, and referrals
3. Test copying referral links
4. Update PayPal email

## Troubleshooting

### API Endpoints Not Working

**Problem**: API calls fail with CORS or connection errors

**Solutions**:
1. Make sure `VITE_API_URL=http://localhost:3001` in `.env.local`
2. Ensure Vercel dev server is running (`vercel dev`)
3. Check browser console for errors
4. Verify environment variables are loaded (restart dev server after changing `.env.local`)

### Database Errors

**Problem**: "Table does not exist" or permission errors

**Solutions**:
1. Verify you ran both `database-schema.sql` and `affiliate-schema.sql`
2. Check Supabase RLS policies are set correctly
3. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct in `.env.local`
4. Check Supabase logs for detailed error messages

### Referral Tracking Not Working

**Problem**: Referrals not being tracked on signup

**Solutions**:
1. Check browser console for errors
2. Verify referral code is in URL (`?ref=CODE`)
3. Check API endpoint is accessible: `http://localhost:3001/api/affiliate/track-referral`
4. Verify user was created successfully before tracking

### Commission Not Calculating

**Problem**: Commissions not created when subscription is made

**Solutions**:
1. Verify referral was tracked first (check `referrals` table)
2. Check API endpoint: `http://localhost:3001/api/affiliate/calculate-commission`
3. Verify subscription was created successfully
4. Check browser console and API logs for errors

## Development Tips

### Hot Reload

- Frontend changes: Automatically reloads (Vite HMR)
- API changes: May need to restart `vercel dev`
- Database changes: Refresh browser

### Debugging

1. **Browser Console**: Check for frontend errors
2. **Vercel Dev Logs**: Check terminal running `vercel dev` for API errors
3. **Supabase Logs**: Check Supabase dashboard → Logs
4. **Network Tab**: Inspect API requests/responses

### Making Changes

1. **Frontend**: Edit files in `src/` - changes hot reload
2. **API**: Edit files in `api/` - restart `vercel dev` if needed
3. **Database**: Run SQL in Supabase SQL Editor

### Testing Different Scenarios

1. **Multiple Affiliates**: Create multiple test accounts
2. **Different Tiers**: Test Premium vs Pro commissions
3. **Cost Variations**: Add different cost types
4. **Edge Cases**: Test with zero costs, negative profit, etc.

## Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes | `eyJhbGc...` |
| `VITE_API_URL` | API base URL | Yes (local) | `http://localhost:3001` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for API | Yes (API) | `eyJhbGc...` |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile key | Optional | `0x4AAA...` |
| `PAYPAL_CLIENT_ID` | PayPal client ID | Optional | `AeA1QIZX...` |
| `PAYPAL_CLIENT_SECRET` | PayPal secret | Optional | `EC0...` |

## Next Steps

Once you have it running locally:

1. ✅ Test affiliate registration
2. ✅ Test referral tracking
3. ✅ Test commission calculation
4. ✅ Test dashboard functionality
5. ⏳ Complete PayPal payout integration
6. ⏳ Add admin authentication to payout endpoints

## Need Help?

- Check Supabase logs for database errors
- Check Vercel dev logs for API errors
- Check browser console for frontend errors
- Review `AFFILIATE_PROGRAM_SETUP.md` for detailed documentation
