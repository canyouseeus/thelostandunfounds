/**
 * Privacy Policy
 */

export default function Privacy() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-4">Privacy Policy</h1>
      <p className="text-white/60 text-sm mb-8">Last updated: {new Date().toLocaleDateString()}</p>

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
            <li><strong>PayPal:</strong> Payment processing for subscriptions and shop purchases</li>
            <li><strong>Vercel:</strong> Hosting and deployment services</li>
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
            <li>Affiliate tracking cookies may be set by third-party services</li>
            <li>Your purchase information is handled by the merchant, not by us</li>
            <li>We disclose affiliate relationships in our content as required</li>
          </ul>
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
            We use cookies and similar technologies to:
          </p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>Maintain your session and authentication state</li>
            <li>Remember your preferences</li>
            <li>Track usage analytics</li>
            <li>Enable affiliate link tracking</li>
          </ul>
          <p className="mt-3">
            You can control cookies through your browser settings. Note that disabling cookies may affect the functionality of our platform.
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


