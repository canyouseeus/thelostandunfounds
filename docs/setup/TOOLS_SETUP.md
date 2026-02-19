# Tools Setup Guide for thelostandunfounds.com

This guide explains how to set up your website to host all your tools, including the TikTok downloader.

## Structure

Your website now has:
- **Home page** (`/`) - Your main landing page with navigation menu
- **Tools Dashboard** (`/tools`) - Overview of all available tools
- **TikTok Downloader** (`/tools/tiktok-downloader`) - Embedded TikTok video downloader tool

## TikTok Downloader Features

Your TikTok downloader includes:
- ✅ PayPal payment integration ($4.99/month premium)
- ✅ Supabase authentication (email/password + Google OAuth)
- ✅ Download limits (5/day free, unlimited premium)
- ✅ Premium features (HD quality downloads)
- ✅ Google Drive integration
- ✅ Google AdSense integration

## Setup Steps

### 1. Install Dependencies

```bash
cd thelostandunfounds
npm install
```

### 2. Configure TikTok Downloader URL

The TikTok downloader is embedded as an iframe pointing to your existing TikTok downloader server. Set the URL:

Create a `.env` file in `thelostandunfounds/`:
```env
VITE_TIKTOK_DOWNLOADER_URL=https://your-tiktok-downloader-domain.com
```

Or if running locally:
```env
VITE_TIKTOK_DOWNLOADER_URL=http://localhost:3000
```

**Note:** Make sure your TikTok downloader server is running and accessible. If it's deployed on Railway or another platform, use that URL.

### 3. Update TikTok Downloader CORS (Already Done)

The TikTok downloader server (`tiktok-downloader/server.js`) has been updated to:
- Allow CORS requests from `thelostandunfounds.com`
- Allow iframe embedding from `thelostandunfounds.com`

If you deploy the TikTok downloader, make sure these CORS settings are in place.

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your site.

### 5. Navigation Menu

The home page now has a menu button (☰) in the header that opens a dropdown with "Explore Tools" link. Click outside the menu to close it.

### 6. Add More Tools

To add more tools:

1. Create a new page component in `src/pages/` (e.g., `YouTubeDownloader.tsx`)
2. Add a route in `src/App.tsx`:
   ```tsx
   <Route path="youtube-downloader" element={<YouTubeDownloader />} />
   ```
3. Add the tool to the tools list in `src/pages/ToolsDashboard.tsx`:
   ```tsx
   {
     id: 'youtube-downloader',
     name: 'YouTube Downloader',
     description: 'Download YouTube videos and audio',
     icon: <Youtube className="w-8 h-8" />,
     path: '/tools/youtube-downloader',
     color: 'from-red-500 to-red-600'
   }
   ```

## Deployment

### Deploy Main Site to Vercel

```bash
npm run build
vercel
```

Make sure to set environment variables in Vercel:
- `VITE_TIKTOK_DOWNLOADER_URL` - Your TikTok downloader server URL (e.g., `https://your-app.railway.app`)

### Deploy TikTok Downloader

The TikTok downloader should be deployed separately (Railway, Vercel, etc.) with:
- PayPal credentials
- Supabase credentials
- Google OAuth credentials
- Google Drive credentials

## File Structure

```
thelostandunfounds/
├── src/
│   ├── components/
│   │   └── Layout.tsx          # Navigation layout for tools pages
│   ├── pages/
│   │   ├── Home.tsx             # Landing page with menu
│   │   ├── ToolsDashboard.tsx   # Tools overview
│   │   └── TikTokDownloader.tsx # TikTok downloader (embedded iframe)
│   ├── App.tsx                  # Main routing
│   └── main.tsx                 # Entry point
├── package.json
├── tailwind.config.js
└── vercel.json                  # Vercel deployment config
```

## TikTok Downloader Integration

The TikTok downloader is embedded as an iframe, which means:
- It uses your existing TikTok downloader server (with all its features: auth, PayPal, Google Drive, etc.)
- The full functionality is preserved
- Users can log in, upgrade to premium, and use all features
- CORS and iframe headers have been configured to allow embedding

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Configure TikTok downloader URL in `.env`
3. ✅ Start TikTok downloader server (if running locally)
4. ✅ Test locally: `npm run dev`
5. ✅ Deploy TikTok downloader to Railway/Vercel
6. ✅ Deploy main site to Vercel: `vercel`
7. ✅ Add more tools as needed!

