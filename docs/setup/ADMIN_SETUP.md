# Admin Setup Guide

## Setting Up Admin User

Follow these steps to set up admin@thelostandunfounds.com as an admin user:

### Step 1: Run Database Setup SQL

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run the SQL from `admin-setup.sql` to create the `user_roles` table

### Step 2: Create Admin User Account

1. **Sign up through the app:**
   - Go to your app (http://localhost:3000)
   - Click "LOG IN" in the menu
   - Click "Sign Up" tab
   - Enter email: `admin@thelostandunfounds.com`
   - Enter a secure password
   - Click "Sign Up"

2. **Grant admin privileges:**

   **Option A: Using Supabase Dashboard (Recommended)**
   - Go to Supabase Dashboard → Authentication → Users
   - Find `admin@thelostandunfounds.com`
   - Copy the User ID
   - Go to SQL Editor and run:
   ```sql
   INSERT INTO user_roles (user_id, email, is_admin)
   VALUES ('PASTE_USER_ID_HERE', 'admin@thelostandunfounds.com', true)
   ON CONFLICT (user_id) DO UPDATE SET is_admin = true;
   ```

   **Option B: Using Script (Requires Service Key)**
   - Set `SUPABASE_SERVICE_ROLE_KEY` in your `.env.local` file
   - Run: `npx tsx scripts/create-admin-user.ts`

### Step 3: Update User Metadata (Optional)

Run this SQL to also set admin in user metadata:

```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'admin@thelostandunfounds.com';
```

### Step 4: Verify Admin Access

1. Log out if you're logged in
2. Log in with `admin@thelostandunfounds.com`
3. You should see "Admin Dashboard" in the menu
4. Navigate to `/admin` to access the dashboard

## Password Management

### Change Password

1. Log in as admin
2. Go to Settings page (`/settings`)
3. Click "Change Password" in Security section
4. Enter new password and confirm
5. Click "Update Password"

### Reset Password (If Forgotten)

1. Go to login page
2. Click "Forgot Password" (if implemented)
3. Or use Supabase Dashboard → Authentication → Users → Reset Password

## Admin Features

The admin dashboard includes:

- **Overview**: Platform statistics and metrics
- **Users**: User management (coming soon)
- **Subscriptions**: Subscription management (coming soon)
- **Settings**: Platform configuration (coming soon)

## Security Notes

- Admin routes are protected and require authentication
- Admin status is checked on both client and server side
- Only users with `is_admin = true` in `user_roles` table can access admin pages
- Always use strong passwords for admin accounts

