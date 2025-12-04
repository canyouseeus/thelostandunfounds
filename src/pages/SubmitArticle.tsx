/**
 * Article Submission Page for THE LOST ARCHIVES
 * Public form for submitting articles with Amazon affiliate links
 */

import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import AuthModal from '../components/auth/AuthModal';
import SubdomainRegistration from '../components/SubdomainRegistration';
import UserRegistration from '../components/UserRegistration';
import StorefrontRegistration from '../components/StorefrontRegistration';
import { FileText, Plus, X, BookOpen, Mail, User, Copy, Check, AlertTriangle } from 'lucide-react';

interface AffiliateLink {
  book_title?: string;
  product_title?: string;
  item_title?: string;
  link: string;
}

type BlogColumn = 'main' | 'bookclub' | 'gearheads' | 'borderlands' | 'science' | 'newtheory';

interface ColumnConfig {
  name: string;
  title: string;
  description: string;
  requiresAffiliates: boolean;
  requiresStorefront: boolean;
  requiresSubdomain: boolean;
  minItems: number;
  maxItems: number;
  itemLabel: string;
  linkLabel: string;
  promptPath?: string;
}

const COLUMN_CONFIGS: Record<BlogColumn, ColumnConfig> = {
  main: {
    name: 'Main Blog',
    title: 'SUBMIT TO THE LOST ARCHIVES',
    description: 'Pure writing and personal expression. Essays, reflections, stories, and philosophical or cultural commentary.',
    requiresAffiliates: false,
    requiresStorefront: false,
    requiresSubdomain: false,
    minItems: 0,
    maxItems: 0,
    itemLabel: '',
    linkLabel: '',
  },
  bookclub: {
    name: 'BookClub',
    title: 'SUBMIT TO BOOK CLUB',
    description: 'Share your insights on books and how they\'ve shaped your thinking. Submit an article featuring four books with your Amazon affiliate links.',
    requiresAffiliates: true,
    requiresStorefront: true,
    requiresSubdomain: true,
    minItems: 4,
    maxItems: 4,
    itemLabel: 'Book',
    linkLabel: 'Amazon Affiliate Link',
    promptPath: '/prompts/AI_WRITING_PROMPT_FOR_CONTRIBUTORS.md',
  },
  gearheads: {
    name: 'GearHeads',
    title: 'SUBMIT TO GEARHEADS',
    description: 'Explore tools, setups, kits, and combinations that create experiences. Share how items combine to support workflows, hobbies, or lifestyle practices.',
    requiresAffiliates: true,
    requiresStorefront: true,
    requiresSubdomain: true,
    minItems: 1,
    maxItems: 8,
    itemLabel: 'Product',
    linkLabel: 'Amazon Affiliate Link',
    promptPath: '/prompts/GEARHEADS_WRITING_PROMPT.md',
  },
  borderlands: {
    name: 'Edge of the Borderlands',
    title: 'SUBMIT TO EDGE OF THE BORDERLANDS',
    description: 'Share travel experiences and practical adventure insights. Stories of journeys, what you brought, how you navigated spaces, and lessons learned.',
    requiresAffiliates: true,
    requiresStorefront: true,
    requiresSubdomain: true,
    minItems: 1,
    maxItems: 8,
    itemLabel: 'Item',
    linkLabel: 'Affiliate Link',
    promptPath: '/prompts/BORDERLANDS_WRITING_PROMPT.md',
  },
  science: {
    name: 'Science Column',
    title: 'SUBMIT TO SCIENCE COLUMN',
    description: 'Deep dives into scientific concepts and discoveries. Physics, quantum theory, biology, emerging sciences, and applied innovation.',
    requiresAffiliates: false,
    requiresStorefront: false,
    requiresSubdomain: false,
    minItems: 0,
    maxItems: 0,
    itemLabel: '',
    linkLabel: '',
    promptPath: '/prompts/SCIENCE_WRITING_PROMPT.md',
  },
  newtheory: {
    name: 'NEW THEORY',
    title: 'SUBMIT TO NEW THEORY',
    description: 'Practical application of scientific and systems thinking in everyday life. Nutrition, household systems, habit-building, resource management, and DIY experiments.',
    requiresAffiliates: false,
    requiresStorefront: false,
    requiresSubdomain: false,
    minItems: 0,
    maxItems: 8,
    itemLabel: 'Item',
    linkLabel: 'Affiliate Link',
  },
};

export default function SubmitArticle() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  // Check URL path first, then query param, then default to bookclub
  const pathname = location.pathname;
  let columnParam: string | null = null;
  
  if (pathname.includes('/submit/main')) {
    columnParam = 'main';
  } else if (pathname.includes('/submit/bookclub')) {
    columnParam = 'bookclub';
  } else if (pathname.includes('/submit/gearheads')) {
    columnParam = 'gearheads';
  } else if (pathname.includes('/submit/borderlands')) {
    columnParam = 'borderlands';
  } else if (pathname.includes('/submit/science')) {
    columnParam = 'science';
  } else if (pathname.includes('/submit/newtheory')) {
    columnParam = 'newtheory';
  } else {
    columnParam = searchParams.get('column') || 'bookclub';
  }
  
  const column = (Object.keys(COLUMN_CONFIGS).includes(columnParam.toLowerCase()) 
    ? columnParam.toLowerCase() 
    : 'bookclub') as BlogColumn;
  const config = COLUMN_CONFIGS[column];
  const { user, loading: authLoading } = useAuth();
  const { success, error: showError } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [userSubdomain, setUserSubdomain] = useState<string | null>(null);
  const [loadingSubdomain, setLoadingSubdomain] = useState(true);
  const [showUserRegistrationModal, setShowUserRegistrationModal] = useState(false);
  const [showSubdomainModal, setShowSubdomainModal] = useState(false);
  const [showStorefrontModal, setShowStorefrontModal] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [promptContent, setPromptContent] = useState<string>('');
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    author_name: '',
    author_email: '',
    amazon_storefront_id: '',
  });

  // Load the AI writing prompt
  useEffect(() => {
    const loadPrompt = async () => {
      if (!config.promptPath) {
        setLoadingPrompt(false);
        return;
      }
      try {
        const response = await fetch(config.promptPath);
        if (response.ok) {
          const text = await response.text();
          setPromptContent(text);
        } else {
          console.error('Failed to load prompt file');
        }
      } catch (error) {
        console.error('Error loading prompt:', error);
      } finally {
        setLoadingPrompt(false);
      }
    };
    loadPrompt();
  }, [config.promptPath]);

  // Check if user has completed registration and subdomain
  useEffect(() => {
    if (user && !authLoading) {
      const checkRegistration = async () => {
        // Step 1: Check if username is set
        const userMetadata = user.user_metadata || {};
        const hasAuthorName = userMetadata.author_name;

        // If missing username, show user registration modal
        if (!hasAuthorName) {
          setShowSubdomainModal(false);
          setShowStorefrontModal(false);
          setShowUserRegistrationModal(true);
          return;
        }

        // Step 2: Check subdomain
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
              
              // Step 3: Check for storefront ID (after subdomain is set)
              const hasStorefrontId = userMetadata.amazon_storefront_id;
              if (!hasStorefrontId) {
                setShowStorefrontModal(true);
              }
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

        // Get user's email and pre-filled registration data
        // Author name and storefront ID should be set during registration
        const authorName = userMetadata.author_name || '';
        const storefrontId = userMetadata.amazon_storefront_id || '';
        
        setFormData(prev => ({
          ...prev,
          author_email: user.email || '',
          author_name: authorName,
          amazon_storefront_id: storefrontId,
        }));
      };

      checkRegistration();
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

  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>([]);

  // Initialize affiliate links when column changes
  useEffect(() => {
    const initialCount = config.minItems;
    setAffiliateLinks(Array(initialCount).fill(null).map(() => ({ link: '' })));
  }, [column]);

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

  const updateAffiliateLink = (index: number, field: 'book_title' | 'product_title' | 'item_title' | 'link', value: string) => {
    const updated = [...affiliateLinks];
    // Clear all title fields and set the appropriate one
    if (field === 'book_title' || field === 'product_title' || field === 'item_title') {
      updated[index] = {
        ...updated[index],
        book_title: undefined,
        product_title: undefined,
        item_title: undefined,
        [field]: value,
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setAffiliateLinks(updated);
  };

  const getTitleField = (): 'book_title' | 'product_title' | 'item_title' => {
    if (column === 'bookclub') return 'book_title';
    if (column === 'gearheads') return 'product_title';
    return 'item_title';
  };

  const getTitleValue = (link: AffiliateLink): string => {
    return link.book_title || link.product_title || link.item_title || '';
  };

  const [bulkAffiliateInput, setBulkAffiliateInput] = useState('');

  const handleBulkInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const input = e.target.value;
    setBulkAffiliateInput(input);

    const extracted: AffiliateLink[] = [];
    // Split by newlines but keep content
    const lines = input.split(/\n+/).map(l => l.trim()).filter(l => l);
    // Regex to find http/https/amzn.to links
    const urlRegex = /((https?:\/\/)|(www\.)|(amzn\.to))[^\s]+/;

    let bufferTitle = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(urlRegex);

      if (match) {
        const url = match[0];
        // Check for title on same line (e.g. "Title - Link")
        const textBefore = line.replace(url, '')
          .replace(/[-:|–]\s*$/, '') // Remove trailing separators
          .trim();
        
        let title = textBefore;
        // If no title on same line, use the previous buffer line
        if (!title && bufferTitle) {
          title = bufferTitle;
        }
        
        // Clean up title
        title = title.replace(/^[-*•\d.]+\s+/, ''); // Remove bullet points/numbers

        const titleField = getTitleField();
        const linkObj: AffiliateLink = { link: url };
        linkObj[titleField] = title || '';
        extracted.push(linkObj);
        
        bufferTitle = ''; // Title consumed
      } else {
        // Likely a title for the next link
        bufferTitle = line;
      }
    }

    // Update state: Ensure proper item count
    const newLinks = [...extracted];
    // Pad if less than minimum
    while (newLinks.length < config.minItems) {
      const linkObj: AffiliateLink = { link: '' };
      newLinks.push(linkObj);
    }
    // Truncate if more than maximum
    if (newLinks.length > config.maxItems) {
      newLinks.length = config.maxItems;
    }
    
    setAffiliateLinks(newLinks);
  };

  const copyPromptToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(promptContent);
      setCopiedPrompt(true);
      success('AI Writing Prompt copied to clipboard!');
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      showError('Failed to copy prompt to clipboard');
    }
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
    if (config.requiresSubdomain && !userSubdomain) {
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
    if (!formData.author_name || !formData.author_name.trim()) {
      showError('Author name is required');
      return false;
    }
    if (!formData.author_email.trim() || !formData.author_email.includes('@')) {
      showError('Please enter a valid email address');
      return false;
    }
    
    // Validate Amazon storefront ID if required
    if (config.requiresStorefront) {
      if (!formData.amazon_storefront_id.trim()) {
        showError('Please enter your Amazon Storefront ID or URL');
        return false;
      }
      
      if (!validateAmazonStorefront(formData.amazon_storefront_id)) {
        showError('Please enter a valid Amazon Storefront ID or URL (e.g., https://www.amazon.com/shop/yourstorefront or just your storefront ID)');
        return false;
      }
    }
    
    // Validate affiliate links if required
    if (config.requiresAffiliates) {
      const titleField = getTitleField();
      const validLinks = affiliateLinks.filter(
        link => {
          const title = getTitleValue(link);
          return title.trim() && link.link.trim();
        }
      );
      
      if (validLinks.length < config.minItems) {
        showError(`Please provide at least ${config.minItems} ${config.itemLabel.toLowerCase()}${config.minItems > 1 ? 's' : ''} with both title and affiliate link`);
        return false;
      }
      
      // Validate each link
      for (const link of validLinks) {
        if (!link.link.trim().startsWith('http')) {
          showError('Please provide valid URLs (starting with http:// or https://) for all affiliate links');
          return false;
        }
        // For bookclub, require Amazon links
        if (column === 'bookclub' && !link.link.includes('amazon') && !link.link.includes('amzn.to')) {
          showError('Please provide valid Amazon affiliate links (amazon.com or amzn.to)');
          return false;
        }
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
      // Filter out empty affiliate links if required
      let validLinks: AffiliateLink[] = [];
      if (config.requiresAffiliates) {
        validLinks = affiliateLinks.filter(
          link => {
            const title = getTitleValue(link);
            return title.trim() && link.link.trim();
          }
        );

        if (validLinks.length < config.minItems) {
          showError(`Please provide at least ${config.minItems} ${config.itemLabel.toLowerCase()}${config.minItems > 1 ? 's' : ''} with both title and affiliate link`);
          setSubmitting(false);
          return;
        }
      }

      if (config.requiresSubdomain && !userSubdomain) {
        showError('Please register your subdomain first');
        setShowSubdomainModal(true);
        setSubmitting(false);
        return;
      }

      // Extract and normalize storefront ID if required
      const storefrontId = config.requiresStorefront 
        ? extractStorefrontId(formData.amazon_storefront_id)
        : null;

      const submissionData: any = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        excerpt: formData.excerpt.trim() || null,
        author_name: formData.author_name.trim(),
        author_email: formData.author_email.trim(),
        status: 'pending',
        blog_column: column,
      };

      // Add optional fields
      if (config.requiresAffiliates && validLinks.length > 0) {
        submissionData.amazon_affiliate_links = validLinks.slice(0, config.maxItems);
      }
      if (config.requiresStorefront && storefrontId) {
        submissionData.amazon_storefront_id = storefrontId;
      }
      if (config.requiresSubdomain && userSubdomain) {
        submissionData.subdomain = userSubdomain;
      }

      const { error } = await supabase
        .from('blog_submissions')
        .insert([submissionData]);

      if (error) throw error;

      // Send submission confirmation email
      try {
        const emailResponse = await fetch('/api/blog/submission-confirmation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            authorEmail: formData.author_email.trim(),
            authorName: formData.author_name.trim(),
            articleTitle: formData.title.trim(),
          }),
        });

        if (!emailResponse.ok) {
          console.warn('Failed to send submission confirmation email:', await emailResponse.text());
        }
      } catch (emailError) {
        console.error('Error sending submission confirmation email:', emailError);
      }

      success('Your article has been submitted successfully! A confirmation email has been sent. We\'ll review it and get back to you soon.');
      
      // Reset form
      setFormData({
        title: '',
        content: '',
        excerpt: '',
        author_name: '',
        author_email: '',
        amazon_storefront_id: '',
      });
      // Reset affiliate links to initial state
      setAffiliateLinks(() => {
        const initialCount = config.minItems;
        return Array(initialCount).fill(null).map(() => ({ link: '' }));
      });
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
        <title>Submit to {config.name} | THE LOST ARCHIVES | THE LOST+UNFOUNDS</title>
        <meta name="description" content={config.description} />
      </Helmet>
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <UserRegistration
        isOpen={showUserRegistrationModal}
        onClose={() => {
          // Don't allow closing if registration is incomplete
          const userMetadata = user?.user_metadata || {};
          if (!userMetadata.author_name || !userMetadata.amazon_storefront_id) {
            return;
          }
          setShowUserRegistrationModal(false);
        }}
        onSuccess={(username) => {
          setShowUserRegistrationModal(false);
          // After username registration, check for subdomain
          const checkSubdomain = async () => {
            if (user) {
              const { data } = await supabase
                .from('user_subdomains')
                .select('subdomain')
                .eq('user_id', user.id)
                .single();
              
              if (!data) {
                setShowSubdomainModal(true);
              } else {
                // Subdomain exists, check for storefront
                const userMetadata = user.user_metadata || {};
                if (!userMetadata.amazon_storefront_id) {
                  setUserSubdomain(data.subdomain);
                  setShowStorefrontModal(true);
                }
              }
            }
          };
          checkSubdomain();
        }}
        required={true}
      />
      <SubdomainRegistration
        isOpen={showSubdomainModal}
        onClose={() => {
          // Don't allow closing if user doesn't have a subdomain
          if (!userSubdomain) {
            return;
          }
          setShowSubdomainModal(false);
        }}
        onSuccess={(subdomain) => {
          setUserSubdomain(subdomain);
          setShowSubdomainModal(false);
          // After subdomain, check for storefront
          const userMetadata = user?.user_metadata || {};
          if (!userMetadata.amazon_storefront_id) {
            setShowStorefrontModal(true);
          }
        }}
        required={!userSubdomain}
      />
      <StorefrontRegistration
        isOpen={showStorefrontModal}
        onClose={() => {
          // Don't allow closing if registration is incomplete
          const userMetadata = user?.user_metadata || {};
          if (!userMetadata.amazon_storefront_id) {
            return;
          }
          setShowStorefrontModal(false);
        }}
        onSuccess={(storefrontId) => {
          setShowStorefrontModal(false);
          // Refresh user data to get updated metadata
          window.location.reload();
        }}
        subdomain={userSubdomain || ''}
        required={true}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!user && !authLoading && (
          <div className="mb-8 text-center bg-yellow-900/20 border border-white rounded-none p-6">
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
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 tracking-wide whitespace-nowrap">
            {config.title}
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto mb-4 text-left">
            {config.description}
          </p>
        </div>

        {/* AI Writing Prompt Box */}
        {config.promptPath && (
        <div className="mb-8">
          <div className="bg-black/50 border border-white rounded-none p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white mb-1">AI Writing Prompt for Contributors</h2>
              <p className="text-white/60 text-sm mb-2">Copy this prompt to use with your AI assistant</p>
              <div className="bg-yellow-900/20 border border-white rounded-none p-3 mt-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-yellow-300 text-xs">
                  <strong>Important:</strong> Do not modify this prompt. Use it exactly as provided to ensure your article matches our format and style requirements.
                </p>
              </div>
            </div>
            {loadingPrompt ? (
              <div className="bg-black/50 border border-white rounded-none p-4">
                <p className="text-white/60 text-sm">Loading prompt...</p>
              </div>
            ) : (
              <>
                <pre className="bg-black/50 border border-white rounded-none p-4 overflow-x-auto text-white/90 text-sm font-mono whitespace-pre-wrap break-words text-left max-h-96 overflow-y-auto relative">
                  <button
                    onClick={copyPromptToClipboard}
                    className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 rounded-none text-white transition flex items-center justify-center flex-shrink-0 z-10"
                    title={copiedPrompt ? "Copied!" : "Copy Prompt"}
                  >
                    {copiedPrompt ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  <code className="text-left">{promptContent || 'Failed to load prompt. Please refresh the page.'}</code>
                </pre>
                <div className="flex justify-center mt-4">
                  <button
                    onClick={copyPromptToClipboard}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-none text-white text-sm transition flex items-center gap-2"
                  >
                    {copiedPrompt ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Prompt
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        )}

        {/* Tips Section */}
        <div className="mb-8">
          <div className="bg-black/30 border border-white rounded-none p-6 mt-6">
            <h3 className="text-lg font-bold text-white mb-4">Important Tips for Contributors</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-white font-semibold mb-2">How Book Linking Works:</h4>
                <ul className="text-white/70 text-sm space-y-1 list-disc list-inside">
                  <li>Book titles in the text will automatically become clickable links - just mention them naturally where relevant</li>
                  <li>Each book should be linked a maximum of 2 times - once in the introduction and once in its dedicated section</li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-2">Formatting Tips:</h4>
                <ul className="text-white/70 text-sm space-y-1 list-disc list-inside">
                  <li>Use double line breaks (⸻) to separate major sections</li>
                  <li>Keep paragraphs focused - one main idea per paragraph</li>
                  <li>Write for humans, not algorithms - prioritize genuine insights over keyword stuffing</li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-2">Ready to Submit?</h4>
                <p className="text-white/70 text-sm mb-2">
                  Once you have your draft, paste your content in the form below. Make sure to:
                </p>
                <ul className="text-white/70 text-sm space-y-1 list-disc list-inside">
                  <li>Fill in all placeholders with actual information</li>
                  <li>Add your Amazon affiliate links in the form</li>
                  <li>Review the formatting matches the example post</li>
                  <li>Add your personal touches and experiences</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {user && (
          <div className="bg-black/50 border border-white rounded-none p-6 md:p-8">
            {/* Column indicator */}
            <div className="mb-6 pb-4 border-b border-white">
              <p className="text-white/60 text-sm">
                Submitting to: <span className="text-white font-semibold">{config.name}</span>
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">

            {/* Subdomain Display (read-only) - only show if required */}
            {config.requiresSubdomain && userSubdomain && (
              <div className="bg-green-900/20 border border-white rounded-none p-4">
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
            {config.requiresSubdomain && !userSubdomain && !loadingSubdomain && (
              <div className="bg-yellow-900/20 border border-white rounded-none p-4">
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
                className="w-full px-4 py-2 bg-black/50 border border-white rounded-none text-white focus:border-white focus:outline-none"
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
                className="w-full px-4 py-2 bg-black/50 border border-white rounded-none text-white focus:border-white focus:outline-none font-mono text-sm"
                rows={20}
                placeholder="Write your article here. Use double line breaks for paragraphs...

Example structure:
- Introduction (3-4 paragraphs)
- Book sections (each with 3-4 paragraphs)
- Conclusion

Use double line breaks between sections. Book titles mentioned in the text will automatically become clickable links if you add them in the Amazon Affiliate Links section below. The Amazon Affiliate Disclosure will be added automatically after the introduction."
                required
              />
              <div className="text-white/50 text-xs mt-2 space-y-1">
                <p>• Use double line breaks (press Enter twice) to create paragraphs</p>
                <p>• Headings should be on their own line</p>
                <p>• Book titles mentioned in your text will automatically become clickable links</p>
                {config.promptPath && (
                  <p>• See the <a href={`/${column}/prompt`} target="_blank" rel="noopener noreferrer" className="text-white hover:text-white/80 underline uppercase font-semibold">AI Writing Prompt Guide</a> for detailed formatting instructions</p>
                )}
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
                className="w-full px-4 py-2 bg-black/50 border border-white rounded-none text-white focus:border-white focus:outline-none"
                rows={3}
                placeholder="A brief summary of your article (will be shown on the blog listing page)"
              />
            </div>

            {/* Affiliate Links - only show if required */}
            {config.requiresAffiliates && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-white/80 text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  {config.itemLabel} Affiliate Links {config.minItems === config.maxItems ? `(Required - Exactly ${config.minItems} ${config.itemLabel}${config.minItems > 1 ? 's' : ''})` : `(Required - ${config.minItems} to ${config.maxItems} ${config.itemLabel}${config.maxItems > 1 ? 's' : ''})`} *
                </label>
                {affiliateLinks.length < config.maxItems && (
                  <button
                    type="button"
                    onClick={addAffiliateLink}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white rounded-none text-white text-xs font-medium transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add {config.itemLabel}
                  </button>
                )}
              </div>
              
              <p className="text-white/60 text-sm mb-4">
                {config.minItems === config.maxItems 
                  ? `You must provide exactly ${config.minItems} ${config.itemLabel.toLowerCase()}${config.minItems > 1 ? 's' : ''}.`
                  : `You must provide between ${config.minItems} and ${config.maxItems} ${config.itemLabel.toLowerCase()}${config.maxItems > 1 ? 's' : ''}.`
                }
                {column === 'bookclub' && ' Paste your list below (Title and Link) to auto-fill, or enter them manually.'}
              </p>

              {/* Bulk Paste Box - only for bookclub */}
              {column === 'bookclub' && (
              <div className="bg-black/30 border border-white rounded-none p-4 mb-6">
                <label className="block text-white/80 text-xs mb-2 font-semibold">
                  QUICK ADD: Paste your book list here to auto-fill
                </label>
                <textarea
                  value={bulkAffiliateInput}
                  onChange={handleBulkInput}
                  className="w-full px-3 py-2 bg-black/50 border border-white rounded-none text-white text-sm focus:border-white focus:outline-none font-mono placeholder-white/30"
                  rows={6}
                  placeholder={`Paste format example:
The E-Myth Revisited
https://amzn.to/3...

Atomic Habits - https://amzn.to/4...`}
                />
              </div>
              )}
              
              <div className="space-y-3">
                {affiliateLinks.map((link, index) => (
                  <div key={index} className="bg-black/30 border border-white rounded-none p-4">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-white/80 text-sm font-medium">
                        {config.itemLabel} {index + 1} {index < config.minItems && <span className="text-white/50">(Required)</span>}
                      </span>
                      {affiliateLinks.length > config.minItems && (
                        <button
                          type="button"
                          onClick={() => removeAffiliateLink(index)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-white/70 text-xs mb-1">{config.itemLabel} Title {index < config.minItems && '*'}</label>
                        <input
                          type="text"
                          value={getTitleValue(link)}
                          onChange={(e) => updateAffiliateLink(index, getTitleField(), e.target.value)}
                          className="w-full px-3 py-2 bg-black/50 border border-white rounded-none text-white text-sm focus:border-white focus:outline-none"
                          placeholder={`e.g., ${column === 'bookclub' ? 'The E-Myth Revisited' : column === 'gearheads' ? 'MacBook Pro 16"' : 'Travel Backpack'}`}
                          required={index < config.minItems}
                        />
                      </div>
                      <div>
                        <label className="block text-white/70 text-xs mb-1">{config.linkLabel} {index < config.minItems && '*'}</label>
                        <input
                          type="url"
                          value={link.link}
                          onChange={(e) => updateAffiliateLink(index, 'link', e.target.value)}
                          className="w-full px-3 py-2 bg-black/50 border border-white rounded-none text-white text-sm focus:border-white focus:outline-none"
                          placeholder={column === 'bookclub' ? 'https://amzn.to/... or https://amazon.com/...' : 'https://...'}
                          required={index < config.minItems}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {column === 'bookclub' && (
              <div className="bg-blue-900/20 border border-white rounded-none p-3 mt-4">
                <p className="text-blue-300 text-xs">
                  <strong>Tip:</strong> Make sure to mention these book titles in your article content. 
                  When you mention a book title (e.g., "The E-Myth Revisited"), it will automatically become a clickable link 
                  using the affiliate link you provide here. Each book can be linked up to 2 times in your article.
                </p>
              </div>
              )}
            </div>
            )}

            {/* Submit Button */}
            <div className="pt-4 border-t border-white">
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
