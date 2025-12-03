/**
 * Support Page
 */

import { Link } from 'react-router-dom';
import { HelpCircle, Book, Mail, MessageCircle, ArrowRight } from 'lucide-react';

export default function Support() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-white mb-4">SUPPORT CENTER</h1>
        <p className="text-xl text-white/70">
          We're here to help you get the most out of THE LOST+UNFOUNDS
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <Link
          to="/docs/faq"
          className="group relative bg-black/50 border border-white/10 rounded-none px-6 py-4 hover:border-white/40 hover:bg-white/5 hover:shadow-[0_8px_30px_rgba(255,255,255,0.12)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border border-white/20 flex items-center justify-center text-white group-hover:border-white/50 group-hover:scale-110 transition-all flex-shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="flex flex-col justify-center min-h-[40px]">
              <h3 className="text-lg font-bold text-white leading-none text-left">FAQ</h3>
              <p className="text-sm text-white/70 leading-tight mt-1.5 text-left">
                Find answers to commonly asked questions
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-2 transition-all" />
        </Link>

        <Link
          to="/docs"
          className="group relative bg-black/50 border border-white/10 rounded-none px-6 py-4 hover:border-white/40 hover:bg-white/5 hover:shadow-[0_8px_30px_rgba(255,255,255,0.12)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border border-white/20 flex items-center justify-center text-white group-hover:border-white/50 group-hover:scale-110 transition-all flex-shrink-0">
              <Book className="w-5 h-5" />
            </div>
            <div className="flex flex-col justify-center min-h-[40px]">
              <h3 className="text-lg font-bold text-white leading-none text-left">Documentation</h3>
              <p className="text-sm text-white/70 leading-tight mt-1.5 text-left">
                Comprehensive guides and tutorials
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-2 transition-all" />
        </Link>

        <Link
          to="/contact"
          className="group relative bg-black/50 border border-white/10 rounded-none px-6 py-4 hover:border-white/40 hover:bg-white/5 hover:shadow-[0_8px_30px_rgba(255,255,255,0.12)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border border-white/20 flex items-center justify-center text-white group-hover:border-white/50 group-hover:scale-110 transition-all flex-shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="flex flex-col justify-center min-h-[40px]">
              <h3 className="text-lg font-bold text-white leading-none text-left">Contact Us</h3>
              <p className="text-sm text-white/70 leading-tight mt-1.5 text-left">
                Send us a message and we'll get back to you
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-2 transition-all" />
        </Link>

        <div className="group relative bg-black/50 border border-white/10 rounded-none px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border border-white/20 flex items-center justify-center text-white flex-shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="flex flex-col justify-center min-h-[40px]">
              <h3 className="text-lg font-bold text-white leading-none text-left">Community</h3>
              <p className="text-sm text-white/70 leading-tight mt-1.5 text-left">
                Join our community for tips, updates, and discussions
              </p>
            </div>
          </div>
          <span className="text-xs text-white/60">Coming Soon</span>
        </div>
      </div>

      <div className="bg-black/50 border border-white/10 rounded-none p-8">
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

      <div className="mt-8 p-6 bg-black/50 border border-white/10 rounded-none text-center">
        <h3 className="text-xl font-bold text-white mb-2">Still Need Help?</h3>
        <p className="text-white/70 mb-4">
          Our support team is available to assist you with any questions or issues.
        </p>
        <Link
          to="/contact"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition"
        >
          Get in Touch <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}


