import React, { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import SEOHead from '../components/SEOHead';

interface FormState {
  client_name: string;
  client_email: string;
  client_phone: string;
  date_of_birth: string;
  emergency_contact: string;
  medical_conditions: string;
  agreed_to_terms: boolean;
  newsletter_opt_in: boolean;
}

const INITIAL: FormState = {
  client_name: '',
  client_email: '',
  client_phone: '',
  date_of_birth: '',
  emergency_contact: '',
  medical_conditions: '',
  agreed_to_terms: false,
  newsletter_opt_in: false,
};

export default function KattitudeWaiver() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [hasSig, setHasSig] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawing.current = true;
    lastPos.current = getPos(e, canvas);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e, canvas);
    if (lastPos.current) {
      ctx.beginPath();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasSig(true);
    }
    lastPos.current = pos;
  }, []);

  const endDraw = useCallback(() => {
    drawing.current = false;
    lastPos.current = null;
  }, []);

  const clearSig = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
  }, []);

  const set = (key: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const val = e.target.type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : e.target.value;
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.agreed_to_terms) { setError('You must agree to the terms to proceed.'); return; }
    if (!hasSig) { setError('Please sign the waiver before submitting.'); return; }

    const signature_data = canvasRef.current?.toDataURL('image/png') || null;
    setSubmitting(true);
    try {
      const res = await fetch('/api/kattitude/waiver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, signature_data }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Submission failed. Please try again.');
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto mb-6" />
          <h1 className="text-3xl font-black uppercase tracking-tight mb-3">Waiver Signed</h1>
          <p className="text-white/50 mb-8 leading-relaxed">
            Thank you, {form.client_name}. Your waiver has been submitted. We'll be in touch to
            confirm your appointment details.
          </p>
          <Link
            to="/kattitude"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-sm hover:bg-white/90 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Studio
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Client Waiver — Kattitude Tattoo Studio"
        description="Sign your tattoo waiver before your appointment at Kattitude Tattoo Studio, Austin TX."
        canonicalPath="/kattitude/waiver"
        noIndex={true}
      />

      <div className="min-h-screen bg-black text-white">
        <div className="border-b border-white/10 px-6 py-5 flex items-center justify-between">
          <Link
            to="/kattitude"
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Kattitude
          </Link>
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">
            Client Waiver
          </span>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-black uppercase tracking-tight mb-2">Tattoo Waiver</h1>
            <p className="text-white/40 text-sm mb-10">
              Please complete all fields before your appointment. All information is kept confidential.
            </p>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Info */}
              <fieldset className="space-y-4">
                <legend className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-4 block">
                  Personal Information
                </legend>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Full Name *</label>
                  <input type="text" required value={form.client_name} onChange={set('client_name')}
                    placeholder="Jane Smith"
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 px-4 py-3 text-sm focus:outline-none focus:border-white/40 transition-colors" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Email *</label>
                    <input type="email" required value={form.client_email} onChange={set('client_email')}
                      placeholder="jane@example.com"
                      className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 px-4 py-3 text-sm focus:outline-none focus:border-white/40 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Phone</label>
                    <input type="tel" value={form.client_phone} onChange={set('client_phone')}
                      placeholder="(512) 555-0100"
                      className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 px-4 py-3 text-sm focus:outline-none focus:border-white/40 transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Date of Birth *</label>
                  <input type="date" required value={form.date_of_birth} onChange={set('date_of_birth')}
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-white/40 transition-colors"
                    style={{ colorScheme: 'dark' }} />
                  <p className="text-[9px] text-white/25 mt-1 uppercase tracking-widest">Must be 18+ to receive a tattoo</p>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Emergency Contact</label>
                  <input type="text" value={form.emergency_contact} onChange={set('emergency_contact')}
                    placeholder="Name — Phone number"
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 px-4 py-3 text-sm focus:outline-none focus:border-white/40 transition-colors" />
                </div>
              </fieldset>

              {/* Medical */}
              <fieldset>
                <legend className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-4 block">
                  Medical Information
                </legend>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">
                    Medical Conditions, Allergies, or Medications
                  </label>
                  <textarea rows={4} value={form.medical_conditions} onChange={set('medical_conditions')}
                    placeholder="List any conditions that may affect the tattooing process, or write 'None'…"
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 px-4 py-3 text-sm focus:outline-none focus:border-white/40 transition-colors resize-none" />
                </div>
              </fieldset>

              {/* Terms */}
              <fieldset className="space-y-4">
                <legend className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-4 block">
                  Terms &amp; Release
                </legend>
                <div className="p-4 bg-white/5 border border-white/10 text-xs text-white/50 leading-relaxed space-y-2">
                  <p>I understand that tattooing is a permanent procedure and involves inherent risks including, but not limited to: allergic reaction to ink, infection, and scarring.</p>
                  <p>I confirm that I am at least 18 years of age, am not pregnant, and am not under the influence of alcohol or drugs. I have disclosed all relevant medical conditions.</p>
                  <p>I release Kattitude Tattoo Studio and its artists from liability for complications arising from failure to follow aftercare instructions or pre-existing conditions not disclosed prior to the procedure.</p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input type="checkbox" required checked={form.agreed_to_terms} onChange={set('agreed_to_terms')}
                    className="mt-0.5 w-4 h-4 border border-white/30 bg-transparent accent-white cursor-pointer" />
                  <span className="text-sm text-white/70 group-hover:text-white transition-colors">
                    I have read, understood, and agree to the above terms and release. *
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input type="checkbox" checked={form.newsletter_opt_in} onChange={set('newsletter_opt_in')}
                    className="mt-0.5 w-4 h-4 border border-white/30 bg-transparent accent-white cursor-pointer" />
                  <span className="text-sm text-white/50 group-hover:text-white/70 transition-colors">
                    I'd like to receive updates, promotions, and aftercare tips from Kattitude Tattoo Studio.
                  </span>
                </label>
              </fieldset>

              {/* Signature */}
              <fieldset>
                <legend className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-4 block">
                  Signature *
                </legend>
                <div className="border border-white/20 bg-white/5 relative">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    className="w-full touch-none cursor-crosshair block"
                    style={{ height: '160px' }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                  />
                  {!hasSig && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-white/20 text-xs uppercase tracking-widest font-bold">Sign here</p>
                    </div>
                  )}
                  <div className="absolute bottom-8 left-8 right-8 border-b border-white/10 pointer-events-none" />
                </div>
                {hasSig && (
                  <button type="button" onClick={clearSig}
                    className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                    <XMarkIcon className="w-3 h-3" />
                    Clear signature
                  </button>
                )}
              </fieldset>

              {error && (
                <div className="p-4 border border-red-500/30 bg-red-500/10">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button type="submit" disabled={submitting}
                className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-sm hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {submitting ? 'Submitting…' : 'Submit Waiver'}
              </button>

              <p className="text-center text-[9px] text-white/25 uppercase tracking-widest">
                Your information is stored securely and never shared with third parties.
              </p>
            </form>
          </motion.div>
        </div>
      </div>
    </>
  );
}
