# Email Notification System

## Overview

This system sends email notifications when:
1. **New subscriptions** are created
2. **New blog contributor accounts** are created (users with subdomains)

## Implementation

### API Handlers

1. **`lib/api-handlers/_new-subscription-notification-handler.ts`**
   - Sends email notification when a new subscription is created
   - Endpoint: `/api/admin/new-subscription-notification`
   - Receives: `userId`, `tier`, `subscriptionId`, `userEmail` (optional)

2. **`lib/api-handlers/_new-blog-contributor-notification-handler.ts`**
   - Sends email notification when a new blog contributor account is created
   - Endpoint: `/api/admin/new-blog-contributor-notification`
   - Receives: `userId`, `subdomain` (optional), `userEmail` (optional)
   - Only sends notification if user has a subdomain (is a blog contributor)

### Integration Points

1. **Subscription Creation** (`src/servers/subscription/index.ts`)
   - Automatically sends notification after successful subscription creation
   - Fire-and-forget (doesn't block subscription creation if email fails)

2. **User Signup** (`src/contexts/AuthContext.tsx`)
   - Checks if new user has a subdomain after signup
   - Sends notification if user is a blog contributor
   - Fire-and-forget (doesn't block signup if email fails)

## Configuration

### Environment Variables

The notification emails are sent to the email address specified in:
- `NOTIFICATION_EMAIL` (defaults to `admin@thelostandunfounds.com`)

Set this in your `.env.local` or Vercel environment variables:

```bash
NOTIFICATION_EMAIL=your-notification-email@example.com
```

### Zoho Mail Configuration

The system uses Zoho Mail API for sending emails. Ensure these are configured:
- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_REFRESH_TOKEN`
- `ZOHO_FROM_EMAIL` or `ZOHO_EMAIL`

## Email Content

### New Subscription Notification

Includes:
- User email
- Subscription tier (Free/Premium/Pro)
- Subscription ID
- Date/time

### New Blog Contributor Notification

Includes:
- User email
- Subdomain
- Blog URL
- User ID
- Date/time

## Testing

### Test Subscription Notification

Create a subscription through the normal flow - notification will be sent automatically.

### Test Blog Contributor Notification

1. Sign up a new user account
2. Ensure the user has a subdomain in `user_subdomains` table
3. Notification will be sent automatically

### Manual Testing

You can manually trigger notifications via API:

```bash
# Test subscription notification
curl -X POST https://your-domain.com/api/admin/new-subscription-notification \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "tier": "premium",
    "subscriptionId": "sub-uuid"
  }'

# Test blog contributor notification
curl -X POST https://your-domain.com/api/admin/new-blog-contributor-notification \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "subdomain": "username",
    "userEmail": "user@example.com"
  }'
```

## Error Handling

- Notifications are sent asynchronously (fire-and-forget)
- Errors are logged but don't block the main operation
- If email sending fails, the subscription/user creation still succeeds
- Check server logs for email sending errors

## Future Enhancements

Potential improvements:
- Add retry logic for failed emails
- Store notification history in database
- Add notification preferences (email frequency, types)
- Support multiple notification recipients
- Add webhook support for external integrations














