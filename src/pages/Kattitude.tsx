import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  MapPinIcon,
  ClockIcon,
  PhoneIcon,
  EnvelopeIcon,
  ArrowRightIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import SEOHead from '../components/SEOHead';
import { supabase } from '../lib/supabase';

interface Artist {
  id: string;
  name: string;
  bio: string | null;
  profile_image_url: string | null;
  specialties: string[];
  instagram_handle: string | null;
}

interface BusinessSettings {
  location?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  hours?: Record<string, string>;
}

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function Kattitude() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: biz } = await supabase
          .from('businesses')
          .select('id, settings')
          .eq('slug', 'kattitude')
          .maybeSingle();

        if (biz?.settings) setSettings(biz.settings as BusinessSettings);

        if (biz?.id) {
          const { data: artistData } = await supabase
            .from('artists')
            .select('id, name, bio, profile_image_url, specialties, instagram_handle')
            .eq('business_id', biz.id)
            .order('created_at', { ascending: true });

          setArtists(artistData || []);
        }
      } catch (err) {
        console.error('Kattitude load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hours = settings.hours || {};

  return (
    <>
      <SEOHead
        title="Kattitude Tattoo Studio — Austin, TX"
        description="Custom tattoo art in Austin, Texas. Book a consultation with our artists."
        canonicalPath="/kattitude"
      />

      <div className="min-h-screen bg-black text-white font-sans">
        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl"
          >
            <p className="text-[10px] font-black tracking-[0.5em] uppercase text-white/40 mb-6">
              Austin, Texas
            </p>
            <h1 className="text-[clamp(4rem,16vw,12rem)] font-black uppercase leading-none tracking-tighter text-white">
              KATTITUDE
            </h1>
            <p className="text-[clamp(0.75rem,2vw,1.125rem)] font-bold uppercase tracking-[0.3em] text-white/50 mt-4">
              Tattoo Studio
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
              <Link
                to="/kattitude/waiver"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-sm hover:bg-white/90 transition-colors"
              >
                Sign Waiver
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <a
                href="#artists"
                className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 text-white/70 font-bold uppercase tracking-widest text-sm hover:border-white/60 hover:text-white transition-colors"
              >
                View Artists
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <div className="w-px h-12 bg-gradient-to-b from-white/0 to-white/30 mx-auto" />
          </motion.div>
        </section>

        {/* ── ARTISTS ──────────────────────────────────────────────────── */}
        <section id="artists" className="px-6 py-24 max-w-6xl mx-auto">
          <div className="mb-16">
            <p className="text-[9px] font-black tracking-[0.5em] uppercase text-white/30 mb-3">Our Team</p>
            <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight">THE ARTISTS</h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="aspect-[3/4] bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : artists.length === 0 ? (
            <div className="text-center py-20 border border-white/10">
              <p className="text-white/30 uppercase tracking-widest text-sm font-bold">
                Artist profiles coming soon
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {artists.map((artist, i) => (
                <motion.div
                  key={artist.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group"
                >
                  <div className="aspect-[3/4] bg-white/5 overflow-hidden mb-4 relative">
                    {artist.profile_image_url ? (
                      <img
                        src={artist.profile_image_url}
                        alt={artist.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <StarIcon className="w-12 h-12 text-white/10" />
                      </div>
                    )}
                    {artist.instagram_handle && (
                      <a
                        href={`https://instagram.com/${artist.instagram_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 text-[9px] font-bold uppercase tracking-widest text-white/60 hover:text-white transition-colors"
                      >
                        @{artist.instagram_handle}
                      </a>
                    )}
                  </div>

                  <h3 className="text-xl font-black uppercase tracking-tight">{artist.name}</h3>

                  {artist.specialties?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
                      {artist.specialties.map(s => (
                        <span
                          key={s}
                          className="text-[8px] font-black uppercase tracking-widest px-2 py-1 border border-white/20 text-white/50"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {artist.bio && (
                    <p className="text-white/50 text-sm leading-relaxed line-clamp-3">{artist.bio}</p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* ── CTA STRIP ────────────────────────────────────────────────── */}
        <section className="bg-white text-black px-6 py-20">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-8">
            <div>
              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight leading-none">
                Ready to get<br />inked?
              </h2>
              <p className="text-black/50 mt-3 text-sm uppercase tracking-widest font-bold">
                Book a free consultation with our artists
              </p>
            </div>
            <Link
              to="/kattitude/waiver"
              className="flex-shrink-0 inline-flex items-center gap-3 px-10 py-5 bg-black text-white font-black uppercase tracking-widest text-sm hover:bg-black/80 transition-colors"
            >
              Sign Waiver &amp; Book
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
          </div>
        </section>

        {/* ── SHOP INFO ────────────────────────────────────────────────── */}
        <section className="px-6 py-24 max-w-6xl mx-auto">
          <div className="mb-16">
            <p className="text-[9px] font-black tracking-[0.5em] uppercase text-white/30 mb-3">Find Us</p>
            <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight">SHOP INFO</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <MapPinIcon className="w-5 h-5 text-white/40 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Location</p>
                  <p className="text-white font-bold">{settings.location || 'Austin, TX'}</p>
                </div>
              </div>

              {settings.phone && (
                <div className="flex items-start gap-4">
                  <PhoneIcon className="w-5 h-5 text-white/40 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Phone</p>
                    <a href={`tel:${settings.phone}`} className="text-white font-bold hover:text-white/70 transition-colors">
                      {settings.phone}
                    </a>
                  </div>
                </div>
              )}

              {settings.email && (
                <div className="flex items-start gap-4">
                  <EnvelopeIcon className="w-5 h-5 text-white/40 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Email</p>
                    <a href={`mailto:${settings.email}`} className="text-white font-bold hover:text-white/70 transition-colors">
                      {settings.email}
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-3 mb-6">
                <ClockIcon className="w-5 h-5 text-white/40" />
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Hours</p>
              </div>
              <div className="space-y-2">
                {DAYS_ORDER.map(day => (
                  <div key={day} className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-xs font-black uppercase tracking-widest text-white/50 capitalize">{day}</span>
                    <span className={`text-xs font-bold ${hours[day] === 'Closed' ? 'text-white/25' : 'text-white'}`}>
                      {hours[day] || '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────── */}
        <footer className="border-t border-white/10 px-6 py-8">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">
              © {new Date().getFullYear()} Kattitude Tattoo Studio — Austin, TX
            </p>
            <Link
              to="/kattitude/waiver"
              className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
            >
              Sign Waiver →
            </Link>
          </div>
        </footer>
      </div>
    </>
  );
}
