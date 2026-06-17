/**
 * BookingInvoicePanel
 *
 * Full-screen overlay panel opened from a booking card.
 *
 * Desktop  : two-column — invoice form left, email thread chatbox right.
 * Mobile   : single-column form + floating "Emails" button that expands a
 *            full-screen chatbot drawer from the bottom.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Booking {
  id: string;
  name: string;
  business_name: string | null;
  email: string;
  phone: string | null;
  event_type: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  admin_notes: string | null;
  retainer: boolean;
  status: string;
  total_amount_cents: number | null;
  deposit_amount_cents: number | null;
}

interface LineItem {
  description: string;
  amount: string;
}

interface EmailMessage {
  messageId: string;
  subject: string;
  from: string;
  fromAddress: string;
  to: string;
  receivedTime?: number;
  sentDateInGMT?: number;
  summary?: string;
  content?: string;
  isRead: boolean;
  direction: 'inbound' | 'outbound';
}

interface Props {
  booking: Booking;
  onClose: () => void;
  onInvoiceCreated: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAdminHeaders(): HeadersInit {
  const secret = (window as any).__ADMIN_SECRET__ || '';
  return {
    'Content-Type': 'application/json',
    'x-admin-secret': secret,
    'x-admin-email': 'thelostandunfounds@gmail.com',
  };
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function fmtMsgTime(ts?: number) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// ─── EmailThread sub-component ───────────────────────────────────────────────

interface EmailThreadProps {
  booking: Booking;
  clientName: string;
  isMobileExpanded?: boolean;
  onCollapse?: () => void;
}

const EmailThread: React.FC<EmailThreadProps> = ({
  booking,
  clientName,
  isMobileExpanded,
  onCollapse,
}) => {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [compose, setCompose] = useState('');
  const [subject, setSubject] = useState(
    `Re: ${booking.event_type} Booking — ${clientName}`
  );
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/mail/search?q=${encodeURIComponent(booking.email)}`,
        { headers: getAdminHeaders() }
      );
      const data = await res.json().catch(() => ({}));
      const msgs: EmailMessage[] = (data.messages || []).map((m: any) => ({
        ...m,
        direction:
          (m.fromAddress || m.from || '').toLowerCase().includes(booking.email.toLowerCase())
            ? 'inbound'
            : 'outbound',
      }));
      // Sort oldest first
      msgs.sort((a, b) => (a.receivedTime || a.sentDateInGMT || 0) - (b.receivedTime || b.sentDateInGMT || 0));
      setEmails(msgs);
    } catch {
      // silently fail — Zoho may not be connected
    } finally {
      setLoading(false);
    }
  }, [booking.email]);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [emails]);

  const sendEmail = async () => {
    if (!compose.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch('/api/mail/send', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          to: booking.email,
          subject,
          content: compose.trim(),
          isHtml: false,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setSendError(data.error || `Failed to send (${res.status})`);
      } else {
        // Optimistically add to thread
        setEmails(prev => [
          ...prev,
          {
            messageId: `local-${Date.now()}`,
            subject,
            from: 'media@thelostandunfounds.com',
            fromAddress: 'media@thelostandunfounds.com',
            to: booking.email,
            sentDateInGMT: Date.now(),
            summary: compose.trim(),
            content: compose.trim(),
            isRead: true,
            direction: 'outbound',
          },
        ]);
        setCompose('');
      }
    } catch (e: any) {
      setSendError(e?.message || 'Network error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Email Thread</p>
          <p className="text-xs font-bold text-white truncate">{booking.email}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchEmails}
            disabled={loading}
            className="p-1.5 text-white/30 hover:text-white transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="p-1.5 text-white/30 hover:text-white transition-colors"
            >
              <ChevronDownIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {loading && emails.length === 0 ? (
          <div className="text-center text-white/20 text-[10px] uppercase tracking-widest py-8 animate-pulse">
            Loading…
          </div>
        ) : emails.length === 0 ? (
          <div className="text-center py-10">
            <ChatBubbleLeftRightIcon className="w-8 h-8 text-white/10 mx-auto mb-2" />
            <p className="text-white/20 text-[10px] uppercase tracking-widest">No emails yet</p>
            <p className="text-white/10 text-[9px] mt-1">Messages to/from {booking.email} will appear here</p>
          </div>
        ) : (
          emails.map(msg => (
            <div
              key={msg.messageId}
              className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-none px-3 py-2 text-xs leading-relaxed ${
                  msg.direction === 'outbound'
                    ? 'bg-white text-black'
                    : 'bg-white/5 border border-white/10 text-white/80'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.summary || msg.content || '(no preview)'}</p>
                <p className={`text-[9px] mt-1 ${msg.direction === 'outbound' ? 'text-black/40' : 'text-white/25'}`}>
                  {fmtMsgTime(msg.receivedTime || msg.sentDateInGMT)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div className="shrink-0 border-t border-white/10 p-3 space-y-2">
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Subject"
          className="w-full bg-white/5 border border-white/10 px-3 py-1.5 text-[10px] text-white placeholder-white/20 focus:outline-none focus:border-white/30"
        />
        <div className="flex gap-2">
          <textarea
            value={compose}
            onChange={e => setCompose(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendEmail();
            }}
            rows={3}
            placeholder={`Message ${clientName}… (⌘↵ to send)`}
            className="flex-1 bg-white/5 border border-white/10 px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30 resize-none"
          />
          <button
            onClick={sendEmail}
            disabled={sending || !compose.trim()}
            className="px-3 bg-white text-black hover:bg-zinc-200 disabled:opacity-30 transition-colors self-end py-2"
            title="Send (⌘↵)"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        </div>
        {sendError && (
          <p className="text-red-400 text-[9px]">{sendError}</p>
        )}
      </div>
    </div>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

const BookingInvoicePanel: React.FC<Props> = ({ booking, onClose, onInvoiceCreated }) => {
  // ── Client info (preloaded, name editable) ──────────────────────────────
  const [clientName, setClientName] = useState(booking.name);
  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // ── Session details ─────────────────────────────────────────────────────
  const [eventDate, setEventDate] = useState(booking.event_date);
  const [startTime, setStartTime] = useState(booking.start_time || '');
  const [endTime, setEndTime] = useState(booking.end_time || '');
  const [location, setLocation] = useState(booking.location || '');
  const [eventType, setEventType] = useState(booking.event_type || '');

  // ── Deliverables / line items ────────────────────────────────────────────
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', amount: '' },
  ]);

  // ── Pricing ─────────────────────────────────────────────────────────────
  const [depositPct, setDepositPct] = useState('50');

  // ── Notes ────────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState(booking.admin_notes || '');

  // ── Invoice generation ───────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    msg: string;
    pdfUrl?: string;
  } | null>(null);

  // ── Mobile email drawer ──────────────────────────────────────────────────
  const [emailDrawerOpen, setEmailDrawerOpen] = useState(false);

  // Focus name input when editing
  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  // Trap scroll on mount
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const projectTotal = lineItems.reduce(
    (sum, li) => sum + (parseFloat(li.amount) || 0),
    0
  );

  const addLineItem = () =>
    setLineItems(prev => [...prev, { description: '', amount: '' }]);

  const removeLineItem = (i: number) =>
    setLineItems(prev => prev.filter((_, idx) => idx !== i));

  const updateLineItem = (i: number, field: keyof LineItem, value: string) =>
    setLineItems(prev => prev.map((li, idx) => idx === i ? { ...li, [field]: value } : li));

  const generateInvoice = async () => {
    const validItems = lineItems.filter(
      li => li.description.trim() && parseFloat(li.amount) > 0
    );
    if (validItems.length === 0) {
      setFeedback({ type: 'error', msg: 'Add at least one deliverable with an amount.' });
      return;
    }
    if (projectTotal <= 0) {
      setFeedback({ type: 'error', msg: 'Project total must be greater than zero.' });
      return;
    }
    const pct = parseFloat(depositPct);
    if (!(pct > 0) || pct >= 100) {
      setFeedback({ type: 'error', msg: 'Deposit % must be between 1 and 99.' });
      return;
    }

    setGenerating(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/booking/create-quote', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          bookingId: booking.id,
          totalPrice: projectTotal,
          depositPct: pct,
          lineItems: validItems.map(li => ({
            description: li.description.trim(),
            quantity: 1,
            unit_price: parseFloat(li.amount),
            amount: parseFloat(li.amount),
          })),
          description: `${eventType || booking.event_type} — ${clientName}`,
          // Pass through any updated fields for context
          overrideName: clientName !== booking.name ? clientName : undefined,
          adminNotes: notes || undefined,
          sessionDate: eventDate,
          sessionStart: startTime || undefined,
          sessionEnd: endTime || undefined,
          sessionLocation: location || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setFeedback({
          type: 'error',
          msg: data.error || data.message || `Request failed (${res.status})`,
        });
      } else {
        setFeedback({
          type: 'success',
          msg: `Invoice ${data.invoiceNumber} created${data.emailed ? ' and emailed to client' : ' — email failed, share PDF manually'}.`,
          pdfUrl: data.pdfUrl,
        });
        onInvoiceCreated();
      }
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e?.message || 'Network error' });
    } finally {
      setGenerating(false);
    }
  };

  // ── Invoice form ──────────────────────────────────────────────────────────
  const InvoiceForm = (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-7 max-w-2xl">

        {/* Client info */}
        <section>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-3">Client</p>
          <div className="space-y-3">
            {/* Editable name */}
            <div className="flex items-center gap-2">
              {editingName ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === 'Escape') setEditingName(false);
                    }}
                    className="flex-1 bg-white/5 border border-white/30 px-3 py-1.5 text-sm font-bold text-white focus:outline-none"
                  />
                  <button
                    onClick={() => setEditingName(false)}
                    className="p-1 text-green-400 hover:text-green-300"
                  >
                    <CheckIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <p className="text-sm font-bold text-white">{clientName}</p>
                  <button
                    onClick={() => setEditingName(true)}
                    className="p-1 text-white/20 hover:text-white/60 transition-colors"
                    title="Edit client name"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[9px] text-white/25 uppercase tracking-widest mb-0.5">Email</p>
                <p className="text-xs text-white/60">{booking.email}</p>
              </div>
              {booking.phone && (
                <div>
                  <p className="text-[9px] text-white/25 uppercase tracking-widest mb-0.5">Phone</p>
                  <p className="text-xs text-white/60">{booking.phone}</p>
                </div>
              )}
              {booking.business_name && (
                <div className="col-span-2">
                  <p className="text-[9px] text-white/25 uppercase tracking-widest mb-0.5">Business</p>
                  <p className="text-xs text-white/60">{booking.business_name}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="border-t border-white/8" />

        {/* Session details */}
        <section>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-3">Session Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] text-white/25 uppercase tracking-widest block mb-1">Event Type</label>
              <input
                type="text"
                value={eventType}
                onChange={e => setEventType(e.target.value)}
                className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="text-[9px] text-white/25 uppercase tracking-widest block mb-1">Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-[9px] text-white/25 uppercase tracking-widest block mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                placeholder="—"
                className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-[9px] text-white/25 uppercase tracking-widest block mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                placeholder="—"
                className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 [color-scheme:dark]"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[9px] text-white/25 uppercase tracking-widest block mb-1">Meeting Location</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Studio, address, or virtual"
                className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
              />
            </div>
          </div>
        </section>

        <div className="border-t border-white/8" />

        {/* Deliverables */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Deliverables</p>
            <button
              onClick={addLineItem}
              className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors"
            >
              <PlusIcon className="w-3 h-3" /> Add
            </button>
          </div>

          <div className="space-y-2">
            {lineItems.map((li, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={li.description}
                  onChange={e => updateLineItem(i, 'description', e.target.value)}
                  placeholder="e.g. Photo editing, 2hr shoot, gallery delivery…"
                  className="flex-1 bg-white/5 border border-white/10 px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                />
                <div className="relative w-28 shrink-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={li.amount}
                    onChange={e => updateLineItem(i, 'amount', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 pl-6 pr-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                  />
                </div>
                {lineItems.length > 1 && (
                  <button
                    onClick={() => removeLineItem(i)}
                    className="p-2 text-white/20 hover:text-red-400 transition-colors"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Total + deposit */}
          <div className="mt-4 pt-4 border-t border-white/8 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Project Total</span>
              <span className="text-lg font-black font-mono text-white">
                ${projectTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/30 shrink-0">Deposit %</label>
              <input
                type="number"
                min="1"
                max="99"
                value={depositPct}
                onChange={e => setDepositPct(e.target.value)}
                className="w-20 bg-white/5 border border-white/10 px-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-white/30 text-center"
              />
              {projectTotal > 0 && (
                <span className="text-xs text-white/30 font-mono">
                  = ${((projectTotal * parseFloat(depositPct || '0')) / 100).toFixed(2)} due now
                </span>
              )}
            </div>
          </div>
        </section>

        <div className="border-t border-white/8" />

        {/* Notes */}
        <section>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-3">Notes</p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Internal notes, special requirements, reminders…"
            className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 resize-none"
          />
          {booking.notes && (
            <div className="mt-2 p-3 bg-white/3 border border-white/8">
              <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1">Client's Original Notes</p>
              <p className="text-xs text-white/50 leading-relaxed">{booking.notes}</p>
            </div>
          )}
        </section>

        {/* Feedback */}
        {feedback && (
          <div
            className={`p-4 text-sm ${
              feedback.type === 'success'
                ? 'bg-green-400/10 border border-green-400/20 text-green-300'
                : 'bg-red-400/10 border border-red-400/20 text-red-300'
            }`}
          >
            {feedback.msg}
            {feedback.pdfUrl && (
              <>
                {' '}
                <a
                  href={feedback.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-white"
                >
                  View PDF ↗
                </a>
              </>
            )}
          </div>
        )}

        {/* Generate button */}
        <div className="pb-8">
          <button
            onClick={generateInvoice}
            disabled={generating}
            className="w-full py-3.5 bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] hover:bg-zinc-200 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <DocumentTextIcon className="w-4 h-4" />
            {generating ? 'Generating Invoice…' : 'Generate & Send Invoice'}
          </button>
          <p className="text-[9px] text-white/20 text-center mt-2">
            Creates a quote PDF and emails the deposit payment link to {booking.email}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="absolute inset-0 md:inset-4 bg-zinc-950 border border-white/10 flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.15em] text-white">Generate Invoice</h2>
              <p className="text-[10px] text-white/30 mt-0.5">
                {booking.event_type} &nbsp;·&nbsp; {fmtDate(booking.event_date)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/30 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* ── Desktop: two-column ── */}
          <div className="hidden md:flex flex-1 overflow-hidden">
            {/* Left: Invoice form */}
            <div className="flex-1 overflow-y-auto border-r border-white/10">
              {InvoiceForm}
            </div>

            {/* Right: Email thread chatbox */}
            <div className="w-[360px] xl:w-[420px] shrink-0 flex flex-col overflow-hidden">
              <EmailThread
                booking={booking}
                clientName={clientName}
              />
            </div>
          </div>

          {/* ── Mobile: single column ── */}
          <div className="flex flex-col flex-1 overflow-hidden md:hidden">
            {InvoiceForm}

            {/* Floating email button */}
            <div className="shrink-0 border-t border-white/10 px-4 py-3">
              <button
                onClick={() => setEmailDrawerOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border border-white/20 text-white text-[10px] font-black uppercase tracking-[0.15em] hover:bg-white/5 transition-colors"
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                View / Send Emails
              </button>
            </div>
          </div>

          {/* ── Mobile email drawer (full-screen overlay) ── */}
          <AnimatePresence>
            {emailDrawerOpen && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="absolute inset-0 bg-zinc-950 flex flex-col z-10 md:hidden"
              >
                <EmailThread
                  booking={booking}
                  clientName={clientName}
                  isMobileExpanded
                  onCollapse={() => setEmailDrawerOpen(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BookingInvoicePanel;
