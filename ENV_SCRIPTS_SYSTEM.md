# Environment Variables Script System

## Overview

This project uses an automated script generation system for managing environment variables. This ensures consistency, validation, and ease of setup across all services.

## Quick Start

### 1. Generate Setup Script
```bash
npm run generate-env-script <service-name>
```

### 2. Run Setup Script
```bash
./scripts/setup-<service-name>-env.sh
```

### 3. Validate Setup
```bash
npm run validate-env
```

## Available Services

- `supabase` - Supabase database and authentication
- `turnstile` - Cloudflare Turnstile bot protection
- `telegram` - Telegram bot integration
- `openai` - OpenAI API integration

## Commands Reference

### Generate Scripts
```bash
# Generate script for a service
npm run generate-env-script supabase
npm run generate-env-script turnstile
npm run generate-env-script telegram
npm run generate-env-script openai
```

### Validate Environment Variables
```bash
# Check all (local + Vercel)
npm run validate-env

# Check only local .env.local
npm run validate-env:local

# Check only Vercel
npm run validate-env:vercel
```

## Files

- `scripts/generate-env-script.js` - Script generator (Node.js)
- `scripts/validate-env.sh` - Validation script (Bash)
- `scripts/setup-*-env.sh` - Generated setup scripts (one per service)
- `.cursorrules-env-scripts` - Cursor IDE rules for this system

## How It Works

1. **Generator** (`generate-env-script.js`):
   - Reads service definitions from `ENV_DEFINITIONS`
   - Generates interactive bash scripts
   - Includes validation and Vercel integration

2. **Setup Scripts** (`setup-*-env.sh`):
   - Prompt for environment variables
   - Validate input formats
   - Create/update `.env.local`
   - Optionally set Vercel variables

3. **Validator** (`validate-env.sh`):
   - Checks `.env.local` file exists
   - Validates all required variables are set
   - Checks variable formats
   - Verifies Vercel variables (if configured)

## Adding New Services

Edit `scripts/generate-env-script.js` and add to `ENV_DEFINITIONS`:

```javascript
newservice: {
  name: 'New Service',
  description: 'Service description',
  required: [
    {
      key: 'NEW_SERVICE_KEY',
      description: 'Key description',
      defaultValue: 'default',
      getFrom: 'https://example.com',
      validation: (value) => value.length > 0,
    },
  ],
  optional: [],
},
```

Then generate:
```bash
npm run generate-env-script newservice
```

## Best Practices

1. ✅ Always use the generator for new services
2. ✅ Run validation after setting variables
3. ✅ Never commit actual keys to git
4. ✅ Use placeholders in documentation
5. ✅ Validate before deployment

## Examples

### Complete Setup Flow
```bash
# 1. Generate Supabase setup script
npm run generate-env-script supabase

# 2. Run setup (interactive)
./scripts/setup-supabase-env.sh

# 3. Validate
npm run validate-env

# 4. Start dev server
npm run dev
```

### Quick Validation
```bash
# Check if everything is set up correctly
npm run validate-env

# Output:
# ✅ VITE_SUPABASE_URL is set
# ✅ VITE_SUPABASE_ANON_KEY is set
# ✅ All required environment variables are set correctly!
```

## Troubleshooting

**"Script not found"**
- Run: `npm run generate-env-script <service-name>` first

**"Permission denied"**
- Run: `chmod +x scripts/setup-*-env.sh`

**"Validation fails"**
- Check `.env.local` exists
- Verify no placeholder values
- Run setup script again

**"Vercel validation fails"**
- Install Vercel CLI: `npm install -g vercel` or use `npx vercel`
- Login: `vercel login`
- Link project: `vercel link`

