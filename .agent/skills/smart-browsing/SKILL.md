---
name: smart-browsing
description: Strict guidelines for browsing: single tab only, patience for loading, and visible UI confirmation.
---

# Smart Browsing Guidelines

**Use this skill when:**
- Performing ANY browser-based task.
- Interacting with JavaScript-heavy websites.
- Troubleshooting page load issues.

## 1. Single Tab Policy (CRITICAL)
- **Use ONLY a single tab** for the entire session.
- **Do NOT open additional tabs** under any circumstances.
- Reuse the existing tab for all navigation.

## 2. Page Load Protocol
- **Patience is Key:** If a page appears slow, **WAIT** for it to finish loading.
- **No Premature Timeouts:** Do not assume a timeout unless the User explicitly says "retry".
- **Definition of "Loaded":**
  - The DOM is visible AND
  - Network activity has settled OR
  - 15 seconds have passed (whichever comes first).
- **Initial Renders:** JavaScript-heavy sites often have initial blank or partial renders. **Wait for visible UI elements** before deciding the page failed.

## 3. Failure Handling
- If the page fails to load (after waiting/verifying):
  - **STOP** immediately.
  - **Report the issue** containing:
    - The URL.
    - Observation (e.g., "Screen remained white for 15s", "Error 500 received").
  - **Do NOT retry** automatically unless explicitly instructed.
