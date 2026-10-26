---
name: gallery-ops
description: Governs the digital photo gallery, checkout flows, secure asset delivery, and Google Drive integrations. Use when working on gallery pages, photo purchases, download portal, or image sync workflows.
---

# Gallery Operations & Delivery Standard

This skill defines the mandatory architecture for The Lost+Unfounds digital gallery, specifically regarding the purchase and delivery lifecycle.

## 1. Purchase Flow Architecture
The checkout process must ALWAYS follow this circular journey:

1.  **Origin**: User selects photos in a specific gallery (e.g., `/gallery/kattitude-tattoo`).
2.  **Checkout**: User hits "Secure Checkout".
    *   **Payload**: Must include `librarySlug` to identify the origin.
    *   **Return URL**: Backend MUST append `?library={slug}` to the Stripe success URL.
3.  **Payment**: User pays via Stripe Checkout (the print path also accepts `strike`).
4.  **Capture**: User returns to `/payment/success`.
5.  **Delivery Redirection (CRITICAL)**:
    *   The Success Page MUST read the `library` query parameter.
    *   It MUST redirect the user BACK to the specific gallery (e.g., `/gallery/kattitude-tattoo`), NOT the generic shop.
    *   **Redirect Time**: 3 seconds max transition.

## 2. Asset Delivery Mechanism
Delivery is dual-channel: **Instant Access** + **Email Backup**.

### A. Instant Access (The "Unlock")
*   Upon returning to the gallery, the frontend `PhotoGallery.tsx` checks `fetchPurchasedAssets` against Supabase.
*   **Visual Changes**:
    *   Watermarks are removed.
    *   "PROPRIETARY" badge (Green) is applied.
    *   Download buttons become available.
*   **Security**: Direct downloads use `/api/gallery/stream` to pipe content from Google Drive without exposing raw Drive links.

### B. Email Backup ("The Vault")
*   **Trigger**: Sent immediately by `local-server.js` upon successful capture.
*   **Subject**: "Your Photos Are Ready - THE LOST+UNFOUNDS"
*   **Content**:
    *   Primary link goes to the Gallery (`/gallery/{slug}`).
    *   Resend/Recovery links go to the Download Portal (`/downloads/{order_id}`).

## 3. Code Standards

### Backend (`local-server.js`)
*   **Return URL**: Always construct as: `http://localhost:3000/payment/success?library=${librarySlug}`
*   **Email Link**: Always check `librarySlug` existence before generating the CTA link.

### Frontend (`PaymentSuccess.tsx`)
*   **Navigation**: Never hardcode `/shop`. Always check for `searchParams.get('library')` first.
    ```typescript
    const librarySlug = searchParams.get('library');
    const redirectPath = librarySlug ? `/gallery/${librarySlug}` : '/shop';
    navigate(redirectPath);
    ```

## 4. Google Drive Integration
*   **Proxying**: All images are served via `/api/gallery/stream`.
*   **Privacy**: Images in Drive must be "Anyone with the link can view".
*   **CORS**: The proxy bypasses standard Drive CORS issues by piping the stream server-side.

## 5. Live Events (camera → review inbox → gallery)
Photos sent from a camera during an event never go straight to the gallery. They wait in a
**private review inbox** until the owner publishes them from **`/admin/live?slug=<gallery>`**
(reached from the admin dashboard: Gallery Management → the green **LIVE** header button, or the
radio icon on each gallery row under Active Galleries).

*   **Phone is the bridge — no laptop.** The camera's own app (Canon Camera Connect, Fujifilm XApp,
    Nikon SnapBridge, Sony Creators' App) drops frames into the phone's camera roll; the owner sends
    them with **SEND FROM CAMERA ROLL** on `/admin/live`, a photographer with their **upload link**
    (`/live/upload#tlu_live_…`, minted under UPLOAD LINKS — key in the fragment, never in a server
    log). Both use `src/components/live/LiveUploader.tsx`: direct PUT to the Drive session, and on a
    CORS refusal it switches to `/api/gallery/ingest-chunk` (4MB chunks relayed by us; the relay only
    ever targets `www.googleapis.com/upload/drive/v3/files?upload_id=…`).
*   **Photographers run their own live galleries** from `/photographer-dashboard` → LIVE GALLERIES
    (`src/components/live/MyLiveGalleries.tsx`, route `/api/gallery/my-live`). Create makes a public,
    live gallery they own (`owner_id` = their user id, own Drive folder under
    `PHOTOGRAPHER_LIVE_DRIVE_FOLDER_ID` / `LIVE_INBOX_DRIVE_FOLDER_ID` / Drive root, $5 default
    price). "Photographer" = an **active** `photographers` row whose `user_id` is the session user;
    checked server-side only (`verifiedPhotographer`) since that table is admin-only under RLS. They
    can upload to, and go live / end live on, galleries they own — nothing else.
*   **Camera-roll uploads publish immediately — no review** (owner's call, 2026-10-26: they are
    hand-picked). LiveUploader sends `ingest-complete { publish: true }`. The review inbox is for
    automatic sends only (FTP relay, watcher), which omit `publish`.

*   **Upload** (`POST /api/gallery/ingest-start` → PUT bytes to the returned Drive URL →
    `POST /api/gallery/ingest-complete`). Auth is a per-gallery **ingest key** (`Bearer tlu_live_…`,
    minted on the live page, only its SHA-256 stored) or the admin session. A key can only add to
    its own gallery's inbox: it cannot publish, delete, read anything, or pass `verifyAdmin`.
*   **Inbox** = a Drive folder **outside** the gallery folder (`gallery_live_inboxes`), so neither
    guests nor the scheduled sync can see a pending photo. Pending rows live in
    `gallery_ingest_pending`. Both tables are service-role only (RLS on, no policies).
*   **Publish** moves the file into the gallery folder and writes the row through
    `ingestUploadedPhoto` (same `upsertPhoto` + fingerprint as the sync, so the sync skips it).
*   **Discard** permanently deletes the Drive file (no trash) and drops the row. Nothing is kept.
*   **Previews** of pending photos go through admin-only `/api/gallery/live-preview`, never the
    public `/api/gallery/stream`.
*   **Live gallery**: `photo_libraries.live_mode` makes the gallery page poll for newly published
    photos every 10s, keyed on `updated_at` (server time), not `created_at` (capture time).
*   Drive writes use the owner's OAuth refresh token. If uploads fail with Google 403
    `insufficientPermissions`, that token only has read-only Drive scope — re-consent it with full
    Drive scope; it is not a code bug.
*   Harness: `npx tsx scripts/verify-gallery-ingest.mts`.
