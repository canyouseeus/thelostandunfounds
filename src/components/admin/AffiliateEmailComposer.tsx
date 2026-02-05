/**
 * Affiliate Email Composer Component
 * Allows admins to draft and send emails to affiliates
 */

import { useState, useEffect } from 'react';
import { useToast } from '../Toast';
import { supabase } from '../../lib/supabase';
import { EnvelopeIcon, PaperAirplaneIcon, EyeIcon, UsersIcon, FunnelIcon, CheckCircleIcon, StopIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from '../Loading';
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

      setAffiliates(affiliatesData);
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
      <div className="bg-black rounded-none p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-0">
          <div className="flex items-center gap-3">
            <EnvelopeIcon className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Affiliate Email Composer</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-b border-white/10">
        {/* Compose Email */}
        <div className="bg-black rounded-none p-8 border-r border-white/10">
          <h3 className="text-lg font-black text-white uppercase tracking-widest mb-8">Compose Email</h3>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="EMAIL SUBJECT..."
                className="w-full px-0 py-3 bg-transparent border-b border-white/20 rounded-none text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors text-lg font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="WRITE YOUR MESSAGE..."
                rows={12}
                className="w-full px-0 py-3 bg-transparent border-b border-white/20 rounded-none text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors font-mono text-sm resize-none leading-relaxed"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-6 py-3 bg-transparent border border-white/20 text-white rounded-none hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider"
              >
                <EyeIcon className="w-4 h-4" />
                {showPreview ? 'HIDE PREVIEW' : 'PREVIEW'}
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !subject.trim() || !content.trim() || selectedCount === 0}
                className="flex-1 px-6 py-3 bg-white text-black rounded-none hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider"
              >
                {sending ? (
                  <>
                    <LoadingSpinner size="sm" />
                    SENDING...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="w-4 h-4" />
                    SEND TO {selectedCount} AFFILIATES
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Select Recipients */}
        <div className="bg-black rounded-none p-8">
          <div className="flex items-center justify-between mb-8 pb-2 border-b border-white/10">
            <h3 className="text-lg font-black text-white uppercase tracking-widest">Recipients</h3>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest bg-white/5 px-2 py-1">
              {selectedCount} / {totalCount} SELECTED
            </div>
          </div>

          {/* Filter */}
          <div className="mb-6 flex gap-2">
            {(['all', 'active', 'inactive'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-none transition-all ${filterStatus === status
                  ? 'bg-white text-black'
                  : 'bg-transparent text-white/40 border border-white/10 hover:border-white hover:text-white'
                  }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Select All */}
          <button
            onClick={handleSelectAll}
            className="w-full mb-6 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-none hover:bg-white/10 transition flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-wider group"
          >
            {selectAll ? <CheckCircleIcon className="w-4 h-4 text-white" /> : <StopIcon className="w-4 h-4 text-white/40 group-hover:text-white" />}
            {selectAll ? 'DESELECT ALL' : 'SELECT ALL'}
          </button>

          {/* Affiliates List */}
          <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="text-center py-12 text-white/40 text-xs font-mono uppercase tracking-widest animate-pulse">Loading affiliates...</div>
            ) : filteredAffiliates.length === 0 ? (
              <div className="text-center py-12 text-white/40 text-xs font-mono uppercase tracking-widest">No affiliates found</div>
            ) : (
              filteredAffiliates.map((affiliate) => (
                <label
                  key={affiliate.id}
                  className={`flex items-center gap-4 p-3 border border-transparent hover:bg-white/5 transition-all cursor-pointer group ${selectedAffiliates.has(affiliate.id) ? 'bg-white/5 border-white/10' : ''}`}
                >
                  <div className={`w-4 h-4 border flex items-center justify-center transition-colors ${selectedAffiliates.has(affiliate.id) ? 'bg-white border-white' : 'border-white/20 group-hover:border-white/60'}`}>
                    {selectedAffiliates.has(affiliate.id) && <CheckCircleIcon className="w-3 h-3 text-black" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-white font-bold text-sm truncate">{affiliate.code}</div>
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${affiliate.status === 'active' ? 'text-emerald-400' : 'text-white/40'
                        }`}>
                        {affiliate.status}
                      </div>
                    </div>
                    {affiliate.email && (
                      <div className="text-white/40 text-xs font-mono truncate">{affiliate.email}</div>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="bg-black rounded-none p-8 border-b border-white/10 animate-in fade-in slide-in-from-top-4 duration-500">
          <h3 className="text-lg font-black text-white uppercase tracking-widest mb-8">Email Preview</h3>
          <div className="bg-black border border-white/20 rounded-none p-8 max-w-3xl mx-auto">
            <div className="border-b border-white/10 pb-6 mb-6 workspace-font">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Recipient Group</span>
                <span className="text-xs text-white uppercase tracking-wider">{selectedCount} affiliate(s)</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Subject</span>
                <span className="text-xl text-white font-serif italic text-right flex-1 ml-4">{subject || '(No subject)'}</span>
              </div>
            </div>
            <div
              className="prose prose-invert max-w-none font-serif text-white/80 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: convertToHtml(content) }}
            />
          </div>
        </div>
      )}

      {/* Past Campaigns */}
      {campaigns.length > 0 && (
        <div className="bg-black rounded-none p-8">
          <h3 className="text-lg font-black text-white uppercase tracking-widest mb-6">Campaign History</h3>
          <div className="border border-white/10">
            <div className="grid grid-cols-12 gap-4 p-3 border-b border-white/10 bg-white/5 text-[10px] font-bold text-white/40 uppercase tracking-widest">
              <div className="col-span-5">Subject</div>
              <div className="col-span-2 text-right">Recipients</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-3 text-right">Date</div>
            </div>

            <div className="divide-y divide-white/5">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="grid grid-cols-12 gap-4 p-4 hover:bg-white/5 transition-colors items-center"
                >
                  <div className="col-span-5">
                    <div className="text-white font-bold text-sm truncate">{campaign.subject}</div>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-white/60 text-xs font-mono">{campaign.recipients_count}</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${campaign.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400' :
                      campaign.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                        campaign.status === 'sending' ? 'bg-yellow-500/10 text-yellow-400' :
                          'bg-white/10 text-white/40'
                      }`}>
                      {campaign.status}
                    </span>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="text-white/40 text-[10px] font-mono uppercase">
                      {campaign.sent_at
                        ? new Date(campaign.sent_at).toLocaleDateString()
                        : 'Draft'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}













