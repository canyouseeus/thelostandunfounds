/**
 * Blog Submission Review Component
 * Admin interface for reviewing and approving/rejecting blog submissions
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import { LoadingSpinner } from './Loading';
import { FileText, CheckCircle, XCircle, Eye, Mail, Calendar, BookOpen, MessageSquare, User, X, AlertTriangle, Check } from 'lucide-react';

interface AffiliateLink {
  book_title: string;
  link: string;
}

// --- Link Matching Logic (Mirrored from BlogPost.tsx) ---

// Normalize book title for matching - handles case, punctuation, and common variations
const normalizeBookTitle = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    // Normalize apostrophes and quotes
    .replace(/[''`]/g, "'")
    // Normalize hyphens and dashes
    .replace(/[—–-]/g, '-')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Normalize commas and spacing
    .replace(/,\s*/g, ', ');
};

// Find book title match using intelligent fuzzy matching
const findBookTitleMatch = (text: string, bookTitles: string[]): string | null => {
  if (!text || !bookTitles || bookTitles.length === 0) return null;
  
  const normalizedText = normalizeBookTitle(text);
  
  // Strategy 1: Exact normalized match
  for (const title of bookTitles) {
    if (normalizeBookTitle(title) === normalizedText) {
      return title;
    }
  }
  
  // Strategy 2: Remove apostrophes and compare (Ender's Game = Enders Game)
  const removeApostrophes = (t: string) => normalizeBookTitle(t).replace(/'/g, '');
  const textNoApostrophe = removeApostrophes(text);
  for (const title of bookTitles) {
    if (removeApostrophes(title) === textNoApostrophe) {
      return title;
    }
  }
  
  // Strategy 3: Word-by-word matching (handle punctuation differences)
  const getWords = (t: string) => {
    return normalizeBookTitle(t)
      .replace(/[.,!?;:()\[\]{}'"]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(w => w.length > 0);
  };
  
  const textWords = getWords(text);
  for (const title of bookTitles) {
    const titleWords = getWords(title);
    const significantTitleWords = titleWords.filter(w => w.length > 2);
    const significantTextWords = textWords.filter(w => w.length > 2);
    
    if (significantTitleWords.length === 0 || significantTextWords.length === 0) continue;
    
    // Count how many title words appear in text
    const matchingWords = significantTitleWords.filter(tw => 
      significantTextWords.some(txt => txt === tw || txt.includes(tw) || tw.includes(txt))
    );
    
    const reverseMatch = significantTextWords.filter(txt =>
      significantTitleWords.some(tw => txt === tw || txt.includes(tw) || tw.includes(txt))
    );
    
    const matchRatio = Math.max(
      matchingWords.length / significantTitleWords.length,
      reverseMatch.length / significantTextWords.length
    );
    
    if (matchRatio >= 0.7) { 
      return title;
    }
  }
  
  // Strategy 4: Core title matching (remove "the", "a", "an")
  const getCoreTitle = (t: string) => {
    return normalizeBookTitle(t)
      .replace(/^(the|a|an)\s+/i, '')
      .replace(/\s+(the|a|an)$/i, '')
      .replace(/'/g, '');
  };
  
  const coreText = getCoreTitle(text);
  for (const title of bookTitles) {
    const coreTitle = getCoreTitle(title);
    if (coreTitle === coreText || 
        (coreTitle.length > 5 && coreText.includes(coreTitle)) ||
        (coreText.length > 5 && coreTitle.includes(coreText))) {
      return title;
    }
  }
  
  return null;
};

// Analyze links against content to check if they will be linked correctly
const analyzeLinkHealth = (content: string, links: AffiliateLink[]) => {
  if (!content || !links || links.length === 0) return [];

  // 1. Build the variations map (Exact logic from BlogPost.tsx)
  const bookLinks: Record<string, string> = {};
  
  links.forEach((link) => {
    if (link.book_title && link.link) {
      bookLinks[link.book_title] = link.link;
      
      // Handle apostrophe variations (e.g. "Enders Game" -> "Ender's Game", "Ender's Game")
      // Also handle specific case for "Ender's Game"
      if (link.book_title.toLowerCase().includes('ender') && link.book_title.toLowerCase().includes('game')) {
        bookLinks["Ender's Game"] = link.link;
        bookLinks["Ender’s Game"] = link.link;
        bookLinks["Enders Game"] = link.link;
      }

      if (!link.book_title.includes("'") && !link.book_title.includes("’")) {
        // Try adding apostrophe before 's'
        if (link.book_title.endsWith("s Game")) {
          const withApostrophe = link.book_title.replace("s Game", "'s Game");
          const withSmartApostrophe = link.book_title.replace("s Game", "’s Game");
          bookLinks[withApostrophe] = link.link;
          bookLinks[withSmartApostrophe] = link.link;
        }
      }
      
      // Handle "The Lion, the Witch and the Wardrobe" specific variations
      if (link.book_title.toLowerCase().includes('lion') && 
          link.book_title.toLowerCase().includes('witch') && 
          link.book_title.toLowerCase().includes('wardrobe')) {
        bookLinks['The Lion, the Witch and the Wardrobe'] = link.link;
        bookLinks['Lion, the Witch and the Wardrobe'] = link.link;
        bookLinks['The Lion, The Witch And The Wardrobe'] = link.link;
        bookLinks['the lion, the witch and the wardrobe'] = link.link;
      }
      
      // General "The" prefix handling
      if (!link.book_title.toLowerCase().startsWith('the ')) {
        const withThe = `The ${link.book_title}`;
        bookLinks[withThe] = link.link;
        const withTheTitleCase = `The ${link.book_title.charAt(0).toUpperCase() + link.book_title.slice(1)}`;
        bookLinks[withTheTitleCase] = link.link;
      }
      
      // Handle apostrophe variations for existing titles
      if (link.book_title.includes("'") || link.book_title.includes("'")) {
        const withoutApostrophe = link.book_title.replace(/['']/g, '');
        bookLinks[withoutApostrophe] = link.link;
      }
    }
  });

  // 2. Check each submitted link
  const allVariations = Object.keys(bookLinks);
  const paragraphs = content.split('\n').filter(p => p.trim().length > 0);

  return links.map(link => {
    // Find all variations that map to this link's URL
    // (This handles the case where "Ender's Game" is found but the submitted title was "Enders Game")
    const variationsForThisLink = allVariations.filter(v => bookLinks[v] === link.link);
    
    let matchCount = 0;
    
    // Check every paragraph
    for (const para of paragraphs) {
      // Use the robust matcher
      const matchedTitle = findBookTitleMatch(para, variationsForThisLink);
      if (matchedTitle) {
        matchCount++;
      }
    }
    
    return {
      title: link.book_title,
      count: matchCount,
      variations: variationsForThisLink
    };
  });
};

interface BlogSubmission {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  author_name: string;
  author_email: string;
  subdomain: string | null;
  amazon_affiliate_links: AffiliateLink[];
  amazon_storefront_id: string | null;
  blog_column: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'published';
  admin_notes: string | null;
  rejected_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function BlogSubmissionReview() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [submissions, setSubmissions] = useState<BlogSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<BlogSubmission | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'published'>('all');

  useEffect(() => {
    loadSubmissions();
  }, [filterStatus]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('blog_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading submissions:', error);
        showError('Failed to load submissions');
        return;
      }

      setSubmissions(data || []);
    } catch (err) {
      console.error('Error loading submissions:', err);
      showError('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (submission: BlogSubmission) => {
    if (!user) {
      showError('You must be logged in');
      return;
    }

    try {
      const { error } = await supabase
        .from('blog_submissions')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: reviewNotes || null,
        })
        .eq('id', submission.id);

      if (error) throw error;

      // Send approval notification email
      try {
        const emailResponse = await fetch('/api/blog/submission-approved', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            authorEmail: submission.author_email,
            authorName: submission.author_name.trim(),
            articleTitle: submission.title,
          }),
        });

        if (!emailResponse.ok) {
          console.warn('Failed to send approval notification email:', await emailResponse.text());
        }
      } catch (emailError) {
        console.error('Error sending approval notification email:', emailError);
      }

      success('Submission approved successfully. A notification email has been sent to the author.');
      setSelectedSubmission(null);
      setReviewNotes('');
      loadSubmissions();
    } catch (err: any) {
      console.error('Error approving submission:', err);
      showError(err.message || 'Failed to approve submission');
    }
  };

  const handleReject = async (submission: BlogSubmission) => {
    if (!user) {
      showError('You must be logged in');
      return;
    }

    if (!rejectionReason.trim()) {
      showError('Please provide a reason for rejection');
      return;
    }

    try {
      const { error } = await supabase
        .from('blog_submissions')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejected_reason: rejectionReason,
          admin_notes: reviewNotes || null,
        })
        .eq('id', submission.id);

      if (error) throw error;

      // Send rejection notification email with reason
      try {
        const emailResponse = await fetch('/api/blog/submission-rejected', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            authorEmail: submission.author_email,
            authorName: submission.author_name.trim(),
            articleTitle: submission.title,
            rejectionReason: rejectionReason.trim(),
          }),
        });

        if (!emailResponse.ok) {
          console.warn('Failed to send rejection notification email:', await emailResponse.text());
        }
      } catch (emailError) {
        console.error('Error sending rejection notification email:', emailError);
      }

      success('Submission rejected. A notification email with the rejection reason has been sent to the author.');
      setSelectedSubmission(null);
      setReviewNotes('');
      setRejectionReason('');
      loadSubmissions();
    } catch (err: any) {
      console.error('Error rejecting submission:', err);
      showError(err.message || 'Failed to reject submission');
    }
  };

  const handlePublish = async (submission: BlogSubmission) => {
    if (!user) {
      showError('You must be logged in');
      return;
    }

    if (!confirm('This will create a published blog post. Continue?')) {
      return;
    }

    try {
      // Generate slug from title
      const slug = submission.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      // Get user_id/author_id from the submission author (NOT the admin)
      // The schema may use either user_id or author_id, and one may be required
      // We need to find the author's user_id from their email or subdomain
      let userId = null;
      let authorId = null;
      
      // Method 1: If submission has a subdomain, find the user_id from user_subdomains
      if (submission.subdomain) {
        try {
          const { data: subdomainData, error: subdomainError } = await supabase
            .from('user_subdomains')
            .select('user_id')
            .eq('subdomain', submission.subdomain)
            .maybeSingle();
          
          if (subdomainError) {
            console.warn('Error looking up user_id from subdomain:', subdomainError);
          } else if (subdomainData?.user_id) {
            userId = subdomainData.user_id;
            authorId = subdomainData.user_id;
            console.log(`Found author user_id ${userId} from subdomain ${submission.subdomain}`);
          }
        } catch (err) {
          console.warn('Could not find user_id from subdomain:', err);
        }
      }
      
      // Method 2: If we still don't have user_id, try to find it from user_roles by email
      if (!userId && submission.author_email) {
        try {
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('email', submission.author_email)
            .maybeSingle();
          
          if (roleError) {
            console.warn('Error looking up user_id from user_roles:', roleError);
          } else if (roleData?.user_id) {
            userId = roleData.user_id;
            authorId = roleData.user_id;
            console.log(`Found author user_id ${userId} from email ${submission.author_email} in user_roles`);
          }
        } catch (err) {
          console.warn('Could not find user_id from user_roles:', err);
        }
      }
      
      // Method 3: Try to find from blog_submissions (if the author has other submissions)
      if (!userId && submission.author_email) {
        try {
          const { data: otherSubmissions, error: submissionsError } = await supabase
            .from('blog_submissions')
            .select('subdomain')
            .eq('author_email', submission.author_email)
            .not('subdomain', 'is', null)
            .limit(1)
            .maybeSingle();
          
          if (!submissionsError && otherSubmissions?.subdomain) {
            // Try to get user_id from that subdomain
            const { data: subdomainData } = await supabase
              .from('user_subdomains')
              .select('user_id')
              .eq('subdomain', otherSubmissions.subdomain)
              .maybeSingle();
            
            if (subdomainData?.user_id) {
              userId = subdomainData.user_id;
              authorId = subdomainData.user_id;
              console.log(`Found author user_id ${userId} from other submission's subdomain`);
            }
          }
        } catch (err) {
          console.warn('Could not find user_id from other submissions:', err);
        }
      }
      
      // If we still don't have user_id, we cannot proceed - user_id is required
      if (!userId) {
        showError(`Could not find user_id for author ${submission.author_email} (subdomain: ${submission.subdomain || 'none'}). Please ensure the author has a subdomain registered or their email is in user_roles.`);
        return;
      }

      // Ensure author_name is set (required)
      if (!submission.author_name || !submission.author_name.trim()) {
        showError('Author name is required. Please update the submission with an author name before publishing.');
        return;
      }

      // Warn if subdomain is missing (post won't show on Book Club page)
      if (!submission.subdomain) {
        const proceed = confirm(
          'Warning: This submission has no subdomain. The post will be published but may not appear on the Book Club page.\n\n' +
          'Posts without subdomains are typically for THE LOST ARCHIVES main blog.\n\n' +
          'Do you want to continue publishing?'
        );
        if (!proceed) {
          return;
        }
      }

      // Clean content: remove ⸻ characters and normalize line breaks
      let cleanedContent = submission.content
        // Remove all ⸻ characters (em dashes used as separators)
        .replace(/⸻/g, '')
        // Remove standalone em dashes on their own line
        .replace(/^[—–-]\s*$/gm, '')
        // Normalize multiple line breaks to double line breaks (paragraph breaks)
        .replace(/\n{3,}/g, '\n\n')
        // Remove trailing whitespace from lines
        .split('\n').map(line => line.trimEnd()).join('\n')
        // Remove leading/trailing whitespace
        .trim();

      // Create blog post with subdomain and Amazon links
      // Build insert object conditionally to handle different schema versions
      // Some schemas use user_id, others use author_id, and one may be required
      const blogPostData: any = {
        title: submission.title,
        slug: slug,
        content: cleanedContent, // Use cleaned content
        excerpt: submission.excerpt,
        published: true,
        published_at: new Date().toISOString(),
        status: 'published',
        subdomain: submission.subdomain || null, // User subdomain
        amazon_affiliate_links: submission.amazon_affiliate_links || [], // Store Amazon links
        amazon_storefront_id: submission.amazon_storefront_id || null, // Store Amazon storefront ID
        blog_column: submission.blog_column || null, // Copy blog_column from submission
        seo_title: null,
        seo_description: submission.excerpt || null,
        seo_keywords: null,
        og_image_url: null,
      }

      // Set both user_id and author_id to the author's user_id
      // This handles different schema versions (some use user_id, others use author_id)
      blogPostData.user_id = userId;
      blogPostData.author_id = authorId || userId; // Use same value for both

      // Only include author_name if the column exists (handled via try-catch fallback)
      // The author_name column may not exist in all schema versions
      // We'll try with it first, and if it fails, retry without it
      
      let blogPost
      let blogError
      
      // First attempt: try with author_name
      const firstAttempt = await supabase
        .from('blog_posts')
        .insert([{
          ...blogPostData,
          author_name: submission.author_name.trim(), // Store author name for disclosure
        }])
        .select()
        .single()

      if (firstAttempt.error) {
        const errorMsg = firstAttempt.error.message || '';
        const errorCode = firstAttempt.error.code;
        
        // Handle different error types with appropriate fallbacks
        if (errorMsg.includes('author_name') || errorCode === '42703') {
          // Column doesn't exist - retry without author_name
          console.warn('author_name column not found, retrying without it:', errorMsg)
          const secondAttempt = await supabase
            .from('blog_posts')
            .insert([blogPostData])
            .select()
            .single()
          
          blogPost = secondAttempt.data
          blogError = secondAttempt.error
        } else if (errorMsg.includes('user_id') && errorMsg.includes('null')) {
          // user_id is required but we don't have it - this should not happen if we did the lookup correctly
          console.error('user_id is required but not found. This should not happen after lookup:', errorMsg)
          // Don't use admin user - fail with error
          blogPost = null
          blogError = firstAttempt.error
        } else if (errorMsg.includes('author_id') && errorMsg.includes('null') && !blogPostData.author_id && blogPostData.user_id) {
          // author_id might be required but we have user_id - try setting author_id to user_id
          console.warn('author_id may be required, setting to user_id:', errorMsg)
          const fourthAttempt = await supabase
            .from('blog_posts')
            .insert([{
              ...blogPostData,
              author_id: blogPostData.user_id,
            }])
            .select()
            .single()
          
          blogPost = fourthAttempt.data
          blogError = fourthAttempt.error
        } else {
          // Different error, use the original
          blogPost = firstAttempt.data
          blogError = firstAttempt.error
        }
      } else {
        // Success on first attempt
        blogPost = firstAttempt.data
        blogError = null
      }

      if (blogError) {
        console.error('Error creating blog post:', blogError)
        throw blogError
      }

      // Update submission status (email sent timestamp will be set by the API)
      const { error: updateError } = await supabase
        .from('blog_submissions')
        .update({
          status: 'published',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: reviewNotes || null,
        })
        .eq('id', submission.id);

      if (updateError) throw updateError;

      const postUrl = submission.subdomain 
        ? `/blog/${submission.subdomain}/${slug}`
        : `/thelostarchives/${slug}`;
      
      const fullPostUrl = `${window.location.origin}${postUrl}`;
      
      // Send notification email to the author
      try {
        const emailResponse = await fetch('/api/blog/post-published', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            authorEmail: submission.author_email,
            authorName: submission.author_name.trim(),
            postTitle: submission.title,
            postUrl: fullPostUrl,
            submissionId: submission.id, // Pass submission ID to mark email as sent
          }),
        });

        if (!emailResponse.ok) {
          console.warn('Failed to send notification email:', await emailResponse.text());
          // Don't fail the publish if email fails - just log it
        }
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
        // Don't fail the publish if email fails - just log it
      }
      
      success(`Article published successfully! ${submission.subdomain ? 'It should appear on the Book Club page.' : 'Note: Without a subdomain, it may not appear on the Book Club page.'} A notification email has been sent to ${submission.author_email}.`);
      setSelectedSubmission(null);
      setReviewNotes('');
      loadSubmissions();
      
      // Optionally open the published post in a new tab
      setTimeout(() => {
        window.open(postUrl, '_blank');
      }, 1000);
    } catch (err: any) {
      console.error('Error publishing submission:', err);
      showError(err.message || 'Failed to publish article');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-400/20 text-yellow-400 border-white';
      case 'approved':
        return 'bg-blue-400/20 text-blue-400 border-white';
      case 'rejected':
        return 'bg-red-400/20 text-red-400 border-white';
      case 'published':
        return 'bg-green-400/20 text-green-400 border-white';
      default:
        return 'bg-white/10 text-white/60 border-white';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Blog Submissions Review
        </h2>
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected', 'published'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 text-sm rounded transition ${
                filterStatus === status
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions List */}
      <div className="bg-black/50 border border-white rounded-none p-6">
        {submissions.length === 0 ? (
          <p className="text-white/60 text-left py-8">No submissions found</p>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="bg-black/30 border border-white rounded-none p-4 hover:border-white transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg mb-2">{submission.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-white/60 mb-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {submission.author_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {submission.author_email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(submission.created_at)}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(submission.status)}`}>
                        {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                        {submission.status === 'approved' && (
                          <span className="ml-1 text-yellow-400" title="Approved but not yet published - click to publish">
                            ⚠️ Needs Publishing
                          </span>
                        )}
                      </span>
                    </div>
                    {submission.excerpt && (
                      <p className="text-white/70 text-sm mb-2">{submission.excerpt.substring(0, 150)}...</p>
                    )}
                    {submission.amazon_affiliate_links && submission.amazon_affiliate_links.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <BookOpen className="w-3 h-3" />
                        <span>{submission.amazon_affiliate_links.length} book link(s)</span>
                      </div>
                    )}
                    {submission.subdomain && (
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <span>Subdomain: {submission.subdomain}</span>
                      </div>
                    )}
                    {submission.amazon_storefront_id && (
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <span>Storefront ID: {submission.amazon_storefront_id} <span className="text-white/30">(internal)</span></span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSubmission(submission);
                      setReviewNotes(submission.admin_notes || '');
                      setRejectionReason(submission.rejected_reason || '');
                    }}
                    className="ml-4 p-2 hover:bg-white/10 rounded transition"
                    title="Review submission"
                  >
                    <Eye className="w-4 h-4 text-white/60" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-white rounded-none p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Review Submission</h3>
              <button
                onClick={() => {
                  setSelectedSubmission(null);
                  setReviewNotes('');
                  setRejectionReason('');
                }}
                className="text-white/60 hover:text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Submission Details */}
              <div className="bg-black/50 border border-white rounded-none p-4">
                <h4 className="text-white font-bold mb-2">Title</h4>
                <p className="text-white/90 mb-4">{selectedSubmission.title}</p>

                <h4 className="text-white font-bold mb-2">Author</h4>
                <p className="text-white/90 mb-2">{selectedSubmission.author_name}</p>
                <p className="text-white/60 text-sm mb-4">{selectedSubmission.author_email}</p>

                {selectedSubmission.excerpt && (
                  <>
                    <h4 className="text-white font-bold mb-2">Excerpt</h4>
                    <p className="text-white/90 mb-4">{selectedSubmission.excerpt}</p>
                  </>
                )}

                <h4 className="text-white font-bold mb-2">Content</h4>
                <div className="bg-black/30 border border-white rounded-none p-4 mb-4">
                  <pre className="text-white/90 text-sm whitespace-pre-wrap font-sans">
                    {selectedSubmission.content}
                  </pre>
                </div>

                {selectedSubmission.amazon_storefront_id && (
                  <>
                    <h4 className="text-white font-bold mb-2">Amazon Storefront ID <span className="text-white/50 text-xs font-normal">(Internal - Not displayed publicly)</span></h4>
                    <div className="bg-black/30 border border-white rounded-none p-3 mb-4">
                      <p className="text-white/70 text-sm mb-2">This storefront ID is stored for tracking purposes only and will not be displayed on the published blog post.</p>
                      <a
                        href={`https://www.amazon.com/shop/${selectedSubmission.amazon_storefront_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm break-all"
                      >
                        {selectedSubmission.amazon_storefront_id}
                      </a>
                    </div>
                  </>
                )}

                {selectedSubmission.amazon_affiliate_links && selectedSubmission.amazon_affiliate_links.length > 0 && (
                  <>
                    <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Amazon Affiliate Links
                    </h4>
                    
                    {/* Link Health Check */}
                    <div className="bg-white/5 border border-white/10 rounded-none p-4 mb-4">
                      <h5 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Link Formatting Check
                      </h5>
                      <p className="text-white/60 text-xs mb-3">
                        Verifies if book titles in the content will be correctly hyperlinked based on the latest formatting rules (including apostrophe and "The" prefix fixes).
                      </p>
                      <div className="space-y-2">
                        {analyzeLinkHealth(selectedSubmission.content, selectedSubmission.amazon_affiliate_links).map((result, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm p-2 bg-black/30 border border-white/5 rounded">
                            <div className="flex items-center gap-2">
                              {result.count > 0 ? (
                                <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-red-400" />
                              )}
                              <span className="text-white/90">{result.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-mono ${result.count > 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                                Found: {result.count}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {selectedSubmission.amazon_affiliate_links.map((link, index) => (
                        <div key={index} className="bg-black/30 border border-white rounded-none p-3">
                          <p className="text-white/90 font-medium mb-1">{link.book_title}</p>
                          <a
                            href={link.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm break-all"
                          >
                            {link.link}
                          </a>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-white/80 text-sm mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Admin Notes (optional)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-4 py-2 bg-black/50 border border-white rounded-none text-white focus:border-white focus:outline-none"
                  rows={3}
                  placeholder="Internal notes about this submission..."
                />
              </div>

              {/* Rejection Reason (if rejecting) */}
              {selectedSubmission.status === 'pending' && (
                <div>
                  <label className="block text-white/80 text-sm mb-2">Rejection Reason (required if rejecting)</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-4 py-2 bg-black/50 border border-white rounded-none text-white focus:border-white focus:outline-none"
                    rows={2}
                    placeholder="Reason for rejection (will be shared with submitter)..."
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t border-white">
                {selectedSubmission.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(selectedSubmission)}
                      className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-none transition flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(selectedSubmission)}
                      className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-none transition flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </>
                )}
                {selectedSubmission.status === 'approved' && (
                  <div className="flex flex-col gap-2">
                    {!selectedSubmission.subdomain && (
                      <div className="bg-yellow-900/20 border border-white rounded-none p-3 mb-2">
                        <p className="text-yellow-400 text-sm">
                          ⚠️ No subdomain set. This post may not appear on the Book Club page. Consider setting a subdomain before publishing.
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => handlePublish(selectedSubmission)}
                      className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-none transition flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Publish to Blog
                    </button>
                  </div>
                )}
                <button
                  onClick={() => {
                    setSelectedSubmission(null);
                    setReviewNotes('');
                    setRejectionReason('');
                  }}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded text-white transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
