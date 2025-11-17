# Fourthwall Webhook Events Guide

## 🎯 Recommended Events for Affiliate Program

### **Required (Must Have)**
- ✅ **Order updated** - Handles all order state changes (created, fulfilled, cancelled)
  - This is the main event for affiliate commissions
  - Covers: order.created, order.fulfilled, order.cancelled

### **Optional but Useful**
- ✅ **Product (offer) created** - Track new products (could sync to your database)
- ✅ **Product (offer) updated** - Track product changes (price, availability, etc.)
- ✅ **Subscription purchased** - If you offer subscriptions (future feature)
- ✅ **Subscription expired** - Track subscription lifecycle
- ✅ **Subscription changed** - Handle subscription updates

### **Probably Not Needed (Unless You Use These Features)**
- ❌ **Gift purchase** - Only if you have gift products
- ❌ **Donation** - Only if you accept donations
- ❌ **Newsletter subscribed** - You might handle this separately
- ❌ **Thank you sent** - Internal Fourthwall feature
- ❌ **Gift draw started/ended** - Only if you run gift draws
- ❌ **Promotion created/updated/status changed** - Only if you manage promotions via webhooks
- ❌ **Platform app disconnected** - System event, probably not needed

## 💡 Recommendation

**Start with these 3-4 events:**
1. ✅ **Order updated** (REQUIRED - for affiliate commissions)
2. ✅ **Product (offer) created** (useful for syncing products)
3. ✅ **Product (offer) updated** (useful for keeping products in sync)
4. ✅ **Subscription purchased** (if you plan to offer subscriptions)

**Why not all?**
- More events = more webhook calls = more server load
- You can always add more events later
- Some events might not be relevant to your use case
- Fewer events = easier debugging

## 🔄 Adding Events Later

You can always:
1. Go back to Fourthwall dashboard
2. Edit the webhook
3. Add more events
4. The webhook handler will automatically handle new event types (or you can add handlers)

## 📝 Current Webhook Handler Support

The current handler (`/api/webhooks/fourthwall.ts`) supports:
- ✅ `order.created`
- ✅ `order.fulfilled`
- ✅ `order.updated`
- ✅ `order.cancelled`

**To add support for other events**, you would need to:
1. Add handlers in the webhook file
2. Implement the logic for each event type

## 🎯 My Recommendation

**For now, select:**
- ✅ Order updated (REQUIRED)
- ✅ Product (offer) created (useful)
- ✅ Product (offer) updated (useful)

**Skip for now:**
- Everything else (you can add later if needed)

This gives you:
- ✅ Affiliate commission tracking (Order updated)
- ✅ Product sync capability (Product created/updated)
- ✅ Room to grow (can add more later)

**You can always add more events later** - it's easy to edit the webhook in Fourthwall dashboard!

