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
              <div className="p-3 bg-blue-500/10 border border-blue-500/20">
                <UsersIcon className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white tracking-tight">{subscriberCount}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] mt-1">
                  Verified Emails
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-blue-400/60 uppercase tracking-widest font-bold">View List</span>
              <span className="text-white/20 text-xs">→</span>
            </div>
          </AdminBentoCard>
        </button>

        <AdminBentoCard title="EMAILS SENT">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 border border-green-500/20">
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
            <div className="p-3 bg-purple-500/10 border border-purple-500/20">
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
              className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/20 focus:border-white focus:outline-none transition-colors text-sm"
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
              className="w-full px-4 py-4 bg-white/5 border border-white/10 text-white placeholder-white/20 focus:border-white focus:outline-none font-mono text-sm resize-none transition-colors"
              disabled={sending}
            />
            <p className="text-white/20 text-[10px] mt-2 uppercase tracking-tight">
              Tip: Use double line breaks to separate paragraphs.
            </p>
          </div>

          {/* Schedule */}
          <div className="border border-white/5 p-6 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-4">
              <label
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => setScheduleEnabled(!scheduleEnabled)}
              >
                <div className={cn(
                  "w-4 h-4 border flex items-center justify-center transition-colors",
                  scheduleEnabled ? "bg-white border-white" : "border-white/20 group-hover:border-white/40"
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
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white focus:border-white outline-none [color-scheme:dark] text-sm transition-colors"
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
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white focus:border-white outline-none [color-scheme:dark] text-sm transition-colors"
                    disabled={sending}
                  />
                </div>
              </div>
            )}
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
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
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
              className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-[0.2em] text-xs transition-all flex items-center gap-2 border border-white/10"
            >
              <EyeIcon className="w-4 h-4" />
              {showPreview ? 'HIDE' : 'SHOW'} PREVIEW
            </button>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="mt-8 border border-white/5 animate-in fade-in zoom-in-95 duration-500 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 bg-white/[0.05] border-b border-white/5">
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
                className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition"
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
              <ArrowPathIcon className={cn("w-3.5 h-3.5", loadingCampaigns && "animate-spin")} />
              {loadingCampaigns ? 'REFRESHING...' : 'REFRESH'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Select All Row */}
          {campaigns.length > 0 && (
            <div className="flex items-center gap-3 pb-3 border-b border-white/5">
              <button
                onClick={toggleSelectAll}
                className={cn(
                  "w-4 h-4 border flex items-center justify-center transition-colors",
                  selectedCampaigns.size === campaigns.length && campaigns.length > 0
                    ? "bg-white border-white"
                    : selectedCampaigns.size > 0
                      ? "bg-white/30 border-white/30"
                      : "border-white/20 hover:border-white/40"
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
              <div className="w-8 h-8 border-2 border-white/20 border-t-white animate-spin" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-left py-12 border border-white/5 bg-white/[0.01]">
              <div className="flex items-center gap-4 px-6">
                <EnvelopeIcon className="w-8 h-8 text-white/10" />
                <div>
                  <p className="text-white font-medium">No campaigns found</p>
                  <p className="text-white/20 text-xs">Start by composing your first newsletter above.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className={cn(
                    "group/item py-6 transition-all border-l-2",
                    selectedCampaigns.has(campaign.id) ? "bg-white/[0.03] border-white" : "border-transparent hover:bg-white/[0.02]"
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
                        "w-4 h-4 mt-1 border flex items-center justify-center transition-colors flex-shrink-0",
                        selectedCampaigns.has(campaign.id)
                          ? "bg-white border-white"
                          : "border-white/20 hover:border-white/40"
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
                              "px-1.5 py-0.5 border",
                              campaign.status === 'sent' ? "text-green-400 border-green-400/30 bg-green-400/5" :
                                campaign.status === 'scheduled' ? "text-blue-400 border-blue-400/30 bg-blue-400/5" :
                                  campaign.status === 'sending' ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/5" :
                                    "text-white/40 border-white/10 bg-white/5"
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
                    <div className="mt-8 mx-4 p-6 bg-black border border-white/5 animate-in fade-in slide-in-from-top-4 duration-300" onClick={(e) => e.stopPropagation()}>
                      {/* Campaign Deep Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="p-4 bg-white/[0.02] border border-white/5 relative group/stat">
                          <div className="text-white/20 text-[8px] uppercase tracking-widest mb-1 font-bold">Delivery Status</div>
                          <div className={cn(
                            "text-base font-bold uppercase tracking-tight",
                            campaign.status === 'sent' ? "text-green-400" :
                              campaign.status === 'failed' ? "text-red-400" : "text-white/60"
                          )}>
                            {campaign.status}
                          </div>
                        </div>
                        <div className="p-4 bg-white/[0.02] border border-white/5 relative group/stat">
                          <div className="text-white/20 text-[8px] uppercase tracking-widest mb-1 font-bold">Successful Sends</div>
                          <div className="text-base font-bold text-white tracking-tight">
                            {Math.round((campaign.emails_sent / (campaign.total_subscribers || 1)) * 100)}%
                          </div>
                        </div>
                        <div className="p-4 bg-white/[0.02] border border-white/5 relative group/stat">
                          <div className="text-white/20 text-[8px] uppercase tracking-widest mb-1 font-bold">Failed Count</div>
                          <div className="text-base font-bold text-red-400/80 tracking-tight">
                            {campaign.emails_failed}
                          </div>
                        </div>
                      </div>

                      {/* Delivery Details Table-like List */}
                      <div className="border border-white/5">
                        <div className="bg-white/[0.03] px-4 py-3 border-b border-white/10 flex items-center justify-between">
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
                              <ArrowPathIcon className={cn("w-3.5 h-3.5", loadingLogs === campaign.id && "animate-spin")} />
                            </button>
                          </div>
                        </div>

                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                          {loadingLogs === campaign.id ? (
                            <div className="py-12 flex justify-center">
                              <div className="w-6 h-6 border-2 border-white/10 border-t-white animate-spin" />
                            </div>
                          ) : campaignLogs[campaign.id] ? (
                            <div className="divide-y divide-white/5">
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
                                      "text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 border",
                                      log.status === 'sent' ? "text-green-400/80 border-green-400/20" : "text-red-400/80 border-red-400/20"
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

      {/* Subscriber List Modal */}
      {showSubscriberModal && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setShowSubscriberModal(false)}
        >
          <div
            className="bg-black/50 border border-white/10 rounded-none w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-8 border-b border-white/5 bg-[#0a0a0a]">
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
                <div className="flex gap-1 bg-white/[0.02] border border-white/5 p-1">
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
                    className="w-full pl-12 pr-4 py-3 bg-black border border-white/10 text-white placeholder-white/20 focus:border-white transition-colors outline-none text-xs uppercase tracking-widest"
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
                    onClick={() => copyEmailsToClipboard(filteredSubscribers.map(s => s.email))}
                    className="w-full py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all"
                  >
                    <ClipboardIcon className="w-4 h-4" />
                    EXPORT {filteredSubscribers.length} ENTITIES TO CLIPBOARD
                  </button>
                );
              })()}

              {/* List Container */}
              <div className="flex-1 overflow-y-auto custom-scrollbar border border-white/5 divide-y divide-white/5">
                {loadingSubscribers ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-12 h-12 border-2 border-white/10 border-t-white animate-spin" />
                    <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Accessing Index...</span>
                  </div>
                ) : (
                  subscribers
                    .filter(sub => {
                      const matchesTab = subscriberTab === 'subscribed' ? sub.verified : !sub.verified;
                      const matchesSearch = sub.email.toLowerCase().includes(searchQuery.toLowerCase());
                      return matchesTab && matchesSearch;
                    })
                    .map((subscriber) => (
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
