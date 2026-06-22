import { useState } from 'react';
import {
  CalendarDaysIcon, CurrencyDollarIcon, UserGroupIcon,
  ClockIcon, CheckCircleIcon, ArrowTrendingUpIcon,
  Bars3Icon, XMarkIcon, BellIcon,
  ArrowRightIcon, DocumentTextIcon, Cog6ToothIcon, HomeIcon,
  ClipboardDocumentListIcon, PlusIcon, ExclamationTriangleIcon,
  PhoneIcon, EnvelopeIcon,
  ChartBarIcon, BanknotesIcon, MagnifyingGlassIcon,
  StarIcon, PhotoIcon, PaintBrushIcon, SparklesIcon,
  MapPinIcon, ChevronDownIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { CalendarWidget } from '@/components/ui/calendar-widget';
import { ClockWidget } from '@/components/ui/clock-widget';
import { cn } from '@/components/ui/utils';

// ─── Brand ───────────────────────────────────────────────────────────────────

const PINK = '#E91E8C';
const GOLD = '#B8860B';
const BEE  = 'https://kattitudekollection.com/cdn/shop/files/Black_White_Circle_Bee_Icon_Food_Logo_-_1.png';
const tooltipStyle = { backgroundColor: '#111111', border: 'none', borderRadius: 0, color: '#fff', fontSize: 11 };

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = 'overview' | 'schedule' | 'appointments' | 'artists' | 'clients' | 'deposits' | 'portfolio' | 'settings';
type ModalType = 'create-appointment' | 'add-artist' | 'complete-sessions' | null;

interface Appointment {
  id: string; date: string; time: string; client: string; artist: string;
  style: string; placement: string; size: string; status: string;
  deposit: number; total: number; phone: string; notes?: string;
}
interface Deposit {
  id: string; client: string; apptRef: string; amount: number;
  daysOut: number; apptDate: string; status: string; paidDate?: string;
}
interface ArtistRecord {
  id: string; initials: string; name: string; role: string; instagram: string;
  specialties: string[]; bookingRate: number; rating: number;
  sessionsMonth: number; revenueMonth: number; nextAvail: string;
  status: 'available' | 'booked' | 'off'; bio: string;
}
interface Client {
  name: string; phone: string; email: string; instagram: string;
  sessions: number; lastVisit: string; spend: number; favStyle: string;
  preferredArtist: string; since: string; note: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const ALL_APPTS_INIT: Appointment[] = [
  { id:'APT-0041', date:'Jun 22', time:'10:00 AM', client:'Camila Vega',    artist:'Kat',   style:'Fine Line',     placement:'Wrist',       size:'Small',  status:'in-progress', deposit:85,  total:280, phone:'(512) 555-0181' },
  { id:'APT-0042', date:'Jun 22', time:'12:30 PM', client:'Jordan Torres',  artist:'Marco', style:'Blackwork',     placement:'Shoulder',    size:'Medium', status:'upcoming',    deposit:130, total:420, phone:'(512) 555-0143' },
  { id:'APT-0043', date:'Jun 22', time:'3:00 PM',  client:'Priya Mehta',    artist:'Kat',   style:'Color Realism', placement:'Calf',        size:'Large',  status:'upcoming',    deposit:195, total:650, phone:'(512) 555-0209' },
  { id:'APT-0044', date:'Jun 23', time:'11:00 AM', client:'Devon Santos',   artist:'Kat',   style:'Traditional',   placement:'Upper Arm',   size:'Medium', status:'confirmed',   deposit:115, total:380, phone:'(512) 555-0167' },
  { id:'APT-0045', date:'Jun 23', time:'2:00 PM',  client:'Alex Rivera',    artist:'Sofia', style:'Fine Line',     placement:'Ankle',       size:'Small',  status:'confirmed',   deposit:60,  total:200, phone:'(512) 555-0334' },
  { id:'APT-0046', date:'Jun 24', time:'10:00 AM', client:'Maya Kim',       artist:'Kat',   style:'Illustrative',  placement:'Ribcage',     size:'Large',  status:'confirmed',   deposit:165, total:550, phone:'(512) 555-0278' },
  { id:'APT-0047', date:'Jun 24', time:'1:00 PM',  client:'Tyler Brooks',   artist:'Marco', style:'Blackwork',     placement:'Back',        size:'XL',     status:'confirmed',   deposit:250, total:800, phone:'(512) 555-0391' },
  { id:'APT-0048', date:'Jun 25', time:'11:00 AM', client:'Sofia Garza',    artist:'Sofia', style:'Fine Line',     placement:'Behind Ear',  size:'Small',  status:'pending',     deposit:0,   total:150, phone:'(512) 555-0422' },
  { id:'APT-0049', date:'Jun 26', time:'12:00 PM', client:'Marcus Bell',    artist:'Kat',   style:'Cover-Up',      placement:'Forearm',     size:'Medium', status:'confirmed',   deposit:150, total:500, phone:'(512) 555-0115' },
  { id:'APT-0050', date:'Jun 27', time:'10:00 AM', client:'Lucas Torres',   artist:'Marco', style:'Traditional',   placement:'Chest',       size:'Large',  status:'confirmed',   deposit:210, total:700, phone:'(512) 555-0251' },
  // completed
  { id:'APT-0040', date:'Jun 21', time:'2:00 PM',  client:'Rina Park',      artist:'Kat',   style:'Color Realism', placement:'Shoulder',    size:'Medium', status:'completed',   deposit:185, total:620, phone:'(512) 555-0362' },
  { id:'APT-0039', date:'Jun 21', time:'10:00 AM', client:'Camila Vega',    artist:'Sofia', style:'Fine Line',     placement:'Collarbone',  size:'Small',  status:'completed',   deposit:75,  total:250, phone:'(512) 555-0181' },
  { id:'APT-0038', date:'Jun 20', time:'1:00 PM',  client:'Tyler Brooks',   artist:'Marco', style:'Blackwork',     placement:'Forearm',     size:'Medium', status:'completed',   deposit:115, total:380, phone:'(512) 555-0391' },
  { id:'APT-0037', date:'Jun 19', time:'11:00 AM', client:'Devon Santos',   artist:'Kat',   style:'Traditional',   placement:'Bicep',       size:'Medium', status:'completed',   deposit:100, total:320, phone:'(512) 555-0167' },
  { id:'APT-0036', date:'Jun 18', time:'10:30 AM', client:'Mia Chen',       artist:'Sofia', style:'Fine Line',     placement:'Wrist',       size:'Small',  status:'completed',   deposit:65,  total:220, phone:'(512) 555-0488' },
  { id:'APT-0035', date:'Jun 17', time:'12:00 PM', client:'Alex Rivera',    artist:'Sofia', style:'Fine Line',     placement:'Spine',       size:'Medium', status:'completed',   deposit:90,  total:300, phone:'(512) 555-0334' },
  { id:'APT-0034', date:'Jun 16', time:'1:30 PM',  client:'Priya Mehta',    artist:'Kat',   style:'Color Realism', placement:'Upper Arm',   size:'Large',  status:'completed',   deposit:180, total:600, phone:'(512) 555-0209' },
  { id:'APT-0033', date:'Jun 15', time:'10:00 AM', client:'Jordan Torres',  artist:'Marco', style:'Blackwork',     placement:'Chest',       size:'Large',  status:'completed',   deposit:165, total:550, phone:'(512) 555-0143' },
];

const ALL_DEPOSITS_INIT: Deposit[] = [
  { id:'DEP-0088', client:'Sofia Garza',   apptRef:'APT-0048', amount:75,  daysOut:5,  apptDate:'Jun 25', status:'overdue'     },
  { id:'DEP-0094', client:'Marcus Bell',   apptRef:'APT-0049', amount:150, daysOut:2,  apptDate:'Jun 26', status:'outstanding' },
  { id:'DEP-0095', client:'Lucas Torres',  apptRef:'APT-0050', amount:210, daysOut:1,  apptDate:'Jun 27', status:'outstanding' },
  { id:'DEP-0087', client:'Tyler Brooks',  apptRef:'APT-0047', amount:250, daysOut:0,  apptDate:'Jun 24', status:'paid', paidDate:'Jun 20' },
  { id:'DEP-0086', client:'Maya Kim',      apptRef:'APT-0046', amount:165, daysOut:0,  apptDate:'Jun 24', status:'paid', paidDate:'Jun 19' },
  { id:'DEP-0085', client:'Devon Santos',  apptRef:'APT-0044', amount:115, daysOut:0,  apptDate:'Jun 23', status:'paid', paidDate:'Jun 16' },
  { id:'DEP-0084', client:'Alex Rivera',   apptRef:'APT-0045', amount:60,  daysOut:0,  apptDate:'Jun 23', status:'paid', paidDate:'Jun 17' },
  { id:'DEP-0083', client:'Priya Mehta',   apptRef:'APT-0043', amount:195, daysOut:0,  apptDate:'Jun 22', status:'paid', paidDate:'Jun 15' },
  { id:'DEP-0082', client:'Jordan Torres', apptRef:'APT-0042', amount:130, daysOut:0,  apptDate:'Jun 22', status:'paid', paidDate:'Jun 15' },
  { id:'DEP-0081', client:'Camila Vega',   apptRef:'APT-0041', amount:85,  daysOut:0,  apptDate:'Jun 22', status:'paid', paidDate:'Jun 14' },
];

const CLIENTS: Client[] = [
  { name:'Alex Rivera',    phone:'(512) 555-0334', email:'alex@rivera.io',          instagram:'@alex.ink.atx',    sessions:6, lastVisit:'Jun 21', spend:1470, favStyle:'Fine Line',     preferredArtist:'Sofia', since:'Oct 2023', note:'Wants full sleeve eventually — fine line botanicals. Very loyal.' },
  { name:'Camila Vega',    phone:'(512) 555-0181', email:'camilav@outlook.com',     instagram:'@camila.tatted',   sessions:5, lastVisit:'Jun 21', spend:1240, favStyle:'Fine Line',     preferredArtist:'Kat',   since:'Nov 2023', note:'Fine line only. Loves delicate botanical work. Refers friends often.' },
  { name:'Tyler Brooks',   phone:'(512) 555-0391', email:'tyler@brooksco.com',      instagram:'@tbrooks_ink',     sessions:4, lastVisit:'Jun 20', spend:1750, favStyle:'Blackwork',     preferredArtist:'Marco', since:'Jan 2024', note:'Building a Japanese-inspired blackwork sleeve with Marco.' },
  { name:'Devon Santos',   phone:'(512) 555-0167', email:'devon.santos@gmail.com',  instagram:'@devonsantos_atx', sessions:4, lastVisit:'Jun 19', spend:1020, favStyle:'Traditional',   preferredArtist:'Kat',   since:'Feb 2024', note:'Classic American traditional. Interested in chest panel next.' },
  { name:'Priya Mehta',    phone:'(512) 555-0209', email:'priya.mehta@pm.me',       instagram:'@priyaink',        sessions:3, lastVisit:'Jun 16', spend:1450, favStyle:'Color Realism',  preferredArtist:'Kat',   since:'Mar 2024', note:'Portrait work. Very detail-oriented about references.' },
  { name:'Jordan Torres',  phone:'(512) 555-0143', email:'j.torres@live.com',       instagram:'@jordantats',      sessions:3, lastVisit:'Jun 15', spend:1170, favStyle:'Blackwork',     preferredArtist:'Marco', since:'Mar 2024', note:'Cover-up completed in Jun. Now wants ornamental sleeve pieces.' },
  { name:'Mia Chen',       phone:'(512) 555-0488', email:'mia.chen@gmail.com',      instagram:'@mia_fineline',    sessions:2, lastVisit:'Jun 18', spend:470,  favStyle:'Fine Line',     preferredArtist:'Sofia', since:'Apr 2024', note:'Minimalist fine line. Wants matching pieces with her sister.' },
  { name:'Maya Kim',       phone:'(512) 555-0278', email:'maya@mayakim.art',        instagram:'@mayakim.art',     sessions:2, lastVisit:'Jun 14', spend:600,  favStyle:'Illustrative',  preferredArtist:'Kat',   since:'May 2024', note:'Illustrative character work. Shows up with very detailed briefs.' },
  { name:'Marcus Bell',    phone:'(512) 555-0115', email:'marcusbell@icloud.com',   instagram:'@bellinkd',        sessions:2, lastVisit:'Jun 10', spend:620,  favStyle:'Cover-Up',      preferredArtist:'Kat',   since:'May 2024', note:'Has 2 cover-up areas. First done. Second (back piece) scheduled Jun 26.' },
  { name:'Rina Park',      phone:'(512) 555-0362', email:'rinapark@gmail.com',      instagram:'@rinapark_tats',   sessions:1, lastVisit:'Jun 21', spend:620,  favStyle:'Color Realism',  preferredArtist:'Kat',   since:'Jun 2024', note:'First session was a portrait — very happy. Wants second session.' },
];

const ARTISTS_DATA: ArtistRecord[] = [
  {
    id:'KH', initials:'KH', name:'Katherine "Kat" Herrera', role:'Owner & Lead Artist',
    instagram:'@kattitudetattoo', specialties:['Fine Line','Color Realism','Illustrative','Cover-Ups'],
    bookingRate:94, rating:4.9, sessionsMonth:22, revenueMonth:8840, nextAvail:'Jun 29',
    status:'booked', bio:'Self-taught with 8+ years experience. Known for delicate fine line and vibrant realism.',
  },
  {
    id:'MR', initials:'MR', name:'Marco Reyes', role:'Guest Artist',
    instagram:'@marcoreyes.ink', specialties:['Blackwork','Traditional','Tribal','Geometric'],
    bookingRate:78, rating:4.8, sessionsMonth:14, revenueMonth:5720, nextAvail:'Jun 25',
    status:'available', bio:'Specialist in bold, graphic blackwork and classic American traditional.',
  },
  {
    id:'SL', initials:'SL', name:'Sofia Lee', role:'Guest Artist',
    instagram:'@sofialee.tats', specialties:['Fine Line','Botanical','Minimalist','Script'],
    bookingRate:85, rating:4.9, sessionsMonth:10, revenueMonth:3100, nextAvail:'Jun 26',
    status:'available', bio:'Soft, feminine fine line. Botanical and script work with a loyal following.',
  },
];

// chart data
const revenueTrend = [
  { week:'May W1', collected:2200, deposits:440 },
  { week:'May W2', collected:2650, deposits:530 },
  { week:'May W3', collected:1980, deposits:396 },
  { week:'May W4', collected:3100, deposits:620 },
  { week:'Jun W1', collected:2850, deposits:570 },
  { week:'Jun W2', collected:3420, deposits:684 },
];
const apptsByWeek = [
  { week:'May W1', sessions:14 },
  { week:'May W2', sessions:17 },
  { week:'May W3', sessions:13 },
  { week:'May W4', sessions:19 },
  { week:'Jun W1', sessions:18 },
  { week:'Jun W2', sessions:22 },
];
const styleBreakdown = [
  { name:'Fine Line',     value:42, color:PINK },
  { name:'Blackwork',     value:22, color:'rgba(255,255,255,0.5)' },
  { name:'Traditional',   value:18, color:GOLD },
  { name:'Color Realism', value:12, color:'#e879f9' },
  { name:'Illustrative',  value:6,  color:'rgba(255,255,255,0.2)' },
];
const busyDays = [
  { day:'Tue', appts:8 }, { day:'Wed', appts:6 }, { day:'Thu', appts:9 },
  { day:'Fri', appts:11 }, { day:'Sat', appts:14 }, { day:'Sun', appts:0 },
];
const depositAging = [
  { bracket:'0–3 days', amount:360 },
  { bracket:'4–7 days', amount:75 },
  { bracket:'8–14 days', amount:0 },
  { bracket:'15+ days',  amount:0 },
];

// ─── Shared UI ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    'in-progress': { color: PINK,                          bg: `${PINK}18`               },
    upcoming:      { color: 'rgba(255,255,255,0.5)',        bg: 'rgba(255,255,255,0.06)'  },
    completed:     { color: '#81c784',                     bg: 'rgba(129,199,132,0.1)'   },
    confirmed:     { color: '#81c784',                     bg: 'rgba(129,199,132,0.1)'   },
    pending:       { color: '#ffb74d',                     bg: 'rgba(255,183,77,0.1)'    },
    overdue:       { color: '#ef9a9a',                     bg: 'rgba(239,154,154,0.1)'   },
    outstanding:   { color: '#ffb74d',                     bg: 'rgba(255,183,77,0.1)'    },
    paid:          { color: '#81c784',                     bg: 'rgba(129,199,132,0.1)'   },
    available:     { color: '#81c784',                     bg: 'rgba(129,199,132,0.1)'   },
    booked:        { color: PINK,                          bg: `${PINK}18`               },
    off:           { color: 'rgba(255,255,255,0.25)',       bg: 'rgba(255,255,255,0.04)'  },
  };
  const { color, bg } = map[status] ?? map.upcoming;
  return (
    <span className="text-[9px] tracking-[0.2em] uppercase font-medium px-2 py-1 whitespace-nowrap"
      style={{ color, background: bg }}>{status.replace('-', ' ')}</span>
  );
}

function AgingBadge({ days }: { days: number }) {
  const color = days >= 8 ? '#ef9a9a' : days >= 4 ? '#ffb74d' : '#81c784';
  return <span className="text-[10px] font-mono font-bold" style={{ color }}>{days}d</span>;
}

function SectionLabel({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-0.5">{eyebrow}</div>
      <div className="text-white font-bold text-sm uppercase tracking-wider">{title}</div>
    </div>
  );
}

function PanelHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-black text-white uppercase tracking-wider">{title}</h1>
        {sub && <p className="text-white/30 text-xs tracking-wider mt-1">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function ConsoleTray({ onNav, activeSection }: { onNav: (s: Section) => void; activeSection: Section }) {
  const apps: { id: Section; icon: React.ElementType; title: string }[] = [
    { id: 'overview',      icon: ChartBarIcon,           title: 'Overview'     },
    { id: 'schedule',      icon: CalendarDaysIcon,        title: 'Schedule'     },
    { id: 'appointments',  icon: ClipboardDocumentListIcon, title: 'Appointments' },
    { id: 'artists',       icon: PaintBrushIcon,          title: 'Artists'      },
    { id: 'clients',       icon: UserGroupIcon,           title: 'Clients'      },
    { id: 'deposits',      icon: BanknotesIcon,           title: 'Deposits'     },
    { id: 'portfolio',     icon: PhotoIcon,               title: 'Portfolio'    },
    { id: 'settings',      icon: Cog6ToothIcon,           title: 'Settings'     },
  ];
  return (
    <div className="flex flex-col items-center pt-8 pb-12">
      <div className="text-[10px] font-black text-white/40 tracking-[0.4em] uppercase mb-4">Platform Console</div>
      <div className="flex flex-wrap justify-center gap-2 p-1.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
        {apps.map((app) => {
          const isActive = activeSection === app.id;
          return (
            <button key={app.id} onClick={() => onNav(app.id)}
              className="relative p-3 transition-all duration-200 group/btn"
              style={{
                background: isActive ? PINK : 'transparent',
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.4)',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#ffffff'; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)'; }}>
              <app.icon className="w-5 h-5" />
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 text-[9px] font-black uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10"
                style={{ background: PINK, color: '#ffffff' }}>
                {app.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg shadow-2xl" style={{ background: '#111111' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div>
            <div className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-0.5">Action</div>
            <div className="text-white font-bold text-sm uppercase tracking-wider">{title}</div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CreateAppointmentModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    client: '', phone: '', artist: 'Kat', style: 'Fine Line',
    placement: '', size: 'Medium', date: '2026-06-29', time: '11:00', notes: '',
  });
  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const cls = "w-full text-white text-sm px-3 py-2.5 focus:outline-none placeholder:text-white/20 transition-colors";
  const inputStyle = { background: 'rgba(255,255,255,0.06)' };
  const focusStyle = { background: 'rgba(255,255,255,0.1)' };
  return (
    <ModalShell title="New Appointment" onClose={onClose}>
      <div className="px-6 py-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Client Name</label>
            <input list="new-appt-clients" value={form.client} onChange={e => upd('client', e.target.value)}
              placeholder="First & Last…" className={cls} style={inputStyle}
              onFocus={e => Object.assign((e.target as HTMLInputElement).style, focusStyle)}
              onBlur={e => Object.assign((e.target as HTMLInputElement).style, inputStyle)} />
            <datalist id="new-appt-clients">{CLIENTS.map(c => <option key={c.name} value={c.name} />)}</datalist>
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Phone</label>
            <input value={form.phone} onChange={e => upd('phone', e.target.value)}
              placeholder="(512) 555-…" className={cls} style={inputStyle}
              onFocus={e => Object.assign((e.target as HTMLInputElement).style, focusStyle)}
              onBlur={e => Object.assign((e.target as HTMLInputElement).style, inputStyle)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Artist</label>
            <select value={form.artist} onChange={e => upd('artist', e.target.value)} className={cls} style={{ ...inputStyle, appearance: 'none' as const }}>
              <option value="Kat">Kat Herrera</option>
              <option value="Marco">Marco Reyes</option>
              <option value="Sofia">Sofia Lee</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Style</label>
            <select value={form.style} onChange={e => upd('style', e.target.value)} className={cls} style={{ ...inputStyle, appearance: 'none' as const }}>
              <option>Fine Line</option><option>Traditional</option><option>Blackwork</option>
              <option>Color Realism</option><option>Illustrative</option><option>Cover-Up</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Placement</label>
            <input value={form.placement} onChange={e => upd('placement', e.target.value)}
              placeholder="Wrist, shoulder…" className={cls} style={inputStyle}
              onFocus={e => Object.assign((e.target as HTMLInputElement).style, focusStyle)}
              onBlur={e => Object.assign((e.target as HTMLInputElement).style, inputStyle)} />
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Size</label>
            <select value={form.size} onChange={e => upd('size', e.target.value)} className={cls} style={{ ...inputStyle, appearance: 'none' as const }}>
              <option>Small</option><option>Medium</option><option>Large</option><option>XL</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Date</label>
            <input type="date" value={form.date} onChange={e => upd('date', e.target.value)} className={cls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Time</label>
            <input type="time" value={form.time} onChange={e => upd('time', e.target.value)} className={cls} style={inputStyle} />
          </div>
        </div>
        <div>
          <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Notes</label>
          <textarea value={form.notes} onChange={e => upd('notes', e.target.value)}
            placeholder="Design notes, allergies, reference links…" rows={2}
            className={`${cls} resize-none`} style={inputStyle} />
        </div>
      </div>
      <div className="flex gap-3 px-6 pb-6">
        <button onClick={onClose} className="flex-1 py-2.5 text-[10px] font-bold tracking-widest uppercase text-white/30 transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
        <button onClick={onClose} className="flex-1 py-2.5 text-[10px] font-bold tracking-widest uppercase text-white hover:opacity-90 transition-opacity"
          style={{ background: PINK }}>
          Create Appointment →
        </button>
      </div>
    </ModalShell>
  );
}

function AddArtistModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', instagram: '', specialties: '', email: '', bio: '' });
  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const cls = "w-full text-white text-sm px-3 py-2.5 focus:outline-none placeholder:text-white/20";
  const bg = { background: 'rgba(255,255,255,0.06)' };
  return (
    <ModalShell title="Add Guest Artist" onClose={onClose}>
      <div className="px-6 py-6 space-y-4">
        <div>
          <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Full Name</label>
          <input value={form.name} onChange={e => upd('name', e.target.value)} placeholder="Artist name…" className={cls} style={bg} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Instagram</label>
            <input value={form.instagram} onChange={e => upd('instagram', e.target.value)} placeholder="@handle" className={cls} style={bg} />
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Email</label>
            <input value={form.email} onChange={e => upd('email', e.target.value)} placeholder="artist@…" className={cls} style={bg} />
          </div>
        </div>
        <div>
          <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Specialties (comma-separated)</label>
          <input value={form.specialties} onChange={e => upd('specialties', e.target.value)} placeholder="Fine Line, Blackwork…" className={cls} style={bg} />
        </div>
        <div>
          <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Bio</label>
          <textarea value={form.bio} onChange={e => upd('bio', e.target.value)}
            placeholder="Short artist bio…" rows={3} className={`${cls} resize-none`} style={bg} />
        </div>
      </div>
      <div className="flex gap-3 px-6 pb-6">
        <button onClick={onClose} className="flex-1 py-2.5 text-[10px] font-bold tracking-widest uppercase text-white/30"
          style={{ background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
        <button onClick={onClose} className="flex-1 py-2.5 text-[10px] font-bold tracking-widest uppercase text-white hover:opacity-90"
          style={{ background: PINK }}>
          Add Artist →
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Section Panels ───────────────────────────────────────────────────────────

function OverviewPanel({ appts, deposits, onCompleteAppt, onMarkPaid }: {
  appts: Appointment[]; deposits: Deposit[];
  onCompleteAppt: (id: string) => void;
  onMarkPaid: (id: string) => void;
}) {
  const [chartTab, setChartTab] = useState<'revenue' | 'sessions'>('revenue');
  const todayAppts = appts.filter(a => a.date === 'Jun 22');
  const upcomingAppts = appts.filter(a => a.date !== 'Jun 22' && a.status !== 'completed');
  const outstandingDeps = deposits.filter(d => d.status !== 'paid');
  const weekRevenue = 3420;

  return (
    <div className="space-y-12">
      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-8">
        {[
          { icon: <ClipboardDocumentListIcon className="w-5 h-5" />, label:"Today's Appointments", value: String(todayAppts.length),
            sub: `${todayAppts.filter(a=>a.status==='in-progress').length} in session · ${todayAppts.filter(a=>a.status==='upcoming').length} upcoming` },
          { icon: <CurrencyDollarIcon className="w-5 h-5" />, label:'This Week Revenue', value:'$3,420',
            sub:'↑ $570 vs last week' },
          { icon: <UserGroupIcon className="w-5 h-5" />, label:'Active Clients', value: String(CLIENTS.length),
            sub: '4 repeat this month' },
          { icon: <BanknotesIcon className="w-5 h-5" />, label:'Deposit Balance', value:`$${outstandingDeps.reduce((s,d)=>s+d.amount,0)}`,
            sub: `${outstandingDeps.length} pending · ${outstandingDeps.filter(d=>d.status==='overdue').length} overdue` },
        ].map(card => (
          <div key={card.label}>
            <div className="text-white/25 mb-2 sm:mb-3">{card.icon}</div>
            <div className="text-3xl sm:text-4xl font-black text-white tabular-nums mb-1">{card.value}</div>
            <div className="text-[9px] tracking-[0.2em] uppercase text-white/30">{card.label}</div>
            <div className="text-[10px] sm:text-[11px] text-white/20 mt-1 sm:mt-1.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Today + clock */}
      <div className="grid xl:grid-cols-3 gap-12">
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <SectionLabel eyebrow="Sunday Jun 22" title="Today's Schedule" />
          </div>
          <div className="space-y-1">
            {todayAppts.map(appt => (
              <div key={appt.id} className={cn('flex items-start gap-4 py-3 px-2 -mx-2 transition-colors', appt.status === 'in-progress' ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]')}>
                <div className="w-20 flex-shrink-0 pt-0.5">
                  <div className={cn('text-xs font-mono font-bold tabular-nums', appt.status === 'in-progress' ? 'text-[#E91E8C]' : 'text-white/35')}>{appt.time}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium">{appt.client}</span>
                    <StatusBadge status={appt.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-[11px] text-white/30">{appt.style} · {appt.placement} · {appt.size}</span>
                    <span className="text-[11px] text-white/20">w/ {appt.artist}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={`tel:${appt.phone}`} className="text-white/20 hover:text-white/50 transition-colors"><PhoneIcon className="w-4 h-4" /></a>
                  <span className="text-white/30 font-mono text-sm">${appt.total}</span>
                  {appt.status === 'in-progress' && (
                    <button onClick={() => onCompleteAppt(appt.id)}
                      className="text-[9px] tracking-widest uppercase font-bold px-2.5 py-1.5 transition-colors"
                      style={{ color: '#81c784', background: 'rgba(129,199,132,0.1)' }}>Done</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-8">
          <div>
            <div className="mb-3"><SectionLabel eyebrow="Current Time" title="Clock" /></div>
            <ClockWidget className="bg-transparent min-h-[200px]" />
          </div>
          <div>
            <div className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-4">Artist Status Today</div>
            <div className="space-y-4">
              {ARTISTS_DATA.map(a => (
                <div key={a.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 text-[10px] font-black"
                      style={{ background: `${PINK}18`, color: PINK }}>{a.initials}</div>
                    <div className="min-w-0">
                      <div className="text-white/65 text-xs truncate">{a.name.split('"')[0].trim()}</div>
                      <div className="text-white/20 text-[10px]">{a.specialties[0]}</div>
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div>
        <div className="flex items-center gap-4 mb-6">
          <SectionLabel eyebrow="Past 6 Weeks" title="Performance" />
          <div className="flex gap-1">
            {(['revenue','sessions'] as const).map(tab => (
              <button key={tab} onClick={() => setChartTab(tab)}
                className="text-[9px] tracking-widest uppercase font-bold px-3 py-1.5 transition-colors"
                style={{
                  background: chartTab === tab ? PINK : 'rgba(255,255,255,0.05)',
                  color: chartTab === tab ? '#ffffff' : 'rgba(255,255,255,0.4)',
                }}>{tab}</button>
            ))}
          </div>
        </div>
        <div className="grid xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <ResponsiveContainer width="100%" height={180}>
              {chartTab === 'revenue' ? (
                <AreaChart data={revenueTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="kCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PINK} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={PINK} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v}`, '']} />
                  <Area type="monotone" dataKey="collected" stroke={PINK} strokeWidth={2} fill="url(#kCollected)" name="Revenue" />
                  <Area type="monotone" dataKey="deposits" stroke={GOLD} strokeWidth={1.5} fill="none" strokeDasharray="4 2" name="Deposits" />
                </AreaChart>
              ) : (
                <BarChart data={apptsByWeek} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="sessions" fill={PINK} radius={[2,2,0,0]} name="Sessions" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            <div className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-4">Style Mix</div>
            {styleBreakdown.map(s => (
              <div key={s.name} className="flex items-center gap-3">
                <div className="w-2 h-2 flex-shrink-0 rounded-full" style={{ background: s.color }} />
                <div className="flex-1 text-[11px] text-white/50">{s.name}</div>
                <div className="text-[11px] text-white/40 font-mono">{s.value}%</div>
                <div className="w-16 h-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full" style={{ width: `${s.value}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming + calendar */}
      <div className="grid xl:grid-cols-3 gap-12">
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <SectionLabel eyebrow="Next 7 Days" title="Upcoming Appointments" />
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr>{['Date','Client','Artist','Style','Placement','Status'].map(h => (
                <th key={h} className="pb-3 text-left text-[9px] tracking-[0.25em] uppercase text-white/20 font-medium">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {upcomingAppts.slice(0,7).map((a, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 text-white/50 text-xs font-mono whitespace-nowrap pr-4">{a.date}</td>
                  <td className="py-2.5 text-white/70 text-xs pr-4">{a.client}</td>
                  <td className="py-2.5 text-white/40 text-xs pr-4">{a.artist}</td>
                  <td className="py-2.5 text-white/30 text-xs pr-4">{a.style}</td>
                  <td className="py-2.5 text-white/30 text-xs pr-4">{a.placement}</td>
                  <td className="py-2.5"><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div className="mb-3"><SectionLabel eyebrow="Booking Calendar" title="Schedule" /></div>
          <CalendarWidget interactive className="bg-transparent"
            dotsByDate={new Map([
              ['2026-06-22', { bookings: 3, events: 0, photos: 0, blocked: false }],
              ['2026-06-23', { bookings: 2, events: 0, photos: 0, blocked: false }],
              ['2026-06-24', { bookings: 2, events: 0, photos: 0, blocked: false }],
              ['2026-06-25', { bookings: 1, events: 0, photos: 0, blocked: false }],
              ['2026-06-26', { bookings: 1, events: 0, photos: 0, blocked: false }],
              ['2026-06-27', { bookings: 1, events: 0, photos: 0, blocked: false }],
              ['2026-06-28', { bookings: 0, events: 0, photos: 0, blocked: true  }],
              ['2026-06-29', { bookings: 3, events: 0, photos: 0, blocked: false }],
            ])}
          />
        </div>
      </div>

      {/* Outstanding deposits */}
      <div>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <SectionLabel eyebrow="Needs Attention" title="Outstanding Deposits" />
            <span className="text-[9px] font-bold px-2 py-0.5"
              style={{ color: '#ffb74d', background: 'rgba(255,183,77,0.1)' }}>
              ${outstandingDeps.reduce((s,d)=>s+d.amount,0)} owed
            </span>
          </div>
        </div>
        <div className="space-y-1">
          {outstandingDeps.map(dep => (
            <div key={dep.id} className="flex items-center gap-4 py-3 px-2 -mx-2 hover:bg-white/[0.02] transition-colors">
              <div className="w-24 flex-shrink-0">
                <span className="font-mono text-[10px] text-white/25">{dep.id}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white/70 text-sm">{dep.client}</div>
                <div className="text-white/25 text-[11px]">{dep.apptRef} · Appt {dep.apptDate}</div>
              </div>
              <AgingBadge days={dep.daysOut} />
              <div className="text-white/50 font-mono text-sm w-16 text-right">${dep.amount}</div>
              <StatusBadge status={dep.status} />
              <button onClick={() => onMarkPaid(dep.id)}
                className="text-[9px] tracking-widest uppercase font-bold px-2.5 py-1.5 transition-colors flex-shrink-0"
                style={{ color: PINK, background: `${PINK}15` }}>
                Mark Paid
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Panel ───────────────────────────────────────────────────────────

function SchedulePanel({ appts }: { appts: Appointment[] }) {
  const dates = [...new Set(appts.filter(a => a.status !== 'completed').map(a => a.date))].slice(0, 7);
  return (
    <div className="space-y-8">
      <PanelHeader title="Schedule" sub="7-day booking view across all artists" />
      <div className="grid xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-10">
          {dates.map(date => {
            const dayAppts = appts.filter(a => a.date === date && a.status !== 'completed');
            return (
              <div key={date}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-[9px] tracking-[0.3em] uppercase text-white/20">{date}</div>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <div className="text-[9px] text-white/20">{dayAppts.length} session{dayAppts.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="space-y-1">
                  {dayAppts.map(a => (
                    <div key={a.id} className="flex items-center gap-4 py-2.5 px-3 transition-colors"
                      style={{ background: a.status === 'in-progress' ? `${PINK}0d` : 'rgba(255,255,255,0.02)' }}>
                      <div className="w-20 flex-shrink-0">
                        <div className="text-xs font-mono font-bold" style={{ color: a.status === 'in-progress' ? PINK : 'rgba(255,255,255,0.4)' }}>{a.time}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-white/80">{a.client}</span>
                          <StatusBadge status={a.status} />
                        </div>
                        <div className="text-[11px] text-white/30 mt-0.5">{a.style} · {a.placement} · {a.size} · w/ {a.artist}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-mono text-white/40">${a.total}</div>
                        <div className="text-[10px] text-white/20">{a.deposit > 0 ? `$${a.deposit} dep` : 'no dep'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="space-y-6">
          <CalendarWidget interactive className="bg-transparent"
            dotsByDate={new Map([
              ['2026-06-22', { bookings: 3, events: 0, photos: 0, blocked: false }],
              ['2026-06-23', { bookings: 2, events: 0, photos: 0, blocked: false }],
              ['2026-06-24', { bookings: 2, events: 0, photos: 0, blocked: false }],
              ['2026-06-25', { bookings: 1, events: 0, photos: 0, blocked: false }],
              ['2026-06-26', { bookings: 1, events: 0, photos: 0, blocked: false }],
              ['2026-06-27', { bookings: 1, events: 0, photos: 0, blocked: false }],
              ['2026-06-28', { bookings: 0, events: 0, photos: 0, blocked: true  }],
            ])}
          />
          <div>
            <div className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-4">Busiest Days</div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={busyDays} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="appts" fill={PINK} radius={[2,2,0,0]} name="Appts" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Appointments Panel ───────────────────────────────────────────────────────

function AppointmentsPanel({ appts, onComplete }: { appts: Appointment[]; onComplete: (id: string) => void }) {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const filters = ['all', 'in-progress', 'upcoming', 'confirmed', 'pending', 'completed'];
  const visible = appts
    .filter(a => filter === 'all' || a.status === filter)
    .filter(a => !search || a.client.toLowerCase().includes(search.toLowerCase()) || a.style.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <PanelHeader title="Appointments" sub={`${appts.length} total · ${appts.filter(a=>a.status==='completed').length} completed`} />
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 flex-1 max-w-xs" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <MagnifyingGlassIcon className="w-4 h-4 text-white/25" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client or style…"
            className="bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none flex-1" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="text-[9px] tracking-widest uppercase font-bold px-3 py-1.5 transition-colors"
              style={{
                background: filter === f ? PINK : 'rgba(255,255,255,0.05)',
                color: filter === f ? '#ffffff' : 'rgba(255,255,255,0.4)',
              }}>{f.replace('-', ' ')}</button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr>{['ID','Date','Time','Client','Artist','Style','Placement','Size','Deposit','Total','Status',''].map(h => (
              <th key={h} className="pb-3 text-left text-[9px] tracking-[0.2em] uppercase text-white/20 font-medium pr-3">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {visible.map(a => (
              <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-2 text-white/20 text-[10px] font-mono pr-3">{a.id}</td>
                <td className="py-2 text-white/50 text-xs font-mono pr-3 whitespace-nowrap">{a.date}</td>
                <td className="py-2 text-white/40 text-xs font-mono pr-3 whitespace-nowrap">{a.time}</td>
                <td className="py-2 text-white/80 text-xs pr-3 font-medium">{a.client}</td>
                <td className="py-2 text-white/40 text-xs pr-3">{a.artist}</td>
                <td className="py-2 text-white/40 text-xs pr-3">{a.style}</td>
                <td className="py-2 text-white/30 text-xs pr-3">{a.placement}</td>
                <td className="py-2 text-white/30 text-xs pr-3">{a.size}</td>
                <td className="py-2 text-white/30 text-xs font-mono pr-3">{a.deposit > 0 ? `$${a.deposit}` : '—'}</td>
                <td className="py-2 text-white/50 text-xs font-mono pr-3">${a.total}</td>
                <td className="py-2 pr-3"><StatusBadge status={a.status} /></td>
                <td className="py-2">
                  {(a.status === 'in-progress' || a.status === 'upcoming') && (
                    <button onClick={() => onComplete(a.id)}
                      className="text-[9px] tracking-widest uppercase font-bold px-2 py-1 transition-colors whitespace-nowrap"
                      style={{ color: '#81c784', background: 'rgba(129,199,132,0.08)' }}>Done</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="sm:hidden space-y-2">
        {visible.map(a => (
          <div key={a.id} className="p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="text-white font-medium text-sm">{a.client}</div>
                <div className="text-white/30 text-[11px] mt-0.5">{a.date} · {a.time} · {a.artist}</div>
              </div>
              <StatusBadge status={a.status} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-white/30">{a.style}</span>
              <span className="text-[10px] text-white/20">{a.placement}</span>
              <span className="text-[10px] font-mono text-white/40 ml-auto">${a.total}</span>
            </div>
          </div>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="text-center py-12 text-white/20 text-sm uppercase tracking-widest">No appointments match</div>
      )}
    </div>
  );
}

// ─── Artists Panel ────────────────────────────────────────────────────────────

function ArtistsPanel({ onAddArtist }: { onAddArtist: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const artist = selected ? ARTISTS_DATA.find(a => a.id === selected) : null;

  return (
    <div className="space-y-6">
      <PanelHeader title="Artists" sub="Manage your roster and guest artist slots"
        action={
          <button onClick={onAddArtist} className="flex items-center gap-2 px-5 py-2.5 text-[10px] font-bold tracking-widest uppercase text-white hover:opacity-90 transition-opacity"
            style={{ background: PINK }}>
            <PlusIcon className="w-4 h-4" /> Add Guest Artist
          </button>
        }
      />

      <div className="grid sm:grid-cols-3 gap-6 mb-8">
        {[
          { label:'Total Artists', value: String(ARTISTS_DATA.length), sub:'1 owner · 2 guest' },
          { label:'Sessions This Month', value: String(ARTISTS_DATA.reduce((s,a)=>s+a.sessionsMonth,0)), sub:'across all artists' },
          { label:'Monthly Revenue', value:`$${ARTISTS_DATA.reduce((s,a)=>s+a.revenueMonth,0).toLocaleString()}`, sub:'combined billings' },
        ].map(c => (
          <div key={c.label} className="p-5" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="text-2xl font-black text-white tabular-nums mb-1">{c.value}</div>
            <div className="text-[9px] tracking-[0.2em] uppercase text-white/30">{c.label}</div>
            <div className="text-[10px] text-white/20 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {ARTISTS_DATA.map(a => (
          <button key={a.id} onClick={() => setSelected(selected === a.id ? null : a.id)}
            className="text-left p-5 transition-colors"
            style={{ background: selected === a.id ? `${PINK}0d` : 'rgba(255,255,255,0.03)' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 flex items-center justify-center font-black text-base"
                style={{ background: `${PINK}18`, color: PINK }}>{a.initials}</div>
              <StatusBadge status={a.status} />
            </div>
            <div className="font-bold text-white text-sm mb-0.5">{a.name}</div>
            <div className="text-[10px] tracking-widest uppercase mb-3" style={{ color: PINK }}>{a.role}</div>
            <p className="text-[11px] text-white/40 leading-relaxed mb-4">{a.bio}</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {a.specialties.map(s => (
                <span key={s} className="text-[8px] tracking-[0.15em] uppercase px-2 py-1 font-medium"
                  style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)' }}>{s}</span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {[
                { label:'Sessions', value: String(a.sessionsMonth) },
                { label:'Revenue', value:`$${a.revenueMonth.toLocaleString()}` },
                { label:'Booking Rate', value:`${a.bookingRate}%` },
                { label:'Rating', value:`${a.rating} / 5` },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-[8px] tracking-widest uppercase text-white/20">{s.label}</div>
                  <div className="text-sm font-bold text-white/60 mt-0.5">{s.value}</div>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      {artist && (
        <div className="p-6 mt-4" style={{ background: `${PINK}08` }}>
          <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
            <div>
              <div className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-1">Artist Detail</div>
              <div className="text-white font-black text-lg uppercase tracking-wider">{artist.name}</div>
              <div className="text-[11px] mt-1" style={{ color: PINK }}>{artist.instagram} · Next available: {artist.nextAvail}</div>
            </div>
            <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white transition-colors">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="grid sm:grid-cols-4 gap-6">
            {[
              { label:'Sessions This Month', value: String(artist.sessionsMonth) },
              { label:'Monthly Revenue', value:`$${artist.revenueMonth.toLocaleString()}` },
              { label:'Booking Rate', value:`${artist.bookingRate}%` },
              { label:'Avg Rating', value:`${artist.rating} / 5.0` },
            ].map(s => (
              <div key={s.label}>
                <div className="text-[8px] tracking-widest uppercase text-white/20 mb-1">{s.label}</div>
                <div className="text-2xl font-black text-white">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Clients Panel ────────────────────────────────────────────────────────────

function ClientsPanel() {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const visible = CLIENTS.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.favStyle.toLowerCase().includes(search.toLowerCase())
  );
  const client = selected ? CLIENTS.find(c => c.name === selected) : null;

  return (
    <div className="space-y-6">
      <PanelHeader title="Clients" sub={`${CLIENTS.length} active clients · ${CLIENTS.reduce((s,c)=>s+c.sessions,0)} total sessions`} />
      <div className="flex items-center gap-2 px-3 py-2 max-w-xs" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <MagnifyingGlassIcon className="w-4 h-4 text-white/25" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…"
          className="bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none flex-1" />
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <table className="w-full text-sm">
            <thead>
              <tr>{['Client','Sessions','Last Visit','Lifetime $','Fav Style','Artist',''].map(h => (
                <th key={h} className="pb-3 text-left text-[9px] tracking-[0.2em] uppercase text-white/20 font-medium pr-4">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {visible.map(c => (
                <tr key={c.name} className={cn('hover:bg-white/[0.02] transition-colors cursor-pointer', selected === c.name ? 'bg-white/[0.03]' : '')}
                  onClick={() => setSelected(selected === c.name ? null : c.name)}>
                  <td className="py-2.5 pr-4">
                    <div className="text-white/80 text-sm font-medium">{c.name}</div>
                    <div className="text-white/25 text-[10px]">{c.instagram}</div>
                  </td>
                  <td className="py-2.5 text-white/50 text-xs font-mono pr-4">{c.sessions}</td>
                  <td className="py-2.5 text-white/40 text-xs pr-4">{c.lastVisit}</td>
                  <td className="py-2.5 text-white/50 text-xs font-mono pr-4">${c.spend}</td>
                  <td className="py-2.5 text-white/30 text-xs pr-4">{c.favStyle}</td>
                  <td className="py-2.5 text-white/30 text-xs pr-4">{c.preferredArtist}</td>
                  <td className="py-2.5">
                    <ArrowRightIcon className="w-3 h-3 text-white/20" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          {client ? (
            <div className="p-5" style={{ background: `${PINK}08` }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-white font-black text-base">{client.name}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: PINK }}>{client.instagram}</div>
                </div>
                <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white transition-colors">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 mb-5">
                {[
                  { icon: <PhoneIcon className="w-3.5 h-3.5" />, text: client.phone },
                  { icon: <EnvelopeIcon className="w-3.5 h-3.5" />, text: client.email },
                  { icon: <ClockIcon className="w-3.5 h-3.5" />, text: `Client since ${client.since}` },
                ].map(row => (
                  <div key={row.text} className="flex items-center gap-2 text-[11px] text-white/40">
                    <span className="text-white/20">{row.icon}</span>
                    {row.text}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 mb-5">
                {[
                  { label:'Sessions', value: String(client.sessions) },
                  { label:'Lifetime', value:`$${client.spend}` },
                  { label:'Fav Style', value: client.favStyle },
                  { label:'Artist', value: client.preferredArtist },
                ].map(s => (
                  <div key={s.label}>
                    <div className="text-[8px] tracking-widest uppercase text-white/20 mb-0.5">{s.label}</div>
                    <div className="text-sm font-bold text-white/70">{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-[8px] tracking-widest uppercase text-white/20 mb-2">Artist Notes</div>
                <p className="text-[11px] text-white/45 leading-relaxed">{client.note}</p>
              </div>
            </div>
          ) : (
            <div className="p-5 text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <UserGroupIcon className="w-8 h-8 text-white/10 mx-auto mb-3" />
              <div className="text-[10px] tracking-widest uppercase text-white/20">Select a client to view details</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Deposits Panel ───────────────────────────────────────────────────────────

function DepositsPanel({ deposits, onMarkPaid }: { deposits: Deposit[]; onMarkPaid: (id: string) => void }) {
  const outstanding = deposits.filter(d => d.status !== 'paid');
  const paid = deposits.filter(d => d.status === 'paid');

  return (
    <div className="space-y-10">
      <PanelHeader title="Deposits & Invoices" sub="Track deposits against upcoming appointments" />

      <div className="grid sm:grid-cols-3 gap-6">
        {[
          { label:'Outstanding', value:`$${outstanding.reduce((s,d)=>s+d.amount,0)}`, sub:`${outstanding.length} pending`, color:'#ffb74d' },
          { label:'Overdue', value:`$${deposits.filter(d=>d.status==='overdue').reduce((s,d)=>s+d.amount,0)}`, sub:`${deposits.filter(d=>d.status==='overdue').length} past due`, color:'#ef9a9a' },
          { label:'Collected (Month)', value:`$${paid.reduce((s,d)=>s+d.amount,0)}`, sub:`${paid.length} deposits received`, color:'#81c784' },
        ].map(c => (
          <div key={c.label} className="p-5" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="text-2xl font-black mb-1" style={{ color: c.color }}>{c.value}</div>
            <div className="text-[9px] tracking-[0.2em] uppercase text-white/30">{c.label}</div>
            <div className="text-[10px] text-white/20 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-8">
          {outstanding.length > 0 && (
            <div>
              <div className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-4">Awaiting Payment</div>
              <div className="space-y-1">
                {outstanding.map(dep => (
                  <div key={dep.id} className="flex items-center gap-4 py-3 px-3 transition-colors"
                    style={{ background: dep.status === 'overdue' ? 'rgba(239,154,154,0.05)' : 'rgba(255,255,255,0.02)' }}>
                    <span className="font-mono text-[10px] text-white/20 w-24 flex-shrink-0">{dep.id}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white/70">{dep.client}</div>
                      <div className="text-[11px] text-white/30">{dep.apptRef} · Appt {dep.apptDate}</div>
                    </div>
                    <AgingBadge days={dep.daysOut} />
                    <span className="font-mono text-sm text-white/50 w-12 text-right">${dep.amount}</span>
                    <StatusBadge status={dep.status} />
                    <button onClick={() => onMarkPaid(dep.id)}
                      className="text-[9px] tracking-widest uppercase font-bold px-3 py-1.5 flex-shrink-0 hover:opacity-80 transition-opacity"
                      style={{ color: '#ffffff', background: PINK }}>
                      Paid
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-4">Received</div>
            <table className="w-full text-sm">
              <thead>
                <tr>{['ID','Client','Appt','Amount','Paid On',''].map(h => (
                  <th key={h} className="pb-3 text-left text-[9px] tracking-[0.2em] uppercase text-white/20 font-medium pr-4">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {paid.map(d => (
                  <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2 font-mono text-[10px] text-white/20 pr-4">{d.id}</td>
                    <td className="py-2 text-xs text-white/60 pr-4">{d.client}</td>
                    <td className="py-2 text-xs text-white/30 font-mono pr-4">{d.apptRef}</td>
                    <td className="py-2 text-xs font-mono text-white/50 pr-4">${d.amount}</td>
                    <td className="py-2 text-xs text-white/30 pr-4">{d.paidDate}</td>
                    <td className="py-2"><StatusBadge status="paid" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-4">Deposit Aging</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={depositAging} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <XAxis dataKey="bracket" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v}`, '']} />
                <Bar dataKey="amount" fill={GOLD} radius={[2,2,0,0]} name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="p-4" style={{ background: `${PINK}0a` }}>
            <div className="text-[9px] tracking-[0.3em] uppercase mb-2" style={{ color: PINK }}>Deposit Policy</div>
            <p className="text-[11px] text-white/40 leading-relaxed">
              30% of estimated session total. Non-refundable. Required to hold all bookings. Payment collected via Square or Venmo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Portfolio Panel ──────────────────────────────────────────────────────────

function PortfolioPanel() {
  const [activeStyle, setActiveStyle] = useState('All');
  const styles = ['All', 'Fine Line', 'Blackwork', 'Traditional', 'Color Realism', 'Illustrative', 'Cover-Up'];
  const counts: Record<string, number> = {
    'Fine Line': 22, 'Blackwork': 15, 'Traditional': 11,
    'Color Realism': 9, 'Illustrative': 7, 'Cover-Up': 6,
  };
  const totalPieces = Object.values(counts).reduce((s, v) => s + v, 0);

  const pieces = Array.from({ length: 18 }).map((_, i) => ({
    id: i,
    style: styles.slice(1)[i % 6],
    artist: ['Kat', 'Marco', 'Sofia'][i % 3],
    date: `Jun ${1 + (i % 20)}, 2026`,
    featured: i < 3,
  }));

  const visible = activeStyle === 'All' ? pieces : pieces.filter(p => p.style === activeStyle);

  return (
    <div className="space-y-6">
      <PanelHeader title="Portfolio" sub={`${totalPieces} pieces · client photo gallery`}
        action={
          <button className="flex items-center gap-2 px-5 py-2.5 text-[10px] font-bold tracking-widest uppercase text-white hover:opacity-90 transition-opacity"
            style={{ background: PINK }}>
            <PlusIcon className="w-4 h-4" /> Upload Photos
          </button>
        }
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {[
          { label:'Total Pieces', value: String(totalPieces) },
          { label:'This Month', value: '8' },
          { label:'Most Photographed', value: 'Fine Line' },
        ].map(c => (
          <div key={c.label} className="p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="text-xl font-black text-white mb-1">{c.value}</div>
            <div className="text-[9px] tracking-widest uppercase text-white/25">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {styles.map(s => (
          <button key={s} onClick={() => setActiveStyle(s)}
            className="text-[9px] tracking-widest uppercase font-bold px-3 py-1.5 transition-colors"
            style={{
              background: activeStyle === s ? PINK : 'rgba(255,255,255,0.05)',
              color: activeStyle === s ? '#ffffff' : 'rgba(255,255,255,0.4)',
            }}>
            {s} {s !== 'All' ? `(${counts[s]})` : `(${totalPieces})`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {visible.map(p => (
          <div key={p.id} className="aspect-square relative group cursor-pointer"
            style={{ background: `${PINK}${p.featured ? '18' : '0a'}` }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <PaintBrushIcon className="w-6 h-6" style={{ color: p.featured ? PINK : 'rgba(255,255,255,0.1)' }} />
              <div className="text-[8px] tracking-widest uppercase" style={{ color: p.featured ? PINK : 'rgba(255,255,255,0.2)' }}>{p.style}</div>
            </div>
            <div className="absolute inset-0 flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.6)' }}>
              <div>
                <div className="text-[9px] text-white/60">{p.artist}</div>
                <div className="text-[8px] text-white/30">{p.date}</div>
              </div>
            </div>
            {p.featured && (
              <div className="absolute top-1 right-1">
                <StarIcon className="w-3 h-3" style={{ color: GOLD }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="text-center pt-4 text-[10px] tracking-widest uppercase text-white/20">
        Connect your Instagram to auto-sync portfolio photos
      </div>
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────

function SettingsPanel() {
  const [hours, setHours] = useState({
    monday:    'Closed',
    tuesday:   '11:00 AM – 7:00 PM',
    wednesday: '11:00 AM – 7:00 PM',
    thursday:  '11:00 AM – 7:00 PM',
    friday:    '11:00 AM – 7:00 PM',
    saturday:  '10:00 AM – 6:00 PM',
    sunday:    'Closed',
  });
  const [saved, setSaved] = useState(false);
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div className="space-y-10">
      <PanelHeader title="Settings" sub="Business profile and booking preferences" />

      <div className="grid xl:grid-cols-2 gap-10">
        {/* Business Info */}
        <div className="space-y-6">
          <div className="text-[9px] tracking-[0.3em] uppercase text-white/20 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            Business Profile
          </div>
          {[
            { label:'Business Name', value:'Kattitude Tattoo Studio', type:'text' },
            { label:'Owner / Lead Artist', value:'Katherine "Kat" Herrera', type:'text' },
            { label:'Instagram Handle', value:'@kattitudetattoo', type:'text' },
            { label:'Email', value:'kat@kattitudestudio.com', type:'email' },
            { label:'Phone', value:'(512) 555-0420', type:'tel' },
            { label:'Location', value:'East Austin, TX', type:'text' },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1.5">{f.label}</label>
              <input type={f.type} defaultValue={f.value}
                className="w-full text-sm text-white px-3 py-2.5 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)' }} />
            </div>
          ))}
        </div>

        <div className="space-y-8">
          {/* Hours */}
          <div>
            <div className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-4 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              Business Hours
            </div>
            <div className="space-y-2">
              {Object.entries(hours).map(([day, val]) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-[10px] tracking-widest uppercase text-white/40 w-20 flex-shrink-0 capitalize">{day}</span>
                  <input value={val} onChange={e => setHours(h => ({ ...h, [day]: e.target.value }))}
                    className="flex-1 text-xs text-white px-3 py-2 focus:outline-none"
                    style={{ background: val === 'Closed' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                      color: val === 'Closed' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Booking Policy */}
          <div>
            <div className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-4 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              Booking Policy
            </div>
            <div className="space-y-4">
              {[
                { label:'Deposit Required', value:'30% of estimated total' },
                { label:'Deposit Policy', value:'Non-refundable' },
                { label:'Booking Lead Time', value:'Minimum 48 hours' },
                { label:'Cancellation Window', value:'24 hours notice required' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1.5">{f.label}</label>
                  <input defaultValue={f.value} className="w-full text-sm text-white px-3 py-2.5 focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={save}
          className="px-8 py-3 text-[10px] font-black tracking-widest uppercase text-white hover:opacity-90 transition-opacity"
          style={{ background: PINK }}>
          Save Changes
        </button>
        {saved && (
          <div className="flex items-center gap-2 text-[10px] tracking-widest uppercase" style={{ color: '#81c784' }}>
            <CheckCircleIcon className="w-4 h-4" /> Saved
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ section, onNav, onNewAppt, mobile, onClose }: {
  section: Section; onNav: (s: Section) => void; onNewAppt: () => void;
  mobile?: boolean; onClose?: () => void;
}) {
  const navItems: { id: Section; icon: React.ElementType; label: string }[] = [
    { id: 'overview',     icon: HomeIcon,                   label: 'Overview'      },
    { id: 'schedule',     icon: CalendarDaysIcon,            label: 'Schedule'      },
    { id: 'appointments', icon: ClipboardDocumentListIcon,   label: 'Appointments'  },
    { id: 'artists',      icon: PaintBrushIcon,              label: 'Artists'       },
    { id: 'clients',      icon: UserGroupIcon,               label: 'Clients'       },
    { id: 'deposits',     icon: BanknotesIcon,               label: 'Deposits'      },
    { id: 'portfolio',    icon: PhotoIcon,                   label: 'Portfolio'     },
    { id: 'settings',     icon: Cog6ToothIcon,               label: 'Settings'      },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a0a0a' }}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <img src={BEE} alt="Kattitude" className="w-8 h-8 object-contain rounded-full" />
          <div>
            <div className="font-black text-sm tracking-widest uppercase leading-none text-white">Kattitude</div>
            <div className="text-[9px] tracking-[0.2em] uppercase leading-none mt-0.5" style={{ color: PINK }}>Studio Admin</div>
          </div>
        </div>
        {mobile && onClose && (
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* New Appointment CTA */}
      <div className="px-3 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <button onClick={onNewAppt} className="w-full flex items-center justify-center gap-2 py-2.5 text-[10px] font-black tracking-widest uppercase text-white hover:opacity-90 transition-opacity"
          style={{ background: PINK }}>
          <PlusIcon className="w-4 h-4" /> New Appointment
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const active = section === item.id;
          return (
            <button key={item.id} onClick={() => { onNav(item.id); onClose?.(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
              style={{
                background: active ? `${PINK}18` : 'transparent',
                color: active ? '#ffffff' : 'rgba(255,255,255,0.35)',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'; }}>
              <item.icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? PINK : undefined }} />
              <span className="text-xs font-bold tracking-wider uppercase">{item.label}</span>
              {active && <div className="ml-auto w-1 h-4" style={{ background: PINK }} />}
            </button>
          );
        })}
      </nav>

      {/* Artist indicator */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 flex items-center justify-center text-[10px] font-black" style={{ background: `${PINK}18`, color: PINK }}>KH</div>
          <div>
            <div className="text-xs font-bold text-white/70">Kat Herrera</div>
            <div className="text-[9px] text-white/25">Owner · Active</div>
          </div>
          <div className="ml-auto w-2 h-2 rounded-full" style={{ background: '#81c784' }} />
        </div>
      </div>
    </div>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

function Topbar({ section, onMenuOpen, onNewAppt }: { section: Section; onMenuOpen: () => void; onNewAppt: () => void }) {
  const labels: Record<Section, string> = {
    overview:'Overview', schedule:'Schedule', appointments:'Appointments',
    artists:'Artists', clients:'Clients', deposits:'Deposits & Invoices',
    portfolio:'Portfolio', settings:'Settings',
  };
  return (
    <div className="flex items-center justify-between px-4 sm:px-6 h-14 flex-shrink-0"
      style={{ background: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-3">
        <button onClick={onMenuOpen} className="lg:hidden text-white/40 hover:text-white transition-colors mr-1">
          <Bars3Icon className="w-5 h-5" />
        </button>
        <div className="text-xs font-bold tracking-widest uppercase text-white/50">
          {labels[section]}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] tracking-wider" style={{ color: PINK }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: PINK }} />
          Live Demo
        </div>
        <button className="relative text-white/30 hover:text-white transition-colors">
          <BellIcon className="w-5 h-5" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: PINK }} />
        </button>
        <button onClick={onNewAppt} className="hidden sm:flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-black tracking-widest uppercase text-white hover:opacity-90 transition-opacity"
          style={{ background: PINK }}>
          <PlusIcon className="w-3.5 h-3.5" /> New Appt
        </button>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function KattitudeDashboard() {
  const [section, setSection] = useState<Section>('overview');
  const [modal, setModal] = useState<ModalType>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [appts, setAppts] = useState<Appointment[]>(ALL_APPTS_INIT);
  const [deposits, setDeposits] = useState<Deposit[]>(ALL_DEPOSITS_INIT);

  const handleCompleteAppt = (id: string) => {
    setAppts(prev => prev.map(a => a.id === id ? { ...a, status: 'completed' } : a));
  };
  const handleMarkPaid = (id: string) => {
    setDeposits(prev => prev.map(d => d.id === id ? { ...d, status: 'paid', paidDate: 'Jun 22' } : d));
  };

  return (
    <div className="h-screen flex overflow-hidden font-sans" style={{ background: '#0a0a0a', color: '#ffffff' }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-56 flex-shrink-0" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <Sidebar section={section} onNav={setSection} onNewAppt={() => setModal('create-appointment')} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">
            <Sidebar section={section} onNav={setSection} onNewAppt={() => { setModal('create-appointment'); setSidebarOpen(false); }}
              mobile onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar section={section} onMenuOpen={() => setSidebarOpen(true)} onNewAppt={() => setModal('create-appointment')} />

        <div className="flex-1 overflow-y-auto" style={{ background: '#0a0a0a' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            {section === 'overview' && (
              <OverviewPanel appts={appts} deposits={deposits}
                onCompleteAppt={handleCompleteAppt} onMarkPaid={handleMarkPaid} />
            )}
            {section === 'schedule' && <SchedulePanel appts={appts} />}
            {section === 'appointments' && (
              <AppointmentsPanel appts={appts} onComplete={handleCompleteAppt} />
            )}
            {section === 'artists' && <ArtistsPanel onAddArtist={() => setModal('add-artist')} />}
            {section === 'clients' && <ClientsPanel />}
            {section === 'deposits' && <DepositsPanel deposits={deposits} onMarkPaid={handleMarkPaid} />}
            {section === 'portfolio' && <PortfolioPanel />}
            {section === 'settings' && <SettingsPanel />}
          </div>
          <ConsoleTray onNav={setSection} activeSection={section} />
        </div>
      </div>

      {/* Modals */}
      {modal === 'create-appointment' && <CreateAppointmentModal onClose={() => setModal(null)} />}
      {modal === 'add-artist' && <AddArtistModal onClose={() => setModal(null)} />}
    </div>
  );
}
