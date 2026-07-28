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

## 📦 MCP Registry Integration

This project uses the MCP (Model Context Protocol) registry system for dynamic tool loading.

### Available Tools

The project automatically discovers and loads tools from:
- Google Drive MCP Server
- Vercel MCP Server
- Railway MCP Server
- Supabase MCP Server
- GitHub MCP Server

### Using Tools

```typescript
import { importTool } from '@tools/index';

// Import a tool dynamically
const listFiles = await importTool('googledrive', 'listFiles');

// Use the tool
const result = await listFiles.execute({
  folderId: 'abc123'
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
├── src/
│   ├── components/     # React components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   ├── services/       # API services
│   ├── types/          # TypeScript types
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── vercel.json         # Vercel configuration
└── package.json        # Dependencies
```

## 🔧 Development

### Environment Variables

Create a `.env.local` file:

```env
VITE_API_URL=https://api.example.com
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

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

