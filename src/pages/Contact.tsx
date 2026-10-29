/**
 * Contact Page
 *
 * The form used to wait a second and say "sent" without sending anything.
 * It now opens a ticket like /support does, so a message lands in the company
 * inbox and the admin Support console, and the sender gets a copy.
 */

import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import SupportRequestForm from '../components/support/SupportRequestForm';

const surface = { borderRadius: 0 } as const;

export default function Contact() {
  return (
    <>
      <Helmet>
        <title>THE LOST+UNFOUNDS | Contact</title>
        <meta name="description" content="Get in touch with THE LOST+UNFOUNDS. We'd love to hear from you and help with any questions, inquiries, or feedback you might have about our platform." />
        <link rel="canonical" href="https://www.thelostandunfounds.com/contact" />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left">
        <div className="mb-8 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">CONTACT US</h1>
          <p className="text-lg sm:text-xl text-white/70">
            Have a question? We'd love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="bg-white/5 p-6" style={surface}>
              <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-2">Email</h3>
              <a href="mailto:support@thelostandunfounds.com" className="text-white/70 hover:text-white transition-colors text-sm break-all">
                support@thelostandunfounds.com
              </a>
            </div>
            <div className="bg-white/5 p-6" style={surface}>
              <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-2">Response Time</h3>
              <p className="text-white/70 text-sm">
                We typically respond within 24-48 hours during business days. Every message gets a ticket number and a page where you can follow the conversation.
              </p>
            </div>
            <div className="bg-white/5 p-6" style={surface}>
              <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-2">Something Broken?</h3>
              <p className="text-white/70 text-sm">
                Affiliates, photographers and clients: the <Link to="/support" className="underline hover:text-white">Support Center</Link> has guides and your open tickets.
              </p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <SupportRequestForm defaultCategory="General question" turnstileAction="contact" />
          </div>
        </div>
      </div>
    </>
  );
}
