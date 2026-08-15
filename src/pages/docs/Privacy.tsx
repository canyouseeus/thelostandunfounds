/**
 * Privacy Policy
 *
 * LAST_UPDATED is a hardcoded constant on purpose. It used to be
 * `new Date().toLocaleDateString()`, which re-rendered as *today* on every
 * visit — the page claimed to have been revised the moment you loaded it, no
 * matter how stale the text was. Bump this by hand whenever the policy text
 * below actually changes, and only then.
 */
const LAST_UPDATED = 'August 15, 2026';

export default function Privacy() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-4">Privacy Policy</h1>
      <p className="text-white/60 text-sm mb-8">Last updated: {LAST_UPDATED}</p>

      <div className="space-y-6 text-white/80">
        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Introduction</h2>
          <p>
            <strong className="font-bold">THE LOST+UNFOUNDS</strong> ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our platform, including our blog publishing platform, article submission system, shop, and related services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Information We Collect</h2>
          <div className="space-y-3">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Account Information</h3>
              <p>When you create an account, we collect:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Email address</li>
                <li>Password (encrypted and securely stored)</li>
                <li>Display name or author name (optional)</li>
                <li>Profile information you choose to provide</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Content and Publishing Data</h3>
              <p>When you use our blog publishing features, we collect:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Blog posts and articles you create or submit</li>
                <li>User subdomain information (if you create a custom subdomain)</li>
                <li>Article submission data and metadata</li>
                <li>Content preferences and column selections</li>
                <li>Publication status and scheduling information</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Usage Data</h3>
              <p>We track:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Tool usage statistics</li>
                <li>Content views and engagement metrics</li>
                <li>Subscription tier and access levels</li>
                <li>Navigation patterns and feature usage</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Email and Newsletter Data</h3>
              <p>When you subscribe to our newsletter or email updates:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Email address</li>
                <li>Subscription preferences</li>
                <li>Email open and click tracking (if enabled)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Shop and Purchase Data</h3>
              <p>When you make purchases through our shop:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Purchase history</li>
                <li>Shipping information (if applicable)</li>
                <li>Payment information (processed securely through third-party payment processors)</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">How We Use Your Information</h2>
          <ul className="list-disc list-inside ml-4 space-y-2">
            <li>To provide and maintain our services, including blog publishing, article submissions, and content management</li>
            <li>To process your subscription payments and shop purchases</li>
            <li>To send you important updates about our services, newsletters, and content</li>
            <li>To improve our platform and develop new features</li>
            <li>To enforce usage limits based on your subscription tier</li>
            <li>To publish and display your content on your assigned subdomain or in our columns</li>
            <li>To moderate and review article submissions</li>
            <li>To track affiliate links and commissions (when applicable)</li>
            <li>To provide customer support and respond to inquiries</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Content Publishing and Public Information</h2>
          <p>
            When you publish content on <strong className="font-bold">THE LOST+UNFOUNDS</strong>:
          </p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>Your published blog posts and articles are publicly accessible</li>
            <li>Your author name (if provided) will be displayed with your content</li>
            <li>Content published on your subdomain is publicly viewable</li>
            <li>Submitted articles may be published in our columns (Book Club, GearHeads, Borderlands, Science, New Theory, etc.)</li>
            <li>We may use your content for promotional purposes within our platform</li>
          </ul>
          <p className="mt-3">
            You retain ownership of your content, but by publishing on our platform, you grant us a license to display, distribute, and promote your content.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Data Storage and Security</h2>
          <p>
            We use industry-standard security measures to protect your data. Your passwords are encrypted, and we use secure connections (HTTPS) for all data transmission.
          </p>
          <p className="mt-3">
            <strong>Content Storage:</strong> Your blog posts, articles, and published content are stored securely in our database. We do not store downloaded videos or temporary content files on our servers beyond what is necessary for service delivery.
          </p>
          <p className="mt-3">
            <strong>Data Retention:</strong> We retain your account information and content for as long as your account is active. You may request deletion of your account and associated data at any time.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li><strong>Supabase:</strong> Authentication, database services, and user management</li>
            <li><strong>Google OAuth:</strong> Authentication and account creation</li>
            <li><strong>Stripe:</strong> Payment processing for shop purchases</li>
            <li><strong>Vercel:</strong> Hosting and deployment, plus cookieless aggregate traffic analytics</li>
            <li><strong>Zoho Mail:</strong> Email delivery and newsletter services</li>
            <li><strong>Fourthwall:</strong> Shop and product management</li>
            <li><strong>Amazon Associates:</strong> Affiliate link tracking (when applicable)</li>
          </ul>
          <p className="mt-3">
            These services have their own privacy policies. We recommend reviewing them. When you use Google OAuth to sign in, Google's privacy policy applies to the authentication process.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Affiliate Links and Tracking</h2>
          <p>
            Our platform may contain affiliate links to products (such as books on Amazon). When you click on these links:
          </p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>We may receive a commission if you make a purchase</li>
            <li>External merchants such as Amazon set their own tracking cookies on their own sites</li>
            <li>Your purchase information is handled by the merchant, not by us</li>
            <li>We disclose affiliate relationships in our content as required</li>
          </ul>
          <p className="mt-3">
            We also run our own affiliate program. If you arrive here through a referral link from one of our affiliates, we set a first-party <code>affiliate_ref</code> cookie on our site for 30 days so that the person who referred you is credited for any purchase you make. See the Cookies and Tracking section below for the full detail.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>Access your personal data and published content</li>
            <li>Correct inaccurate data</li>
            <li>Delete your account and data (subject to content that has been published and may need to remain for archival purposes)</li>
            <li>Opt out of marketing communications and newsletters</li>
            <li>Request a copy of your data</li>
            <li>Withdraw consent for data processing where applicable</li>
          </ul>
          <p className="mt-3">
            To exercise these rights, please contact us at privacy@thelostandunfounds.com.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Cookies and Tracking</h2>
          <p>
            We keep this short and specific, because vague cookie disclosures are worse than none. Here is everything we store on your device.
          </p>

          <h3 className="text-xl font-semibold text-white mb-2 mt-4">Cookies</h3>
          <p>These are first-party cookies, set by our own site. We set no third-party cookies ourselves.</p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li><strong>affiliate_ref</strong> (30 days) — set only if you arrive through an affiliate or referral link (a URL containing <code>?ref=</code>, <code>?affiliate=</code> or <code>?aff=</code>). It credits the referring affiliate if you later buy something. If you never use a referral link, this cookie is never set.</li>
            <li><strong>nl_done</strong> (10 years) — set only when you successfully subscribe to the newsletter, so we never show you the signup prompt again. Dismissing the prompt without subscribing does not set it.</li>
          </ul>

          <h3 className="text-xl font-semibold text-white mb-2 mt-4">Browser storage</h3>
          <p>
            We also use your browser's local storage. This is not technically a cookie, but it stores data on your device in the same way, so we disclose it here.
          </p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li><strong>tlau_visitor_id</strong> — a random identifier (a UUID) generated in your browser, with no expiry date. It lets us count returning visitors without knowing who you are. It contains no personal information and is not derived from anything about you or your device.</li>
            <li><strong>affiliate_ref</strong>, <strong>affiliate_ref_timestamp</strong>, <strong>affiliate_subid</strong> — a copy of the referral information above, plus any campaign tag on the referral link, kept in case the cookie is cleared.</li>
            <li><strong>Authentication tokens</strong> — if you have an account, these keep you signed in. They are required for login to work.</li>
          </ul>

          <h3 className="text-xl font-semibold text-white mb-2 mt-4">What we record when you view a page</h3>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>The page address and title</li>
            <li>The referring website, if you arrived from a link elsewhere</li>
            <li>Your <code>tlau_visitor_id</code></li>
            <li>Your browser's user-agent string, and the country and city our host derives from your IP address</li>
          </ul>
          <p className="mt-3">
            <strong>We do not store your IP address itself</strong> — only the approximate country and city derived from it.
          </p>

          <h3 className="text-xl font-semibold text-white mb-2 mt-4">What we do not do</h3>
          <p>
            We do not use Google Analytics, the Meta/Facebook pixel, advertising cookies, retargeting, or any third-party tracking or ad network. We do not build advertising profiles, and we do not sell or share your personal information with anyone.
          </p>
          <p className="mt-3">
            We use <strong>Vercel Analytics</strong> for aggregate traffic counts. It is cookieless by design and does not store a persistent identifier for you.
          </p>
          <p className="mt-3">
            When a purchase sends you to <strong>Stripe</strong> or <strong>Fourthwall</strong>, those companies set their own cookies on their own sites, governed by their privacy policies rather than this one.
          </p>

          <h3 className="text-xl font-semibold text-white mb-2 mt-4">Your choices</h3>
          <p>
            You can clear or block cookies and local storage through your browser settings, and clearing them resets your <code>tlau_visitor_id</code>. Blocking storage for this site will sign you out and may stop a referral from being credited, but the rest of the site will keep working. You can also email us at privacy@thelostandunfounds.com to ask what we hold about you or to have it deleted.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Children's Privacy</h2>
          <p>
            Our services are not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. For significant changes, we may also notify you via email.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, wish to exercise your rights, or have concerns about how we handle your data, please contact us at:
          </p>
          <p className="mt-2">
            <strong>Email:</strong> privacy@thelostandunfounds.com
          </p>
          <p className="mt-2">
            <strong>Website:</strong> https://www.thelostandunfounds.com
          </p>
        </section>
      </div>
    </div>
  );
}


