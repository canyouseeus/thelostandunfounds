# Quick Reference: AI Assistant Communication

## One-Liner Setup Prompt

```
I'm building [PROJECT TYPE] and need it integrated with my existing React/TypeScript/Vite + Supabase + PayPal + Vercel stack. 
Follow SITE_STYLE_GUIDE.md for styling (dark theme only), use existing AuthContext and subscriptionService patterns, 
and reference AI_PROJECT_SETUP_PROMPT.md for full infrastructure details.
```

## Tech Stack Summary

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth) + Railway (API services)
- **Deployment**: Vercel
- **Payments**: PayPal (via MCP tools registry)
- **Auth**: Supabase Auth + Google OAuth
- **Tools**: MCP registry system

## Critical Files to Reference

- **Styling**: `SITE_STYLE_GUIDE.md` - Dark theme patterns
- **Infrastructure**: `AI_PROJECT_SETUP_PROMPT.md` - Full setup guide
- **Auth**: `src/contexts/AuthContext.tsx` - Authentication
- **Subscriptions**: `src/services/subscription.ts` - Subscription management
- **Database**: `database-schema.sql` - Schema patterns
- **API Routes**: `api/tiktok/[...path].js` - Vercel API pattern

## Common Commands

### "Add a new page"
```
Create a new page component following the ToolsDashboard.tsx pattern, 
using Layout wrapper, AuthContext for user state, and dark theme styling.
```

### "Add PayPal payment"
```
Integrate PayPal using the MCP tools registry pattern (useTool('paypal', 'createOrder')), 
update subscription via subscriptionService.createSubscription(), and follow 
the payment flow in public/tiktok-downloader/app.js.
```

### "Add database table"
```
Create a new Supabase table following database-schema.sql patterns with RLS policies. 
Reference auth.users(id) for user relationships and ensure proper permissions.
```

### "Style a component"
```
Style this component using SITE_STYLE_GUIDE.md patterns: bg-black, border-white/10, 
text-white with opacity variants, rounded-lg, and hover states.
```

## Environment Variables Checklist

**Frontend (Vite)**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Backend (Vercel API Routes)**:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- PayPal credentials (if needed)

## Style Quick Reference

- **Background**: `bg-black`
- **Text**: `text-white`, `text-white/80`, `text-white/60`
- **Borders**: `border border-white/10 hover:border-white/30`
- **Cards**: `bg-black border border-white/10 rounded-lg p-6`
- **Buttons Primary**: `bg-white text-black font-semibold rounded-lg hover:bg-white/90`
- **Buttons Secondary**: `bg-black border border-white/10 rounded-lg text-white hover:border-white/30`
- **Modals**: Backdrop `bg-black/80 backdrop-blur-sm`, Content `bg-black border border-white/10 rounded-lg`

## Integration Patterns

**Check Auth**:
```typescript
const { user, loading } = useAuth()
if (!user) return <AuthModal />
```

**Check Subscription**:
```typescript
const tier = await subscriptionService.getTier(user.id)
const canDo = await subscriptionService.canPerformAction(user.id, 'tool-id', 'action')
```

**Use MCP Tool**:
```typescript
import { useTool } from '../services/mcp-registry'
const result = await useTool('paypal', 'createOrder', { amount: 9.99 })
```

**Database Query**:
```typescript
import { supabase } from '../lib/supabase'
const { data } = await supabase.from('table').select('*').eq('user_id', user.id)
```

---

**Full details**: See `AI_PROJECT_SETUP_PROMPT.md`
