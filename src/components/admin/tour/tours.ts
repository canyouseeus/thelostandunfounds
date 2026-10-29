/**
 * Every admin walkthrough, in one place.
 *
 * A tour is a list of steps. Each step outlines ONE real control — found by
 * its `data-tour="<target>"` attribute — dims everything else, and says what
 * to do with it. A step can first move the page: `route` navigates there,
 * `panel` opens a console panel on /admin (null closes whichever is open).
 * A step with `action: 'click'` waits for the reader to tap the control (NEXT
 * taps it for them), so the tour walks INTO whatever opens: a panel, a tab, a
 * form, a pop-up. That is the difference between walking someone through a
 * tool and describing it to them.
 *
 * Copy: name the thing, say what to do, stop. One control per step.
 *
 * SHIPPING A NEW ADMIN FEATURE? Add a tour here with `announce` set to the
 * date it shipped, and put `data-tour` attributes on what it points at. The
 * dashboard then shows a NEW FEATURE pop-up once, with GO to start the
 * walkthrough, and the tour stays in the SAGE MODE tutorial library after.
 * A step whose target is missing is skipped, so a step pointing at something
 * that only exists with data (a ticket, a booking) is safe.
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
  /**
   * Shown when the target never turns up. Without one, a step whose target is
   * missing is skipped.
   */
  missingNote?: string;
  /**
   * 'click': the step asks you to tap the target; doing it (or NEXT, which
   * taps it for you) moves the tour on into whatever it opens.
   * 'choose': the target is a select or input; picking something moves on.
   */
  action?: 'click' | 'choose';
}

/**
 * Which dashboard a tour belongs to. Admin tours live in the SAGE MODE library;
 * every other dashboard has its own ? button and first-visit WELCOME pop-up
 * (see TourHelpButton and WhatsNewModal), because SAGE MODE is admin-only.
 */
export type DashboardId = 'admin' | 'member' | 'photographer';

export interface Tour {
  id: string;
  title: string;
  summary: string;
  /** Defaults to 'admin'. */
  dashboard?: DashboardId;
  /** The dashboard's first-visit walkthrough: offered once with WELCOME + GO. */
  intro?: boolean;
  group: 'new' | 'dashboard' | 'console';
  /** ISO date the feature shipped. Set → announced once on the dashboard. */
  announce?: string;
  steps: TourStep[];
}

/** Step 1 of any tour that starts in a console panel: tap its dock icon. */
const openFromDock = (panel: string, title: string, body: string): TourStep => ({
  route: '/admin',
  panel: null,
  target: `dock-${panel}`,
  action: 'click',
  title,
  body,
});

/** A step inside a console panel; reopens it if the reader closed it. */
const inPanel = (panel: string, step: TourStep): TourStep => ({ panel, ...step });

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
      body: 'Everything that runs the site starts here.',
    },
    {
      target: 'admin-actions',
      title: 'Header Buttons',
      body: 'DEBUG REPORT copies recent errors and logs. Paste it to an agent when something breaks.\n\nThe bell is deployments. The white square is your profile.',
    },
    {
      target: 'widget-grid',
      title: 'The Board',
      body: 'Live tiles. Tap or hold a tile to open it. Hold the calendar for the master calendar, and the clock for the stopwatch and timer.',
    },
    {
      target: 'dock',
      title: 'Platform Console',
      body: 'Every tool lives in this dock. A red number on an icon means something is waiting on you.',
    },
    {
      target: 'dock-edit-layout',
      title: 'Edit Layout',
      body: 'Move and resize the tiles. Saved in this browser.',
    },
    {
      target: 'sage-toggle',
      title: 'Tutorials',
      body: 'Turn SAGE MODE on here, then tap TUTORIALS. Every tool has a walkthrough.',
    },
  ],
};

/* ── One walkthrough per console tool ─────────────────────────────────── */

const galleryTour: Tour = {
  id: 'console-gallery',
  title: 'Gallery',
  summary: 'Create galleries, manage photos, pricing, client access and live events.',
  group: 'console',
  steps: [
    openFromDock('gallery', 'Gallery', 'Tap the Gallery icon to open it.'),
    inPanel('gallery', { target: 'gallery-tab-galleries', action: 'click', title: 'Active Galleries', body: 'Tap ACTIVE GALLERIES to see every gallery you have made.' }),
    inPanel('gallery', { target: 'gallery-row', title: 'A Gallery', body: 'One row per gallery: its link and photo count, then LIVE, QR, VIEW, RENAME and DELETE.' }),
    inPanel('gallery', { target: 'gallery-tab-photos', action: 'click', title: 'All Photos', body: 'Tap ALL PHOTOS for every photo across every gallery.' }),
    inPanel('gallery', { target: 'gallery-tab-applications', title: 'Applications', body: 'Photographers asking to join. A red number means some are waiting.' }),
    inPanel('gallery', { target: 'gallery-health', title: 'Health', body: 'Checks that every photo still loads from Google Drive.' }),
    inPanel('gallery', { target: 'gallery-live-link', title: 'Live', body: 'The live event console, for publishing photos during an event.' }),
    inPanel('gallery', { target: 'gallery-screens-button', title: 'Screens', body: 'The screen generator, for halftone films.' }),
    inPanel('gallery', { target: 'gallery-new', action: 'click', title: 'New Gallery', body: 'Tap NEW to start a gallery.' }),
    inPanel('gallery', { target: 'gallery-form-name', title: 'Name And Link', body: 'Name it. The slug is its address: /gallery/your-slug.' }),
    inPanel('gallery', { target: 'gallery-form-pricing', title: 'Pricing', body: 'What a single photo, a bundle and the whole gallery cost.' }),
    inPanel('gallery', { target: 'gallery-form-private', title: 'Private', body: 'Tick it to keep the gallery off the public list. Only clients you invite get in.' }),
    inPanel('gallery', { target: 'gallery-form-source', title: 'Photos', body: 'Link its Google Drive folder, or drag photos in.' }),
    inPanel('gallery', { target: 'gallery-form-save', title: 'Create', body: 'CREATE GALLERY saves it. CANCEL closes the form.' }),
  ],
};

const contentRequestsTour: Tour = {
  id: 'console-clientuploads',
  title: 'Content Requests',
  summary: 'Ask someone for photos or files with a link, then review what comes back.',
  group: 'console',
  steps: [
    openFromDock('clientuploads', 'Content Requests', 'Tap the Content Requests icon to open it.'),
    inPanel('clientuploads', { target: 'cr-new', action: 'click', title: 'New Request', body: 'Tap NEW REQUEST.' }),
    inPanel('clientuploads', { target: 'cr-form', title: 'Who And What', body: 'Who you are asking, what it is for, their email and how long the link lasts. The note shows on their upload page.' }),
    inPanel('clientuploads', { target: 'cr-create', title: 'Create The Link', body: 'Makes their upload link and its Drive folder.' }),
    inPanel('clientuploads', { target: 'cr-copy', title: 'Copy Link', body: 'Copy it into a text or email.' }),
    inPanel('clientuploads', { target: 'cr-email', title: 'Email It', body: 'Or have the site email it to them.' }),
    inPanel('clientuploads', { target: 'cr-files', title: 'What They Sent', body: 'Opens their files. COPY BRIEF lists every file and where it lives, ready for an agent.' }),
    inPanel('clientuploads', { target: 'cr-revoke', title: 'Revoke', body: 'Turns the link off. ENABLE turns it back on.' }),
  ],
};

const blogTour: Tour = {
  id: 'console-blog',
  title: 'Blog',
  summary: 'The Lost Archives: find, write, edit and publish posts.',
  group: 'console',
  steps: [
    openFromDock('blog', 'Blog', 'Tap the Blog icon to open it.'),
    inPanel('blog', { target: 'blog-analytics', title: 'Blog Analytics', body: 'Views, readers, where they come from and which posts they finish. Tap it any time.' }),
    inPanel('blog', { target: 'blog-archives', action: 'click', title: 'The Lost Archives', body: 'Tap THE LOST ARCHIVES to see every post.' }),
    inPanel('blog', { target: 'blog-stats', title: 'At A Glance', body: 'Totals, drafts, and posts still missing their SEO.' }),
    inPanel('blog', { target: 'blog-search', title: 'Search', body: 'Find a post by title, slug, tag or byline.' }),
    inPanel('blog', { target: 'blog-filters', title: 'Filter', body: 'All, published or drafts, then by column and sort order.' }),
    inPanel('blog', { target: 'blog-edit', title: 'Edit', body: 'Opens that post in the editor.' }),
    inPanel('blog', { target: 'blog-duplicate', title: 'Duplicate', body: 'Copies a post as a new draft.' }),
    inPanel('blog', { target: 'blog-new', action: 'click', title: 'New Post', body: 'Tap NEW POST.' }),
    inPanel('blog', { target: 'blog-form-title', title: 'Title', body: 'The headline. Its slug becomes the address.' }),
    inPanel('blog', { target: 'blog-form-content', title: 'Write', body: 'The post itself.' }),
    inPanel('blog', { target: 'blog-form-seo', title: 'Search & Social', body: 'How it shows on Google and when shared: description, image, keywords. The preview shows it.' }),
    inPanel('blog', { target: 'blog-save-draft', title: 'Save Draft', body: 'Saves it without publishing.' }),
    inPanel('blog', { target: 'blog-publish', title: 'Publish', body: 'Puts it live in The Lost Archives. CANCEL leaves the editor.' }),
  ],
};

const newsletterTour: Tour = {
  id: 'console-newsletter',
  title: 'Newsletter',
  summary: 'Write a campaign, pick who gets it, test it, then send.',
  group: 'console',
  steps: [
    openFromDock('newsletter', 'Newsletter', 'Tap the Newsletter icon to open it.'),
    inPanel('newsletter', { target: 'nl-stats', title: 'Subscribers', body: 'Tap TOTAL SUBSCRIBERS for the full list.' }),
    inPanel('newsletter', { target: 'nl-compose', action: 'click', title: 'Compose', body: 'Tap COMPOSE NEWSLETTER to open the editor.' }),
    inPanel('newsletter', { target: 'nl-subject', title: 'Subject', body: 'The subject line.' }),
    inPanel('newsletter', { target: 'nl-content', title: 'Write It', body: 'A blank line starts a new paragraph. The branded template is added for you.' }),
    inPanel('newsletter', { target: 'nl-preview', title: 'Preview', body: 'See it the way subscribers will.' }),
    inPanel('newsletter', { target: 'nl-recipients', title: 'Recipients', body: 'Everyone gets it unless you pick specific people here.' }),
    inPanel('newsletter', { target: 'nl-schedule', title: 'Schedule', body: 'Tick it to send later, then pick a date and time.' }),
    inPanel('newsletter', { target: 'nl-test', title: 'Send A Test', body: 'Send it to yourself first.' }),
    inPanel('newsletter', { target: 'nl-send', title: 'Send', body: 'Sends it to everyone selected.' }),
  ],
};

const mailTour: Tour = {
  id: 'console-mail',
  title: 'Webmail',
  summary: 'The business inbox: read, reply, compose and search.',
  group: 'console',
  steps: [
    openFromDock('mail', 'Webmail', 'Tap the Webmail icon to open it.'),
    inPanel('mail', { target: 'mail-folder', title: 'Folders', body: 'Inbox, Sent, Drafts and the rest.' }),
    inPanel('mail', { target: 'mail-folder-toggle', title: 'Folders', body: 'Tap here to switch folders.' }),
    inPanel('mail', { target: 'mail-search', title: 'Search', body: 'Type and press Enter.' }),
    inPanel('mail', { target: 'mail-message', action: 'click', title: 'Open A Message', body: 'Tap a message to read it.' }),
    inPanel('mail', { target: 'mail-reply', title: 'Reply', body: 'Reply, or FORWARD next to it. CC media@thelostandunfounds.com on client mail.' }),
    inPanel('mail', { target: 'mail-compose', action: 'click', title: 'Compose', body: 'Tap COMPOSE for a new message.' }),
    inPanel('mail', { target: 'mail-draft', title: 'Save Draft', body: 'Keeps it in Drafts.' }),
    inPanel('mail', { target: 'mail-send', title: 'Send', body: 'Sends it.' }),
  ],
};

const usersTour: Tour = {
  id: 'console-users',
  title: 'Users',
  summary: 'Everyone with an account, their tier and their admin status.',
  group: 'console',
  steps: [
    openFromDock('users', 'Users', 'Tap the Users icon to open it.'),
    inPanel('users', { target: 'users-stats', title: 'At A Glance', body: 'Contributors, active users and premium users.' }),
    inPanel('users', { target: 'users-search', title: 'Search', body: 'By email, username, or what they own.' }),
    inPanel('users', { target: 'users-filters', title: 'Filter', body: 'By tier and by status.' }),
    inPanel('users', { target: 'users-row', title: 'A User', body: 'Tick to select. Tap for their blog, galleries and details.' }),
  ],
};

const rosterTour: Tour = {
  id: 'console-roster',
  title: 'Photographer Roster',
  summary: 'Who can you send tonight? Crew searchable by name and by gear.',
  group: 'console',
  steps: [
    openFromDock('roster', 'Photographer Roster', 'Tap the Roster icon to open it.'),
    inPanel('roster', { target: 'roster-tabs', title: 'Roster And Requests', body: 'ROSTER is your crew. REQUESTS are people asking to join.' }),
    inPanel('roster', { target: 'roster-search', title: 'Search By Gear', body: 'Type gear, like gimbal or drone, to see who owns it.' }),
    inPanel('roster', { target: 'roster-card', title: 'A Crew Member', body: 'Their kit by category and when they last confirmed it. Old kit is worth a text before a booking.' }),
    inPanel('roster', { target: 'roster-copy', title: 'Kit Link', body: 'Copies their kit-list page so they can update it.' }),
  ],
};

const affiliatesTour: Tour = {
  id: 'console-affiliates',
  title: 'Affiliates',
  summary: 'The affiliate program: affiliates, earnings, payouts and flags.',
  group: 'console',
  steps: [
    openFromDock('affiliates', 'Affiliates', 'Tap the Affiliates icon to open it.'),
    inPanel('affiliates', { target: 'aff-message', title: 'Message Affiliates', body: 'Email all your affiliates, or some of them.' }),
    inPanel('affiliates', { target: 'aff-card-summary', title: 'Overview', body: 'Clicks, conversions and money paid out. Every card opens to the detail.' }),
    inPanel('affiliates', { target: 'aff-card-payouts', title: 'Payout Requests', body: 'Transfers affiliates have asked for.' }),
    inPanel('affiliates', { target: 'aff-card-affiliates', action: 'click', title: 'Affiliates', body: 'Tap to see every affiliate.' }),
    inPanel('affiliates', { target: 'aff-affiliate', title: 'An Affiliate', body: 'Their status, Stripe account, earnings, clicks and rate.' }),
    inPanel('affiliates', { target: 'aff-actions', title: 'Change Their Deal', body: 'EDIT RATE, EDIT THRESHOLD, or add a commission by hand. Shares are a percentage of profit, never gross.' }),
  ],
};

const submissionsTour: Tour = {
  id: 'console-submissions',
  title: 'Submissions',
  summary: 'Blog posts writers have sent in, waiting for your review.',
  group: 'console',
  steps: [
    openFromDock('submissions', 'Submissions', 'Tap the Submissions icon to open it.'),
    inPanel('submissions', { target: 'panel-body', title: 'Submissions', body: 'Posts writers send in wait here for you. The number on the icon counts them.' }),
    inPanel('submissions', { target: 'sub-filters', title: 'Filter', body: 'Pending, approved, rejected, published.' }),
    inPanel('submissions', { target: 'sub-review', action: 'click', title: 'Review', body: 'Tap REVIEW on a submission.' }),
    inPanel('submissions', { target: 'sub-column', title: 'Column', body: 'Which blog column it goes in.' }),
    inPanel('submissions', { target: 'sub-save', title: 'Save Revisions', body: 'Keeps your edits.' }),
    inPanel('submissions', { target: 'sub-approve', title: 'Approve', body: 'Accepts it.' }),
    inPanel('submissions', { target: 'sub-reject', title: 'Reject', body: 'Say why. The writer sees your reason.' }),
  ],
};

const bookingsTour: Tour = {
  id: 'console-bookings',
  title: 'Bookings',
  summary: 'Booking requests, quotes, invoices and status.',
  group: 'console',
  steps: [
    openFromDock('bookings', 'Bookings', 'Tap the Bookings icon to open it.'),
    inPanel('bookings', { target: 'book-tabs', title: 'Bookings And Calendar', body: 'BOOKINGS is the list. CALENDAR is where you block days off.' }),
    inPanel('bookings', { target: 'book-filters', title: 'Filter', body: 'By status: pending, confirmed, declined, cancelled.' }),
    inPanel('bookings', { target: 'book-row', action: 'click', title: 'Open A Booking', body: 'Tap a booking for its details.' }),
    inPanel('bookings', { target: 'book-confirm', title: 'Status', body: 'CONFIRM, DECLINE or CANCEL it.' }),
    inPanel('bookings', { target: 'book-quote', title: 'Quick Quote', body: 'A quote with line items.' }),
    inPanel('bookings', { target: 'book-invoice', title: 'Generate Invoice', body: 'Builds the full invoice for this booking.' }),
  ],
};

const calendarTour: Tour = {
  id: 'console-calendar',
  title: 'Calendar',
  summary: 'The master calendar: bookings, events, blocked days and crew time off.',
  group: 'console',
  steps: [
    openFromDock('calendar', 'Calendar', 'Tap the Calendar icon to open it. Holding the calendar tile, or tapping the date in the header, opens it too.'),
    inPanel('calendar', { target: 'cal-modes', title: 'Month, Week, Day', body: 'Switch how much you see.' }),
    inPanel('calendar', { target: 'cal-month', title: 'Pick A Day', body: 'Tap a date. Tap a second one to select a range.' }),
    inPanel('calendar', { target: 'cal-open-day', action: 'click', title: 'Open The Day', body: 'Opens the day you picked: its bookings, events and uploads.' }),
    inPanel('calendar', { target: 'cal-day', action: 'click', title: 'A Day', body: 'Tap a day to open it.' }),
    inPanel('calendar', { target: 'cal-add-booking', title: 'Add Booking', body: 'Put a booking on this day.' }),
    inPanel('calendar', { target: 'cal-notes', title: 'Notes', body: 'Your notes, kept with the calendar.' }),
  ],
};

const crmTour: Tour = {
  id: 'console-crm',
  title: 'CRM',
  summary: 'Every client: their details, what they were billed and what they paid.',
  group: 'console',
  steps: [
    openFromDock('crm', 'CRM', 'Tap the CRM icon to open it.'),
    inPanel('crm', { target: 'crm-totals', title: 'Totals', body: 'Clients, billed, collected and outstanding.' }),
    inPanel('crm', { target: 'crm-client', action: 'click', title: 'A Client', body: 'Tap a client to open them.' }),
    inPanel('crm', { target: 'crm-field', title: 'Their Details', body: 'Name, business, email, phone and notes. Edit any of them.' }),
    inPanel('crm', { target: 'crm-save', title: 'Save', body: 'SAVE CHANGES keeps your edits.' }),
  ],
};

const invoicesTour: Tour = {
  id: 'console-invoices',
  title: 'Invoices',
  summary: 'Every invoice and its status, plus direct bookings and street nights.',
  group: 'console',
  steps: [
    openFromDock('invoices', 'Invoices', 'Tap the Invoices icon to open it.'),
    inPanel('invoices', { target: 'inv-new', title: 'New Invoice', body: 'Start an invoice for a client.' }),
    inPanel('invoices', { target: 'inv-direct', title: 'Direct Booking', body: 'A job booked by phone or email. It splits with affiliates exactly like a website booking.' }),
    inPanel('invoices', { target: 'inv-street', title: 'Street Night', body: 'Log a night of street sales.' }),
    inPanel('invoices', { target: 'inv-row', action: 'click', title: 'An Invoice', body: 'Tap an invoice to open it.' }),
    inPanel('invoices', { target: 'inv-pdf', title: 'View PDF', body: 'The invoice as the client sees it.' }),
    inPanel('invoices', { target: 'inv-send', title: 'Send', body: 'Emails it to the client.' }),
  ],
};

const productsTour: Tour = {
  id: 'console-pricing',
  title: 'Products',
  summary: 'Services and shop products, and what each one costs you.',
  group: 'console',
  steps: [
    openFromDock('pricing', 'Products', 'Tap the Products icon to open it.'),
    inPanel('pricing', { target: 'prod-tabs', title: 'Services And Shop', body: 'Your services, and the shop products.' }),
    inPanel('pricing', { target: 'prod-card', action: 'click', title: 'A Product', body: 'Tap a product to open it.' }),
    inPanel('pricing', { target: 'prod-cost', title: 'Cost', body: 'What it costs you. Profit is price minus cost, and affiliate shares come out of profit.' }),
    inPanel('pricing', { target: 'prod-save', title: 'Save', body: 'Saves the product.' }),
  ],
};

const printShopTour: Tour = {
  id: 'console-printshop',
  title: 'Print Shop',
  summary: 'Prints for sale, their Prodigi SKU and cost, and print orders.',
  group: 'console',
  steps: [
    openFromDock('printshop', 'Print Shop', 'Tap the Print Shop icon to open it.'),
    inPanel('printshop', { target: 'print-tabs', title: 'Catalog, Sizes, Frames, Orders', body: 'CATALOG is what you sell. ORDERS shows every print order. A red number on the icon means one failed at Prodigi.' }),
    inPanel('printshop', { target: 'print-new', title: 'New Print', body: 'Add a print: artwork, title, price, Prodigi SKU and cost.' }),
    inPanel('printshop', { target: 'print-verify', title: 'Verify Catalog', body: 'Checks every SKU with Prodigi and pulls the real costs.' }),
    inPanel('printshop', { target: 'print-sync', title: 'Sync To Stripe', body: 'Sends the catalog to Stripe so it can be bought.' }),
  ],
};

const supportConsoleTour: Tour = {
  id: 'console-support',
  title: 'Support',
  summary: 'Support tickets from affiliates, photographers, clients and the contact form.',
  group: 'console',
  steps: [
    openFromDock('support', 'Support', 'Tap the Support icon to open it.'),
    inPanel('support', { target: 'support-filters', title: 'The Queue', body: 'ACTIVE is everything open. NEEDS REPLY means they spoke last.' }),
    inPanel('support', { target: 'support-list', action: 'click', title: 'Open A Ticket', body: 'Tap a ticket to read the thread.' }),
    inPanel('support', { target: 'support-reply', title: 'Reply', body: 'They get your reply by email. Tick Internal note to write something only you see.' }),
    inPanel('support', { target: 'support-status', title: 'Status', body: 'OPEN, IN PROGRESS, RESOLVED, CLOSED.' }),
  ],
};

const settingsTour: Tour = {
  id: 'console-settings',
  title: 'Settings',
  summary: 'Platform health and shortcuts to SAGE MODE, the design system and QR codes.',
  group: 'console',
  steps: [
    openFromDock('settings', 'Settings', 'Tap the Settings icon to open it.'),
    inPanel('settings', { target: 'settings-status', title: 'Platform Status', body: 'Whether the site, database and services are up.' }),
    inPanel('settings', { target: 'settings-links', title: 'Shortcuts', body: 'SAGE MODE, the Design System and the QR code tools.' }),
  ],
};

const consoleTours: Tour[] = [
  galleryTour, contentRequestsTour, blogTour, newsletterTour, mailTour, usersTour,
  rosterTour, affiliatesTour, submissionsTour, bookingsTour, calendarTour, crmTour,
  invoicesTour, productsTour, printShopTour, supportConsoleTour, settingsTour,
];

/* ── New features ─────────────────────────────────────────────────────── */

const liveEventTour: Tour = {
  id: 'live-event-galleries',
  title: 'Live Event Galleries',
  summary: 'Send photos from your camera roll during an event and they appear in the gallery live. Photos a camera sends on its own wait for you to review.',
  group: 'new',
  announce: '2026-10-23',
  steps: [
    openFromDock('gallery', 'Live Event Galleries', 'Live events start in Gallery. Tap the Gallery icon.'),
    inPanel('gallery', { target: 'gallery-live-link', action: 'click', title: 'Open Live', body: 'Tap LIVE.' }),
    {
      route: '/admin/live',
      target: 'live-gallery-select',
      action: 'choose',
      title: 'Pick The Gallery',
      body: 'Choose the event\'s gallery. One already live has — LIVE after its name.',
    },
    {
      target: 'live-go',
      title: 'Go Live',
      body: 'GO LIVE makes the guests\' gallery page keep checking for new photos. END LIVE when the event is over.',
      missingNote: 'Pick a gallery first. GO LIVE appears once one is chosen.',
    },
    {
      target: 'live-camera-roll',
      title: 'Send From Camera Roll',
      body: 'Let the camera app drop the shots into your phone\'s photos, then tap CHOOSE PHOTOS and pick the keepers. They go straight into the gallery, named and credited.',
      missingNote: 'Pick a gallery first. This appears once one is chosen.',
    },
    {
      target: 'live-keys',
      title: 'Upload Links',
      body: 'A link for each extra shooter. Pick them from your crew, or type a guest\'s Instagram, so their photos are credited to them. Send it right away: it is shown once. Turn it off when the event ends.',
      missingNote: 'Pick a gallery first. This appears once one is chosen.',
    },
    {
      target: 'live-inbox',
      title: 'Review Inbox',
      body: 'Photos a camera sends on its own wait here. Tap one to select it, VIEW to see it full size.\n\nSelecting brings up PUBLISH (into the gallery) and DISCARD (deleted from Drive for good).',
      missingNote: 'Pick a gallery first. The inbox appears once one is chosen.',
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
    openFromDock('gallery', 'Gallery QR Codes', 'QR codes live in Gallery. Tap the Gallery icon.'),
    inPanel('gallery', { target: 'gallery-tab-galleries', action: 'click', title: 'Active Galleries', body: 'Tap ACTIVE GALLERIES.' }),
    inPanel('gallery', {
      target: 'gallery-qr-button',
      action: 'click',
      title: 'QR Button',
      body: 'Tap QR on the gallery you want a code for.',
      missingNote: 'No galleries yet. Make one with NEW first.',
    }),
    { target: 'qr-shape', title: 'Shape', body: 'SQUARE or ROUNDED dots.' },
    { target: 'qr-scheme', title: 'Colours', body: 'BLACK ON WHITE or WHITE ON BLACK.' },
    { target: 'qr-download', title: 'Download QR', body: 'Saves the plain code as a print-size PNG. Or keep going to make a wallpaper.' },
    { target: 'qr-make-wallpaper', action: 'click', title: 'Make A Wallpaper', body: 'Tap MAKE WALLPAPER.' },
    { target: 'qr-choose-photo', title: 'Choose A Photo', body: 'Pick a photo. Then drag it to move it.' },
    { target: 'qr-zoom', title: 'Zoom', body: 'Zoom the photo here, or pinch it. The frame is a phone screen.' },
    {
      target: 'qr-to-place',
      action: 'click',
      title: 'Place The QR',
      body: 'Tap NEXT on the pop-up to put the code on the photo.',
      missingNote: 'Choose a photo first.',
    },
    {
      target: 'qr-size',
      title: 'QR Size',
      body: 'Drag the code where you want it. This sets its size.',
      missingNote: 'Choose a photo, then tap NEXT on the pop-up to place the code.',
    },
    { target: 'qr-download-wallpaper', title: 'Download Wallpaper', body: 'Saves a full-size phone wallpaper.' },
    { target: 'qr-share', title: 'Save To Photos', body: 'On a phone, puts it straight in your camera roll.' },
  ],
};

const supportTour: Tour = {
  id: 'support-tickets',
  title: 'Support Tickets',
  summary: 'Affiliates, photographers and clients can open a support ticket. You answer from the console and they get your reply by email.',
  group: 'new',
  announce: '2026-10-26',
  steps: [
    openFromDock('support', 'Support Tickets', 'Anyone can open a ticket now, from GET HELP, the Support page or the Contact form. Tap the Support icon.'),
    inPanel('support', { target: 'support-filters', title: 'The Queue', body: 'ACTIVE is everything open. NEEDS REPLY means they spoke last.' }),
    inPanel('support', {
      target: 'support-list',
      action: 'click',
      title: 'Open A Ticket',
      body: 'Tap a ticket for the whole thread: who sent it, what they are, the page they were on.',
      missingNote: 'No tickets yet. They appear here when one arrives.',
    }),
    inPanel('support', { target: 'support-reply', title: 'Reply', body: 'They get your reply by email. REPLY AND RESOLVE sends and closes it. Tick Internal note to write something only you see.' }),
    inPanel('support', { target: 'support-status', title: 'Status', body: 'OPEN, IN PROGRESS, RESOLVED, CLOSED. A reply on a resolved ticket reopens it.' }),
  ],
};

const halftoneTour: Tour = {
  id: 'gallery-screen-generator',
  title: 'Screen Generator',
  summary: 'Turn a photo into a halftone film positive for screen printing, with circles, triangles or 3s and your own text.',
  group: 'new',
  announce: '2026-10-27',
  steps: [
    openFromDock('gallery', 'Screen Generator', 'The screen generator lives in Gallery. Tap the Gallery icon.'),
    inPanel('gallery', { target: 'gallery-screens-button', action: 'click', title: 'Screens', body: 'Tap SCREENS.' }),
    { target: 'halftone-canvas-size', title: 'Canvas', body: '18 × 24 or 8.5 × 11. The page turns to match the photo.' },
    { target: 'halftone-from-gallery', title: 'Choose A Photo', body: 'FROM A GALLERY browses your galleries and Drive folders full screen. UPLOAD takes one from your device.' },
    { target: 'halftone-preview', title: 'Preview', body: 'The photo fills the canvas you picked, never cropped. Text above or below makes it shrink just enough to fit.' },
    { target: 'halftone-levels', title: 'Auto Levels', body: 'Stretches the photo from darkest to lightest. Good for night shots.' },
    { target: 'halftone-ink', title: 'Ink', body: 'WHITE INK inverts it, for light ink on a dark shirt.' },
    { target: 'halftone-step-text', action: 'click', title: 'Text', body: 'Tap 2 · TEXT.' },
    { target: 'halftone-text-above', title: 'Text Above And Below', body: 'Optional: a name, a date, a place. It prints in solid ink, centred on the photo.' },
    { target: 'halftone-step-screen', action: 'click', title: 'Screen', body: 'Tap 3 · SCREEN.' },
    { target: 'halftone-download', title: 'Download Film', body: 'A true-size vector PDF, sharp at any printer resolution. Flip the transfer over when you press it.' },
  ],
};

const screensFromGalleryTour: Tour = {
  id: 'screens-from-gallery',
  title: 'Screens From Your Galleries & Folders',
  summary: 'Pick the screen generator\'s photo from any gallery or Drive folder, full screen.',
  group: 'new',
  announce: '2026-10-27',
  steps: [
    openFromDock('gallery', 'Screens From Your Galleries', 'The screen generator lives in Gallery. Tap the Gallery icon.'),
    inPanel('gallery', { target: 'gallery-screens-button', action: 'click', title: 'Screens', body: 'Tap SCREENS.' }),
    { target: 'halftone-from-gallery', action: 'click', title: 'From A Gallery', body: 'Tap FROM A GALLERY.' },
    { target: 'halftone-picker-filter', title: 'Find One', body: 'Type part of a name to narrow the list.' },
    { target: 'halftone-picker-galleries', title: 'Galleries', body: 'Your galleries, published or not.' },
    { target: 'halftone-picker-folders', title: 'Folders', body: 'Every folder in your Drive JPG folder: VANCERTS, ROSE ROOM and the rest. Nothing here gets published.' },
    { target: 'halftone-picker-dates', title: 'Dates', body: 'Year, month and day folders. Tap any folder, scroll its photos, and tap one to use it.' },
  ],
};

/* ── Member dashboard (/dashboard) ────────────────────────────────────── */

const MEMBER = '/dashboard';
const memberApp = (app: string, title: string, body: string): TourStep => ({
  route: MEMBER,
  panel: null,
  target: `m-dock-${app}`,
  action: 'click',
  title,
  body,
});
const inApp = (app: string, step: TourStep): TourStep => ({ panel: app, ...step });

const memberBasicsTour: Tour = {
  id: 'member-basics',
  title: 'Your Dashboard',
  summary: 'Your earnings, your apps and where to get help, in one place.',
  dashboard: 'member',
  intro: true,
  group: 'dashboard',
  steps: [
    { route: MEMBER, panel: null, target: 'm-header', title: 'Your Dashboard', body: 'Everything you do on THE LOST+UNFOUNDS lives here.' },
    { target: 'm-actions', title: 'Settings And Sign Out', body: 'The gear is your account settings. The arrow signs you out.' },
    { target: 'm-revenue', title: 'Your Earnings', body: 'What you have earned, kept up to date.' },
    { target: 'm-clock', title: 'Clock And Calendar', body: 'Tap the clock face to change its look. Tap its label for a stopwatch and timer.' },
    { target: 'm-dock', title: 'Your Apps', body: 'Each of your apps opens from here: Gallery, Writer, Affiliate and Account. You see the ones that are yours.' },
    { target: 'help-tickets', title: 'Support', body: 'Stuck? GET HELP opens a ticket. The reply comes by email and shows here.' },
    { target: 'tour-help', title: 'Tutorials', body: 'Tap ? any time for a walkthrough of each app.' },
  ],
};

const memberAffiliateTour: Tour = {
  id: 'member-affiliate',
  title: 'Affiliate',
  summary: 'Your link, your earnings, your network, and getting paid.',
  dashboard: 'member',
  group: 'dashboard',
  steps: [
    memberApp('affiliate', 'Affiliate', 'Tap the Affiliate icon to open it.'),
    inApp('affiliate', { target: 'm-aff-earnings', action: 'click', title: 'Earnings', body: 'Tap EARNINGS.' }),
    inApp('affiliate', { target: 'm-aff-quick', action: 'click', title: 'Quick Actions', body: 'Tap QUICK ACTIONS.' }),
    inApp('affiliate', { target: 'm-aff-copy', title: 'Copy Your Link', body: 'Your link. When someone buys through it, you earn a share of the profit.' }),
    inApp('affiliate', { target: 'm-aff-back', action: 'click', title: 'Back', body: 'Tap ALL SECTIONS to go back.' }),
    inApp('affiliate', { target: 'm-aff-network', title: 'Network', body: 'People you brought in, and what their sales earn you.' }),
    inApp('affiliate', { target: 'm-aff-kingmidas', title: 'King Midas', body: 'The daily leaderboard and its prize pot.' }),
    inApp('affiliate', { target: 'm-aff-rewards', title: 'Rewards', body: 'Your reward points and store credit.' }),
    inApp('affiliate', { target: 'm-aff-payouts', action: 'click', title: 'Payouts', body: 'Tap PAYOUTS.' }),
    inApp('affiliate', { target: 'm-aff-available', action: 'click', title: 'Available To Payout', body: 'What you can be paid now. Tap it.' }),
    inApp('affiliate', { target: 'm-aff-request-payout', title: 'Request A Payout', body: 'Sends your available balance to you.' }),
    inApp('affiliate', { target: 'm-aff-stripe', title: 'Stripe Connect', body: 'Connect Stripe once so your payouts can reach your bank.' }),
    inApp('affiliate', { target: 'm-aff-payout-settings', title: 'Payout Settings', body: 'When and how you get paid. EDIT changes it.' }),
    inApp('affiliate', { target: 'm-aff-back', action: 'click', title: 'Back', body: 'Tap ALL SECTIONS.' }),
    inApp('affiliate', { target: 'm-aff-links', action: 'click', title: 'Links', body: 'Tap LINKS.' }),
    inApp('affiliate', { target: 'm-aff-code', title: 'Your Code', body: 'Your affiliate code. The pencil changes it.' }),
    inApp('affiliate', { target: 'm-aff-link-generator', title: 'Link Generator', body: 'Paste any page on the site to get your own link to it.' }),
    inApp('affiliate', { target: 'm-aff-guide', title: 'Affiliate Guide', body: 'How the program works, start to finish.' }),
  ],
};

const memberGalleryTour: Tour = {
  id: 'member-gallery',
  title: 'Gallery',
  summary: 'Your galleries: make one, share it, and see your job pay.',
  dashboard: 'member',
  group: 'dashboard',
  steps: [
    memberApp('gallery', 'Gallery', 'Tap the Gallery icon to open it.'),
    inApp('gallery', { target: 'pg-jobpay', title: 'Job Pay', body: 'What you are owed for shoots you covered.' }),
    inApp('gallery', { target: 'gallery-row', title: 'A Gallery', body: 'One row per gallery: its link, its photo count, and QR to share it.' }),
    inApp('gallery', { target: 'gallery-qr-button', title: 'QR Code', body: 'A QR code for the gallery, or a phone wallpaper with the code on it.' }),
    inApp('gallery', { target: 'gallery-new', action: 'click', title: 'New Gallery', body: 'Tap NEW to start a gallery.' }),
    inApp('gallery', { target: 'gallery-form-name', title: 'Name And Link', body: 'Name it. The slug is its address: /gallery/your-slug.' }),
    inApp('gallery', { target: 'gallery-form-pricing', title: 'Pricing', body: 'What a single photo, a bundle and the whole gallery cost.' }),
    inApp('gallery', { target: 'gallery-form-source', title: 'Photos', body: 'Link its Google Drive folder, or drag photos in.' }),
    inApp('gallery', { target: 'gallery-form-save', title: 'Create', body: 'CREATE GALLERY saves it. CANCEL closes the form.' }),
  ],
};

const memberWriterTour: Tour = {
  id: 'member-writer',
  title: 'Writer',
  summary: 'Your author profile, your blog and your Book Club posts.',
  dashboard: 'member',
  group: 'dashboard',
  steps: [
    memberApp('writer', 'Writer', 'Tap the Writer icon to open it.'),
    inApp('writer', { target: 'm-writer-stats', title: 'Your Blog', body: 'Your author name, your blog’s address and how many articles you have.' }),
    inApp('writer', { target: 'm-writer-public', title: 'View Public Blog', body: 'Your blog as readers see it.' }),
    inApp('writer', { target: 'm-writer-posts', title: 'My Book Club Posts', body: 'Tap to open your posts and their status.' }),
  ],
};

const memberAccountTour: Tour = {
  id: 'member-account',
  title: 'Account',
  summary: 'Your tier, your status and your details.',
  dashboard: 'member',
  group: 'dashboard',
  steps: [
    memberApp('settings', 'Account', 'Tap the Account icon to open it.'),
    inApp('settings', { target: 'm-account', title: 'Your Account', body: 'Your tier and status.' }),
    inApp('settings', { target: 'm-account-manage', title: 'Manage Details', body: 'Change your name, email and other details.' }),
  ],
};

/* ── Photographer dashboard (/photographer-dashboard) ─────────────────── */

const PHOTOG = '/photographer-dashboard';

const photographerBasicsTour: Tour = {
  id: 'photographer-basics',
  title: 'Your Dashboard',
  summary: 'Tonight’s live gallery, your pay, your calendar and your galleries, in one place.',
  dashboard: 'photographer',
  intro: true,
  group: 'dashboard',
  steps: [
    { route: PHOTOG, target: 'pg-live', title: 'Live Galleries', body: 'For tonight’s event: start a gallery and send photos from your camera roll.' },
    { target: 'pg-jobpay', title: 'Job Pay', body: 'What you are owed for shoots you covered, and getting it paid.' },
    { target: 'pg-calendar', title: 'My Calendar', body: 'Mark the days you can’t work.' },
    { target: 'pg-revenue', title: 'Your Revenue', body: 'You keep 97% of your gallery sales, less Stripe’s fee. Tap for the details.' },
    { target: 'pg-galleries', title: 'My Galleries', body: 'Every gallery you have made.' },
    { target: 'pg-ask', title: 'Ask For Anything', body: 'A question, a problem, or something you want built. It goes straight to the studio.' },
    { target: 'help-tickets', title: 'Support', body: 'GET HELP opens a ticket. The reply comes by email and shows here.' },
    { target: 'tour-help', title: 'Tutorials', body: 'Tap ? any time for a walkthrough of each part.' },
  ],
};

const photographerLiveTour: Tour = {
  id: 'photographer-live',
  title: 'Live Galleries',
  summary: 'Start a gallery for tonight, go live, and send photos as you shoot.',
  dashboard: 'photographer',
  group: 'dashboard',
  steps: [
    { route: PHOTOG, target: 'pg-terms', title: 'Before You Upload', body: 'Everything you send goes on a public site. Read what can never go on it.' },
    { target: 'pg-terms-agree', title: 'Agree To The Terms', body: 'Tick the box once you have read the Photographer Terms.' },
    { target: 'pg-terms-continue', action: 'click', title: 'Agree And Continue', body: 'Tap AGREE AND CONTINUE to unlock live galleries.' },
    { route: PHOTOG, target: 'pg-live-new', title: 'Start One', body: 'Name the event, then tap NEW LIVE GALLERY.' },
    { target: 'pg-live-go', title: 'Go Live', body: 'Guests’ gallery page keeps checking for new photos while it is live. END LIVE when the night is over.', missingNote: 'Start a gallery first. Its buttons appear here.' },
    { target: 'pg-live-share', title: 'Share', body: 'Copies the gallery link for guests.' },
    { target: 'pg-live-send', action: 'click', title: 'Send Photos', body: 'Tap SEND PHOTOS.' },
    { target: 'pg-live-uploader', title: 'Pick Your Shots', body: 'Let the camera app drop shots into your phone’s photos, then choose the keepers. They appear in the gallery straight away.' },
  ],
};

const photographerPayTour: Tour = {
  id: 'photographer-pay',
  title: 'Getting Paid',
  summary: 'Job pay, Stripe, and what you keep from gallery sales.',
  dashboard: 'photographer',
  group: 'dashboard',
  steps: [
    { route: PHOTOG, target: 'pg-jobpay', title: 'Job Pay', body: 'What you are owed for each shoot you covered.' },
    { target: 'pg-stripe-setup', title: 'Set Up Payouts', body: 'Connect Stripe once so your pay reaches your bank.' },
    { target: 'pg-stripe-dashboard', title: 'Your Stripe', body: 'Your payouts and bank details, in Stripe.' },
    { target: 'pg-revenue', action: 'click', title: 'Gallery Sales', body: 'Tap to see how gallery sales split.' },
    { target: 'pg-revenue', title: 'What You Keep', body: '97% of each sale is yours, less Stripe’s fee. Affiliate commissions come out of the studio’s 3%, never yours.' },
  ],
};

const photographerCalendarTour: Tour = {
  id: 'photographer-calendar',
  title: 'My Calendar',
  summary: 'Tell the studio which days you can’t work.',
  dashboard: 'photographer',
  group: 'dashboard',
  steps: [
    { route: PHOTOG, target: 'pg-calendar', title: 'My Calendar', body: 'The studio books around this.' },
    { target: 'pg-cal-day', title: 'Block A Day', body: 'Tap a day you can’t work and add a reason if you like. Tap it again to free it.' },
    { target: 'pg-cal-blocked', title: 'Blocked Out Next', body: 'Your next days off, in order.' },
  ],
};

const photographerGalleriesTour: Tour = {
  id: 'photographer-galleries',
  title: 'My Galleries',
  summary: 'Make a gallery, price it, link its photos and share it.',
  dashboard: 'photographer',
  group: 'dashboard',
  steps: [
    { route: PHOTOG, target: 'pg-galleries', title: 'My Galleries', body: 'Every gallery you have made.' },
    { target: 'gallery-row', title: 'A Gallery', body: 'Its link and photo count, and QR to share it.' },
    { target: 'gallery-qr-button', title: 'QR Code', body: 'A QR code for the gallery, or a phone wallpaper with the code on it.' },
    { target: 'gallery-new', action: 'click', title: 'New Gallery', body: 'Tap NEW to start a gallery.' },
    { target: 'gallery-form-name', title: 'Name And Link', body: 'Name it. The slug is its address: /gallery/your-slug.' },
    { target: 'gallery-form-pricing', title: 'Pricing', body: 'What a single photo, a bundle and the whole gallery cost.' },
    { target: 'gallery-form-source', title: 'Photos', body: 'Link its Google Drive folder, or drag photos in.' },
    { target: 'gallery-form-save', title: 'Create', body: 'CREATE GALLERY saves it. CANCEL closes the form.' },
  ],
};

const photographerAskTour: Tour = {
  id: 'photographer-ask',
  title: 'Ask For Anything',
  summary: 'Send the studio a question, a problem or an idea.',
  dashboard: 'photographer',
  group: 'dashboard',
  steps: [
    { route: PHOTOG, target: 'pg-ask', title: 'Ask For Anything', body: 'It goes straight to the studio.' },
    { target: 'pg-ask-kind', title: 'What Kind', body: 'Pick what it is: a question, a problem, or something you want built.' },
    { target: 'pg-ask-send', title: 'Send', body: 'Type it and send. Your past requests show underneath.' },
  ],
};

export const TOURS: Tour[] = [screensFromGalleryTour, halftoneTour, supportTour, qrWallpaperTour, liveEventTour, dashboardTour, ...consoleTours,
  memberBasicsTour, memberAffiliateTour, memberGalleryTour, memberWriterTour, memberAccountTour,
  photographerBasicsTour, photographerLiveTour, photographerPayTour, photographerCalendarTour, photographerGalleriesTour, photographerAskTour];

export function getTour(id: string): Tour | undefined {
  return TOURS.find(t => t.id === id);
}

export const dashboardOf = (t: Tour): DashboardId => t.dashboard ?? 'admin';

export function toursFor(dashboard: DashboardId): Tour[] {
  return TOURS.filter(t => dashboardOf(t) === dashboard);
}

/** A dashboard's announced tours, newest first. */
export function announcedTours(dashboard: DashboardId = 'admin'): Tour[] {
  return toursFor(dashboard).filter(t => t.announce).sort((a, b) => (b.announce! < a.announce! ? -1 : 1));
}

/**
 * Window event that opens (string) or closes (null) a panel on whichever
 * dashboard is mounted. Each dashboard root carries data-tour-root and
 * data-active-panel, and listens for this.
 */
export const TOUR_PANEL_EVENT = 'tlu:tour-panel';
