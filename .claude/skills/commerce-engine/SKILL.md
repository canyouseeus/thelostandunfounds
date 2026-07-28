---
name: commerce-engine
description: Governs the shop, product catalog, and transaction logic. Use when working on Shop.tsx, PaymentSuccess.tsx, or PayPal integrations.
---

# Commerce Engine Skill

This skill manages the commercial "Noir" marketplace and financial transactions.

## Shop & Product Hygiene
- **Product Definition**: Every product in the shop must have a "Noir" aesthetic image, clear description, and pricing tied to the `products` table in Supabase.
- **Shadow Board**: Use the "Shadow Board" pipeline logic from `CRM_PRD_NOIR.md` to move leads/orders through `DISCOVERY` → `WON`.

## Transaction Flow (PayPal)
- **Security**: Always capture payments before granting access or calculating commissions.
- **Commissions**: Triggered upon successful capture, with `available_date` set to +30 days (holding period).
- **Redirection**: Handle `/payment-success` and `/payment-cancel` with stark, mechanical UI feedback.
- **Taxes**: Ensure tax calculations follow the country-specific rules defined in the checkout logic.

## UI/UX Rules
- **Direct Action**: Minimize friction. One-click transitions between pipeline stages.
- **Card Styling**: Every product card is a **borderless** surface — `bg-white/5` against the pure-black page. Inactive states are `opacity: 0.6`. Hover raises the surface to `bg-white/10`; it never adds an outline, ring, or glow. (No `border-*` classes anywhere — see `no-border-design`.)
- **Forms**: Inputs are borderless — `bg-white/5` with `focus:bg-white/10`. No bottom-border rule. Labels are small and uppercase.
