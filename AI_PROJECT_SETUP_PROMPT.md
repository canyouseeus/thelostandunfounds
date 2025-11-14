# AI Project Setup Prompt Template

Use this prompt when starting new projects (affiliate programs, web stores, etc.) with Google AI Studio or any AI assistant to ensure proper integration with your existing infrastructure.

---

## Copy-Paste Prompt Template

```
I'm building a [PROJECT TYPE: e.g., affiliate program / web store / dashboard] for my existing platform. 
I need you to integrate it with my current infrastructure and follow my established patterns.

## EXISTING INFRASTRUCTURE

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (dark theme only)
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Deployment**: Vercel (with vercel.json configuration)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + Google OAuth
- **Payments**: PayPal (subscriptions and one-time payments)
- **Backend Services**: Railway (for API endpoints)
- **Tools Registry**: MCP (Model Context Protocol) tools registry system

### Existing Services & Patterns

**Authentication Service** (`src/services/auth.ts`):
- Uses Supabase client from `src/lib/supabase.ts`
- Methods: signUp, signIn, signInWithGoogle, signOut, getCurrentUser, getSession
- Google OAuth already configured
- Auth context available via `src/contexts/AuthContext.tsx`

**Subscription Service** (`src/services/subscription.ts`):
- Tiers: 'free', 'premium', 'pro'
- Methods: getSubscription, getTier, canPerformAction, trackUsage, createSubscription, cancelSubscription
- Integrates with PayPal subscriptions
- Database tables: platform_subscriptions, tool_limits, tool_usage

**MCP Tools Registry** (`src/services/mcp-registry.ts`):
- Use `useTool(namespace, toolName, params)` to call tools
- Use `searchAvailableTools(keyword)` to discover tools
- Tools are organized by namespace (auth, subscription, paypal, etc.)

**Database Schema** (Supabase):
- `platform_subscriptions`: User subscription management
- `tool_limits`: Tier-based limits per tool
- `tool_usage`: Usage tracking across all tools
- All tables have RLS (Row Level Security) policies
- User ID references `auth.users(id)`

### Styling Requirements

**CRITICAL**: Follow the style guide in `SITE_STYLE_GUIDE.md`. Key points:
- **Always dark theme**: Pure black background (#000000), white text
- **Borders**: Use `border-white/10` with `hover:border-white/30`
- **Buttons**: 
  - Primary: `bg-white text-black font-semibold rounded-lg hover:bg-white/90`
  - Secondary: `bg-black border border-white/10 rounded-lg text-white hover:border-white/30`
- **Cards**: `bg-black border border-white/10 rounded-lg p-6`
- **Modals**: `bg-black/80 backdrop-blur-sm` backdrop, `bg-black border border-white/10 rounded-lg` content
- **Spacing**: Use Tailwind spacing scale (gap-4, p-4, mb-4, etc.)
- **Typography**: Inter font, use opacity variants (text-white/80, text-white/60)
- **No light mode**: Force dark theme always

### Environment Variables Pattern

**Frontend (Vite)**:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key
- `VITE_TIKTOK_DOWNLOADER_URL` - Backend API URL (if needed)

**Backend/API Routes**:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - For admin operations
- PayPal credentials (if payment features needed)

### API Route Pattern (Vercel)

Create API routes in `/api/[feature]/[...path].js`:
- Use Vercel serverless functions
- Proxy to Railway backend if needed (see `api/tiktok/[...path].js` example)
- Set CORS headers appropriately
- Handle authentication via Supabase session

### Component Structure

```
src/
  components/
    [feature]/          # Feature-specific components
      ComponentName.tsx
  pages/
    FeaturePage.tsx     # Route pages
  services/
    [feature].ts        # Business logic / API calls
  servers/
    [feature]/          # Server-side tools (for MCP registry)
      index.ts
```

### Authentication Pattern

```typescript
import { useAuth } from '../contexts/AuthContext'

function MyComponent() {
  const { user, loading, signOut } = useAuth()
  
  if (loading) return <Loading />
  if (!user) return <AuthModal />
  
  // User is authenticated
}
```

### Subscription Check Pattern

```typescript
import { useAuth } from '../contexts/AuthContext'
import { subscriptionService } from '../services/subscription'

function MyComponent() {
  const { user } = useAuth()
  const [tier, setTier] = useState<'free' | 'premium' | 'pro'>('free')
  
  useEffect(() => {
    if (user) {
      subscriptionService.getTier(user.id).then(setTier)
    }
  }, [user])
  
  // Check limits before actions
  const canPerform = await subscriptionService.canPerformAction(
    user.id, 
    'tool-id', 
    'action-name'
  )
}
```

### Payment Integration Pattern

For PayPal payments:
1. Use MCP tools registry: `useTool('paypal', 'createOrder', params)`
2. Or create API route that handles PayPal SDK
3. Update subscription via `subscriptionService.createSubscription()`
4. Store `paypal_subscription_id` in database

### Database Access Pattern

**Client-side (React)**:
```typescript
import { supabase } from '../lib/supabase'

const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', user.id)
```

**Server-side (API routes)**:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
```

### Error Handling Pattern

```typescript
try {
  const result = await someService.method()
  if (result.error) {
    showError(result.error.message)
    return
  }
  // Success
} catch (error) {
  showError(error instanceof Error ? error.message : 'An error occurred')
}
```

### Toast Notifications

```typescript
import { useToast } from '../components/Toast'

const { success, error, info, warning } = useToast()

success('Operation completed!')
error('Something went wrong')
```

## PROJECT REQUIREMENTS

[DESCRIBE YOUR SPECIFIC PROJECT HERE]

### Required Features:
- [Feature 1]
- [Feature 2]
- [Feature 3]

### Integration Points:
- [ ] User authentication (use existing AuthContext)
- [ ] Subscription checks (use subscriptionService)
- [ ] Payment processing (PayPal via MCP tools or API routes)
- [ ] Database operations (Supabase with RLS)
- [ ] Styling (follow SITE_STYLE_GUIDE.md)

## IMPLEMENTATION CHECKLIST

Please ensure:
- [ ] All components follow the dark theme style guide
- [ ] Authentication is handled via existing AuthContext
- [ ] Database tables follow existing schema patterns
- [ ] RLS policies are created for new tables
- [ ] API routes follow Vercel serverless function patterns
- [ ] Error handling uses toast notifications
- [ ] Subscription checks are implemented where needed
- [ ] PayPal integration follows existing patterns (if payments needed)
- [ ] MCP tools are registered if creating reusable tools
- [ ] Environment variables are documented
- [ ] TypeScript types are properly defined
- [ ] Components are responsive (mobile-first)

## QUESTIONS TO CONSIDER

Before implementing, please:
1. Identify which existing services/components can be reused
2. Determine if new database tables are needed (and their RLS policies)
3. Plan API routes structure if backend logic is needed
4. Consider subscription tier restrictions for features
5. Plan error handling and user feedback flows

Start by analyzing the existing codebase structure and then propose an implementation plan that integrates seamlessly with the current infrastructure.
```

---

## Usage Instructions

### For New Projects:

1. **Copy the template above**
2. **Fill in the PROJECT REQUIREMENTS section** with your specific needs
3. **Customize the Required Features** list
4. **Paste into Google AI Studio** or your AI assistant
5. **Reference specific files** if the AI needs more context

### For Specific Integrations:

#### Adding PayPal Payments:
```
Add to prompt: "Integrate PayPal payment processing using the existing MCP tools registry pattern. 
Reference the subscription service for handling payment callbacks and updating user tiers."
```

#### Adding Database Tables:
```
Add to prompt: "Create new Supabase tables following the existing schema pattern in database-schema.sql. 
Ensure RLS policies are created so users can only access their own data. Reference auth.users(id) for user relationships."
```

#### Adding New Tools:
```
Add to prompt: "Create a new tool following the MCP registry pattern. Register it in src/services/mcp-registry.ts 
and create server-side implementation in src/servers/[tool-name]/index.ts following the auth/subscription pattern."
```

#### Styling New Components:
```
Add to prompt: "Style all components according to SITE_STYLE_GUIDE.md. Use the dark theme exclusively with 
black backgrounds, white text, and border-white/10 borders. Reference existing components like AuthModal.tsx 
or ToolsDashboard.tsx for styling patterns."
```

---

## Quick Reference: Common Patterns

### Creating a New Page
```typescript
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'

export default function NewPage() {
  const { user, loading } = useAuth()
  
  if (loading) return <div>Loading...</div>
  
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Your content */}
      </div>
    </Layout>
  )
}
```

### Creating an API Route
```typescript
// api/[feature]/[...path].js
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  // Your logic here
  
  res.json({ success: true })
}
```

### Creating a Service
```typescript
// src/services/[feature].ts
import { supabase } from '../lib/supabase'

export class FeatureService {
  async getData(userId: string) {
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('user_id', userId)
    
    if (error) throw error
    return data
  }
}

export const featureService = new FeatureService()
```

---

## Environment Setup Reminder

When deploying, ensure these environment variables are set:

**Vercel Environment Variables:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL` (for API routes)
- `SUPABASE_SERVICE_ROLE_KEY` (for API routes)
- PayPal credentials (if needed)

**Railway Environment Variables:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- PayPal credentials
- Any other backend-specific vars

---

## Tips for Better AI Collaboration

1. **Be Specific**: Instead of "add payments", say "integrate PayPal subscriptions using the existing subscriptionService pattern"

2. **Reference Files**: Point to specific files like "follow the pattern in src/services/subscription.ts"

3. **Show Examples**: "Use the same modal pattern as AuthModal.tsx"

4. **Iterate**: Start with structure, then refine styling, then add features

5. **Test Integration**: Always verify new code works with existing auth/subscription systems

6. **Document**: Ask the AI to document new patterns if they differ from existing ones

---

This prompt ensures your AI assistant understands your infrastructure and builds new features that integrate seamlessly with your existing platform.
