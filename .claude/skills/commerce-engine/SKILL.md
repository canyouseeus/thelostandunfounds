---
name: commerce-engine
description: Governs the shop, product catalog, and transaction logic. Use when working on Shop.tsx, checkout, orders, payments, or Stripe integrations.
---

# Commerce Engine Skill

This skill manages the commercial "Noir" marketplace and financial transactions.

## Shop & Product Hygiene
- **Product Definition**: Every product in the shop must have a "Noir" aesthetic image, clear description, and pricing tied to the `products` table in Supabase.
- **Shadow Board**: Use the "Shadow Board" pipeline logic from `CRM_PRD_NOIR.md` to move leads/orders through `DISCOVERY` → `WON`.

## Transaction Flow (Stripe)

**Stripe is the payment processor. PayPal is retired — do not add PayPal code paths.**

- **Checkout**: Stripe Checkout Sessions (`stripe.checkout.sessions.create`). The photo/print path
  also accepts `strike` as an alternative `paymentMethod`; everything else is Stripe.
- **Security**: Confirm payment before granting access or calculating commissions. Payment
  confirmation arrives via the Stripe webhook — `lib/api-handlers/_stripe-webhook-handler.ts`,
  verified with `STRIPE_WEBHOOK_SECRET`. Never grant access off a client-side redirect alone.
- **Commissions**: Triggered on confirmed payment, with `available_date` set to +30 days (holding
  period).
- **Payouts**: Affiliate payouts go through **Stripe Connect** —
  `lib/api-handlers/affiliates/connect-onboarding.ts` and `_stripe-client.ts`.
- **Redirection**: Stripe returns to the URLs in `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL`.
  Render stark, mechanical UI feedback.
- **Taxes**: Ensure tax calculations follow the country-specific rules defined in the checkout logic.

> **Legacy column names.** Several tables still have `paypal_order_id` and `paypal_email` columns
> from the PayPal era. They are filled with Stripe session IDs (or `''`) and are **not** evidence
> of a PayPal integration. Don't "fix" them by adding PayPal, and don't rename them without a
> migration — `paypal_email` is still `NOT NULL` on legacy schemas.

## UI/UX Rules
- **Direct Action**: Minimize friction. One-click transitions between pipeline stages.
- **Card Styling**: Every product card is a **borderless** surface — `bg-white/5` against the pure-black page. Inactive states are `opacity: 0.6`. Hover raises the surface to `bg-white/10`; it never adds an outline, ring, or glow. (No `border-*` classes anywhere — see `no-border-design`.)
- **Forms**: Inputs are borderless — `bg-white/5` with `focus:bg-white/10`. No bottom-border rule. Labels are small and uppercase.
