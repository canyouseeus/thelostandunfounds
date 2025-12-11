/**
 * Newsletter Management Component
 * Allows admins to compose and send newsletters to subscribers
 */

import { useState, useEffect, KeyboardEvent } from 'react';
import { useToast } from './Toast';
import { supabase } from '../lib/supabase';
import { Mail, Send, Eye, Clock, CheckCircle, XCircle, Loader, Users, BarChart3, TrendingUp, X, UserMinus, UserCheck, Search, Copy, Trash2, Calendar, Timer, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface NewsletterCampaign {
  id: string;
  subject: string;
  content: string;
  content_html: string;
  sent_at: string | null;
  scheduled_for: string | null;
  total_subscribers: number;
  emails_sent: number;
  emails_failed: number;
  status: 'draft' | 'sending' | 'sent' | 'failed' | 'scheduled';
  created_at: string;
}

interface Subscriber {
  id: string;
  email: string;
  verified: boolean;
  created_at: string;
  unsubscribed_at: string | null;
}

interface SendLog {
  id: string;
  campaign_id: string;
  subscriber_email: string;
  status: 'sent' | 'failed' | 'pending';
  error_message: string | null;
  sent_at: string | null;
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
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalSent: 0,
    totalCampaigns: 0,
    avgRecipients: 0
  });
  const [showSubscriberModal, setShowSubscriberModal] = useState(false);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);
  const [subscriberTab, setSubscriberTab] = useState<'subscribed' | 'unsubscribed'>('subscribed');
  const [searchQuery, setSearchQuery] = useState('');
  const [unsubscribedCount, setUnsubscribedCount] = useState(0);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [campaignLogs, setCampaignLogs] = useState<Record<string, SendLog[]>>({});
  const [loadingLogs, setLoadingLogs] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriberCount();
    loadCampaigns();
  }, []);

  const loadSubscriberCount = async () => {
    try {
      // Get verified (active subscribers) count
      const { count: subscribedCount, error: subscribedError } = await supabase
        .from('newsletter_subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('verified', true);

      if (subscribedError) throw subscribedError;
      setSubscriberCount(subscribedCount || 0);

      // Get unverified (unsubscribed) count
      const { count: unsubCount, error: unsubError } = await supabase
        .from('newsletter_subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('verified', false);

      if (unsubError) throw unsubError;
      setUnsubscribedCount(unsubCount || 0);
    } catch (error: any) {
      console.error('Error loading subscriber count:', error);
      showError('Failed to load subscriber count');
    }
  };

  const loadAllSubscribers = async () => {
    try {
      setLoadingSubscribers(true);
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscribers(data || []);
    } catch (error: any) {
      console.error('Error loading subscribers:', error);
      showError('Failed to load subscriber list');
    } finally {
      setLoadingSubscribers(false);
    }
  };

  const handleOpenSubscriberModal = () => {
    setShowSubscriberModal(true);
    loadAllSubscribers();
  };

  const copyEmailsToClipboard = (emails: string[]) => {
    navigator.clipboard.writeText(emails.join(', '));
    success(`Copied ${emails.length} emails to clipboard`);
  };

  const deleteCampaign = async (campaignId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expanding the campaign
    
    if (!confirm('Are you sure you want to delete this campaign? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('newsletter_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
      
      success('Campaign deleted');
      setCampaigns(campaigns.filter(c => c.id !== campaignId));
      
      // Recalculate stats
      const remaining = campaigns.filter(c => c.id !== campaignId);
      const totalSent = remaining.reduce((acc, curr) => acc + (curr.emails_sent || 0), 0);
      const totalCampaigns = remaining.length;
      const avgRecipients = totalCampaigns > 0 ? Math.round(totalSent / totalCampaigns) : 0;
      setStats({ totalSent, totalCampaigns, avgRecipients });
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      showError('Failed to delete campaign');
    }
  };

  const deleteAllCampaigns = async () => {
    if (!confirm(`Are you sure you want to delete ALL ${campaigns.length} campaigns? This cannot be undone.`)) {
      return;
    }
    
    if (!confirm('This is a destructive action. Type "DELETE" mentally and click OK to confirm.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('newsletter_campaigns')
        .delete()
        .neq('id', ''); // Delete all

      if (error) throw error;
      
      success('All campaigns deleted');
      setCampaigns([]);
      setSelectedCampaigns(new Set());
      setStats({ totalSent: 0, totalCampaigns: 0, avgRecipients: 0 });
    } catch (error: any) {
      console.error('Error deleting all campaigns:', error);
      showError('Failed to delete campaigns');
    }
  };

  const toggleCampaignSelection = (campaignId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCampaigns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedCampaigns.size === campaigns.length) {
      setSelectedCampaigns(new Set());
    } else {
      setSelectedCampaigns(new Set(campaigns.map(c => c.id)));
    }
  };

  const deleteSelectedCampaigns = async () => {
    if (selectedCampaigns.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedCampaigns.size} selected campaign${selectedCampaigns.size > 1 ? 's' : ''}? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('newsletter_campaigns')
        .delete()
        .in('id', Array.from(selectedCampaigns));

      if (error) throw error;
      
      success(`${selectedCampaigns.size} campaign${selectedCampaigns.size > 1 ? 's' : ''} deleted`);
      const remaining = campaigns.filter(c => !selectedCampaigns.has(c.id));
      setCampaigns(remaining);
      setSelectedCampaigns(new Set());
      
      // Recalculate stats
      const totalSent = remaining.reduce((acc, curr) => acc + (curr.emails_sent || 0), 0);
      const totalCampaigns = remaining.length;
      const avgRecipients = totalCampaigns > 0 ? Math.round(totalSent / totalCampaigns) : 0;
      setStats({ totalSent, totalCampaigns, avgRecipients });
    } catch (error: any) {
      console.error('Error deleting selected campaigns:', error);
      showError('Failed to delete selected campaigns');
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

  const loadCampaignLogs = async (campaignId: string) => {
    try {
      setLoadingLogs(campaignId);
      const response = await fetch(`/api/newsletter/logs?campaignId=${campaignId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load logs');
      }
      
      setCampaignLogs(prev => ({
        ...prev,
        [campaignId]: data.logs || []
      }));
    } catch (error: any) {
      console.error('Error loading campaign logs:', error);
      showError('Failed to load email details');
    } finally {
      setLoadingLogs(null);
    }
  };

  const retryFailedEmails = async (campaignId: string, emails?: string[]) => {
    try {
      setRetrying(campaignId);
      const response = await fetch('/api/newsletter/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId,
          emails,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to retry emails');
      }

      success(`Retry complete: ${data.stats.sent} sent, ${data.stats.failed} failed`);
      
      // Reload logs and campaigns to show updated status
      await loadCampaignLogs(campaignId);
      await loadCampaigns();
    } catch (error: any) {
      console.error('Error retrying emails:', error);
      showError(error.message || 'Failed to retry emails');
    } finally {
      setRetrying(null);
    }
  };

  const convertToHtml = (text: string): string => {
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    const htmlParagraphs = paragraphs.map(p => {
      const lines = p.split('\n').filter(l => l.trim());
      return lines.map(line => `<p style="color: #ffffff !important; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; background-color: #000000 !important;">${line.trim()}</p>`).join('');
    });

    const gettingStartedUrl = 'https://www.thelostandunfounds.com/blog/getting-started';
    const bannerUrl =
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='400'><rect width='100%25' height='100%25' fill='%23000'/><text x='50%25' y='50%25' fill='%23fff' font-family='Arial, sans-serif' font-size='48' font-weight='bold' text-anchor='middle' dominant-baseline='middle'>THE LOST+UNFOUNDS</text></svg>";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { background-color: #000000 !important; margin: 0 !important; padding: 0 !important; font-family: Arial, sans-serif; }
          table { background-color: #000000 !important; border-collapse: collapse !important; }
          td { background-color: #000000 !important; }
        </style>
      </head>
      <body style="margin: 0 !important; padding: 0 !important; background-color: #000000 !important; font-family: Arial, sans-serif;">
        <table role="presentation" style="width: 100% !important; border-collapse: collapse !important; background-color: #000000 !important; margin: 0 !important; padding: 0 !important;">
          <tr>
            <td align="center" style="padding: 40px 20px !important; background-color: #000000 !important;">
              <table role="presentation" style="max-width: 600px !important; width: 100% !important; border-collapse: collapse !important; background-color: #000000 !important; margin: 0 auto !important;">
                <tr>
                  <td align="center" style="padding: 0 0 30px 0; background-color: #000000 !important;">
                    <img src="${bannerUrl}" alt="THE LOST+UNFOUNDS" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 !important; color: #ffffff !important; background-color: #000000 !important;">
                    <h1 style="color: #ffffff !important; font-size: 28px; font-weight: bold; margin: 0 0 20px 0; text-align: left; letter-spacing: 0.1em; background-color: #000000 !important;">
                      THE LOST+UNFOUNDS
                    </h1>
                    ${htmlParagraphs.join('')}
                    <div style="margin: 30px 0;">
                      <a href="${gettingStartedUrl}" style="display: inline-block; padding: 14px 20px; background-color: #ffffff; color: #000000; text-decoration: none; font-weight: bold; font-size: 16px; font-family: Arial, sans-serif; border: 2px solid #ffffff; letter-spacing: 0.05em;">
                        View the Getting Started Guide →
                      </a>
                    </div>
                    <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 30px 0; background-color: #000000 !important;">
                    <p style="color: rgba(255, 255, 255, 0.6) !important; font-size: 12px; line-height: 1.5; margin: 0; text-align: left; background-color: #000000 !important;">
                      © ${new Date().getFullYear()} THE LOST+UNFOUNDS. All rights reserved.
                    </p>
                    <p style="color: rgba(255, 255, 255, 0.6) !important; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0; text-align: left; background-color: #000000 !important;">
                      <a href="https://www.thelostandunfounds.com/unsubscribe" style="color: rgba(255, 255, 255, 0.6); text-decoration: underline;">Unsubscribe</a>
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

  const buildPreviewHtml = (bodyHtml: string): string => {
    return convertToHtml(bodyHtml || 'Start writing your newsletter content…');
  };
  const handleContentChange = (value: string) => {
    setContent(value);
    setContentHtml(convertToHtml(value));
  };

  const getScheduledDateTime = (): Date | null => {
    if (!scheduleEnabled || !scheduledDate || !scheduledTime) return null;
    const dateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    return isNaN(dateTime.getTime()) ? null : dateTime;
  };

  const formatScheduledTime = (date: Date): string => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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

    const scheduledDateTime = getScheduledDateTime();
    
    // Validate scheduled time is in the future
    if (scheduleEnabled) {
      if (!scheduledDate || !scheduledTime) {
        showError('Please select both date and time for scheduling');
        return;
      }
      if (!scheduledDateTime || scheduledDateTime <= new Date()) {
        showError('Scheduled time must be in the future');
        return;
      }
    }

    const confirmMessage = scheduleEnabled && scheduledDateTime
      ? `Schedule newsletter to be sent to ${subscriberCount} subscribers on ${formatScheduledTime(scheduledDateTime)}?`
      : `Send newsletter to ${subscriberCount} subscribers now?`;

    if (!confirm(confirmMessage)) {
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
          contentHtml: (contentHtml || convertToHtml(content)).trim(),
          scheduledFor: scheduledDateTime ? scheduledDateTime.toISOString() : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send newsletter');
      }

      if (scheduledDateTime) {
        success(`Newsletter scheduled for ${formatScheduledTime(scheduledDateTime)}!`);
      } else {
        success(`Newsletter sent to ${data.stats.emailsSent} subscribers!`);
      }

      // Reset form
      setSubject('');
      setContent('');
      setContentHtml('');
      setScheduleEnabled(false);
      setScheduledDate('');
      setScheduledTime('');

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

  const toggleCampaign = async (id: string) => {
    const isExpanding = expandedCampaignId !== id;
    setExpandedCampaignId((current) => (current === id ? null : id));
    
    // Load logs when expanding a campaign (if not already loaded)
    if (isExpanding && !campaignLogs[id]) {
      await loadCampaignLogs(id);
    }
  };

  const handleCampaignKeyDown = (event: KeyboardEvent<HTMLDivElement>, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleCampaign(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={handleOpenSubscriberModal}
          className="bg-black/50 border border-white/10 rounded-none p-4 text-left hover:bg-white/5 hover:border-white/20 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-none group-hover:bg-blue-500/30 transition">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-white/60 text-sm">Total Subscribers</span>
          </div>
          <div className="text-2xl font-bold text-white">{subscriberCount}</div>
          <div className="text-xs text-white/40 mt-1 flex items-center justify-between">
            <span>Verified email addresses</span>
            <span className="text-white/30 group-hover:text-white/60 transition">Click to view →</span>
          </div>
        </button>

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

          {/* Schedule */}
          <div className="border border-white/20 rounded-none p-4 bg-white/5">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  onClick={() => setScheduleEnabled(!scheduleEnabled)}
                  className={`w-5 h-5 border rounded-none flex items-center justify-center transition ${
                    scheduleEnabled
                      ? 'bg-white border-white'
                      : 'border-white/30 hover:border-white/50'
                  }`}
                  aria-label={scheduleEnabled ? 'Disable scheduling' : 'Enable scheduling'}
                >
                  {scheduleEnabled && <CheckCircle className="w-4 h-4 text-black" />}
                </button>
                <span className="text-white font-medium flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  Schedule for later
                </span>
              </label>
              {scheduleEnabled && scheduledDate && scheduledTime && (
                <span className="text-sm text-white/60">
                  {formatScheduledTime(new Date(`${scheduledDate}T${scheduledTime}`))}
                </span>
              )}
            </div>
            
            {scheduleEnabled && (
              <div className="flex flex-wrap gap-4 mt-3">
                <div className="flex-1 min-w-[180px]">
                  <label htmlFor="scheduled-date" className="block text-white/60 text-sm mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    id="scheduled-date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 bg-black border border-white/30 rounded-none text-white focus:outline-none focus:border-white [color-scheme:dark]"
                    disabled={sending}
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label htmlFor="scheduled-time" className="block text-white/60 text-sm mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    id="scheduled-time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-white/30 rounded-none text-white focus:outline-none focus:border-white [color-scheme:dark]"
                    disabled={sending}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4">
            <button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !content.trim() || subscriberCount === 0 || (scheduleEnabled && (!scheduledDate || !scheduledTime))}
              className={`px-6 py-2 rounded-none font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition ${
                scheduleEnabled 
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : 'bg-white text-black hover:bg-white/90'
              }`}
            >
              {sending ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  {scheduleEnabled ? 'Scheduling...' : 'Sending...'}
                </>
              ) : scheduleEnabled ? (
                <>
                  <Calendar className="w-4 h-4" />
                  Schedule for {subscriberCount} Subscribers
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Now to {subscriberCount} Subscribers
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
                  dangerouslySetInnerHTML={{ __html: buildPreviewHtml(contentHtml || convertToHtml(content)) }}
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
            <span className="text-sm font-normal text-white/40">({campaigns.length})</span>
          </h2>
          <div className="flex items-center gap-3">
            {selectedCampaigns.size > 0 && (
              <button
                onClick={deleteSelectedCampaigns}
                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 text-sm flex items-center gap-1 transition rounded-none"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected ({selectedCampaigns.size})
              </button>
            )}
            {campaigns.length > 0 && selectedCampaigns.size === 0 && (
              <button
                onClick={deleteAllCampaigns}
                className="text-red-400/60 hover:text-red-400 text-sm flex items-center gap-1 transition"
              >
                <Trash2 className="w-4 h-4" />
                Delete All
              </button>
            )}
            <button
              onClick={loadCampaigns}
              className="text-white/60 hover:text-white text-sm"
              disabled={loadingCampaigns}
            >
              {loadingCampaigns ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
        
        {/* Select All Row */}
        {campaigns.length > 0 && (
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/10">
            <button
              onClick={toggleSelectAll}
              className={`w-5 h-5 border rounded-none flex items-center justify-center transition ${
                selectedCampaigns.size === campaigns.length && campaigns.length > 0
                  ? 'bg-white border-white'
                  : selectedCampaigns.size > 0
                  ? 'bg-white/30 border-white/50'
                  : 'border-white/30 hover:border-white/50'
              }`}
              aria-label={selectedCampaigns.size === campaigns.length ? 'Deselect all' : 'Select all'}
            >
              {selectedCampaigns.size === campaigns.length && campaigns.length > 0 && (
                <CheckCircle className="w-4 h-4 text-black" />
              )}
              {selectedCampaigns.size > 0 && selectedCampaigns.size < campaigns.length && (
                <div className="w-2 h-2 bg-black rounded-none" />
              )}
            </button>
            <span className="text-white/60 text-sm">
              {selectedCampaigns.size === 0 
                ? 'Select all' 
                : selectedCampaigns.size === campaigns.length 
                ? 'All selected' 
                : `${selectedCampaigns.size} selected`}
            </span>
          </div>
        )}

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
                className={`bg-white/5 border rounded-none p-4 hover:bg-white/10 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/40 ${
                  selectedCampaigns.has(campaign.id) ? 'border-white/50 bg-white/10' : 'border-white'
                }`}
                role="button"
                tabIndex={0}
                aria-expanded={expandedCampaignId === campaign.id}
                onClick={() => toggleCampaign(campaign.id)}
                onKeyDown={(event) => handleCampaignKeyDown(event, campaign.id)}
              >
                <div className="flex items-start gap-3 mb-2">
                  {/* Checkbox */}
                  <button
                    onClick={(e) => toggleCampaignSelection(campaign.id, e)}
                    className={`w-5 h-5 mt-0.5 border rounded-none flex-shrink-0 flex items-center justify-center transition ${
                      selectedCampaigns.has(campaign.id)
                        ? 'bg-white border-white'
                        : 'border-white/30 hover:border-white/50'
                    }`}
                    aria-label={selectedCampaigns.has(campaign.id) ? 'Deselect campaign' : 'Select campaign'}
                  >
                    {selectedCampaigns.has(campaign.id) && (
                      <CheckCircle className="w-4 h-4 text-black" />
                    )}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium mb-1 truncate">{campaign.subject}</h3>
                        <p className="text-white/60 text-sm mb-2 line-clamp-2">
                          {campaign.content.substring(0, 150)}...
                        </p>
                      </div>
                      <div className="ml-4 flex items-center gap-2 flex-shrink-0">
                        {campaign.status === 'sent' && (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        )}
                        {campaign.status === 'failed' && (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                        {campaign.status === 'sending' && (
                          <Loader className="w-5 h-5 text-yellow-400 animate-spin" />
                        )}
                        {campaign.status === 'scheduled' && (
                          <Calendar className="w-5 h-5 text-blue-400" />
                        )}
                        {campaign.status === 'draft' && (
                          <Mail className="w-5 h-5 text-white/40" />
                        )}
                        <button
                          onClick={(e) => deleteCampaign(campaign.id, e)}
                          className="p-1 text-white/30 hover:text-red-400 transition"
                          aria-label="Delete campaign"
                          title="Delete campaign"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-white/60 flex-wrap">
                      <span>
                        {campaign.emails_sent} sent / {campaign.total_subscribers} total
                      </span>
                      {campaign.emails_failed > 0 && (
                        <span className="text-red-400">
                          {campaign.emails_failed} failed
                        </span>
                      )}
                      {campaign.status === 'scheduled' && campaign.scheduled_for && (
                        <span className="text-blue-400 flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          Scheduled: {formatDate(campaign.scheduled_for)}
                        </span>
                      )}
                      <span className="ml-auto">
                        {campaign.sent_at ? formatDate(campaign.sent_at) : formatDate(campaign.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                {expandedCampaignId === campaign.id && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                    <div className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                      {campaign.content}
                    </div>
                    <div className={`grid grid-cols-1 sm:grid-cols-2 ${campaign.scheduled_for ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3 text-sm text-white/70`}>
                      <div className="bg-black/40 border border-white/10 p-3 rounded-none">
                        <div className="text-white/50">Subject</div>
                        <div className="text-white font-medium">{campaign.subject}</div>
                      </div>
                      <div className="bg-black/40 border border-white/10 p-3 rounded-none">
                        <div className="text-white/50">Sent</div>
                        <div className="text-white font-medium">
                          {campaign.sent_at ? formatDate(campaign.sent_at) : campaign.status === 'scheduled' ? 'Pending' : 'Draft'}
                        </div>
                      </div>
                      {campaign.scheduled_for && (
                        <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-none">
                          <div className="text-blue-400/70">Scheduled For</div>
                          <div className="text-blue-400 font-medium">{formatDate(campaign.scheduled_for)}</div>
                        </div>
                      )}
                      <div className="bg-black/40 border border-white/10 p-3 rounded-none">
                        <div className="text-white/50">Status</div>
                        <div className={`font-medium capitalize ${
                          campaign.status === 'scheduled' ? 'text-blue-400' :
                          campaign.status === 'sent' ? 'text-green-400' :
                          campaign.status === 'failed' ? 'text-red-400' :
                          'text-white'
                        }`}>{campaign.status}</div>
                      </div>
                    </div>

                    {/* Email Delivery Details */}
                    <div className="border border-white/10 rounded-none overflow-hidden">
                      <div className="bg-black/40 p-3 flex items-center justify-between">
                        <h4 className="text-white font-medium flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Email Delivery Details
                        </h4>
                        <div className="flex items-center gap-2">
                          {campaign.emails_failed > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                retryFailedEmails(campaign.id);
                              }}
                              disabled={retrying === campaign.id}
                              className="px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-400 text-sm flex items-center gap-1 transition rounded-none disabled:opacity-50"
                            >
                              {retrying === campaign.id ? (
                                <Loader className="w-3 h-3 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3 h-3" />
                              )}
                              Retry Failed ({campaign.emails_failed})
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              loadCampaignLogs(campaign.id);
                            }}
                            disabled={loadingLogs === campaign.id}
                            className="p-1 text-white/40 hover:text-white transition"
                            title="Refresh logs"
                          >
                            <RefreshCw className={`w-4 h-4 ${loadingLogs === campaign.id ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </div>
                      
                      {loadingLogs === campaign.id ? (
                        <div className="p-4 flex items-center justify-center">
                          <Loader className="w-5 h-5 animate-spin text-white/60" />
                        </div>
                      ) : campaignLogs[campaign.id] && campaignLogs[campaign.id].length > 0 ? (
                        <div className="max-h-64 overflow-y-auto">
                          {/* Sent Emails */}
                          {campaignLogs[campaign.id].filter(log => log.status === 'sent').length > 0 && (
                            <div className="border-b border-white/10">
                              <div className="bg-green-500/10 px-3 py-2 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                <span className="text-green-400 text-sm font-medium">
                                  Sent ({campaignLogs[campaign.id].filter(log => log.status === 'sent').length})
                                </span>
                              </div>
                              <div className="divide-y divide-white/5">
                                {campaignLogs[campaign.id].filter(log => log.status === 'sent').map((log) => (
                                  <div key={log.id} className="px-3 py-2 flex items-center justify-between text-sm">
                                    <span className="text-white">{log.subscriber_email}</span>
                                    <span className="text-white/40 text-xs">
                                      {log.sent_at ? formatDate(log.sent_at) : ''}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Failed Emails */}
                          {campaignLogs[campaign.id].filter(log => log.status === 'failed').length > 0 && (
                            <div>
                              <div className="bg-red-500/10 px-3 py-2 flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-red-400" />
                                <span className="text-red-400 text-sm font-medium">
                                  Failed ({campaignLogs[campaign.id].filter(log => log.status === 'failed').length})
                                </span>
                              </div>
                              <div className="divide-y divide-white/5">
                                {campaignLogs[campaign.id].filter(log => log.status === 'failed').map((log) => (
                                  <div key={log.id} className="px-3 py-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-white text-sm">{log.subscriber_email}</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          retryFailedEmails(campaign.id, [log.subscriber_email]);
                                        }}
                                        disabled={retrying === campaign.id}
                                        className="text-yellow-400 hover:text-yellow-300 text-xs flex items-center gap-1 transition"
                                      >
                                        <RefreshCw className="w-3 h-3" />
                                        Retry
                                      </button>
                                    </div>
                                    {log.error_message && (
                                      <div className="text-red-400/70 text-xs mt-1 truncate" title={log.error_message}>
                                        {log.error_message}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 text-white/40 text-sm text-center">
                          No detailed logs available for this campaign.
                          <br />
                          <span className="text-xs">(Logs are recorded for newsletters sent after this feature was added)</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={(e) => deleteCampaign(campaign.id, e)}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm flex items-center gap-2 transition rounded-none"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Campaign
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subscriber List Modal */}
      {showSubscriberModal && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowSubscriberModal(false)}
        >
          <div 
            className="bg-black border border-white rounded-none p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Subscriber List
              </h2>
              <button
                onClick={() => setShowSubscriberModal(false)}
                className="text-white/60 hover:text-white transition p-1"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSubscriberTab('subscribed')}
                className={`px-4 py-2 rounded-none flex items-center gap-2 transition ${
                  subscriberTab === 'subscribed'
                    ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                    : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                Subscribed ({subscriberCount})
              </button>
              <button
                onClick={() => setSubscriberTab('unsubscribed')}
                className={`px-4 py-2 rounded-none flex items-center gap-2 transition ${
                  subscriberTab === 'unsubscribed'
                    ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                    : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                <UserMinus className="w-4 h-4" />
                Unsubscribed ({unsubscribedCount})
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search by email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/20 rounded-none text-white placeholder-white/40 focus:outline-none focus:border-white/40"
              />
            </div>

            {/* Copy All Button */}
            {(() => {
              const filteredSubscribers = subscribers.filter(sub => {
                const matchesTab = subscriberTab === 'subscribed' 
                  ? sub.verified 
                  : !sub.verified;
                const matchesSearch = sub.email.toLowerCase().includes(searchQuery.toLowerCase());
                return matchesTab && matchesSearch;
              });
              
              return filteredSubscribers.length > 0 && (
                <button
                  onClick={() => copyEmailsToClipboard(filteredSubscribers.map(s => s.email))}
                  className="mb-4 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white text-sm flex items-center gap-2 w-fit transition"
                >
                  <Copy className="w-4 h-4" />
                  Copy All Emails ({filteredSubscribers.length})
                </button>
              );
            })()}

            {/* Subscriber List */}
            <div className="flex-1 overflow-y-auto">
              {loadingSubscribers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-6 h-6 animate-spin text-white/60" />
                </div>
              ) : (
                <div className="space-y-2">
                  {subscribers
                    .filter(sub => {
                      const matchesTab = subscriberTab === 'subscribed' 
                        ? sub.verified 
                        : !sub.verified;
                      const matchesSearch = sub.email.toLowerCase().includes(searchQuery.toLowerCase());
                      return matchesTab && matchesSearch;
                    })
                    .map((subscriber) => (
                      <div
                        key={subscriber.id}
                        className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-none hover:bg-white/10 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${subscriber.verified ? 'bg-green-500' : 'bg-red-500'}`} />
                          <div>
                            <div className="text-white font-medium">{subscriber.email}</div>
                            <div className="text-xs text-white/40 space-y-0.5">
                              {subscriber.verified ? (
                                <div>Subscribed: {formatDate(subscriber.created_at)}</div>
                              ) : (
                                <>
                                  <div>Subscribed: {formatDate(subscriber.created_at)}</div>
                                  <div className="text-red-400/70">
                                    Unsubscribed: {subscriber.unsubscribed_at ? formatDate(subscriber.unsubscribed_at) : 'Unknown'}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {subscriber.verified ? (
                            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-none">
                              Active
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-none">
                              Unsubscribed
                            </span>
                          )}
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(subscriber.email);
                              success('Email copied!');
                            }}
                            className="p-1 text-white/40 hover:text-white transition"
                            aria-label="Copy email"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  {subscribers.filter(sub => {
                    const matchesTab = subscriberTab === 'subscribed' 
                      ? sub.verified 
                      : !sub.verified;
                    const matchesSearch = sub.email.toLowerCase().includes(searchQuery.toLowerCase());
                    return matchesTab && matchesSearch;
                  }).length === 0 && (
                    <div className="text-center py-12 text-white/40">
                      {searchQuery ? (
                        <p>No subscribers found matching "{searchQuery}"</p>
                      ) : subscriberTab === 'subscribed' ? (
                        <p>No subscribed users yet</p>
                      ) : (
                        <p>No unsubscribed users</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
