/**
 * Newsletter Management Component
 * Allows admins to compose and send newsletters to subscribers
 */

import { useState, useEffect, KeyboardEvent } from 'react';
import { useToast } from './Toast';
import { supabase } from '../lib/supabase';
import {
  EnvelopeIcon,
  PaperAirplaneIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  UsersIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  XMarkIcon,
  UserMinusIcon,
  CheckIcon as UserCheckIcon,
  MagnifyingGlassIcon,
  ClipboardIcon,
  TrashIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { LoadingSpinner } from './Loading';
import { AdminBentoCard } from './ui/admin-bento-card';
import { cn } from './ui/utils';

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
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [selectedSubscriberEmails, setSelectedSubscriberEmails] = useState<Set<string>>(new Set());
  const [showRecipientSelection, setShowRecipientSelection] = useState(false);

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
      // Use secure server-side API endpoint
      const response = await fetch('/api/newsletter/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Email': 'thelostandunfounds@gmail.com',
        },
        body: JSON.stringify({ campaignIds: [campaignId] }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete campaign');
      }

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
      showError(error.message || 'Failed to delete campaign');
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
      // Use secure server-side API endpoint
      const campaignIds = campaigns.map(c => c.id);
      const response = await fetch('/api/newsletter/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Email': 'thelostandunfounds@gmail.com',
        },
        body: JSON.stringify({ campaignIds }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete campaigns');
      }

      success('All campaigns deleted');
      setCampaigns([]);
      setSelectedCampaigns(new Set());
      setStats({ totalSent: 0, totalCampaigns: 0, avgRecipients: 0 });
    } catch (error: any) {
      console.error('Error deleting all campaigns:', error);
      showError(error.message || 'Failed to delete campaigns');
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
      // Use secure server-side API endpoint
      const response = await fetch('/api/newsletter/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Email': 'thelostandunfounds@gmail.com',
        },
        body: JSON.stringify({ campaignIds: Array.from(selectedCampaigns) }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete campaigns');
      }

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
      showError(error.message || 'Failed to delete selected campaigns');
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
    const hasGettingStarted = text.toLowerCase().includes('getting-started') || text.toLowerCase().includes('view the getting started guide');

    const ctaHtml = !hasGettingStarted ? `
      <div style="margin: 30px 0;">
        <a href="${gettingStartedUrl}" style="display: inline-block; padding: 14px 20px; background-color: #ffffff; color: #000000; text-decoration: none; font-weight: bold; font-size: 16px; font-family: Arial, sans-serif; border: 2px solid #ffffff; letter-spacing: 0.05em;">
          View the Getting Started Guide →
        </a>
      </div>
    ` : '';

    const bannerUrl = "https://nonaqhllakrckbtbawrb.supabase.co/storage/v1/object/public/brand-assets/1764772922060_IMG_1244.png";

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
            <td align="left" style="padding: 40px 20px !important; background-color: #000000 !important;">
              <table role="presentation" style="max-width: 600px !important; width: 100% !important; border-collapse: collapse !important; background-color: #000000 !important; margin: 0 !important;">
                <tr>
                  <td align="left" style="padding: 0 0 30px 0; background-color: #000000 !important;">
                    <img src="${bannerUrl}" alt="THE LOST+UNFOUNDS" style="max-width: 100%; height: auto; display: block;" />
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 !important; color: #ffffff !important; background-color: #000000 !important;">
                    ${htmlParagraphs.join('')}
                    ${ctaHtml}
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
          recipients: selectedSubscriberEmails.size > 0 ? Array.from(selectedSubscriberEmails) : null,
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

  const handleSendTest = async () => {
    if (!testEmail.trim() || !testEmail.includes('@')) {
      showError('Valid test email is required');
      return;
    }

    if (!subject.trim()) {
      showError('Subject is required');
      return;
    }

    if (!content.trim()) {
      showError('Content is required');
      return;
    }

    try {
      setSendingTest(true);
      const response = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: subject.trim(),
          content: content.trim(),
          contentHtml: (contentHtml || convertToHtml(content)).trim(),
          testEmail: testEmail.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test newsletter');
      }

      success(`Test newsletter sent to ${testEmail}!`);
    } catch (error: any) {
      console.error('Error sending test newsletter:', error);
      showError(error.message || 'Failed to send test newsletter');
    } finally {
      setSendingTest(false);
    }
  };

  const handleResend = (campaign: NewsletterCampaign) => {
    setSubject(campaign.subject);
    setContent(campaign.content);
    // contentHtml is auto-regenerated by handleContentChange logic if we just set subject/content
    // but better to set it directly for preview
    setContentHtml(campaign.content_html);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    success('Campaign data loaded into composer');
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={handleOpenSubscriberModal}
          className="text-left w-full focus:outline-none transition-all"
        >
          <AdminBentoCard
            title="TOTAL SUBSCRIBERS"
            className="h-full"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10">
                <UsersIcon className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white tracking-tight">{subscriberCount}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] mt-1">
                  Verified Emails
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 flex items-center justify-between">
              <span className="text-[10px] text-blue-400/60 uppercase tracking-widest font-bold">View List</span>
              <span className="text-white/20 text-xs">→</span>
            </div>
          </AdminBentoCard>
        </button>

        <AdminBentoCard title="EMAILS SENT">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10">
              <ChartBarIcon className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white tracking-tight">{stats.totalSent}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] mt-1">
                Across {stats.totalCampaigns} Campaigns
              </div>
            </div>
          </div>
        </AdminBentoCard>

        <AdminBentoCard title="AVG. REACH">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10">
              <ArrowTrendingUpIcon className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white tracking-tight">{stats.avgRecipients}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] mt-1">
                Recipients Per Campaign
              </div>
            </div>
          </div>
        </AdminBentoCard>
      </div>

      {/* Compose Newsletter */}
      <AdminBentoCard
        title="COMPOSE NEWSLETTER"
        icon={<EnvelopeIcon className="w-4 h-4" />}
        action={
          <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase tracking-widest font-medium">
            <UsersIcon className="w-3.5 h-3.5" />
            <span>{subscriberCount} Subscribers</span>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-white/40 text-[10px] uppercase tracking-[0.2em] mb-2 font-medium">
              Subject Line
            </label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="ENTER SUBJECT..."
              className="w-full px-4 py-3 bg-white/5 text-white placeholder-white/20 focus:bg-white/10 focus:outline-none transition-colors text-sm"
              disabled={sending}
            />
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-white/40 text-[10px] uppercase tracking-[0.2em] mb-2 font-medium">
              Content Body
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="WRITE YOUR CONTENT HERE. USE DOUBLE LINE BREAKS FOR PARAGRAPHS..."
              rows={12}
              className="w-full px-4 py-4 bg-white/5 text-white placeholder-white/20 focus:bg-white/10 focus:outline-none font-mono text-sm resize-none transition-colors"
              disabled={sending}
            />
          </div>

          {/* Targeting */}
          <div className="p-6 bg-white/[0.02] border-t border-white/5">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-white/40 text-[10px] uppercase tracking-[0.2em] font-medium">
                Target Audience
              </label>
              <button
                onClick={() => setShowRecipientSelection(!showRecipientSelection)}
                className="text-blue-400 hover:text-blue-300 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                {selectedSubscriberEmails.size > 0 ? `EDIT SELECTION (${selectedSubscriberEmails.size})` : 'SELECT SPECIFIC RECIPIPIENTS'}
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={cn(
                "px-3 py-1.5 rounded-none border text-[10px] font-bold uppercase tracking-widest transition-all",
                selectedSubscriberEmails.size === 0 
                  ? "bg-white/10 border-white/20 text-white" 
                  : "bg-transparent border-white/10 text-white/40"
              )}>
                {selectedSubscriberEmails.size === 0 ? 'ALL VERIFIED SUBSCRIBERS' : `${subscriberCount} TOTAL VERIFIED`}
              </div>
              {selectedSubscriberEmails.size > 0 && (
                <>
                  <div className="px-3 py-1.5 rounded-none border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest">
                    {selectedSubscriberEmails.size} SELECTED RECIPIENTS
                  </div>
                  <button 
                    onClick={() => setSelectedSubscriberEmails(new Set())}
                    className="text-white/20 hover:text-white transition-colors"
                    title="Clear Selection"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="p-6 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-4">
              <label
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => setScheduleEnabled(!scheduleEnabled)}
              >
                <div className={cn(
                  "w-4 h-4 flex items-center justify-center transition-colors",
                  scheduleEnabled ? "bg-white" : "bg-white/10 group-hover:bg-white/20"
                )}>
                  {scheduleEnabled && <CheckCircleIcon className="w-3 h-3 text-black" />}
                </div>
                <span className="text-white/80 text-[10px] uppercase tracking-[0.2em] font-bold flex items-center gap-2">
                  <ClockIcon className="w-3.5 h-3.5" />
                  Schedule for Later
                </span>
              </label>
              {scheduleEnabled && scheduledDate && scheduledTime && (
                <span className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">
                  {formatScheduledTime(new Date(`${scheduledDate}T${scheduledTime}`))}
                </span>
              )}
            </div>

            {scheduleEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div>
                  <label htmlFor="scheduled-date" className="block text-white/40 text-[10px] uppercase tracking-[0.2em] mb-2 font-medium">
                    Date
                  </label>
                  <input
                    type="date"
                    id="scheduled-date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-white/5 text-white focus:bg-white/10 outline-none [color-scheme:dark] text-sm transition-colors"
                    disabled={sending}
                  />
                </div>
                <div>
                  <label htmlFor="scheduled-time" className="block text-white/40 text-[10px] uppercase tracking-[0.2em] mb-2 font-medium">
                    Time
                  </label>
                  <input
                    type="time"
                    id="scheduled-time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 text-white focus:bg-white/10 outline-none [color-scheme:dark] text-sm transition-colors"
                    disabled={sending}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Test Email Section */}
          <div className="p-6 bg-white/[0.02] border-t border-white/5">
            <label htmlFor="test-email" className="block text-white/40 text-[10px] uppercase tracking-[0.2em] mb-3 font-medium">
              Send Formatting Test
            </label>
            <div className="flex gap-4">
              <input
                type="email"
                id="test-email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="ENTER TEST EMAIL ADDRESS..."
                className="flex-1 px-4 py-3 bg-white/5 text-white placeholder-white/20 focus:bg-white/10 focus:outline-none transition-colors text-sm"
                disabled={sendingTest}
              />
              <button
                onClick={handleSendTest}
                disabled={sendingTest || !testEmail.trim() || !subject.trim() || !content.trim()}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-[0.2em] text-[10px] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {sendingTest ? <LoadingSpinner size="sm" /> : <PaperAirplaneIcon className="w-4 h-4" />}
                SEND TEST
              </button>
            </div>
            <p className="text-white/20 text-[8px] mt-2 uppercase tracking-widest font-bold">
              Test emails do not affect subscriber stats or campaign history.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !content.trim() || subscriberCount === 0 || (scheduleEnabled && (!scheduledDate || !scheduledTime))}
              className={cn(
                "px-8 py-3 font-bold uppercase tracking-[0.2em] text-xs transition-all duration-300 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed",
                scheduleEnabled
                  ? "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20"
                  : "bg-white text-black hover:bg-white/90"
              )}
            >
              {sending ? (
                <>
                  <LoadingSpinner size="sm" />
                  {scheduleEnabled ? 'SCHEDULING...' : 'SENDING...'}
                </>
              ) : scheduleEnabled ? (
                <>
                  <CalendarIcon className="w-4 h-4" />
                  SCHEDULE CAMPAIGN
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="w-4 h-4" />
                  SEND NEWSLETTER
                </>
              )}
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-[0.2em] text-xs transition-all flex items-center gap-2"
            >
              <EyeIcon className="w-4 h-4" />
              {showPreview ? 'HIDE' : 'SHOW'} PREVIEW
            </button>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="mt-8 animate-in fade-in zoom-in-95 duration-500 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 bg-white/[0.05]">
                <span className="text-white/40 text-[10px] uppercase tracking-[0.2em]">Live Preview</span>
                <span className="text-white/60 text-xs font-medium">Subject: {subject || '(No subject)'}</span>
              </div>
              <div
                className="text-white text-left p-8 bg-black custom-scrollbar overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: buildPreviewHtml(contentHtml || convertToHtml(content)) }}
                style={{ maxHeight: '600px' }}
              />
            </div>
          )}
        </div>
      </AdminBentoCard>


      {/* Past Campaigns */}
      <AdminBentoCard
        title="PAST CAMPAIGNS"
        icon={<ClockIcon className="w-4 h-4" />}
        action={
          <div className="flex items-center gap-3">
            {selectedCampaigns.size > 0 && (
              <button
                onClick={deleteSelectedCampaigns}
                className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                DELETE SELECTED ({selectedCampaigns.size})
              </button>
            )}
            {campaigns.length > 0 && selectedCampaigns.size === 0 && (
              <button
                onClick={deleteAllCampaigns}
                className="text-red-400/60 hover:text-red-400 text-[10px] uppercase tracking-widest font-bold flex items-center gap-1 transition"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                DELETE ALL
              </button>
            )}
            <button
              onClick={loadCampaigns}
              className="text-white/40 hover:text-white text-[10px] uppercase tracking-widest font-bold transition flex items-center gap-2"
              disabled={loadingCampaigns}
            >
              {loadingCampaigns ? <LoadingSpinner size="sm" /> : <ArrowPathIcon className="w-3.5 h-3.5" />}
              {loadingCampaigns ? 'REFRESHING...' : 'REFRESH'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Select All Row */}
          {campaigns.length > 0 && (
            <div className="flex items-center gap-3 pb-3">
              <button
                onClick={toggleSelectAll}
                className={cn(
                  "w-4 h-4 flex items-center justify-center transition-colors",
                  selectedCampaigns.size === campaigns.length && campaigns.length > 0
                    ? "bg-white"
                    : selectedCampaigns.size > 0
                      ? "bg-white/30"
                      : "bg-white/10 hover:bg-white/20"
                )}
                aria-label={selectedCampaigns.size === campaigns.length ? 'Deselect all' : 'Select all'}
              >
                {selectedCampaigns.size === campaigns.length && campaigns.length > 0 && (
                  <CheckCircleIcon className="w-3 h-3 text-black" />
                )}
                {selectedCampaigns.size > 0 && selectedCampaigns.size < campaigns.length && (
                  <div className="w-2 h-0.5 bg-black" />
                )}
              </button>
              <span className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
                {selectedCampaigns.size === 0
                  ? 'SELECT ALL'
                  : selectedCampaigns.size === campaigns.length
                    ? 'ALL SELECTED'
                    : `${selectedCampaigns.size} SELECTED`}
              </span>
            </div>
          )}

          {loadingCampaigns ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-left py-12 bg-white/[0.01]">
              <div className="flex items-center gap-4 px-6">
                <EnvelopeIcon className="w-8 h-8 text-white/10" />
                <div>
                  <p className="text-white font-medium">No campaigns found</p>
                  <p className="text-white/20 text-xs">Start by composing your first newsletter above.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className={cn(
                    "group/item py-6 transition-all",
                    selectedCampaigns.has(campaign.id) ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"
                  )}
                  onClick={() => toggleCampaign(campaign.id)}
                  onKeyDown={(e) => handleCampaignKeyDown(e, campaign.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start gap-4 px-4">
                    {/* Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCampaignSelection(campaign.id, e);
                      }}
                      className={cn(
                        "w-4 h-4 mt-1 flex items-center justify-center transition-colors flex-shrink-0",
                        selectedCampaigns.has(campaign.id)
                          ? "bg-white"
                          : "bg-white/10 hover:bg-white/20"
                      )}
                    >
                      {selectedCampaigns.has(campaign.id) && <CheckCircleIcon className="w-3 h-3 text-black" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-bold text-base tracking-tight mb-1 truncate group-hover/item:text-white transition-colors">
                            {campaign.subject}
                          </h3>
                          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest">
                            <span className={cn(
                              "px-1.5 py-0.5",
                              campaign.status === 'sent' ? "text-green-400 bg-green-400/5" :
                                campaign.status === 'scheduled' ? "text-blue-400 bg-blue-400/5" :
                                  campaign.status === 'sending' ? "text-yellow-400 bg-yellow-400/5" :
                                    "text-white/40 bg-white/5"
                            )}>
                              {campaign.status}
                            </span>
                            <span className="text-white/40">
                              {campaign.sent_at ? formatDate(campaign.sent_at) : formatDate(campaign.created_at)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResend(campaign);
                            }}
                            className="p-2 text-white/20 hover:text-blue-400 hover:bg-blue-400/10 transition-all"
                            title="Load into composer"
                          >
                            <ArrowPathIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCampaign(campaign.id, e);
                            }}
                            className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-white/40 text-sm line-clamp-2 leading-relaxed mb-4">
                        {campaign.content}
                      </p>

                      <div className="flex items-center gap-6 text-[10px] uppercase tracking-widest font-bold text-white/30">
                        <div className="flex items-center gap-1.5">
                          <UsersIcon className="w-3.5 h-3.5" />
                          <span>{campaign.emails_sent} / {campaign.total_subscribers} SENT</span>
                        </div>
                        {campaign.emails_failed > 0 && (
                          <div className="flex items-center gap-1.5 text-red-400/60">
                            <XCircleIcon className="w-3.5 h-3.5" />
                            <span>{campaign.emails_failed} FAILED</span>
                          </div>
                        )}
                        {campaign.status === 'scheduled' && campaign.scheduled_for && (
                          <div className="flex items-center gap-1.5 text-blue-400/60">
                            <ClockIcon className="w-3.5 h-3.5" />
                            <span>SCHEDULED: {formatDate(campaign.scheduled_for)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedCampaignId === campaign.id && (
                    <div className="mt-8 mx-4 p-6 bg-black animate-in fade-in duration-300" onClick={(e) => e.stopPropagation()}>
                      {/* Campaign Deep Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="p-4 bg-white/[0.04] relative group/stat">
                          <div className="text-white/20 text-[8px] uppercase tracking-widest mb-1 font-bold">Delivery Status</div>
                          <div className={cn(
                            "text-base font-bold uppercase tracking-tight",
                            campaign.status === 'sent' ? "text-green-400" :
                              campaign.status === 'failed' ? "text-red-400" : "text-white/60"
                          )}>
                            {campaign.status}
                          </div>
                        </div>
                        <div className="p-4 bg-white/[0.04] relative group/stat">
                          <div className="text-white/20 text-[8px] uppercase tracking-widest mb-1 font-bold">Successful Sends</div>
                          <div className="text-base font-bold text-white tracking-tight">
                            {Math.round((campaign.emails_sent / (campaign.total_subscribers || 1)) * 100)}%
                          </div>
                        </div>
                        <div className="p-4 bg-white/[0.04] relative group/stat">
                          <div className="text-white/20 text-[8px] uppercase tracking-widest mb-1 font-bold">Failed Count</div>
                          <div className="text-base font-bold text-red-400/80 tracking-tight">
                            {campaign.emails_failed}
                          </div>
                        </div>
                      </div>

                      {/* Delivery Details Table-like List */}
                      <div>
                        <div className="bg-white/[0.03] px-4 py-3 flex items-center justify-between">
                          <h4 className="text-white text-[10px] uppercase tracking-[0.2em] font-bold flex items-center gap-2">
                            <EnvelopeIcon className="w-3.5 h-3.5" />
                            Delivery Details
                          </h4>
                          <div className="flex items-center gap-3">
                            {campaign.emails_failed > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  retryFailedEmails(campaign.id);
                                }}
                                disabled={retrying === campaign.id}
                                className="px-3 py-1 bg-white text-black text-[8px] font-bold uppercase tracking-widest hover:bg-white/90 transition disabled:opacity-50"
                              >
                                {retrying === campaign.id ? 'RETRYING...' : `RETRY FAILED (${campaign.emails_failed})`}
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); loadCampaignLogs(campaign.id); }}
                              className="text-white/40 hover:text-white transition"
                            >
                              {loadingLogs === campaign.id ? <LoadingSpinner size="sm" /> : <ArrowPathIcon className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                          {loadingLogs === campaign.id ? (
                            <div className="py-12 flex justify-center">
                              <LoadingSpinner size="sm" />
                            </div>
                          ) : campaignLogs[campaign.id] ? (
                            <div className="space-y-1">
                              {campaignLogs[campaign.id].map((log) => (
                                <div key={log.id} className="px-4 py-3 flex items-center justify-between group/log">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-white text-sm font-medium">{log.subscriber_email}</div>
                                    {log.error_message && (
                                      <div className="text-red-400/60 text-[10px] uppercase font-bold mt-1 tracking-tight truncate">
                                        {log.error_message}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className={cn(
                                      "text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5",
                                      log.status === 'sent' ? "text-green-400/80 bg-green-400/5" : "text-red-400/80 bg-red-400/5"
                                    )}>
                                      {log.status}
                                    </span>
                                    <span className="text-white/20 text-[10px] font-bold w-32 text-right">
                                      {log.sent_at ? formatDate(log.sent_at) : ''}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-12 text-center text-white/20 text-[10px] uppercase tracking-widest">
                              No logs locally available. Click refresh.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </AdminBentoCard>

      {/* Recipient Selection Modal */}
      {showRecipientSelection && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setShowRecipientSelection(false)}
        >
          <div
            className="bg-black/50 rounded-none w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-8 bg-[#0a0a0a]">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                  <UsersIcon className="w-6 h-6" />
                  RECIPIENT SELECTION
                </h2>
                <div className="text-white/40 text-[10px] uppercase tracking-[0.2em] mt-1">
                  {selectedSubscriberEmails.size} SELECTED / {subscriberCount} ACTIVE
                </div>
              </div>
              <button
                onClick={() => setShowRecipientSelection(false)}
                className="text-white/30 hover:text-white transition-all p-2 hover:bg-white/5"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-hidden flex flex-col flex-1">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type="text"
                    placeholder="QUERY EMAIL INDEX..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-black text-white placeholder-white/20 focus:bg-white/5 transition-colors outline-none text-xs uppercase tracking-widest"
                  />
                </div>
                <button
                  onClick={() => {
                    const activeEmails = subscribers.filter((s: Subscriber) => s.verified).map((s: Subscriber) => s.email);
                    if (selectedSubscriberEmails.size === activeEmails.length) {
                      setSelectedSubscriberEmails(new Set());
                    } else {
                      setSelectedSubscriberEmails(new Set(activeEmails));
                    }
                  }}
                  className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest transition-all"
                >
                  {selectedSubscriberEmails.size === subscriberCount ? 'DESELECT ALL' : 'SELECT ALL'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                {loadingSubscribers ? (
                  <div className="flex items-center justify-center py-24">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : (
                  subscribers
                    .filter((sub: Subscriber) => sub.verified && sub.email.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((subscriber: Subscriber) => {
                      const isSelected = selectedSubscriberEmails.has(subscriber.email);
                      return (
                        <div
                          key={subscriber.id}
                          onClick={() => {
                            const next = new Set(selectedSubscriberEmails);
                            if (isSelected) next.delete(subscriber.email);
                            else next.add(subscriber.email);
                            setSelectedSubscriberEmails(next);
                          }}
                          className={cn(
                            "flex items-center justify-between p-4 cursor-pointer transition-all",
                            isSelected ? "bg-white/10" : "hover:bg-white/[0.02]"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-4 h-4 flex items-center justify-center transition-colors",
                              isSelected ? "bg-white" : "bg-white/10"
                            )}>
                              {isSelected && <CheckCircleIcon className="w-3 h-3 text-black" />}
                            </div>
                            <div>
                              <div className="text-white font-medium text-sm tracking-tight">{subscriber.email}</div>
                              <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold mt-1">
                                JOINED: {formatDate(subscriber.created_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              <div className="pt-6 border-t border-white/5 flex justify-end">
                <button
                  onClick={() => setShowRecipientSelection(false)}
                  className="px-8 py-3 bg-white text-black font-bold uppercase tracking-[0.2em] text-xs hover:bg-white/90 transition-all"
                >
                  CONFIRM SELECTION
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscriber List Modal */}
      {showSubscriberModal && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setShowSubscriberModal(false)}
        >
          <div
            className="bg-black/50 rounded-none w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-8 bg-[#0a0a0a]">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                  <UsersIcon className="w-6 h-6" />
                  SUBSCRIBER INDEX
                </h2>
                <div className="text-white/40 text-[10px] uppercase tracking-[0.2em] mt-1">Management Console</div>
              </div>
              <button
                onClick={() => setShowSubscriberModal(false)}
                className="text-white/30 hover:text-white transition-all p-2 hover:bg-white/5"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-hidden flex flex-col flex-1">
              {/* Tabs and Search */}
              <div className="space-y-4">
                <div className="flex gap-1 bg-white/[0.02] p-1">
                  <button
                    onClick={() => setSubscriberTab('subscribed')}
                    className={cn(
                      "flex-1 py-3 text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
                      subscriberTab === 'subscribed' ? "bg-white text-black" : "text-white/40 hover:text-white hover:bg-white/5"
                    )}
                  >
                    ACTIVES ({subscriberCount})
                  </button>
                  <button
                    onClick={() => setSubscriberTab('unsubscribed')}
                    className={cn(
                      "flex-1 py-3 text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
                      subscriberTab === 'unsubscribed' ? "bg-white text-black" : "text-white/40 hover:text-white hover:bg-white/5"
                    )}
                  >
                    INACTIVE ({unsubscribedCount})
                  </button>
                </div>

                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type="text"
                    placeholder="QUERY EMAIL INDEX..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-black text-white placeholder-white/20 focus:bg-white/5 transition-colors outline-none text-xs uppercase tracking-widest"
                  />
                </div>
              </div>

              {/* Copy All Button */}
              {(() => {
                const filteredSubscribers = subscribers.filter(sub => {
                  const matchesTab = subscriberTab === 'subscribed' ? sub.verified : !sub.verified;
                  const matchesSearch = sub.email.toLowerCase().includes(searchQuery.toLowerCase());
                  return matchesTab && matchesSearch;
                });

                return filteredSubscribers.length > 0 && (
                  <button
                    onClick={() => copyEmailsToClipboard(filteredSubscribers.map((s: Subscriber) => s.email))}
                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all"
                  >
                    <ClipboardIcon className="w-4 h-4" />
                    EXPORT {filteredSubscribers.length} ENTITIES TO CLIPBOARD
                  </button>
                );
              })()}

              {/* List Container */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                {loadingSubscribers ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="flex justify-center">
                      <LoadingSpinner size="lg" />
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Accessing Index...</span>
                  </div>
                ) : (
                  subscribers
                    .filter((sub: Subscriber) => {
                      const matchesTab = subscriberTab === 'subscribed' ? sub.verified : !sub.verified;
                      const matchesSearch = sub.email.toLowerCase().includes(searchQuery.toLowerCase());
                      return matchesTab && matchesSearch;
                    })
                    .map((subscriber: Subscriber) => (
                      <div
                        key={subscriber.id}
                        className="flex items-center justify-between p-4 group transition-colors hover:bg-white/[0.01]"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-1 h-8 transition-colors",
                            subscriber.verified ? "bg-green-500/40 group-hover:bg-green-500" : "bg-red-500/40 group-hover:bg-red-500"
                          )} />
                          <div>
                            <div className="text-white font-medium text-sm tracking-tight">{subscriber.email}</div>
                            <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold mt-1">
                              {subscriber.verified
                                ? `JOINED: ${formatDate(subscriber.created_at)}`
                                : `EXITED: ${subscriber.unsubscribed_at ? formatDate(subscriber.unsubscribed_at) : 'UNKNOWN'}`}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(subscriber.email);
                            success('ENTITY COPIED TO CLIPBOARD');
                          }}
                          className="p-3 text-white/20 hover:text-white hover:bg-white/5 transition-all"
                          title="Copy ID"
                        >
                          <ClipboardIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                )}
                {!loadingSubscribers && subscribers.filter(sub => {
                  const matchesTab = subscriberTab === 'subscribed' ? sub.verified : !sub.verified;
                  const matchesSearch = sub.email.toLowerCase().includes(searchQuery.toLowerCase());
                  return matchesTab && matchesSearch;
                }).length === 0 && (
                    <div className="py-24 text-center">
                      <UsersIcon className="w-12 h-12 text-white/5 mx-auto mb-4" />
                      <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold">Index Empty</p>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
