/**
 * Terms of Service
 */

import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white uppercase mb-4">TERMS OF USE</h1>
      <p className="text-white/60 text-sm mb-8">Last updated: October 29, 2026</p>

      <div className="space-y-6 text-white/80">
        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Acceptance of Terms</h2>
          <p>
            By accessing and using <strong className="font-bold">THE LOST+UNFOUNDS</strong> platform, including our website, blog publishing platform, article submission system, shop, and related services, you accept and agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Description of Service</h2>
          <p>
            <strong className="font-bold">THE LOST+UNFOUNDS</strong> provides a comprehensive platform offering:
          </p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>Blog publishing and content management system</li>
            <li>Article submission and editorial review process</li>
            <li>User subdomains for personalized blog hosting</li>
            <li>Multiple content columns (The Lost Archives, Book Club, GearHeads, Edge of the Borderlands, Science Column, New Theory)</li>
            <li>Digital tools and utilities</li>
            <li>Online shop for merchandise and products</li>
            <li>Email newsletter and subscription services</li>
            <li>User accounts with tiered access levels</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">User Accounts</h2>
          <div className="space-y-3">
            <p>To use certain features, including publishing content and submitting articles, you must create an account. You agree to:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be responsible for all activities under your account</li>
              <li>Not share your account credentials with others</li>
              <li>Maintain one account per person (multiple accounts are not permitted)</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Content Publishing and Submissions</h2>
          <div className="space-y-3">
            <p>When you publish content or submit articles on our platform:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>You retain ownership of your original content</li>
              <li>You grant us a non-exclusive, worldwide, royalty-free license to display, distribute, and promote your content on our platform</li>
              <li>You are responsible for ensuring your content does not violate any laws or third-party rights</li>
              <li>You represent that you have the right to publish the content you submit</li>
              <li>Submitted articles are subject to editorial review and we reserve the right to accept, reject, or request modifications</li>
              <li>Published content may be edited for formatting, clarity, or compliance with our guidelines</li>
              <li>We may hide, unpublish, edit or permanently delete any content on the platform at any time, for any reason, without notice, and we have no obligation to keep a copy</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Photographers and Contributors</h2>
          <p>
            If you upload photos or other media, run a gallery, sell through our galleries, or shoot work booked through <strong className="font-bold">THE LOST+UNFOUNDS</strong>, our{' '}
            <Link to="/terms/photographers" className="underline hover:text-white">Photographer Terms</Link>{' '}
            also apply to you. They cover the license you grant us, our right to remove content, payouts and conduct on shoots.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Photo Galleries and Purchases</h2>
          <div className="space-y-3">
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Gallery previews are watermarked and may not be downloaded, screenshotted for reuse, or copied</li>
              <li>A purchased photo comes with a personal, non-exclusive license to download, print and share it for non-commercial use, with credit to the photographer or <strong className="font-bold">THE LOST+UNFOUNDS</strong> where practical</li>
              <li>Commercial use, resale or use in advertising requires a separate written license from us</li>
              <li>Copyright in every photo stays with the photographer or with us; buying a photo does not transfer copyright</li>
              <li>Galleries may be changed, closed or removed at any time. Download your purchases promptly; we do not guarantee permanent access</li>
              <li>
                If you appear in a photo and want it taken down, email{' '}
                <a href="mailto:media@thelostandunfounds.com" className="underline hover:text-white">media@thelostandunfounds.com</a>{' '}
                with a link to the photo. We review every request and decide whether to remove it
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">User Subdomains</h2>
          <p>
            If you are assigned a custom subdomain for your blog:
          </p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>The subdomain is provided for your use in connection with our platform</li>
            <li>We reserve the right to reclaim or reassign subdomains if your account is inactive or terminated</li>
            <li>You may not use your subdomain for illegal activities or content that violates these terms</li>
            <li>Subdomain availability is subject to our discretion</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Subscription and Payment</h2>
          <div className="space-y-3">
            <p>We offer free and paid subscription tiers with varying levels of access:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Subscriptions are billed monthly or annually as specified</li>
              <li>Payments are processed through Stripe or other authorized payment processors</li>
              <li>You can cancel your subscription at any time</li>
              <li>Refunds are handled on a case-by-case basis in accordance with our refund policy</li>
              <li>We reserve the right to change pricing with 30 days notice</li>
              <li>Subscription benefits and features may change over time</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Shop and Purchases</h2>
          <div className="space-y-3">
            <p>When purchasing products through our shop:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>All sales are final unless otherwise stated</li>
              <li>Product availability, pricing, and descriptions are subject to change</li>
              <li>Shipping terms and delivery times are provided at checkout</li>
              <li>We are not responsible for products damaged in transit (contact us for assistance)</li>
              <li>Returns and exchanges are subject to our return policy</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Affiliate Links and Disclosures</h2>
          <p>
            Our platform may contain affiliate links (such as Amazon Associates links). When you click on these links:
          </p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>We may receive a commission if you make a purchase</li>
            <li>Affiliate relationships are disclosed in our content as required by law</li>
            <li>Your purchase is made directly with the merchant, not with us</li>
            <li>We are not responsible for the products, services, or policies of affiliate merchants</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>Use our services for illegal purposes or to violate any applicable laws</li>
            <li>Violate any copyright, trademark, or intellectual property rights</li>
            <li>Publish content that is defamatory, harassing, threatening, or discriminatory</li>
            <li>Post pornography or sexually explicit content, nudity of anyone without their consent, or any nudity or sexual content involving a minor</li>
            <li>Post intimate or private images of anyone without their consent, or images taken where they expected privacy</li>
            <li>Post content showing or promoting abuse, violence, self-harm, gore, or illegal activity</li>
            <li>Publish content that contains malware, viruses, or harmful code</li>
            <li>Attempt to circumvent usage limits or security measures</li>
            <li>Use automated systems to abuse our services or scrape content</li>
            <li>Impersonate others or provide false information</li>
            <li>Reverse engineer or attempt to extract our source code</li>
            <li>Interfere with or disrupt the operation of our platform</li>
            <li>Use our platform to send spam or unsolicited communications</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">User Content and Enforcement</h2>
          <p>
            You are solely responsible for anything you post, upload or submit. We do not review everything before it appears, we are not responsible for content posted by users, and we may remove any of it at any time. Content that breaks these terms is removed and the account behind it is suspended or terminated. Content that appears to involve the sexual exploitation of a minor is reported to the National Center for Missing &amp; Exploited Children (NCMEC), and other illegal content is reported to law enforcement, together with the account and upload records we hold.
          </p>
          <p className="mt-3">
            To report content, email{' '}
            <a href="mailto:media@thelostandunfounds.com" className="underline hover:text-white">media@thelostandunfounds.com</a>{' '}
            with a link to it.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Intellectual Property</h2>
          <p>
            All content, features, and functionality of <strong className="font-bold">THE LOST+UNFOUNDS</strong> platform (excluding user-submitted content) are owned by us and are protected by copyright, trademark, and other intellectual property laws.
          </p>
          <p className="mt-3">
            You may not reproduce, distribute, modify, or create derivative works of our platform or its proprietary content without our express written permission.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Third-Party Content and Links</h2>
          <p>
            Our platform may contain links to third-party websites, services, or content. We are not responsible for:
          </p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>The content, policies, or practices of third-party sites</li>
            <li>Products or services offered by third parties</li>
            <li>Any transactions between you and third parties</li>
            <li>Privacy practices of third-party services</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Limitation of Liability</h2>
          <p>
            <strong className="font-bold">THE LOST+UNFOUNDS</strong> is provided "as is" without warranties of any kind, either express or implied. We are not liable for any damages resulting from your use of our services, including but not limited to:
          </p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>Data loss or corruption</li>
            <li>Service interruptions or downtime</li>
            <li>Security breaches or unauthorized access</li>
            <li>Errors or omissions in content</li>
            <li>Loss of revenue or business opportunities</li>
            <li>Indirect, incidental, or consequential damages</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless <strong className="font-bold">THE LOST+UNFOUNDS</strong>, its owners, employees, and affiliates from any claims, damages, losses, or expenses (including legal fees) arising from:
          </p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>Your use of our services</li>
            <li>Content you publish or submit</li>
            <li>Violation of these Terms of Use</li>
            <li>Violation of any third-party rights</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account at any time for:
          </p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>Violation of these Terms of Use</li>
            <li>Violation of our community standards or guidelines</li>
            <li>Fraudulent or illegal activity</li>
            <li>Extended account inactivity</li>
            <li>Any other reason we deem necessary</li>
          </ul>
          <p className="mt-3">
            Upon termination, your access to the platform will be revoked, but published content may remain accessible unless you request removal.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Governing Law</h2>
          <p>
            These Terms of Use are governed by and construed in accordance with applicable laws. Any disputes arising from these terms or your use of our services will be resolved through appropriate legal channels.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Changes to Terms</h2>
          <p>
            We may modify these Terms of Use at any time. We will notify you of material changes by posting the updated terms on this page and updating the "Last updated" date. Continued use of our services after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Severability</h2>
          <p>
            If any provision of these Terms of Use is found to be invalid or unenforceable, the remaining provisions will continue in full force and effect.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Contact Information</h2>
          <p>
            For questions about these Terms of Use, please contact us at:
          </p>
          <p className="mt-2">
            <strong>Email:</strong> legal@thelostandunfounds.com
          </p>
          <p className="mt-2">
            <strong>Website:</strong> https://www.thelostandunfounds.com
          </p>
        </section>
      </div>
    </div>
  );
}


