/**
 * Every admin walkthrough, in one place.
 *
 * A tour is a list of steps. Each step outlines one element — found by its
 * `data-tour="<target>"` attribute — dims everything else, and explains it.
 * A step can first move the page: `route` navigates there, `panel` opens a
 * console panel on /admin (null closes whichever is open).
 *
 * SHIPPING A NEW ADMIN FEATURE? Add a tour here with `announce` set to the
 * date it shipped, and put `data-tour` attributes on what it points at. The
 * dashboard then shows a NEW FEATURE pop-up once, with GO to start the
 * walkthrough, and the tour stays in the SAGE MODE tutorial library after.
 */

export interface TourStep {
  /** `data-tour` value to outline. Omit for a centred card with no outline. */
  target?: string;
  title: string;
  /** Paragraphs separated by a blank line. */
  body: string;
  /** Path to be on first (pathname only). */
  route?: string;
  /** Console panel to open on /admin first; null closes the open one. */
  panel?: string | null;
  /** Shown instead of the outline when the target is not on screen. */
  missingNote?: string;
}

export interface Tour {
  id: string;
  title: string;
  summary: string;
  group: 'new' | 'dashboard' | 'console';
  /** ISO date the feature shipped. Set → announced once on the dashboard. */
  announce?: string;
  steps: TourStep[];
}

const dashboardTour: Tour = {
  id: 'dashboard-basics',
  title: 'The Dashboard',
  summary: 'The board, the header buttons, the console dock and how to rearrange it all.',
  group: 'dashboard',
  steps: [
    {
      route: '/admin',
      panel: null,
      target: 'admin-title',
      title: 'Admin Dashboard',
      body: 'Everything that runs the platform starts here. This tour shows where things are; every tool in the console has its own tutorial in SAGE MODE.',
    },
    {
      target: 'admin-actions',
      title: 'Header Buttons',
      body: 'DEBUG REPORT copies a report of recent errors, API calls and server logs. Paste it into an agent session when something breaks.\n\nThe bell shows deployments. The white square is your profile.',
      missingNote: 'On a phone these sit behind the ••• button at the top right.',
    },
    {
      target: 'widget-grid',
      title: 'The Board',
      body: 'Each tile is live: revenue, analytics, registry, CRM, notifications, clock, calendar, weather.\n\nTap or hold a tile to open its full view. Long-press the calendar for the master calendar. Hold the clock for the stopwatch and timer.',
    },
    {
      target: 'dock',
      title: 'Platform Console',
      body: 'Every admin tool lives in this dock: galleries, blog, newsletter, mail, users, crew, affiliates, bookings, calendar, CRM, invoices, products, print shop, support, settings. Hover an icon to see its name. A red badge means something needs you.',
    },
    {
      target: 'dock-edit-layout',
      title: 'Edit Layout',
      body: 'Rearrange and resize the tiles on the board. The layout is saved in this browser.',
    },
    {
      target: 'sage-toggle',
      title: 'Tutorials Live In SAGE MODE',
      body: 'Tap the triangle to turn SAGE MODE on, then tap TUTORIALS above it. Every tool in the console has a walkthrough there, and new features show up first.',
    },
  ],
};

/** One tutorial per console tool: the dock icon, then the open panel. */
const consoleTools: { id: string; title: string; summary: string; inside: string }[] = [
  {
    id: 'gallery',
    title: 'Gallery',
    summary: 'Create galleries, manage photos, pricing, client access and live events.',
    inside: 'Tabs across the top: Active Galleries, All Photos, Applications, Downloads and Tags.\n\nA new gallery needs a name, a URL slug and its Google Drive folder. Set pricing and bundles, mark it private, and invite clients by email. LIVE EVENT opens the camera-to-gallery console.',
  },
  {
    id: 'clientuploads',
    title: 'Content Requests',
    summary: 'Ask someone for photos or files with a link, then review what comes back.',
    inside: 'Mint a link per person you need content from: a client, a contributor, a photographer. Copy it into an email or have the platform send it.\n\nWhen files arrive, review them here. COPY BRIEF gives a plain-text list of every file and where it lives, ready to hand to an agent.',
  },
  {
    id: 'blog',
    title: 'Blog',
    summary: 'The Lost Archives: posts, analytics, search and social settings.',
    inside: 'Write, edit, organise and unpublish posts in The Lost Archives. Blog Analytics shows how posts are read, and Search & Social sets how a post appears on Google and when shared.',
  },
  {
    id: 'newsletter',
    title: 'Newsletter',
    summary: 'Compose a campaign, pick recipients, send a test, then send.',
    inside: 'Compose the newsletter, choose who gets it under Recipient Selection, and look anyone up in the Subscriber Index.\n\nSend a test to yourself first. The branded template is applied for you.',
  },
  {
    id: 'mail',
    title: 'Webmail',
    summary: 'The business inbox: read, reply, compose and search, with attachments.',
    inside: 'The full Zoho inbox inside the dashboard: Inbox, Sent, Drafts, Compose and Search, with attachments. Media correspondence should CC media@thelostandunfounds.com.',
  },
  {
    id: 'users',
    title: 'Users',
    summary: 'Everyone with an account, their tier and their admin status.',
    inside: 'Every account on the platform. Filter by tier (Free or Premium), see who is an admin, when they joined and whether they are active. Tap a user for their details.',
  },
  {
    id: 'roster',
    title: 'Photographer Roster',
    summary: 'Who can you send tonight? Crew searchable by name and by gear.',
    inside: 'The crew, read as a deployment tool. Search matches gear as well as names, so typing "gimbal" shows who owns one.\n\nEach card shows kit by category and when it was last confirmed. If a kit is a year old, text before you book.',
  },
  {
    id: 'affiliates',
    title: 'Affiliates',
    summary: 'The affiliate program: affiliates, earnings, payouts and flags.',
    inside: 'Every affiliate, what they have earned and what has been paid out. Flagged, suspicious and rate-limited activity shows here too.\n\nShares are a percentage of profit (price minus cost), never of the gross.',
  },
  {
    id: 'submissions',
    title: 'Submissions',
    summary: 'Blog posts writers have sent in, waiting for your review.',
    inside: 'Posts submitted by writers wait here until you approve or reject them. The badge on the dock icon counts how many are pending. When nothing is waiting, the panel says so.',
  },
  {
    id: 'bookings',
    title: 'Bookings',
    summary: 'Booking requests, quotes, deposits and payment status.',
    inside: 'Each booking shows the date, time, location, type, quoted total and where the money stands: deposit paid or paid in full.\n\nNEW QUOTE builds a quote, VIEW PDF opens the invoice, and admin notes stay private. MANAGE INVOICES at the top jumps to Invoices.',
  },
  {
    id: 'calendar',
    title: 'Calendar',
    summary: 'The master calendar: bookings, events, blocked days and crew time off.',
    inside: 'Bookings, events, blocked days and crew out, all on one calendar, with notes per day.\n\nShortcuts: long-press the calendar tile on the board, or tap the date in the site header.',
  },
  {
    id: 'crm',
    title: 'CRM',
    summary: 'Every client and lead, searchable by name, business, email and phone.',
    inside: 'The contact directory: name, business, email and phone. MANAGE INVOICES at the top jumps to Invoices.',
  },
  {
    id: 'invoices',
    title: 'Invoices',
    summary: 'Every invoice and its status: draft, sent, paid, overdue.',
    inside: 'All invoices with their status (DRAFT, SENT, PAID, OVERDUE) and totals collected. Invoices are generated from their data, never written by hand. ← CRM goes back to contacts.',
  },
  {
    id: 'pricing',
    title: 'Products',
    summary: 'Shop products and what each one costs you.',
    inside: 'Set the cost of each shop product. A product with no cost set shows it. Cost matters: every affiliate share is a percentage of profit, and profit is price minus this cost.',
  },
  {
    id: 'printshop',
    title: 'Print Shop',
    summary: 'Prints for sale, their Prodigi SKU and cost, and print orders.',
    inside: 'Add a print with its artwork, title, category, price, Prodigi SKU and Prodigi cost, plus mat and mount options.\n\nPrint orders show below. A red badge on the dock icon means an order failed at Prodigi.',
  },
  {
    id: 'support',
    title: 'Support',
    summary: 'Technical support tickets from affiliates, photographers, clients and the contact form.',
    inside: 'Active shows open and in-progress tickets. NEEDS REPLY means the person spoke last.\n\nOpen a ticket to read the thread, reply (they get it by email) and set its status. Tick Internal note to write something only you will see.',
  },
  {
    id: 'settings',
    title: 'Settings',
    summary: 'Platform health, tool status, SAGE MODE, design system and QR codes.',
    inside: 'Platform status and health (database, API, auth, storage), tool usage, and links to SAGE MODE, the Design System and the QR code tools.',
  },
];

const consoleTours: Tour[] = consoleTools.map(tool => ({
  id: `console-${tool.id}`,
  title: tool.title,
  summary: tool.summary,
  group: 'console',
  steps: [
    {
      route: '/admin',
      panel: null,
      target: `dock-${tool.id}`,
      title: tool.title,
      body: `${tool.summary}\n\nThis is its icon in the Platform Console. NEXT opens it.`,
    },
    {
      panel: tool.id,
      target: 'panel-header',
      title: tool.title,
      body: 'The panel opens over the dashboard. DASHBOARD at the top, or the X, takes you back.',
    },
    {
      target: 'panel-body',
      title: 'What You Do Here',
      body: tool.inside,
    },
  ],
}));

const liveEventTour: Tour = {
  id: 'live-event-galleries',
  title: 'Live Event Galleries',
  summary: 'Photos from the camera land in a private inbox during an event. You pick the keepers and publish them to the gallery while guests watch it fill.',
  group: 'new',
  announce: '2026-10-23',
  steps: [
    {
      route: '/admin',
      panel: null,
      target: 'dock-gallery',
      title: 'Live Event Galleries',
      body: 'During an event, send photos from your phone\'s camera roll and they appear in the gallery live, named and credited automatically. Photos a camera sends on its own wait in a private inbox for you to review first.\n\nIt lives under Gallery.',
    },
    {
      panel: 'gallery',
      target: 'gallery-live-link',
      title: 'Open Live Event',
      body: 'LIVE, the green button at the top of Gallery Management, opens the live console.',
    },
    {
      route: '/admin/live',
      target: 'live-gallery-picker',
      title: 'Pick The Gallery',
      body: 'Choose the event\'s gallery now. The outlined box still works while the tour runs, and the next steps point at what appears once a gallery is picked.\n\nA gallery that is already live has — LIVE after its name.',
    },
    {
      target: 'live-camera-roll',
      title: 'Send From Camera Roll',
      body: 'Let your camera app drop the shots into your phone\'s photos, then tap CHOOSE PHOTOS and pick the keepers. They go straight into the gallery — no review — named @tlau.media_thelostandunfounds_….',
      missingNote: 'Pick a gallery above first. This section appears once one is chosen.',
    },
    {
      target: 'live-keys',
      title: 'Upload Links',
      body: 'Make a link for each extra shooter. Pick them from your crew list, or type a guest\'s Instagram, so their photos are named and credited to them. Send it right away, because it is shown once.\n\nA link can only add photos to this gallery. It cannot delete or see anything. Turn it off when the event ends.',
      missingNote: 'Pick a gallery above first. The links section appears once one is chosen.',
    },
    {
      target: 'live-go',
      title: 'Go Live',
      body: 'GO LIVE tells the guests\' gallery page to keep checking for new photos. END LIVE when the event is over.',
      missingNote: 'Pick a gallery above first. GO LIVE appears at the top right once one is chosen.',
    },
    {
      target: 'live-inbox',
      title: 'The Review Inbox',
      body: 'Photos a camera sends on its own wait here for review. Camera-roll uploads skip it and go live straight away.\n\nTap a photo to select it, or tap VIEW to see it full size.',
      missingNote: 'Pick a gallery above first. The inbox appears once one is chosen.',
    },
    {
      title: 'Publish Or Discard',
      body: 'Selecting photos brings up a bar at the bottom.\n\nPUBLISH moves them into the gallery, live for guests. DISCARD deletes them from Google Drive for good, with no undo.\n\nThere is no "discard everything unselected" on purpose: photos keep arriving while you review, and a new one would be deleted unseen.',
    },
  ],
};

const qrWallpaperTour: Tour = {
  id: 'gallery-qr-wallpaper',
  title: 'Gallery QR Codes & Wallpapers',
  summary: 'Download a QR code for any gallery, or put it on a photo to make a phone wallpaper people can scan.',
  group: 'new',
  announce: '2026-10-26',
  steps: [
    {
      route: '/admin',
      panel: 'gallery',
      target: 'gallery-qr-button',
      title: 'QR Code Button',
      body: 'Every gallery in the list has a QR button. It opens a pop-up for that gallery\'s link.\n\nThe pop-up has three steps: choose the QR style, add a photo, then place the QR on it.',
      missingNote: 'Open a gallery list under Gallery Management. Each row has a QR button.',
    },
    {
      title: 'Step 1: Style',
      body: 'Pick SQUARE or ROUNDED, and BLACK ON WHITE or WHITE ON BLACK. DOWNLOAD QR saves the plain code as a print-size PNG.\n\nMAKE WALLPAPER moves on to the photo.',
    },
    {
      title: 'Step 2: Photo',
      body: 'Choose a photo, then drag it to move it and pinch (or scroll, or use the slider) to zoom. The frame is a phone screen, so what you see is what the wallpaper keeps.',
    },
    {
      title: 'Step 3: Place The QR',
      body: 'Drag the QR code where you want it and pinch to resize it, separately from the photo. DOWNLOAD WALLPAPER saves a full-size phone wallpaper. On a phone, SAVE TO PHOTOS puts it straight in your camera roll.',
    },
  ],
};

const supportTour: Tour = {
  id: 'support-tickets',
  title: 'Support Tickets',
  summary: 'Affiliates, photographers and clients can open a support ticket. You answer from the console and they get your reply by email.',
  group: 'new',
  announce: '2026-10-26',
  steps: [
    {
      route: '/admin',
      panel: null,
      target: 'dock-support',
      title: 'Support Tickets',
      body: 'Anyone can open a ticket now: from GET HELP on the affiliate and photographer dashboards, the Support page, or the Contact form.\n\nEach new ticket and each reply emails support@. The red badge on this icon counts tickets waiting on you.',
    },
    {
      panel: 'support',
      target: 'support-filters',
      title: 'The Queue',
      body: 'Active is everything open or in progress. NEEDS REPLY marks the ones where the person spoke last. Resolved, Closed and All are the history.',
    },
    {
      target: 'support-list',
      title: 'Open A Ticket',
      body: 'Tap a ticket for the whole thread: who sent it, whether they are an affiliate or photographer, the page they were on and their browser.',
      missingNote: 'No tickets yet. The list appears here once one arrives.',
    },
    {
      target: 'support-reply',
      title: 'Reply',
      body: 'Your reply is emailed to them, with a link back to the ticket so they can answer. "Reply and resolve" sends and closes it out in one step.\n\nTick Internal note to keep something to yourself. Notes are never emailed or shown to them.',
      missingNote: 'Open a ticket first. The reply box sits under the thread.',
    },
    {
      target: 'support-status',
      title: 'Status',
      body: 'OPEN, IN PROGRESS, RESOLVED, CLOSED. A reply from them on a resolved ticket reopens it. A closed ticket takes no more replies.',
      missingNote: 'Open a ticket first. The status buttons are at the top of it.',
    },
  ],
};

const halftoneTour: Tour = {
  id: 'gallery-screen-generator',
  title: 'Screen Generator',
  summary: 'Turn a photo into a halftone film positive for screen printing, with triangle or 3 dots and your own text.',
  group: 'new',
  announce: '2026-10-27',
  steps: [
    {
      route: '/admin',
      panel: 'gallery',
      target: 'gallery-screens-button',
      title: 'Screens Button',
      body: 'SCREENS, at the top of Gallery Management, opens the screen generator. It turns a photo into a black and white halftone film for burning a screen.\n\nIt has three steps: PHOTO, TEXT, SCREEN.',
      missingNote: 'Open Gallery Management from the console. SCREENS sits in the row of buttons at the top, next to LIVE.',
    },
    {
      title: 'Step 1: Photo',
      body: 'Pick the canvas, 18 × 24 or 8.5 × 11, and choose a photo. The page turns with the photo: a horizontal photo gets a landscape page, a vertical one a portrait page.\n\nThe whole photo prints at its own shape (3:2 from a Fujifilm), never cropped. PHOTO SIZE, a pinch or a scroll resizes it proportionally; drag to move it. BRIGHTNESS and CONTRAST set the tones, and WHITE INK inverts it for light ink on a dark shirt.',
    },
    {
      title: 'Step 2: Text',
      body: 'Optional. Type text ABOVE and BELOW the photo — a name, a date, a place. It is set in Inter, the site typeface, in REGULAR, BOLD or BLACK, and prints in solid ink.\n\nThe text stays centred on the photo and moves with it. A line too wide for the page shrinks to fit, and a warning shows if the text runs off the page.',
    },
    {
      target: 'halftone-dot-shape',
      title: 'Step 3: Screen',
      body: 'Choose TRIANGLES or 3s for the dots. The DOT DETAIL box shows the real film pixels. Drag the preview to look at a different part.\n\nThe settings start at 250 mesh, 55 LPI and 22.5°. Dots below 5% are dropped and tones above 95% print solid, so every dot holds on press.',
      missingNote: 'Open the generator and go to 3 · SCREEN to see these settings.',
    },
    {
      title: 'Download The Film',
      body: 'DOWNLOAD FILM saves a 1-bit PNG at 360 DPI, black where ink prints, with the DPI set in the file so it prints at true size. Choose MIRRORED if your film goes emulsion side down.',
    },
  ],
};

export const TOURS: Tour[] = [halftoneTour, supportTour, qrWallpaperTour, liveEventTour, dashboardTour, ...consoleTours];

export function getTour(id: string): Tour | undefined {
  return TOURS.find(t => t.id === id);
}

/** Announced tours, newest first. */
export function announcedTours(): Tour[] {
  return TOURS.filter(t => t.announce).sort((a, b) => (b.announce! < a.announce! ? -1 : 1));
}

/** Window event that opens (string) or closes (null) a console panel on /admin. */
export const ADMIN_PANEL_EVENT = 'tlu:admin-panel';
