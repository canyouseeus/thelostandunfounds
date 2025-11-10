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
- **EmailJS** - Email service integration

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

The homepage includes an email sign-up form that sends emails via EmailJS. Users can subscribe to receive updates about new tools and features.

- **Frontend:** `/src/pages/Home.tsx` - Email sign-up form component
- **Backend:** `/api/subscribe.ts` - Vercel serverless function for EmailJS integration

## 🔧 Development

### Environment Variables

Create a `.env.local` file for local development:

```env
VITE_API_URL=https://api.example.com
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

#### EmailJS Integration

For production, add these environment variables in your Vercel dashboard:

```env
EMAILJS_SERVICE_ID=your_emailjs_service_id
EMAILJS_TEMPLATE_ID=your_emailjs_template_id
EMAILJS_PUBLIC_KEY=your_emailjs_public_key
RECIPIENT_EMAIL=your-email@example.com
```

**Setting up EmailJS (Free & Easy):**

1. **Create an EmailJS account:**
   - Go to [EmailJS.com](https://www.emailjs.com/) and sign up (free tier: 200 emails/month)
   - Use any email address you have access to

2. **Set up Email Service:**
   - Go to Email Services → Add New Service
   - Choose your email provider (Gmail, Outlook, etc.) or use EmailJS's own service
   - Follow the setup instructions
   - Copy the Service ID to `EMAILJS_SERVICE_ID`

3. **Create Email Template:**
   - Go to Email Templates → Create New Template
   - Use this template:
     ```
     Subject: New Email List Sign-up
     
     You have a new subscriber!
     
     Email: {{subscriber_email}}
     
     Reply to: {{reply_to}}
     ```
   - Copy the Template ID to `EMAILJS_TEMPLATE_ID`

4. **Get Public Key:**
   - Go to Account → API Keys
   - Copy your Public Key to `EMAILJS_PUBLIC_KEY`

5. **Set Recipient Email:**
   - Add your email address where you want to receive sign-ups to `RECIPIENT_EMAIL`

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

