# Setting Supabase Environment Variables via CLI

## Quick Setup

### Step 1: Get Your Anon Key
Go to: https://supabase.com/dashboard/project/nonaqhllakrckbtbawrb/settings/api-keys
Copy the **Publishable key** (starts with `sb_publishable_...`)

### Step 2: Set Local Environment Variables

**Option A: Interactive script**
```bash
cd /Users/canyouseeus/Desktop/SCOT33/thelostandunfounds
./scripts/setup-supabase-env.sh
```

**Option B: Manual commands**
```bash
cd /Users/canyouseeus/Desktop/SCOT33/thelostandunfounds

# Replace YOUR_KEY_HERE with your actual key
cat > .env.local << EOF
VITE_SUPABASE_URL=https://nonaqhllakrckbtbawrb.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_KEY_HERE
EOF
```

### Step 3: Set Vercel Environment Variables

```bash
# Login to Vercel (if not already)
vercel login

# Link project (if not already)
vercel link

# Set environment variables (replace YOUR_KEY_HERE)
echo "https://nonaqhllakrckbtbawrb.supabase.co" | vercel env add VITE_SUPABASE_URL production preview development
echo "YOUR_KEY_HERE" | vercel env add VITE_SUPABASE_ANON_KEY production preview development

# Verify
vercel env ls

# Redeploy
vercel --prod
```

## One-Liner Setup Script

Run the helper script:
```bash
cd /Users/canyouseeus/Desktop/SCOT33/thelostandunfounds
chmod +x scripts/setup-supabase-env.sh
./scripts/setup-supabase-env.sh
```

## Verify Setup

**Check local:**
```bash
cat .env.local
```

**Check Vercel:**
```bash
vercel env ls
```

**Test locally:**
```bash
npm run dev
```

