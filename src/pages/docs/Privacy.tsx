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
            THE LOST+UNFOUNDS ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our platform.
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
                <li>Password (encrypted)</li>
                <li>Display name (optional)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Usage Data</h3>
              <p>We track:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Tool usage statistics</li>
                <li>Download counts</li>
                <li>Subscription tier</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">How We Use Your Information</h2>
          <ul className="list-disc list-inside ml-4 space-y-2">
            <li>To provide and maintain our services</li>
            <li>To process your subscription payments</li>
            <li>To send you important updates about our services</li>
            <li>To improve our platform and develop new features</li>
            <li>To enforce usage limits based on your subscription tier</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Data Storage and Security</h2>
          <p>
            We use industry-standard security measures to protect your data. Your passwords are encrypted, and we use secure connections (HTTPS) for all data transmission.
          </p>
          <p className="mt-3">
            <strong>Important:</strong> We do not store downloaded videos or content on our servers. All downloads are processed in real-time and not retained.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li><strong>Supabase:</strong> Authentication and database services</li>
            <li><strong>PayPal:</strong> Payment processing</li>
            <li><strong>Vercel:</strong> Hosting and deployment</li>
          </ul>
          <p className="mt-3">
            These services have their own privacy policies. We recommend reviewing them.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your account and data</li>
            <li>Opt out of marketing communications</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Cookies</h2>
          <p>
            We use cookies to maintain your session and remember your preferences. You can control cookies through your browser settings.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at:
          </p>
          <p className="mt-2">
            <strong>Email:</strong> privacy@thelostandunfounds.com
          </p>
        </section>
      </div>
    </div>
  );
}


