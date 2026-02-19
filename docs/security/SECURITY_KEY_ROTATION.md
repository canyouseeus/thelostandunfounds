# 🚨 URGENT: Key Rotation Required

## What Happened
A Supabase anon key was accidentally exposed in chat/terminal output.

**Action**: Rotate the key immediately using the steps below.

## ⚠️ ACTION REQUIRED: Rotate Immediately

### Steps to Rotate (Do This Now):

1. **Go to Supabase Dashboard**:
   https://supabase.com/dashboard/project/nonaqhllakrckbtbawrb/settings/api-keys

2. **Generate New Publishable Key**:
   - Look for "Project API keys" section
   - Find the **"Publishable key"** (starts with `sb_publishable_...`)
   - Click **"Reset"** or **"Regenerate"** button
   - **Copy the new key immediately** (you won't see it again)

3. **Update All Locations** (Do ALL of these):

   **A. Vercel Environment Variables** (Production):
   - Go to: https://vercel.com/joshua-greenes-projects/thelostandunfounds/settings/environment-variables
   - Find `VITE_SUPABASE_ANON_KEY`
   - Click "Edit" → Paste new key → Save
   - **Vercel will auto-redeploy** (wait for deployment to complete)

   **B. Local `.env.local`** (Development):
   - Open `thelostandunfounds/.env.local`
   - Replace the old `VITE_SUPABASE_ANON_KEY` value with the new key
   - Save the file
   - Restart dev server: `npm run dev`

   **C. Any Other Services**:
   - Check if any other services/apps use this key
   - Update them with the new key

4. **Verify Everything Works**:
   - ✅ Test local development (run `npm run dev`, check console)
   - ✅ Test production deployment (visit https://thelostandunfounds.com)
   - ✅ Check browser console for Supabase errors
   - ✅ Test email signup form (if configured)

## 🔒 Prevention Measures

- ✅ **NEVER** show actual keys in chat/terminal output
- ✅ **ALWAYS** use placeholders (`your_supabase_anon_key_here`)
- ✅ **NEVER** commit `.env.local` (already in `.gitignore`)
- ✅ **ALWAYS** mask keys in documentation and examples
- ✅ **ALWAYS** check terminal output before sharing

## 📝 Notes

- The anon/publishable key is public-facing (less sensitive than service role keys)
- However, rotation is **strongly recommended** after exposure
- The old key will stop working after rotation (that's the point!)
- Make sure to update **both** Vercel and `.env.local` or your app will break

## ⏱️ Timeline

- **Immediate**: Rotate the key in Supabase dashboard
- **Within 5 minutes**: Update Vercel environment variables
- **Within 10 minutes**: Update `.env.local` and test locally
- **Within 15 minutes**: Verify production site still works

---

**Status**: ⚠️ **ACTION REQUIRED** - Key exposed, rotation needed

