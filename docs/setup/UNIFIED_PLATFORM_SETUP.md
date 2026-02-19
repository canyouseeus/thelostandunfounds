# Unified Platform Implementation Guide

## ✅ What's Been Created

### 1. Unified Auth Service (`src/services/auth.ts`)
- Email/password authentication
- Google OAuth integration
- Session management
- Uses Supabase Auth (shared across all tools)

### 2. Unified Subscription Service (`src/services/subscription.ts`)
- Platform-wide subscription management
- Tier checking (free/premium/pro)
- Tool-specific limit checking
- Usage tracking

### 3. Database Schema (`database-schema.sql`)
- `platform_subscriptions` table
- `tool_limits` table (configurable limits per tool)
- `tool_usage` table (tracks user actions)
- Row Level Security (RLS) policies

### 4. React Auth Context (`src/contexts/AuthContext.tsx`)
- Provides auth state to all components
- `useAuth()` hook for easy access
- Auto-refreshes subscription tier

### 5. Auth Callback Page (`src/pages/AuthCallback.tsx`)
- Handles OAuth redirects
- Auto-redirects after successful auth

## 🚀 Next Steps

### Step 1: Set Up Database (Required)
1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/nonaqhllakrckbtbawrb
2. Open SQL Editor
3. Run the SQL from `database-schema.sql`
4. Verify tables are created:
   - `platform_subscriptions`
   - `tool_limits`
   - `tool_usage`

### Step 2: Update Environment Variables
Add to `.env` or Vercel environment variables:
```env
VITE_SUPABASE_URL=https://nonaqhllakrckbtbawrb.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Step 3: Create API Endpoints (Optional)
Create backend API endpoints for tools to check auth/subscription:
- `GET /api/auth/me` - Get current user
- `GET /api/subscription/tier` - Get user tier
- `POST /api/subscription/create` - Create subscription
- `GET /api/tools/:toolId/limits` - Get tool limits

### Step 4: Update TikTok Downloader
Migrate TikTok downloader to use platform auth:
1. Remove local auth endpoints
2. Use platform auth API
3. Check platform subscription instead of local subscription
4. Update download limits to use platform tiers

### Step 5: Add Auth UI Components
Create reusable auth components:
- Login modal
- Sign up form
- Subscription status display
- Upgrade button

## 📋 Usage Examples

### In a Component (React)
```typescript
import { useAuth } from '../contexts/AuthContext';
import { subscriptionService } from '../services/subscription';

function MyComponent() {
  const { user, tier, signIn, signOut } = useAuth();
  
  // Check if user can perform action
  const checkAccess = async () => {
    if (!user) return;
    
    const { allowed, remaining, limit } = await subscriptionService.canPerformAction(
      user.id,
      'tiktok',
      'download'
    );
    
    if (allowed) {
      // Perform download
      await subscriptionService.trackUsage(user.id, 'tiktok', 'download');
    }
  };
  
  return (
    <div>
      {user ? (
        <div>
          <p>Welcome, {user.email}!</p>
          <p>Tier: {tier}</p>
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <button onClick={() => signIn('email@example.com', 'password')}>
          Sign In
        </button>
      )}
    </div>
  );
}
```

### In a Tool Backend (Node.js/Express)
```javascript
// Check user subscription before allowing action
app.post('/api/tiktok/download', async (req, res) => {
  const userId = req.user?.id; // From auth middleware
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if user can download
  const { allowed, remaining, limit } = await subscriptionService.canPerformAction(
    userId,
    'tiktok',
    'download'
  );
  
  if (!allowed) {
    return res.status(429).json({
      error: 'Download limit reached',
      remaining,
      limit
    });
  }
  
  // Perform download
  // ... download logic ...
  
  // Track usage
  await subscriptionService.trackUsage(userId, 'tiktok', 'download', {
    video_url: videoUrl,
    video_title: videoTitle
  });
  
  res.json({ success: true, remaining: remaining - 1 });
});
```

## 🎯 Benefits

✅ **One Login**: Users sign in once, access all tools  
✅ **One Subscription**: Premium unlocks all tools  
✅ **Easy to Add Tools**: New tools just check platform subscription  
✅ **Centralized Management**: All auth/subscription logic in one place  
✅ **Better UX**: Seamless experience across tools  

## 📝 Notes

- All tools use the same Supabase project for auth
- Subscription tiers apply platform-wide
- Tool-specific limits are configurable in `tool_limits` table
- Usage is tracked per tool for analytics





