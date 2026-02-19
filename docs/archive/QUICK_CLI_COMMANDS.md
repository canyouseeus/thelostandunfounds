# Quick CLI Commands for Supabase Setup

## Install Vercel CLI (if needed)

**Option 1: Use npx (no installation needed)**
```bash
# Just use npx vercel instead of vercel
npx vercel login
npx vercel env add ...
```

**Option 2: Install globally (requires sudo)**
```bash
sudo npm install -g vercel
```

## Set Local Environment Variables

**Option 1: Using the script (easiest)**
```bash
cd /Users/canyouseeus/Desktop/SCOT33/thelostandunfounds
./scripts/setup-supabase-env.sh
```

**Option 2: Manual commands**
```bash
cd /Users/canyouseeus/Desktop/SCOT33/thelostandunfounds

# Replace YOUR_KEY_HERE with your actual key
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://nonaqhllakrckbtbawrb.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_KEY_HERE
EOF
```

## Set Vercel Environment Variables

**First, login and link (use npx if vercel not installed):**
```bash
cd /Users/canyouseeus/Desktop/SCOT33/thelostandunfounds

# Use npx if vercel command not found
npx vercel login
npx vercel link
```

**Then set variables (replace YOUR_KEY_HERE):**
```bash
# Set URL
echo "https://nonaqhllakrckbtbawrb.supabase.co" | npx vercel env add VITE_SUPABASE_URL production preview development

# Set Anon Key
echo "YOUR_KEY_HERE" | npx vercel env add VITE_SUPABASE_ANON_KEY production preview development

# Verify
npx vercel env ls
```

## Common Issues Fixed

### Issue: "zsh: unknown file attribute: i"
**Problem**: macOS `sed` requires `-i ''` not just `-i`
**Solution**: Use the script or `cat` command instead

### Issue: "zsh: command not found: vercel"
**Problem**: Vercel CLI not installed
**Solution**: Use `npx vercel` instead, or run `sudo npm install -g vercel` (requires password)

### Issue: "zsh: command not found: #"
**Problem**: Copying comment lines as commands
**Solution**: Only run actual commands, not comments

## Quick One-Liner (Local Only)

```bash
cd /Users/canyouseeus/Desktop/SCOT33/thelostandunfounds && cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://nonaqhllakrckbtbawrb.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_KEY_HERE
EOF
```

## Verify Setup

```bash
# Check local file
cat .env.local

# Check Vercel (if set)
npx vercel env ls

# Test locally
npm run dev
```

