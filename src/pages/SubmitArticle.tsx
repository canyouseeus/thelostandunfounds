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
  const [subdomainError, setSubdomainError] = useState('');
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
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
      
      // Generate suggested subdomain from email (username part) as default
      if (user.email && !subdomain) {
        const emailSubdomain = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        setSubdomain(emailSubdomain);
      }
    }
  }, [user, authLoading, navigate, showError]);

  const validateSubdomain = (value: string): boolean => {
    // Subdomain rules: lowercase alphanumeric and hyphens only, 3-63 characters
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
    
    if (!value) {
      setSubdomainError('Subdomain is required');
      return false;
    }
    
    if (value.length < 3) {
      setSubdomainError('Subdomain must be at least 3 characters');
      return false;
    }
    
    if (value.length > 63) {
      setSubdomainError('Subdomain must be 63 characters or less');
      return false;
    }
    
    if (!subdomainRegex.test(value)) {
      setSubdomainError('Subdomain can only contain lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen.');
      return false;
    }
    
    // Reserved subdomains
    const reserved = ['www', 'api', 'admin', 'blog', 'mail', 'ftp', 'localhost', 'test', 'staging', 'dev', 'app', 'thelostarchives', 'thelostandunfounds'];
    if (reserved.includes(value.toLowerCase())) {
      setSubdomainError('This subdomain is reserved and cannot be used');
      return false;
    }
    
    setSubdomainError('');
    return true;
  };

  const checkSubdomainAvailability = async (value: string) => {
    if (!validateSubdomain(value)) {
      return false;
    }

    setCheckingSubdomain(true);
    try {
      // Check if subdomain is already used in blog_posts or blog_submissions
      const [postsResult, submissionsResult] = await Promise.all([
        supabase
          .from('blog_posts')
          .select('id')
          .eq('subdomain', value.toLowerCase())
          .limit(1),
        supabase
          .from('blog_submissions')
          .select('id')
          .eq('subdomain', value.toLowerCase())
          .limit(1)
      ]);

      if (postsResult.data && postsResult.data.length > 0) {
        setSubdomainError('This subdomain is already taken');
        setCheckingSubdomain(false);
        return false;
      }

      if (submissionsResult.data && submissionsResult.data.length > 0) {
        // Check if it's the current user's submission
        const isCurrentUser = submissionsResult.data.some((sub: any) => 
          sub.author_email === formData.author_email
        );
        if (!isCurrentUser) {
          setSubdomainError('This subdomain is already taken');
          setCheckingSubdomain(false);
          return false;
        }
      }

      setSubdomainError('');
      return true;
    } catch (err) {
      console.error('Error checking subdomain:', err);
      // Don't block submission if check fails, but warn user
      setSubdomainError('Could not verify subdomain availability. Please try again.');
      return false;
    } finally {
      setCheckingSubdomain(false);
    }
  };

  const handleSubdomainChange = (value: string) => {
    // Convert to lowercase and remove invalid characters as user types
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomain(cleaned);
    setSubdomainError('');
    
    // Validate format (but don't check availability until blur)
    if (cleaned && !validateSubdomain(cleaned)) {
      // Error already set by validateSubdomain
    }
  };
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>([
    { book_title: '', link: '' },
    { book_title: '', link: '' },
    { book_title: '', link: '' },
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

  const validateForm = async () => {
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
    
    // Validate subdomain
    const isSubdomainValid = await checkSubdomainAvailability(subdomain);
    if (!isSubdomainValid) {
      showError(subdomainError || 'Please choose a valid subdomain');
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

      const submissionData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        excerpt: formData.excerpt.trim() || null,
        author_name: formData.author_name.trim(),
        author_email: formData.author_email.trim(),
        amazon_affiliate_links: validLinks.slice(0, 4), // Only use first 4 valid links
        status: 'pending',
        subdomain: subdomain.toLowerCase().trim() || null, // Store subdomain for user blog
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

            {/* Subdomain */}
            <div>
              <label className="block text-white/80 text-sm mb-2">
                Your Blog Subdomain *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => handleSubdomainChange(e.target.value)}
                  onBlur={() => checkSubdomainAvailability(subdomain)}
                  className="flex-1 px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white focus:border-white/30 focus:outline-none"
                  placeholder="your-blog-name"
                  required
                />
                <span className="text-white/60 text-sm whitespace-nowrap">.thelostandunfounds.com</span>
              </div>
              {subdomainError && (
                <p className="text-red-400 text-xs mt-1">{subdomainError}</p>
              )}
              {checkingSubdomain && (
                <p className="text-white/50 text-xs mt-1">Checking availability...</p>
              )}
              {!subdomainError && subdomain && !checkingSubdomain && (
                <p className="text-green-400 text-xs mt-1">✓ Available</p>
              )}
              <p className="text-white/50 text-xs mt-2">
                Choose a unique subdomain for your blog. This will be your custom URL: <span className="text-white/70 font-mono">{subdomain || 'your-blog-name'}.thelostandunfounds.com</span>
              </p>
              <p className="text-white/40 text-xs mt-1">
                • 3-63 characters • Lowercase letters, numbers, and hyphens only • Cannot start or end with hyphen
              </p>
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
                  Amazon Affiliate Links (Required - 4 Books) *
                </label>
                {affiliateLinks.length < 10 && (
                  <button
                    type="button"
                    onClick={addAffiliateLink}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-white text-sm transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Another
                  </button>
                )}
              </div>
              
              <p className="text-white/60 text-sm mb-4">
                Please provide exactly <strong className="text-white">4 books</strong> that your article discusses. 
                Each book needs both a title and an Amazon affiliate link. These will be automatically linked in your article.
              </p>
              
              <div className="space-y-3">
                {affiliateLinks.map((link, index) => (
                  <div key={index} className="bg-black/30 border border-white/10 rounded-none p-4">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-white/80 text-sm font-medium">
                        Book {index + 1} {index < 4 && <span className="text-white/50">(Required)</span>}
                      </span>
                      {affiliateLinks.length > 4 && (
                        <button
                          type="button"
                          onClick={() => removeAffiliateLink(index)}
                          className="text-red-400 hover:text-red-300 transition"
                          title="Remove this book"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
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
                  <strong>💡 Tip:</strong> Make sure to mention these book titles in your article content. 
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
      </div>
    </>
  );
}
