/**
 * Support Page
 */

import { Link } from 'react-router-dom';
import { HelpCircle, Book, Mail, MessageCircle, ArrowRight } from 'lucide-react';

export default function Support() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-white mb-4">Support Center</h1>
        <p className="text-xl text-white/70">
          We're here to help you get the most out of THE LOST+UNFOUNDS
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <Link
          to="/docs/faq"
          className="bg-black border border-white/10 rounded-lg p-6 hover:border-white/30 transition group"
        >
          <HelpCircle className="w-8 h-8 text-white mb-4 group-hover:text-yellow-400 transition" />
          <h3 className="text-xl font-bold text-white mb-2">FAQ</h3>
          <p className="text-white/70 mb-4">
            Find answers to commonly asked questions
          </p>
          <span className="text-white/60 group-hover:text-white transition flex items-center gap-2">
            View FAQ <ArrowRight className="w-4 h-4" />
          </span>
        </Link>

        <Link
          to="/docs"
          className="bg-black border border-white/10 rounded-lg p-6 hover:border-white/30 transition group"
        >
          <Book className="w-8 h-8 text-white mb-4 group-hover:text-yellow-400 transition" />
          <h3 className="text-xl font-bold text-white mb-2">Documentation</h3>
          <p className="text-white/70 mb-4">
            Comprehensive guides and tutorials
          </p>
          <span className="text-white/60 group-hover:text-white transition flex items-center gap-2">
            Read Docs <ArrowRight className="w-4 h-4" />
          </span>
        </Link>

        <Link
          to="/contact"
          className="bg-black border border-white/10 rounded-lg p-6 hover:border-white/30 transition group"
        >
          <Mail className="w-8 h-8 text-white mb-4 group-hover:text-yellow-400 transition" />
          <h3 className="text-xl font-bold text-white mb-2">Contact Us</h3>
          <p className="text-white/70 mb-4">
            Send us a message and we'll get back to you
          </p>
          <span className="text-white/60 group-hover:text-white transition flex items-center gap-2">
            Contact Support <ArrowRight className="w-4 h-4" />
          </span>
        </Link>

        <div className="bg-black border border-white/10 rounded-lg p-6">
          <MessageCircle className="w-8 h-8 text-white mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Community</h3>
          <p className="text-white/70 mb-4">
            Join our community for tips, updates, and discussions
          </p>
          <span className="text-white/60">
            Coming Soon
          </span>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-white mb-4">Common Issues</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-white font-semibold mb-2">Can't download videos?</h3>
            <p className="text-white/70 text-sm">
              Make sure you're using a valid TikTok URL and haven't exceeded your daily download limit. 
              Check your account tier in your Profile page.
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">Forgot your password?</h3>
            <p className="text-white/70 text-sm">
              Use the "Forgot Password" link on the login page, or contact support if you need additional help.
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">Payment issues?</h3>
            <p className="text-white/70 text-sm">
              If you're experiencing payment problems, please contact us directly with your account email 
              and we'll help resolve the issue.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 p-6 bg-black border border-white/10 rounded-lg text-center">
        <h3 className="text-xl font-bold text-white mb-2">Still Need Help?</h3>
        <p className="text-white/70 mb-4">
          Our support team is available to assist you with any questions or issues.
        </p>
        <Link
          to="/contact"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition"
        >
          Get in Touch <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}


