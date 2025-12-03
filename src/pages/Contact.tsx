/**
 * Contact Page
 */

import { useState } from 'react';
import { Mail, Send, CheckCircle } from 'lucide-react';
import { useToast } from '../components/Toast';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { success, error: showError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Implement actual contact form submission
      // For now, just simulate success
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setSubmitted(true);
      success('Message sent successfully! We\'ll get back to you soon.');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      showError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 sm:mb-12 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">CONTACT US</h1>
        <p className="text-lg sm:text-xl text-white/70 px-4">
          Have a question? We'd love to hear from you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Info */}
        <div className="space-y-6">
          <div className="bg-black/50 border border-white/10 rounded-none p-6">
            <Mail className="w-6 h-6 text-white mb-3" />
            <h3 className="text-white font-semibold mb-2">Email</h3>
            <a href="mailto:support@thelostandunfounds.com" className="text-white/70 hover:text-white transition">
              support@thelostandunfounds.com
            </a>
          </div>
          <div className="bg-black/50 border border-white/10 rounded-none p-6">
            <h3 className="text-white font-semibold mb-2">Response Time</h3>
            <p className="text-white/70 text-sm">
              We typically respond within 24-48 hours during business days.
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2">
          <div className="bg-black/50 border border-white/10 rounded-none p-6">
            {submitted ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Message Sent!</h3>
                <p className="text-white/70 mb-6">
                  Thank you for contacting us. We'll get back to you as soon as possible.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-4 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-white font-medium mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 sm:py-2 bg-black/50 border border-white/10 rounded-none text-white placeholder-white/40 focus:outline-none focus:border-white/30 text-base min-h-[44px] touch-action: manipulation"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-white font-medium mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 sm:py-2 bg-black/50 border border-white/10 rounded-none text-white placeholder-white/40 focus:outline-none focus:border-white/30 text-base min-h-[44px] touch-action: manipulation"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-white font-medium mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 sm:py-2 bg-black/50 border border-white/10 rounded-none text-white placeholder-white/40 focus:outline-none focus:border-white/30 text-base min-h-[44px] touch-action: manipulation"
                    placeholder="What's this about?"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-white font-medium mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 sm:py-2 bg-black/50 border border-white/10 rounded-none text-white placeholder-white/40 focus:outline-none focus:border-white/30 resize-none text-base touch-action: manipulation"
                    placeholder="Tell us more..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>Sending...</>
                  ) : (
                    <>
                      Send Message <Send className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


