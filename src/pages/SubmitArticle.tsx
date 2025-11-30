/**
 * Article Submission Page for THE LOST ARCHIVES
 * Public form for submitting articles with Amazon affiliate links
 */

import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import AuthModal from '../components/auth/AuthModal';
import SubdomainRegistration from '../components/SubdomainRegistration';
import { FileText, Plus, X, BookOpen, Mail, User } from 'lucide-react';

interface AffiliateLink {
  book_title: string;
  link: string;
}

export default function SubmitArticle() {
  const { user, loading: authLoading } = useAuth();
  const { success, error: showError } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [userSubdomain, setUserSubdomain] = useState<string | null>(null);
  const [loadingSubdomain, setLoadingSubdomain] = useState(true);
  const [showSubdomainModal, setShowSubdomainModal] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    author_name: '',
    author_email: '',
    amazon_storefront_id: '',
  });

  // Check if user has a subdomain
  useEffect(() => {
    if (user && !authLoading) {
      const fetchUserSubdomain = async () => {
        setLoadingSubdomain(true);
        try {
          const { data, error } = await supabase
            .from('user_subdomains')
            .select('subdomain')
            .eq('user_id', user.id)
            .single();

          // Handle table not found error gracefully
          if (error) {
            if (error.code === 'PGRST116') {
              // No rows returned - user doesn't have subdomain yet
              setShowSubdomainModal(true);
            } else if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
              // Table doesn't exist yet - show subdomain modal
              console.warn('user_subdomains table not found. Please run the SQL migration script.');
              setShowSubdomainModal(true);
            } else {
              console.error('Error fetching subdomain:', error);
            }
          } else if (data) {
            setUserSubdomain(data.subdomain);
          } else {
            // User doesn't have a subdomain - show registration modal
            setShowSubdomainModal(true);
          }
        } catch (err: any) {
          console.error('Error in subdomain check:', err);
          // If table doesn't exist, show subdomain modal
          if (err?.message?.includes('does not exist') || err?.message?.includes('schema cache')) {
            setShowSubdomainModal(true);
          }
        } finally {
          setLoadingSubdomain(false);
        }
      };

      fetchUserSubdomain();

      // Get user's email for default
      setFormData(prev => ({
        ...prev,
        author_email: user.email || '',
        author_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
      }));
    } else if (!authLoading && !user) {
      // Open login modal instead of redirecting
      setAuthModalOpen(true);
    }
  }, [user, authLoading]);

  // Close auth modal when user successfully logs in
  useEffect(() => {
    if (user && authModalOpen) {
      setAuthModalOpen(false);
    }
  }, [user, authModalOpen]);

  const handleSubdomainSuccess = (subdomain: string) => {
    setUserSubdomain(subdomain);
    setShowSubdomainModal(false);
    success(`Your subdomain ${subdomain}.thelostandunfounds.com is now active!`);
  };

  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>([
    { book_title: '', link: '' },
    { book_title: '', link: '' },
    { book_title: '', link: '' },
    { book_title: '', link: '' }
  ]);

  const addAffiliateLink = () => {
    // Only allow up to 4 books total
    if (affiliateLinks.length < 4) {
      setAffiliateLinks([...affiliateLinks, { book_title: '', link: '' }]);
    }
  };

  const removeAffiliateLink = (index: number) => {
    // Don't allow removing if we only have 4 (exactly 4 required)
    if (affiliateLinks.length > 4) {
      setAffiliateLinks(affiliateLinks.filter((_, i) => i !== index));
    }
  };

  const updateAffiliateLink = (index: number, field: keyof AffiliateLink, value: string) => {
    const updated = [...affiliateLinks];
    updated[index][field] = value;
    setAffiliateLinks(updated);
  };

  const validateAmazonStorefront = (value: string): boolean => {
    if (!value || !value.trim()) {
      return false;
    }

    const trimmed = value.trim();
    
    // Check if it's a full Amazon storefront URL
    const storefrontUrlPatterns = [
      /^https?:\/\/(www\.)?amazon\.(com|co\.uk|ca|de|fr|it|es|jp|in|au|br|mx|nl|sg|ae|sa)\/(shop|stores)\/[a-zA-Z0-9_-]+/i,
      /^https?:\/\/(www\.)?amazon\.(com|co\.uk|ca|de|fr|it|es|jp|in|au|br|mx|nl|sg|ae|sa)\/.*[?&]me=([a-zA-Z0-9_-]+)/i,
    ];

    // Check if it matches any storefront URL pattern
    for (const pattern of storefrontUrlPatterns) {
      if (pattern.test(trimmed)) {
        return true;
      }
    }

    // Check if it's just a storefront ID (alphanumeric, hyphens, underscores, typically 10-20 chars)
    const storefrontIdPattern = /^[a-zA-Z0-9_-]{3,50}$/;
    if (storefrontIdPattern.test(trimmed)) {
      return true;
    }

    return false;
  };

  const extractStorefrontId = (value: string): string => {
    if (!value || !value.trim()) {
      return '';
    }

    const trimmed = value.trim();

    // If it's a URL, extract the ID
    const urlMatch = trimmed.match(/\/(shop|stores)\/([a-zA-Z0-9_-]+)/i);
    if (urlMatch && urlMatch[2]) {
      return urlMatch[2];
    }

    // Check for ?me= parameter
    const meMatch = trimmed.match(/[?&]me=([a-zA-Z0-9_-]+)/i);
    if (meMatch && meMatch[1]) {
      return meMatch[1];
    }

    // If it's just an ID, return as-is
    const storefrontIdPattern = /^[a-zA-Z0-9_-]{3,50}$/;
    if (storefrontIdPattern.test(trimmed)) {
      return trimmed;
    }

    return trimmed;
  };

  const validateForm = async () => {
    if (!userSubdomain) {
      showError('Please register your subdomain first');
      setShowSubdomainModal(true);
      return false;
    }
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
    
    // Validate Amazon storefront ID
    if (!formData.amazon_storefront_id.trim()) {
      showError('Please enter your Amazon Storefront ID or URL');
      return false;
    }
    
    if (!validateAmazonStorefront(formData.amazon_storefront_id)) {
      showError('Please enter a valid Amazon Storefront ID or URL (e.g., https://www.amazon.com/shop/yourstorefront or just your storefront ID)');
      return false;
    }
    
    // Validate affiliate links - require at least 4 books
    const validLinks = affiliateLinks.filter(
      link => link.book_title.trim() && link.link.trim()
    );
    
    if (validLinks.length < 4) {
      showError('Please provide exactly 4 books with both title and Amazon affiliate link');
      return false;
    }
    
    // Validate each link
    for (const link of validLinks) {
      if (!link.link.trim().startsWith('http')) {
        showError('Please provide valid URLs (starting with http:// or https://) for all Amazon affiliate links');
        return false;
      }
      if (!link.link.includes('amazon') && !link.link.includes('amzn.to')) {
        showError('Please provide valid Amazon affiliate links (amazon.com or amzn.to)');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!(await validateForm())) {
      return;
    }

    setSubmitting(true);

    try {
      // Filter out empty affiliate links - must have exactly 4
      const validLinks = affiliateLinks.filter(
        link => link.book_title.trim() && link.link.trim()
      );

      if (validLinks.length < 4) {
        showError('Please provide exactly 4 books with both title and Amazon affiliate link');
        return;
      }

      if (!userSubdomain) {
        showError('Please register your subdomain first');
        setShowSubdomainModal(true);
        return;
      }

      // Extract and normalize storefront ID
      const storefrontId = extractStorefrontId(formData.amazon_storefront_id);

      const submissionData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        excerpt: formData.excerpt.trim() || null,
        author_name: formData.author_name.trim(),
        author_email: formData.author_email.trim(),
        amazon_affiliate_links: validLinks.slice(0, 4), // Only use first 4 valid links
        amazon_storefront_id: storefrontId,
        status: 'pending',
        subdomain: userSubdomain, // Use the registered subdomain
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
        amazon_storefront_id: '',
      });
      setAffiliateLinks([
        { book_title: '', link: '' },
        { book_title: '', link: '' },
        { book_title: '', link: '' },
        { book_title: '', link: '' }
      ]);
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
        <meta name="description" content="Submit your article to THE LOST ARCHIVES. Share your insights on books and how they've shaped your thinking. Feature four books with Amazon affiliate links." />
      </Helmet>
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <SubdomainRegistration
        isOpen={showSubdomainModal}
        onClose={() => {
          // Don't allow closing if user doesn't have a subdomain
          if (!userSubdomain) {
            return;
          }
          setShowSubdomainModal(false);
        }}
        onSuccess={handleSubdomainSuccess}
        required={!userSubdomain}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!user && !authLoading && (
          <div className="mb-8 text-center bg-yellow-900/20 border border-yellow-500/50 rounded-none p-6">
            <h2 className="text-xl font-bold text-white mb-2">Sign In Required</h2>
            <p className="text-white/70 mb-4">
              Please sign in or create an account to submit articles to THE LOST ARCHIVES.
            </p>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-6 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition"
            >
              Sign In / Sign Up
            </button>
          </div>
        )}
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-wide">
            Submit to THE LOST ARCHIVES
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto mb-4">
            Share your insights on books and how they've shaped your thinking. 
            Submit an article featuring four books with your Amazon affiliate links.
          </p>
          <details className="max-w-2xl mx-auto text-left">
            <summary className="text-white/80 text-sm cursor-pointer hover:text-white transition mb-2">
              Need help? View AI Writing Prompt Guide
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

        {user && (
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

            {/* Amazon Storefront ID */}
            <div>
              <label className="block text-white/80 text-sm mb-2">
                Amazon Storefront ID or URL * <span className="text-white/50 text-xs font-normal">(Internal - Not displayed publicly)</span>
              </label>
              <input
                type="text"
                value={formData.amazon_storefront_id}
                onChange={(e) => setFormData({ ...formData, amazon_storefront_id: e.target.value })}
                onBlur={() => {
                  if (formData.amazon_storefront_id && !validateAmazonStorefront(formData.amazon_storefront_id)) {
                    showError('Please enter a valid Amazon Storefront ID or URL');
                  }
                }}
                className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white focus:border-white/30 focus:outline-none"
                placeholder="https://www.amazon.com/shop/yourstorefront or yourstorefront"
                required
              />
              <p className="text-white/50 text-xs mt-2">
                Enter your Amazon Associates Storefront ID or full URL. This is used for internal tracking only and will not be displayed on your published article.
              </p>
              <ul className="text-white/40 text-xs mt-1 list-disc list-inside space-y-1">
                <li>Full URL: <span className="font-mono text-white/60">https://www.amazon.com/shop/yourstorefront</span></li>
                <li>Storefront ID only: <span className="font-mono text-white/60">yourstorefront</span></li>
              </ul>
              {formData.amazon_storefront_id && validateAmazonStorefront(formData.amazon_storefront_id) && (
                <p className="text-green-400 text-xs mt-1">Valid storefront format</p>
              )}
            </div>

            {/* Subdomain Display (read-only) */}
            {userSubdomain && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-none p-4">
                <label className="block text-white/80 text-sm mb-2">
                  Your Blog Subdomain
                </label>
                <p className="text-white/90 font-mono text-sm">
                  {userSubdomain}.thelostandunfounds.com
                </p>
                <p className="text-white/50 text-xs mt-1">
                  Your subdomain is set and cannot be changed. All your articles will be published under this subdomain.
                </p>
              </div>
            )}
            {!userSubdomain && !loadingSubdomain && (
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-none p-4">
                <p className="text-yellow-300 text-sm mb-2">
                  You need to register a subdomain before submitting articles.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSubdomainModal(true)}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-none transition"
                >
                  Register Subdomain
                </button>
              </div>
            )}

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
                  Amazon Affiliate Links (Required - Exactly 4 Books) *
                </label>
                {affiliateLinks.length < 4 && (
                  <button
                    type="button"
                    onClick={addAffiliateLink}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-white text-sm transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Book
                  </button>
                )}
              </div>
              
              <p className="text-white/60 text-sm mb-4">
                You must provide exactly <strong className="text-white">4 books</strong> (no more, no less). 
                Each book needs both a title and an Amazon affiliate link. These will be automatically linked in your article.
              </p>
              
              <div className="space-y-3">
                {affiliateLinks.map((link, index) => (
                  <div key={index} className="bg-black/30 border border-white/10 rounded-none p-4">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-white/80 text-sm font-medium">
                        Book {index + 1} <span className="text-white/50">(Required)</span>
                      </span>
                      {/* No remove button - exactly 4 books required */}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-white/70 text-xs mb-1">Book Title *</label>
                        <input
                          type="text"
                          value={link.book_title}
                          onChange={(e) => updateAffiliateLink(index, 'book_title', e.target.value)}
                          className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-none text-white text-sm focus:border-white/30 focus:outline-none"
                          placeholder="e.g., The E-Myth Revisited"
                          required={index < 4}
                        />
                      </div>
                      <div>
                        <label className="block text-white/70 text-xs mb-1">Amazon Affiliate Link *</label>
                        <input
                          type="url"
                          value={link.link}
                          onChange={(e) => updateAffiliateLink(index, 'link', e.target.value)}
                          className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-none text-white text-sm focus:border-white/30 focus:outline-none"
                          placeholder="https://amzn.to/... or https://amazon.com/..."
                          required={index < 4}
                        />
                        <p className="text-white/40 text-xs mt-1">
                          Use your Amazon Associates affiliate link (amzn.to short links or full amazon.com URLs)
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-none p-3 mt-4">
                <p className="text-blue-300 text-xs">
                  <strong>Tip:</strong> Make sure to mention these book titles in your article content. 
                  When you mention a book title (e.g., "The E-Myth Revisited"), it will automatically become a clickable link 
                  using the affiliate link you provide here. Each book can be linked up to 2 times in your article.
                </p>
              </div>
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
        )}
      </div>
    </>
  );
}
