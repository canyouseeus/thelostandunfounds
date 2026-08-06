/**
 * Terms of Service
 *
 * Rendered twice: standalone at /terms, and as a section of /docs. Pass
 * `standalone` for the h1 — inside /docs the page already owns the h1.
 *
 * LAST_UPDATED is a constant on purpose. It used to render `new Date()`, which
 * meant the page claimed to have been updated today, every day, no matter when
 * the terms actually changed. Bump it by hand whenever the text below changes.
 */

const LAST_UPDATED = 'August 6, 2026'

export default function Terms({ standalone = false }: { standalone?: boolean }) {
  const Heading = standalone ? 'h1' : 'h2'

  return (
    <div>
      <Heading className="text-3xl font-bold text-white mb-4">TERMS OF SERVICE</Heading>
      <p className="text-white/60 text-sm mb-8">Last updated: {LAST_UPDATED}</p>

      <div className="space-y-6 text-white/80">
        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Acceptance of Terms</h2>
          <p>
            By accessing or using <strong className="font-bold">THE LOST+UNFOUNDS</strong> — the
            website, the blog and article submission platform, the photo galleries and download
            portal, the booking system, the shop, the affiliate program, the newsletter, and any
            related service or tool we operate — you accept and agree to be bound by these Terms of
            Service. If you do not agree, please do not use our services.
          </p>
          <p className="mt-3">
            Some services carry additional terms presented at the point of purchase — a booking
            confirmation, an invoice, a quote, a license attached to a photo download, or an
            affiliate agreement. Where those conflict with this page, the document you signed or
            accepted for that specific engagement controls.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Description of Service</h2>
          <p>
            <strong className="font-bold">THE LOST+UNFOUNDS</strong> is a content platform and a
            working studio. We provide:
          </p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>Blog publishing, article submission, and editorial review</li>
            <li>Editorial columns (The Lost Archives, GearHeads, Edge of the Borderlands, Science Column, New Theory)</li>
            <li>Photography and media services booked through the site, including deposits, quotes and invoices</li>
            <li>Public and private photo galleries, digital downloads, and client delivery portals</li>
            <li>Prints and physical products fulfilled by third-party print and merchandise partners</li>
            <li>An online shop and checkout</li>
            <li>An affiliate program with tracked referrals and commission payouts</li>
            <li>Email newsletters and transactional email</li>
            <li>Free digital tools and utilities</li>
            <li>User accounts, profiles and — where offered — subdomains for personal blogs</li>
          </ul>
          <p className="mt-3">
            Features change often. We publish a running record of what has shipped at{' '}
            <a href="/changelog" className="text-white underline">
              /changelog
            </a>
            . We may add, change, or retire any feature at any time.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">User Accounts</h2>
          <div className="space-y-3">
            <p>To use certain features you must create an account. You agree to:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials and any sign-in link sent to you</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be responsible for all activity under your account</li>
              <li>Not share your credentials, and not forward private gallery access to anyone else</li>
              <li>Maintain one account per person</li>
            </ul>
            <p>
              You must be at least 13 years old to create an account, and at least 18 to book paid
              services, purchase, or join the affiliate program.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Bookings, Deposits and Cancellations</h2>
          <div className="space-y-3">
            <p>When you request a session, shoot, event or other service through the site:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>A booking request is not confirmed until we accept it and you receive a written confirmation</li>
              <li>A date is held only once the deposit stated on your quote or invoice is paid</li>
              <li>
                Unless your written quote says otherwise, the deposit is non-refundable — it
                compensates for the date held and turned away — and is credited against the total
              </li>
              <li>The remaining balance is due on the date stated on the invoice</li>
              <li>
                You may reschedule once at no charge with at least 48 hours notice, subject to
                availability; later changes may forfeit the deposit
              </li>
              <li>
                If weather, illness, equipment failure or another circumstance outside our control
                prevents the session, we will reschedule or refund the deposit at our option
              </li>
              <li>Travel, permits, venue fees, rush delivery and additional deliverables are quoted separately</li>
              <li>A no-show forfeits the deposit</li>
            </ul>
            <p>
              Turnaround times quoted for edited deliverables are estimates measured from the
              session date, and assume any material we need from you has been received.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Photography, Licensing and Usage Rights</h2>
          <div className="space-y-3">
            <p>
              We retain copyright in all photographs and other creative work we produce, including
              images delivered to a client. What you receive is a license, not ownership.
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>
                Unless your written agreement grants more, a photo download carries a
                <strong className="font-bold"> personal, non-commercial, non-transferable </strong>
                license: you may display, print and share it for personal use, including on your own
                social accounts with credit
              </li>
              <li>
                Commercial use — advertising, resale, licensing to third parties, merchandise, or
                training a machine-learning model — requires a separate written license
              </li>
              <li>You may not remove or obscure watermarks, credits, or embedded metadata</li>
              <li>You may not redistribute, resell, or sublicense the files, or upload them to a stock library</li>
              <li>Editing beyond cropping and basic exposure adjustment requires our written approval</li>
              <li>
                We may display the work in our portfolio, galleries, social channels and marketing
                unless your written agreement restricts it
              </li>
            </ul>
            <p>
              If you appear in, own, or control access to a location or property in a commissioned
              shoot, you are responsible for securing the model or property releases that engagement
              requires. Tell us in writing before the session if any image must not be published.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Client Galleries and Digital Delivery</h2>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>Private galleries are invite-only; access links and sign-in links are personal to you</li>
            <li>Galleries and download entitlements may expire — download and back up your files promptly</li>
            <li>We aim to retain delivered galleries for a reasonable period but do not guarantee indefinite archival storage or act as your backup</li>
            <li>Digital downloads are non-returnable once delivered; if a file is corrupt or wrong, contact us and we will replace it</li>
            <li>Attempting to bypass gallery protection, watermarking or payment is a breach of these terms</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Payments, Invoices and Promotions</h2>
          <div className="space-y-3">
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Payments are processed by third-party processors, including Stripe; we never store your full card details</li>
              <li>Prices are in US dollars and exclude any applicable sales tax, which is added where required</li>
              <li>Invoices are due on the date stated; unpaid balances may pause delivery of files or services</li>
              <li>Partial payments are applied against the invoice total and do not release deliverables until the balance clears</li>
              <li>
                Promotional and discount codes are single-use unless stated otherwise, apply only to
                the service named, expire on the date shown, cannot be combined, and may be
                withdrawn at any time before use
              </li>
              <li>Prices for future work may change; a quote is honoured for the period stated on it</li>
              <li>
                Initiating a chargeback instead of contacting us first may result in suspension of
                your account and revocation of delivered licenses
              </li>
              <li>Refunds outside the terms above are handled case by case and at our discretion</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Shop, Prints and Physical Products</h2>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>Merchandise and prints are produced and shipped by third-party fulfilment partners</li>
            <li>Printed colour, crop and finish vary slightly from what a screen shows; this is not a defect</li>
            <li>Product availability, pricing and descriptions may change without notice</li>
            <li>Shipping estimates are not guarantees, and risk passes on delivery to the carrier</li>
            <li>Damaged or misprinted items: contact us within 14 days of delivery with photos and we will arrange a replacement</li>
            <li>Custom and made-to-order items are otherwise final sale</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Affiliate Program</h2>
          <div className="space-y-3">
            <p>If you join the affiliate program:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Commission is earned on qualifying, completed, non-refunded sales attributed to your tracked link</li>
              <li>Attribution is determined by our tracking; where records conflict, ours control</li>
              <li>
                Payouts are made through Stripe Connect once you have completed onboarding and
                identity verification, and once your balance clears any minimum threshold
              </li>
              <li>Commission on an order that is later refunded or charged back is reversed</li>
              <li>
                Self-referral, cookie stuffing, bidding on our brand terms, spam, unauthorized
                coupon distribution, and misrepresenting your relationship with us are prohibited
                and forfeit unpaid commission
              </li>
              <li>
                You must disclose your affiliate relationship clearly wherever you post a link, as
                required by the FTC endorsement guidelines
              </li>
              <li>Either side may end the affiliate relationship at any time; earned, unreversed commission remains payable</li>
              <li>You are an independent participant, not an employee, agent or partner, and are responsible for your own taxes</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Content Publishing and Submissions</h2>
          <div className="space-y-3">
            <p>When you publish content or submit articles on our platform:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>You retain ownership of your original content</li>
              <li>You grant us a non-exclusive, worldwide, royalty-free license to host, display, distribute and promote that content on our platform and channels</li>
              <li>You are responsible for ensuring your content does not violate any law or third-party right</li>
              <li>You represent that you have the right to publish what you submit</li>
              <li>Submissions are subject to editorial review; we may accept, reject or request changes</li>
              <li>Published content may be edited for formatting, clarity or compliance with our guidelines</li>
              <li>We may remove content that violates these terms or our community standards</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">User Subdomains</h2>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>A subdomain is provided for use in connection with our platform</li>
            <li>We may reclaim or reassign a subdomain if the account is inactive or terminated</li>
            <li>You may not use a subdomain for illegal activity or content that violates these terms</li>
            <li>Availability is at our discretion</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Email and Communications</h2>
          <p>
            Subscribing to the newsletter, creating an account, booking, or purchasing means you
            agree to receive email from us. Transactional email — receipts, invoices, booking
            confirmations, gallery access, account and security notices — is part of the service and
            cannot be unsubscribed from while you hold an account or an open engagement. Marketing
            email always carries an unsubscribe link, and unsubscribing takes effect promptly.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Automation and AI-Assisted Work</h2>
          <p>
            This platform is built and operated with heavy automation, including AI-assisted
            development, drafting and support tooling. Editorial content is reviewed before
            publication, and photographs delivered to clients are real captures, not generated
            images, unless a deliverable is explicitly described as illustration or composite work.
            Automated systems can still be wrong; if something we sent you looks incorrect, tell us
            and we will correct it.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>Use our services for illegal purposes or to violate any applicable law</li>
            <li>Violate any copyright, trademark or other intellectual property right</li>
            <li>Publish content that is defamatory, harassing, threatening or discriminatory</li>
            <li>Publish content containing malware, viruses or harmful code</li>
            <li>Circumvent usage limits, paywalls, watermarking or security measures</li>
            <li>Scrape, crawl or bulk-download our content, or use it to train a machine-learning model, without written permission</li>
            <li>Impersonate others or provide false information</li>
            <li>Reverse engineer or attempt to extract our source code</li>
            <li>Interfere with or disrupt the operation of the platform</li>
            <li>Send spam or unsolicited communications through our tools</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Intellectual Property</h2>
          <p>
            All content, features and functionality of{' '}
            <strong className="font-bold">THE LOST+UNFOUNDS</strong> — excluding user-submitted
            content — are owned by us and protected by copyright, trademark and other laws. You may
            not reproduce, distribute, modify or create derivative works from the platform or its
            proprietary content without our express written permission.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Copyright Complaints</h2>
          <p>
            If you believe content on our platform infringes your copyright, email{' '}
            <strong>legal@thelostandunfounds.com</strong> with: identification of the work, the URL
            of the material you say infringes it, your contact details, a statement that you have a
            good-faith belief the use is unauthorized, a statement under penalty of perjury that
            your notice is accurate and that you are the rights holder or authorized to act for
            them, and your signature. We remove infringing material promptly and may terminate
            repeat infringers.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Third-Party Services</h2>
          <p>
            We rely on third-party providers — payment processing, print and merchandise
            fulfilment, email delivery, cloud storage, hosting and analytics — and our platform may
            link to third-party sites. We are not responsible for their content, products, policies
            or privacy practices, and your dealings with them are your own. How we handle your data
            is described in our{' '}
            <a href="/privacy" className="text-white underline">
              Privacy Policy
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Disclaimer of Warranties</h2>
          <p>
            <strong className="font-bold">THE LOST+UNFOUNDS</strong> is provided "as is" and "as
            available", without warranties of any kind, express or implied, including any implied
            warranty of merchantability, fitness for a particular purpose, or non-infringement. We
            do not warrant that the service will be uninterrupted, error-free, or that files will
            remain available indefinitely.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, we are not liable for indirect, incidental,
            special, consequential or punitive damages, or for lost profits, revenue, data or
            business opportunity, arising from your use of the services — including data loss,
            downtime, security incidents, or errors and omissions in content.
          </p>
          <p className="mt-3">
            Our total liability for any claim relating to the services is limited to the amount you
            paid us for the specific service giving rise to the claim in the twelve months before
            the claim arose. For a commissioned shoot, and to the extent permitted by law, our
            liability is limited to a refund of the fees paid for that engagement; we are not
            liable for the value of an event that cannot be re-staged. Some jurisdictions do not
            allow these limits, in which case they apply only as far as the law allows.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless{' '}
            <strong className="font-bold">THE LOST+UNFOUNDS</strong>, its owners, contractors and
            affiliates from any claim, damage, loss or expense (including legal fees) arising from
            your use of the services, content you publish or submit, your violation of these terms,
            or your violation of any third-party right.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Termination</h2>
          <p>We may suspend or terminate an account at any time for:</p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>Violation of these terms or our community standards</li>
            <li>Fraudulent or illegal activity, including payment fraud and affiliate fraud</li>
            <li>Extended inactivity</li>
          </ul>
          <p className="mt-3">
            You may close your account at any time by contacting us. On termination your access
            ends; published content may remain available unless you request removal, and provisions
            on licensing, payment, liability and dispute resolution survive.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Disputes and Governing Law</h2>
          <p>
            Before filing anything, email us at{' '}
            <strong>legal@thelostandunfounds.com</strong> and give us 30 days to resolve the issue
            informally. Most problems are a misunderstanding and we would rather fix it than fight
            it.
          </p>
          <p className="mt-3">
            These terms are governed by the laws of the State of Texas, without regard to its
            conflict-of-law rules. Any dispute not resolved informally will be brought exclusively
            in the state or federal courts located in Travis County, Texas, and both sides consent
            to that venue. Claims must be brought individually, not as a class or representative
            action. Nothing here prevents either side from bringing a qualifying claim in small
            claims court.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Changes to These Terms</h2>
          <p>
            We may modify these terms. Material changes are posted here with an updated "Last
            updated" date, and significant changes may also be announced by email or in the{' '}
            <a href="/changelog" className="text-white underline">
              changelog
            </a>
            . Continued use after a change constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Severability and Entire Agreement</h2>
          <p>
            If any provision is found invalid or unenforceable, the rest stays in force. These
            terms, together with the Privacy Policy and any signed agreement, quote or invoice for a
            specific engagement, are the entire agreement between us. Our failure to enforce a
            provision is not a waiver of it.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Contact</h2>
          <p>Questions about these terms:</p>
          <p className="mt-2">
            <strong>Legal:</strong> legal@thelostandunfounds.com
          </p>
          <p className="mt-2">
            <strong>Bookings and client work:</strong> media@thelostandunfounds.com
          </p>
          <p className="mt-2">
            <strong>Website:</strong> https://www.thelostandunfounds.com
          </p>
        </section>
      </div>
    </div>
  );
}
