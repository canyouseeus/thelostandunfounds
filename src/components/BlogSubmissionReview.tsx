/**
 * Blog Submission Review Component
 * Admin interface for reviewing and approving/rejecting blog submissions
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import { LoadingSpinner } from './Loading';
import { FileText, CheckCircle, XCircle, Eye, Mail, Calendar, BookOpen, MessageSquare, User, X } from 'lucide-react';

interface AffiliateLink {
  book_title: string;
  link: string;
}

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

      success('Submission approved successfully');
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

      success('Submission rejected');
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

      // Get author_id from email if user exists
      let authorId = null;
      if (submission.author_email) {
        const { data: userData } = await supabase
          .from('auth.users')
          .select('id')
          .eq('email', submission.author_email)
          .single()
          .catch(() => ({ data: null }));
        
        // Try alternative: query via Supabase admin API or use RPC
        // For now, we'll leave it null and let the admin set it if needed
      }

      // Ensure author_name is set (required)
      if (!submission.author_name || !submission.author_name.trim()) {
        showError('Author name is required. Please update the submission with an author name before publishing.');
        return;
      }

      // Create blog post with subdomain and Amazon links
      const { data: blogPost, error: blogError } = await supabase
        .from('blog_posts')
        .insert([{
          title: submission.title,
          slug: slug,
          content: submission.content,
          excerpt: submission.excerpt,
          published: true,
          published_at: new Date().toISOString(),
          status: 'published',
          author_id: authorId,
          author_name: submission.author_name.trim(), // Store author name for disclosure (required)
          subdomain: submission.subdomain || null, // User subdomain
          amazon_affiliate_links: submission.amazon_affiliate_links || [], // Store Amazon links
          amazon_storefront_id: submission.amazon_storefront_id || null, // Store Amazon storefront ID
          seo_title: null,
          seo_description: submission.excerpt || null,
          seo_keywords: null,
          og_image_url: null,
        }])
        .select()
        .single();

      if (blogError) throw blogError;

      // Update submission status
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

      success('Article published successfully!');
      setSelectedSubmission(null);
      setReviewNotes('');
      loadSubmissions();
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
        return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/20';
      case 'approved':
        return 'bg-blue-400/20 text-blue-400 border-blue-400/20';
      case 'rejected':
        return 'bg-red-400/20 text-red-400 border-red-400/20';
      case 'published':
        return 'bg-green-400/20 text-green-400 border-green-400/20';
      default:
        return 'bg-white/10 text-white/60 border-white/10';
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
      <div className="bg-black/50 border border-white/10 rounded-none p-6">
        {submissions.length === 0 ? (
          <p className="text-white/60 text-left py-8">No submissions found</p>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="bg-black/30 border border-white/10 rounded-none p-4 hover:border-white/20 transition"
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
          <div className="bg-black border border-white/10 rounded-none p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
              <div className="bg-black/50 border border-white/10 rounded-none p-4">
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
                <div className="bg-black/30 border border-white/10 rounded-none p-4 mb-4">
                  <pre className="text-white/90 text-sm whitespace-pre-wrap font-sans">
                    {selectedSubmission.content}
                  </pre>
                </div>

                {selectedSubmission.amazon_storefront_id && (
                  <>
                    <h4 className="text-white font-bold mb-2">Amazon Storefront ID <span className="text-white/50 text-xs font-normal">(Internal - Not displayed publicly)</span></h4>
                    <div className="bg-black/30 border border-white/10 rounded-none p-3 mb-4">
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
                    <div className="space-y-2 mb-4">
                      {selectedSubmission.amazon_affiliate_links.map((link, index) => (
                        <div key={index} className="bg-black/30 border border-white/10 rounded-none p-3">
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
                  className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white focus:border-white/30 focus:outline-none"
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
                    className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white focus:border-white/30 focus:outline-none"
                    rows={2}
                    placeholder="Reason for rejection (will be shared with submitter)..."
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t border-white/10">
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
                  <button
                    onClick={() => handlePublish(selectedSubmission)}
                    className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-none transition flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Publish to Blog
                  </button>
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
