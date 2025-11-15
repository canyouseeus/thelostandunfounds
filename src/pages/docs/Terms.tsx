/**
 * Terms of Service
 */

export default function Terms() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-4">Terms of Service</h1>
      <p className="text-white/60 text-sm mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="space-y-6 text-white/80">
        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Acceptance of Terms</h2>
          <p>
            By accessing and using THE LOST+UNFOUNDS platform, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Description of Service</h2>
          <p>
            THE LOST+UNFOUNDS provides a platform offering various digital tools and services, including but not limited to video downloading, content processing, and other utility tools.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">User Accounts</h2>
          <div className="space-y-3">
            <p>To use certain features, you must create an account. You agree to:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be responsible for all activities under your account</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Subscription and Payment</h2>
          <div className="space-y-3">
            <p>We offer free and paid subscription tiers:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Subscriptions are billed monthly or annually</li>
              <li>Payments are processed through PayPal</li>
              <li>You can cancel your subscription at any time</li>
              <li>Refunds are handled on a case-by-case basis</li>
              <li>We reserve the right to change pricing with 30 days notice</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>Use our services for illegal purposes</li>
            <li>Violate any copyright or intellectual property rights</li>
            <li>Attempt to circumvent usage limits or security measures</li>
            <li>Use automated systems to abuse our services</li>
            <li>Share your account credentials with others</li>
            <li>Reverse engineer or attempt to extract our source code</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Intellectual Property</h2>
          <p>
            All content, features, and functionality of THE LOST+UNFOUNDS platform are owned by us and are protected by copyright, trademark, and other intellectual property laws.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Limitation of Liability</h2>
          <p>
            THE LOST+UNFOUNDS is provided "as is" without warranties of any kind. We are not liable for any damages resulting from your use of our services, including but not limited to data loss, service interruptions, or security breaches.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account at any time for violation of these terms or for any other reason we deem necessary.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Changes to Terms</h2>
          <p>
            We may modify these Terms of Service at any time. Continued use of our services after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Contact Information</h2>
          <p>
            For questions about these Terms of Service, please contact us at:
          </p>
          <p className="mt-2">
            <strong>Email:</strong> legal@thelostandunfounds.com
          </p>
        </section>
      </div>
    </div>
  );
}


