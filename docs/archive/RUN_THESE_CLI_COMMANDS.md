# CLI Commands to Set Turnstile Secret Key

## ⚠️ Run These Commands in Your Terminal

Since login requires browser authentication, please run these commands manually in your terminal:

### Step 1: Navigate to Project
```bash
cd /Users/canyouseeus/Desktop/SCOT33/thelostandunfounds
```

### Step 2: Login to Supabase
```bash
npx supabase login
```
**Note**: This will open a browser window. Complete the authentication there.

### Step 3: Link Your Project
```bash
npx supabase link --project-ref nonaqhllakrckbtbawrb
```

### Step 4: Set the Secret Key
```bash
npx supabase secrets set TURNSTILE_SECRET_KEY=your_actual_secret_key_here
```
**Replace `your_actual_secret_key_here` with your Turnstile Secret Key from Cloudflare.**

### Step 5: Verify (Optional)
```bash
npx supabase secrets list
```
This will show all secrets (values are hidden for security).

---

## 📋 Complete Command Sequence

Copy and paste these commands one at a time in your terminal:

```bash
# 1. Navigate
cd /Users/canyouseeus/Desktop/SCOT33/thelostandunfounds

# 2. Login (opens browser)
npx supabase login

# 3. Link project
npx supabase link --project-ref nonaqhllakrckbtbawrb

# 4. Set secret (REPLACE with your actual key!)
npx supabase secrets set TURNSTILE_SECRET_KEY=YOUR_ACTUAL_SECRET_KEY_HERE

# 5. Verify
npx supabase secrets list
```

---

## 🔑 Where to Get Your Secret Key

1. Go to: https://dash.cloudflare.com/?to=/:account/turnstile
2. Find your Turnstile site
3. Copy the **Secret Key** (NOT the Site Key)
4. Use it in Step 4 above

---

## ✅ Success Indicators

- After `npx supabase login`: Browser opens and you authenticate successfully
- After `npx supabase link`: Shows "Linked to project nonaqhllakrckbtbawrb"
- After `npx supabase secrets set`: Shows "Secret TURNSTILE_SECRET_KEY set"
- After `npx supabase secrets list`: Shows `TURNSTILE_SECRET_KEY` in the list

---

**Ready?** Run these commands in your terminal now!


