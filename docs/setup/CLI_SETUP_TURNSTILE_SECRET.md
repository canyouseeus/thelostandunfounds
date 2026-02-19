# Setting Turnstile Secret Key via CLI

## Step-by-Step Instructions

### Step 1: Login to Supabase
```bash
cd /Users/canyouseeus/Desktop/SCOT33/thelostandunfounds
npx supabase login
```
This will open a browser window for you to authenticate.

### Step 2: Link Your Project
```bash
npx supabase link --project-ref nonaqhllakrckbtbawrb
```

### Step 3: Set the Secret Key
```bash
npx supabase secrets set TURNSTILE_SECRET_KEY=your_secret_key_here
```
Replace `your_secret_key_here` with your actual Turnstile Secret Key from Cloudflare.

### Step 4: Verify (Optional)
```bash
npx supabase secrets list
```
This will show all your secrets (values are hidden for security).

---

## Quick Command Reference

```bash
# Navigate to project
cd /Users/canyouseeus/Desktop/SCOT33/thelostandunfounds

# Login (opens browser)
npx supabase login

# Link project
npx supabase link --project-ref nonaqhllakrckbtbawrb

# Set secret (replace with your actual key)
npx supabase secrets set TURNSTILE_SECRET_KEY=your_actual_secret_key_here

# Verify
npx supabase secrets list
```

---

## Notes

- Use `npx supabase` instead of `supabase` since it's installed locally
- The secret key will be synced to your Supabase project
- Works for both local testing and production automatically
- Secret values are hidden when listing (for security)


