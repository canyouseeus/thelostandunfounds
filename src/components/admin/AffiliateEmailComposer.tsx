/**
 * Affiliate Email Composer Component
 * Allows admins to draft and send emails to affiliates
 */

import { useState, useEffect } from 'react';
import { useToast } from '../Toast';
import { supabase } from '../../lib/supabase';
import { Mail, Send, Eye, Users, Filter, CheckSquare, Square, Loader } from 'lucide-react';
import { safeJsonParse } from '../../utils/helpers';

interface Affiliate {
  id: string;
  code: string;
  user_id: string;
  status: string;
  email?: string;
}

interface EmailCampaign {
  id: string;
  subject: string;
  recipients_count: number;
  sent_at: string | null;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  created_at: string;
}

export default function AffiliateEmailComposer() {
  const { success, error: showError } = useToast();
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [selectedAffiliates, setSelectedAffiliates] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectAll, setSelectAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  useEffect(() => {
    loadAffiliates();
    loadCampaigns();
  }, []);

  useEffect(() => {
    // Update select all when filter changes
    const filtered = getFilteredAffiliates();
    const allSelected = filtered.length > 0 && filtered.every(a => selectedAffiliates.has(a.id));
    setSelectAll(allSelected);
  }, [filterStatus, selectedAffiliates, affiliates]);

  const loadAffiliates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/affiliates');
      
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        throw new Error('API routes are not available. Please restart with "npm run dev:api"');
      }
      
      if (!response.ok) {
        const errorData = await safeJsonParse(response).catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || 'Failed to load affiliates');
      }

      const result = await safeJsonParse(response);
      const affiliatesData = result.affiliates || [];
      
      // Fetch user emails for affiliates
      const affiliatesWithEmails = await Promise.all(
        affiliatesData.map(async (affiliate: Affiliate) => {
          try {
            const { data: userData } = await supabase.auth.admin.getUserById(affiliate.user_id);
            return {
              ...affiliate,
              email: userData?.user?.email || undefined
            };
          } catch {
            return affiliate;
          }
        })
      );
      
      setAffiliates(affiliatesWithEmails);
    } catch (err) {
      console.error('Error loading affiliates:', err);
      showError(err instanceof Error ? err.message : 'Failed to load affiliates');
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      setLoadingCampaigns(true);
      // Load campaigns from affiliate_email_campaigns table if it exists
      const { data, error } = await supabase
        .from('affiliate_email_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error && error.code !== '42P01') {
        console.warn('Error loading campaigns:', error);
      }
      
      setCampaigns(data || []);
    } catch (err) {
      console.warn('Campaigns table may not exist:', err);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const getFilteredAffiliates = () => {
    return affiliates.filter(affiliate => {
      if (filterStatus === 'active') return affiliate.status === 'active';
      if (filterStatus === 'inactive') return affiliate.status !== 'active';
      return true;
    });
  };

  const handleSelectAll = () => {
    const filtered = getFilteredAffiliates();
    if (selectAll) {
      // Deselect all filtered affiliates
      const newSelected = new Set(selectedAffiliates);
      filtered.forEach(a => newSelected.delete(a.id));
      setSelectedAffiliates(newSelected);
    } else {
      // Select all filtered affiliates
      const newSelected = new Set(selectedAffiliates);
      filtered.forEach(a => newSelected.add(a.id));
      setSelectedAffiliates(newSelected);
    }
    setSelectAll(!selectAll);
  };

  const handleSelectAffiliate = (affiliateId: string) => {
    const newSelected = new Set(selectedAffiliates);
    if (newSelected.has(affiliateId)) {
      newSelected.delete(affiliateId);
    } else {
      newSelected.add(affiliateId);
    }
    setSelectedAffiliates(newSelected);
  };

  const convertToHtml = (text: string): string => {
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    const htmlParagraphs = paragraphs.map(p => {
      const lines = p.split('\n').filter(l => l.trim());
      return lines.map(line => `<p style="color: #ffffff !important; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; background-color: #000000 !important;">${line.trim()}</p>`).join('');
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #000000 !important;
            color: #ffffff !important;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #000000 !important;
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${htmlParagraphs.join('')}
        </div>
      </body>
      </html>
    `;
  };

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) {
      showError('Subject and content are required');
      return;
    }

    const selectedIds = Array.from(selectedAffiliates);
    if (selectedIds.length === 0) {
      showError('Please select at least one affiliate');
      return;
    }

    try {
      setSending(true);
      const contentHtml = convertToHtml(content);
      
      const response = await fetch('/api/admin/send-affiliate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          content,
          contentHtml,
          affiliateIds: selectedIds,
        }),
      });

      if (!response.ok) {
        const errorData = await safeJsonParse(response).catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || 'Failed to send emails');
      }

      const result = await safeJsonParse(response);
      success(`Email sent to ${result.sent || selectedIds.length} affiliate(s)`);
      
      // Reset form
      setSubject('');
      setContent('');
      setSelectedAffiliates(new Set());
      setSelectAll(false);
      
      // Reload campaigns
      loadCampaigns();
    } catch (err) {
      console.error('Error sending email:', err);
      showError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const filteredAffiliates = getFilteredAffiliates();
  const selectedCount = selectedAffiliates.size;
  const totalCount = filteredAffiliates.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-black/50 border border-white/10 rounded-none p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Affiliate Email Composer</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose Email */}
        <div className="bg-black/50 border border-white/10 rounded-none p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Compose Email</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-2">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
                className="w-full px-4 py-2 bg-black/50 border border-white/30 rounded-none text-white placeholder-white/50"
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-2">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Email content (plain text)..."
                rows={12}
                className="w-full px-4 py-2 bg-black/50 border border-white/30 rounded-none text-white placeholder-white/50 font-mono text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex-1 px-4 py-2 bg-white/10 border border-white/30 text-white rounded-none hover:bg-white/20 transition flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !subject.trim() || !content.trim() || selectedCount === 0}
                className="flex-1 px-4 py-2 bg-white text-black rounded-none hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send to {selectedCount} Affiliate{selectedCount !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Select Recipients */}
        <div className="bg-black/50 border border-white/10 rounded-none p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Select Recipients</h3>
            <div className="text-sm text-white/60">
              {selectedCount} of {totalCount} selected
            </div>
          </div>

          {/* Filter */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 text-sm rounded-none transition ${
                filterStatus === 'all'
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1 text-sm rounded-none transition ${
                filterStatus === 'active'
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={`px-3 py-1 text-sm rounded-none transition ${
                filterStatus === 'inactive'
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              Inactive
            </button>
          </div>

          {/* Select All */}
          <button
            onClick={handleSelectAll}
            className="w-full mb-4 px-4 py-2 bg-white/10 border border-white/30 text-white rounded-none hover:bg-white/20 transition flex items-center gap-2"
          >
            {selectAll ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            Select All ({totalCount})
          </button>

          {/* Affiliates List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-white/60">Loading affiliates...</div>
            ) : filteredAffiliates.length === 0 ? (
              <div className="text-center py-8 text-white/60">No affiliates found</div>
            ) : (
              filteredAffiliates.map((affiliate) => (
                <label
                  key={affiliate.id}
                  className="flex items-center gap-3 p-3 bg-black/30 border border-white/10 rounded-none hover:bg-white/5 transition cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedAffiliates.has(affiliate.id)}
                    onChange={() => handleSelectAffiliate(affiliate.id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="text-white font-semibold">{affiliate.code}</div>
                    {affiliate.email && (
                      <div className="text-white/60 text-xs">{affiliate.email}</div>
                    )}
                    <div className={`text-xs mt-1 ${
                      affiliate.status === 'active' ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      {affiliate.status}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="bg-black/50 border border-white/10 rounded-none p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Email Preview</h3>
          <div className="bg-black border border-white/20 rounded-none p-6">
            <div className="text-white/60 text-sm mb-2">To: {selectedCount} affiliate(s)</div>
            <div className="text-white/60 text-sm mb-4">Subject: {subject || '(No subject)'}</div>
            <div
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: convertToHtml(content) }}
            />
          </div>
        </div>
      )}

      {/* Past Campaigns */}
      {campaigns.length > 0 && (
        <div className="bg-black/50 border border-white/10 rounded-none p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Campaigns</h3>
          <div className="space-y-2">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-3 bg-black/30 border border-white/10 rounded-none"
              >
                <div>
                  <div className="text-white font-semibold">{campaign.subject}</div>
                  <div className="text-white/60 text-xs">
                    {campaign.recipients_count} recipients • {campaign.sent_at 
                      ? new Date(campaign.sent_at).toLocaleString()
                      : 'Draft'}
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-none text-xs ${
                  campaign.status === 'sent' ? 'bg-green-500/20 text-green-400' :
                  campaign.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                  campaign.status === 'sending' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {campaign.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


