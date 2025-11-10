# THE LOST+UNFOUNDS

Modern web application for thelostandunfounds.com

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🛠️ Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **MCP Registry** - Dynamic tool management system
- **Vercel** - Deployment platform
- **Zoho Campaigns** - Email list management

## 📦 MCP Registry Integration

This project uses the MCP (Model Context Protocol) registry system for dynamic tool loading.

### Available Tools

The project automatically discovers and loads tools from:
- PayPal MCP Server
- Google Drive MCP Server
- Vercel MCP Server
- Railway MCP Server
- Supabase MCP Server
- GitHub MCP Server

### Using Tools

```typescript
import { importTool } from '@tools/index';

// Import a tool dynamically
const createOrder = await importTool('paypal', 'createOrder');

// Use the tool
const result = await createOrder.execute({
  amount: 10.00,
  currency: 'USD'
});
```

## 🌐 Domain Setup

Domain: `thelostandunfounds.com`

### Vercel Configuration

1. Add domain in Vercel dashboard
2. Configure DNS (handled automatically if purchased through Vercel)
3. SSL certificate is automatically provisioned

## 📁 Project Structure

```
thelostandunfounds/
├── api/                # Vercel serverless functions
│   └── subscribe.ts    # Email subscription endpoint
├── src/
│   ├── components/     # React components
│   ├── pages/          # Page components
│   │   └── Home.tsx    # Homepage with email sign-up
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   ├── services/       # API services
│   ├── types/          # TypeScript types
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── vercel.json         # Vercel configuration
└── package.json        # Dependencies
```

## 📧 Email Sign-Up

The homepage includes an email sign-up form that integrates with Zoho Campaigns. Users can subscribe to receive updates about new tools and features.

- **Frontend:** `/src/pages/Home.tsx` - Email sign-up form component
- **Backend:** `/api/subscribe.ts` - Vercel serverless function for Zoho Campaigns API integration (US data center)

## 🔧 Development

### Environment Variables

Create a `.env.local` file for local development:

```env
VITE_API_URL=https://api.example.com
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

#### Zoho Campaigns Integration

For production, add these environment variables in your Vercel dashboard:

```env
ZOHO_API_KEY=your_zoho_oauth_token
ZOHO_LIST_KEY=your_zoho_list_key
ZOHO_API_URL=https://campaigns.zoho.com/api/v1.1/json/listsubscribe
```

**Quick Copy - Zoho API URI (US Data Center):**
```
https://campaigns.zoho.com/api/v1.1/json/listsubscribe
```
[Click here to open in browser](https://campaigns.zoho.com/api/v1.1/json/listsubscribe)

**Setting up Zoho Campaigns:**

1. **Get your OAuth Token:**
   - Go to [Zoho API Console](https://api-console.zoho.com/)
   - Create a new OAuth client or use an existing one
   - **Add Redirect URIs** (Zoho will ask for these):
     - **Production:** `https://thelostandunfounds.com/oauth/callback`
     - **Development:** `http://localhost:3000/oauth/callback`
     - Or use: `https://www.thelostandunfounds.com/oauth/callback`
   - Select scopes: `ZohoCampaigns.contact.READ` and `ZohoCampaigns.contact.CREATE`
   - Generate an OAuth token
   - Copy the access token to `ZOHO_API_KEY`

2. **Get your List Key:**
   - Log in to [Zoho Campaigns](https://campaigns.zoho.com/)
   - Go to Contacts → Lists
   - Select your mailing list
   - The List Key is in the URL or list settings (format: `xxxxxxxxxxxxx`)
   - Copy it to `ZOHO_LIST_KEY`

3. **API URL (US Data Center):**
   - **Default (US):** [`https://campaigns.zoho.com/api/v1.1/json/listsubscribe`](https://campaigns.zoho.com/api/v1.1/json/listsubscribe)
     - Click to open | Copy: `https://campaigns.zoho.com/api/v1.1/json/listsubscribe`
   - **EU Data Center:** [`https://campaigns.zoho.eu/api/v1.1/json/listsubscribe`](https://campaigns.zoho.eu/api/v1.1/json/listsubscribe)
     - Click to open | Copy: `https://campaigns.zoho.eu/api/v1.1/json/listsubscribe`
   - **India Data Center:** [`https://campaigns.zoho.in/api/v1.1/json/listsubscribe`](https://campaigns.zoho.in/api/v1.1/json/listsubscribe)
     - Click to open | Copy: `https://campaigns.zoho.in/api/v1.1/json/listsubscribe`

**For Zoho Mail domain setup:** See [ZOHO_MAIL_SETUP.md](./ZOHO_MAIL_SETUP.md) for detailed instructions on setting up `admin@thelostandunfounds.com` email hosting.

### MCP Server Configuration

MCP servers are configured in Cursor IDE settings. The registry automatically discovers and loads them.

## 🚢 Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments.

## 📝 License

MIT

