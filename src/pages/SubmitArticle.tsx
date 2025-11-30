/**
 * Article Submission Page for THE LOST ARCHIVES
 * Public form for submitting articles with Amazon affiliate links
 */

import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { FileText, Plus, X, BookOpen, Mail, User } from 'lucide-react';

interface AffiliateLink {
  book_title: string;
  link: string;
}

export default function SubmitArticle() {
  const { user, loading: authLoading } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [subdomain, setSubdomain] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    author_name: '',
    author_email: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      // Redirect to login or show message
      showError('Please sign in to submit articles');
      navigate('/');
    } else if (user) {
      // Get user's email for default
      setFormData(prev => ({
        ...prev,
        author_email: user.email || '',
        author_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
      }));
      
      // Generate subdomain from email (username part)
      if (user.email) {
        const emailSubdomain = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        setSubdomain(emailSubdomain);
      }
    }
  }, [user, authLoading, navigate, showError]);
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>([
    { book_title: '', link: '' }
  ]);

  const addAffiliateLink = () => {
    setAffiliateLinks([...affiliateLinks, { book_title: '', link: '' }]);
  };

  const removeAffiliateLink = (index: number) => {
    setAffiliateLinks(affiliateLinks.filter((_, i) => i !== index));
  };

  const updateAffiliateLink = (index: number, field: keyof AffiliateLink, value: string) => {
    const updated = [...affiliateLinks];
    updated[index][field] = value;
    setAffiliateLinks(updated);
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      showError('Please enter a title');
      return false;
    }
    if (!formData.content.trim()) {
      showError('Please enter article content');
      return false;
    }
    if (!formData.author_name.trim()) {
      showError('Please enter your name');
      return false;
    }
    if (!formData.author_email.trim() || !formData.author_email.includes('@')) {
      showError('Please enter a valid email address');
      return false;
    }
    
    // Validate affiliate links
    for (const link of affiliateLinks) {
      if (link.book_title.trim() && !link.link.trim()) {
        showError('Please provide a link for all book titles');
        return false;
      }
      if (link.link.trim() && !link.link.startsWith('http')) {
        showError('Please provide valid URLs for affiliate links');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      // Filter out empty affiliate links
      const validLinks = affiliateLinks.filter(
        link => link.book_title.trim() && link.link.trim()
      );

      const submissionData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        excerpt: formData.excerpt.trim() || null,
        author_name: formData.author_name.trim(),
        author_email: formData.author_email.trim(),
        amazon_affiliate_links: validLinks.length > 0 ? validLinks : [],
        status: 'pending',
        subdomain: subdomain || null, // Store subdomain for user blog
      };

      const { error } = await supabase
        .from('blog_submissions')
        .insert([submissionData]);

      if (error) throw error;

      success('Your article has been submitted successfully! We\'ll review it and get back to you soon.');
      
      // Reset form
      setFormData({
        title: '',
        content: '',
        excerpt: '',
        author_name: '',
        author_email: '',
      });
      setAffiliateLinks([{ book_title: '', link: '' }]);
    } catch (err: any) {
      console.error('Error submitting article:', err);
      showError(err.message || 'Failed to submit article. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Submit Article | THE LOST ARCHIVES | THE LOST+UNFOUNDS</title>
        <meta name="description" content="Submit your article to THE LOST ARCHIVES. Share your insights on development, AI, and building in the age of information." />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-wide">
            Submit to THE LOST ARCHIVES
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto mb-4">
            Share your insights on development, AI, and building in the age of information. 
            If your article includes book recommendations, you can include your Amazon affiliate links.
          </p>
          <details className="max-w-2xl mx-auto text-left">
            <summary className="text-white/80 text-sm cursor-pointer hover:text-white transition mb-2">
              📝 Need help? View AI Writing Prompt Guide
            </summary>
            <div className="bg-black/30 border border-white/10 rounded-none p-4 mt-2 text-white/70 text-sm">
              <p className="mb-3">
                <strong className="text-white">Using AI to help write your article?</strong> We have a comprehensive prompt guide that will help you create content that matches our format and style.
              </p>
              <a
                href="/AI_WRITING_PROMPT_FOR_CONTRIBUTORS.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                View AI Writing Prompt Guide →
              </a>
              <p className="mt-3 text-xs text-white/50">
                This guide shows you exactly how to structure your article, format book sections, and ensure your Amazon links are properly integrated.
              </p>
            </div>
          </details>
        </div>

        <div className="bg-black/50 border border-white/10 rounded-none p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Author Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 text-sm mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Your Name *
                </label>
                <input
                  type="text"
                  value={formData.author_name}
                  onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                  className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white focus:border-white/30 focus:outline-none"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Your Email *
                </label>
                <input
                  type="email"
                  value={formData.author_email}
                  onChange={(e) => setFormData({ ...formData, author_email: e.target.value })}
                  className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white focus:border-white/30 focus:outline-none"
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            {/* Article Title */}
            <div>
              <label className="block text-white/80 text-sm mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Article Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white focus:border-white/30 focus:outline-none"
                placeholder="Your Article Title"
                required
              />
            </div>

            {/* Article Content */}
            <div>
              <label className="block text-white/80 text-sm mb-2">
                Article Content *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white focus:border-white/30 focus:outline-none font-mono text-sm"
                rows={20}
                placeholder="Write your article here. Use double line breaks for paragraphs...

Example structure:
- Introduction (3-4 paragraphs)
- Amazon Affiliate Disclosure
- Book sections (each with 3-4 paragraphs)
- Conclusion

Use double line breaks between sections. Book titles mentioned in the text will automatically become clickable links if you add them in the Amazon Affiliate Links section below."
                required
              />
              <div className="text-white/50 text-xs mt-2 space-y-1">
                <p>• Use double line breaks (press Enter twice) to create paragraphs</p>
                <p>• Headings should be on their own line</p>
                <p>• Book titles mentioned in your text will automatically become clickable links</p>
                <p>• See the <a href="/AI_WRITING_PROMPT_FOR_CONTRIBUTORS.md" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">AI Writing Prompt Guide</a> for detailed formatting instructions</p>
              </div>
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-white/80 text-sm mb-2">
                Excerpt (Optional)
              </label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white focus:border-white/30 focus:outline-none"
                rows={3}
                placeholder="A brief summary of your article (will be shown on the blog listing page)"
              />
            </div>

            {/* Amazon Affiliate Links */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-white/80 text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Amazon Affiliate Links (Optional)
                </label>
                <button
                  type="button"
                  onClick={addAffiliateLink}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-white text-sm transition flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Book
                </button>
              </div>
              
              <div className="space-y-3">
                {affiliateLinks.map((link, index) => (
                  <div key={index} className="bg-black/30 border border-white/10 rounded-none p-4">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-white/60 text-sm">Book {index + 1}</span>
                      {affiliateLinks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAffiliateLink(index)}
                          className="text-red-400 hover:text-red-300 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-white/70 text-xs mb-1">Book Title</label>
                        <input
                          type="text"
                          value={link.book_title}
                          onChange={(e) => updateAffiliateLink(index, 'book_title', e.target.value)}
                          className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-none text-white text-sm focus:border-white/30 focus:outline-none"
                          placeholder="The Book Title"
                        />
                      </div>
                      <div>
                        <label className="block text-white/70 text-xs mb-1">Amazon Affiliate Link</label>
                        <input
                          type="url"
                          value={link.link}
                          onChange={(e) => updateAffiliateLink(index, 'link', e.target.value)}
                          className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-none text-white text-sm focus:border-white/30 focus:outline-none"
                          placeholder="https://amzn.to/..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-white/50 text-xs mt-2">
                If your article mentions books, you can include your Amazon affiliate links here. 
                These will be integrated into the published article.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-white/10">
              <button
                type="submit"
                disabled={submitting}
                className="w-full md:w-auto px-8 py-3 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Article'}
              </button>
              <p className="text-white/50 text-xs mt-3">
                By submitting, you agree that your article may be edited and published on THE LOST ARCHIVES. 
                You'll be notified via email when your submission is reviewed.
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
