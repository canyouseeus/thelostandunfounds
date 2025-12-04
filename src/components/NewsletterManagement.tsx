/**
 * Newsletter Management Component
 * Allows admins to compose and send newsletters to subscribers
 */

import { useState, useEffect } from 'react';
import { useToast } from './Toast';
import { supabase } from '../lib/supabase';
import { Mail, Send, Eye, Clock, CheckCircle, XCircle, Loader, Users, BarChart3, TrendingUp } from 'lucide-react';

interface NewsletterCampaign {
  id: string;
  subject: string;
  content: string;
  content_html: string;
  sent_at: string | null;
  total_subscribers: number;
  emails_sent: number;
  emails_failed: number;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  created_at: string;
}

export default function NewsletterManagement() {
  const { success, error: showError } = useToast();
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [campaigns, setCampaigns] = useState<NewsletterCampaign[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [stats, setStats] = useState({
    totalSent: 0,
    totalCampaigns: 0,
    avgRecipients: 0
  });

  useEffect(() => {
    loadSubscriberCount();
    loadCampaigns();
  }, []);

  const loadSubscriberCount = async () => {
    try {
      const { count, error } = await supabase
        .from('newsletter_subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('verified', true);

      if (error) throw error;
      setSubscriberCount(count || 0);
    } catch (error: any) {
      console.error('Error loading subscriber count:', error);
      showError('Failed to load subscriber count');
    }
  };

  const loadCampaigns = async () => {
    try {
      setLoadingCampaigns(true);
      const { data, error } = await supabase
        .from('newsletter_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setCampaigns(data || []);
      
      // Calculate stats
      const totalSent = (data || []).reduce((acc, curr) => acc + (curr.emails_sent || 0), 0);
      const totalCampaigns = (data || []).length;
      const avgRecipients = totalCampaigns > 0 ? Math.round(totalSent / totalCampaigns) : 0;
      setStats({ totalSent, totalCampaigns, avgRecipients });
    } catch (error: any) {
      console.error('Error loading campaigns:', error);
      showError('Failed to load campaigns');
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const convertToHtml = (text: string): string => {
    // Convert plain text to HTML with proper styling
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
          body { background-color: #000000 !important; margin: 0 !important; padding: 0 !important; }
          table { background-color: #000000 !important; }
          td { background-color: #000000 !important; }
        </style>
      </head>
      <body style="margin: 0 !important; padding: 0 !important; background-color: #000000 !important; font-family: Arial, sans-serif;">
        <table role="presentation" style="width: 100% !important; border-collapse: collapse !important; background-color: #000000 !important; margin: 0 !important; padding: 0 !important;">
          <tr>
            <td align="center" style="padding: 40px 20px !important; background-color: #000000 !important;">
              <table role="presentation" style="max-width: 600px !important; width: 100% !important; border-collapse: collapse !important; background-color: #000000 !important; margin: 0 auto !important;">
                <!-- Logo -->
                <tr>
                  <td align="left" style="padding: 0 0 30px 0; background-color: #000000 !important;">
                    <div style="color: #ffffff !important; font-size: 24px; font-weight: bold; font-family: Arial, sans-serif;">THE LOST+UNFOUNDS</div>
                  </td>
                </tr>
                <!-- Main Content -->
                <tr>
                  <td style="padding: 0 !important; color: #ffffff !important; background-color: #000000 !important;">
                    <h1 style="color: #ffffff !important; font-size: 28px; font-weight: bold; margin: 0 0 20px 0; text-align: left; letter-spacing: 0.1em; background-color: #000000 !important;">
                      CAN YOU SEE US?
                    </h1>
                    ${htmlParagraphs.join('')}
                    <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 30px 0; background-color: #000000 !important;">
                    <p style="color: rgba(255, 255, 255, 0.6) !important; font-size: 12px; line-height: 1.5; margin: 0; text-align: left; background-color: #000000 !important;">
                      © ${new Date().getFullYear()} THE LOST+UNFOUNDS. All rights reserved.
                    </p>
                    <p style="color: rgba(255, 255, 255, 0.6) !important; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0; text-align: left; background-color: #000000 !important;">
                      <a href="{{unsubscribe_url}}" style="color: rgba(255, 255, 255, 0.6); text-decoration: underline;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    setContentHtml(convertToHtml(value));
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      showError('Subject is required');
      return;
    }

    if (!content.trim()) {
      showError('Content is required');
      return;
    }

    if (subscriberCount === 0) {
      showError('No subscribers to send to');
      return;
    }

    if (!confirm(`Send newsletter to ${subscriberCount} subscribers?`)) {
      return;
    }

    try {
      setSending(true);
      const response = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: subject.trim(),
          content: content.trim(),
          contentHtml: contentHtml || convertToHtml(content),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send newsletter');
      }

      success(`Newsletter sent to ${data.stats.emailsSent} subscribers!`);
      
      // Reset form
      setSubject('');
      setContent('');
      setContentHtml('');
      
      // Reload campaigns
      await loadCampaigns();
    } catch (error: any) {
      console.error('Error sending newsletter:', error);
      showError(error.message || 'Failed to send newsletter');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-black/50 border border-white/10 rounded-none p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-none">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-white/60 text-sm">Total Subscribers</span>
          </div>
          <div className="text-2xl font-bold text-white">{subscriberCount}</div>
          <div className="text-xs text-white/40 mt-1">Verified email addresses</div>
        </div>

        <div className="bg-black/50 border border-white/10 rounded-none p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/20 rounded-none">
              <BarChart3 className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-white/60 text-sm">Emails Sent</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalSent}</div>
          <div className="text-xs text-white/40 mt-1">Across {stats.totalCampaigns} campaigns</div>
        </div>

        <div className="bg-black/50 border border-white/10 rounded-none p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/20 rounded-none">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-white/60 text-sm">Avg. Reach</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.avgRecipients}</div>
          <div className="text-xs text-white/40 mt-1">Recipients per campaign</div>
        </div>
      </div>

      {/* Compose Newsletter */}
      <div className="bg-black/50 border border-white rounded-none p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Compose Newsletter
          </h2>
          <div className="flex items-center gap-2 text-white/60">
            <Users className="w-4 h-4" />
            <span className="text-sm">{subscriberCount} subscribers</span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-white font-medium mb-2">
              Subject
            </label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Newsletter subject line"
              className="w-full px-4 py-2 bg-white/5 border border-white rounded-none text-white placeholder-white/40 focus:outline-none focus:border-white"
              disabled={sending}
            />
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-white font-medium mb-2">
              Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Write your newsletter content here. Use double line breaks for paragraphs."
              rows={12}
              className="w-full px-4 py-2 bg-white/5 border border-white rounded-none text-white placeholder-white/40 focus:outline-none focus:border-white font-mono text-sm"
              disabled={sending}
            />
            <p className="text-white/40 text-xs mt-2">
              Tip: Use double line breaks to separate paragraphs
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4">
            <button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !content.trim() || subscriberCount === 0}
              className="px-6 py-2 bg-white text-black hover:bg-white/90 rounded-none font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {sending ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send to {subscriberCount} Subscribers
                </>
              )}
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-none text-white flex items-center gap-2 transition"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </button>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="mt-4 p-4 bg-white/5 border border-white rounded-none">
              <h3 className="text-white font-medium mb-2">Email Preview</h3>
              <div className="bg-black border border-white p-4 rounded-none">
                <div className="text-white/60 text-sm mb-2">Subject: {subject || '(No subject)'}</div>
                <div 
                  className="text-white text-left"
                  dangerouslySetInnerHTML={{ __html: contentHtml || convertToHtml(content) }}
                  style={{ maxHeight: '400px', overflow: 'auto' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Past Campaigns */}
      <div className="bg-black/50 border border-white rounded-none p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Past Campaigns
          </h2>
          <button
            onClick={loadCampaigns}
            className="text-white/60 hover:text-white text-sm"
            disabled={loadingCampaigns}
          >
            {loadingCampaigns ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {loadingCampaigns ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 animate-spin text-white/60" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-left py-8 text-white/60">
            <div className="flex items-center gap-3">
              <Mail className="w-12 h-12 opacity-50" />
              <p>No campaigns yet</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-white/5 border border-white rounded-none p-4 hover:bg-white/10 transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-1">{campaign.subject}</h3>
                    <p className="text-white/60 text-sm mb-2 line-clamp-2">
                      {campaign.content.substring(0, 150)}...
                    </p>
                  </div>
                  <div className="ml-4">
                    {campaign.status === 'sent' && (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    )}
                    {campaign.status === 'failed' && (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                    {campaign.status === 'sending' && (
                      <Loader className="w-5 h-5 text-yellow-400 animate-spin" />
                    )}
                    {campaign.status === 'draft' && (
                      <Mail className="w-5 h-5 text-white/40" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-white/60">
                  <span>
                    {campaign.emails_sent} sent / {campaign.total_subscribers} total
                  </span>
                  {campaign.emails_failed > 0 && (
                    <span className="text-red-400">
                      {campaign.emails_failed} failed
                    </span>
                  )}
                  <span className="ml-auto">
                    {campaign.sent_at ? formatDate(campaign.sent_at) : formatDate(campaign.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
