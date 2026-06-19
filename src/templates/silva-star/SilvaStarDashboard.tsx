import { useState, useEffect, useRef } from 'react';
import {
  TruckIcon, CalendarDaysIcon, CurrencyDollarIcon, UserGroupIcon,
  ClockIcon, CheckCircleIcon, ArrowTrendingUpIcon, BeakerIcon,
  Bars3Icon, XMarkIcon, MapPinIcon, BellIcon, ChevronDownIcon,
  ArrowRightIcon, DocumentTextIcon, Cog6ToothIcon, HomeIcon,
  ClipboardDocumentListIcon, PlusIcon, ExclamationTriangleIcon,
  WrenchScrewdriverIcon, PhoneIcon, EnvelopeIcon, NewspaperIcon,
  ChartBarIcon, GiftIcon, BanknotesIcon, MagnifyingGlassIcon,
  CheckIcon, StarIcon, LinkIcon, BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { CalendarWidget } from '@/components/ui/calendar-widget';
import { ClockWidget } from '@/components/ui/clock-widget';
import { cn } from '@/components/ui/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = 'overview' | 'schedule' | 'jobs' | 'customers' | 'invoices' | 'fleet' | 'affiliates' | 'settings' | 'webmail' | 'newsletter';
type ModalType = 'create-job' | 'invoice' | 'complete' | null;

interface Job {
  id: string; date: string; time: string; customer: string;
  location: string; type: string; status: string; amount: number; phone: string;
}
interface Invoice {
  id: string; customer: string; amount: number; daysOut: number;
  jobDate: string; status: string; paidDate?: string;
}
interface Truck {
  id: string; name: string; capacity: string; status: string;
  nextService: string; mileage: string; alert: string | null;
  year: number; make: string; model: string; lastService: string;
  serviceLog: { date: string; type: string; mileage: string; cost: number }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ICY = '#4fc3f7';
const tooltipStyle = { backgroundColor: '#1a1a2e', border: 'none', borderRadius: 0, color: '#fff', fontSize: 11 };

// ─── Mock Data ────────────────────────────────────────────────────────────────

const ALL_JOBS_INIT: Job[] = [
  { id: 'JOB-0041', date: 'Jun 18', time: '7:30 AM',  customer: 'La Paloma Tacos',      location: '1300 E 6th St',        type: 'Grey Water', status: 'in-progress', amount: 85,   phone: '(512) 555-0101' },
  { id: 'JOB-0042', date: 'Jun 18', time: '9:30 AM',  customer: 'Rolling Smoke BBQ',    location: '4303 S Congress Ave',  type: 'Grey Water', status: 'upcoming',    amount: 95,   phone: '(512) 555-0132' },
  { id: 'JOB-0043', date: 'Jun 18', time: '11:00 AM', customer: 'Seoul Taco',            location: '801 Red River St',     type: 'Grey Water', status: 'upcoming',    amount: 85,   phone: '(512) 555-0188' },
  { id: 'JOB-0044', date: 'Jun 18', time: '1:00 PM',  customer: 'Voodoo Doughnut Cart',  location: 'Rainey St Corridor',  type: 'Grease',     status: 'upcoming',    amount: 130,  phone: '(512) 555-0109' },
  { id: 'JOB-0045', date: 'Jun 18', time: '3:00 PM',  customer: 'East Side King',        location: '1600 E 6th St',       type: 'Grey Water', status: 'upcoming',    amount: 85,   phone: '(512) 555-0174' },
  { id: 'JOB-0046', date: 'Jun 19', time: '8:00 AM',  customer: 'Green Sprout Kitchen',  location: 'SoCo District',       type: 'Grey Water', status: 'confirmed',   amount: 85,   phone: '(512) 555-0211' },
  { id: 'JOB-0047', date: 'Jun 19', time: '10:00 AM', customer: 'Austin Flea Market',    location: 'Burnet Rd',           type: 'Event',      status: 'confirmed',   amount: 640,  phone: '(512) 555-0302' },
  { id: 'JOB-0048', date: 'Jun 20', time: '9:00 AM',  customer: 'ATX Burger Co.',        location: 'East Austin',         type: 'Grease',     status: 'confirmed',   amount: 140,  phone: '(512) 555-0141' },
  { id: 'JOB-0049', date: 'Jun 20', time: '2:00 PM',  customer: 'Ramen Nation',          location: 'Domain Northside',    type: 'Grey Water', status: 'pending',     amount: 85,   phone: '(512) 555-0287' },
  { id: 'JOB-0050', date: 'Jun 21', time: '8:00 AM',  customer: 'Barton Springs Fest',   location: 'Barton Springs Rd',  type: 'Event',      status: 'confirmed',   amount: 1120, phone: '(512) 555-0401' },
  { id: 'JOB-0040', date: 'Jun 17', time: '2:00 PM',  customer: 'Barton Springs Fest',   location: 'Barton Springs Rd',  type: 'Event',      status: 'completed',   amount: 720,  phone: '(512) 555-0401' },
  { id: 'JOB-0039', date: 'Jun 17', time: '10:00 AM', customer: 'La Paloma Tacos',       location: '1300 E 6th St',       type: 'Grey Water', status: 'completed',   amount: 85,   phone: '(512) 555-0101' },
  { id: 'JOB-0038', date: 'Jun 17', time: '8:00 AM',  customer: 'Seoul Taco',            location: '801 Red River St',    type: 'Grey Water', status: 'completed',   amount: 85,   phone: '(512) 555-0188' },
  { id: 'JOB-0037', date: 'Jun 16', time: '11:00 AM', customer: 'Rolling Smoke BBQ',     location: '4303 S Congress Ave', type: 'Grey Water', status: 'completed',   amount: 95,   phone: '(512) 555-0132' },
  { id: 'JOB-0036', date: 'Jun 16', time: '9:00 AM',  customer: 'East Side King',        location: '1600 E 6th St',       type: 'Grey Water', status: 'completed',   amount: 85,   phone: '(512) 555-0174' },
  { id: 'JOB-0035', date: 'Jun 15', time: '1:00 PM',  customer: 'Garden State Truck',    location: '2nd St District',     type: 'Grey Water', status: 'completed',   amount: 85,   phone: '(512) 555-0199' },
  { id: 'JOB-0034', date: 'Jun 15', time: '9:00 AM',  customer: 'Green Sprout Kitchen',  location: 'SoCo District',       type: 'Grey Water', status: 'completed',   amount: 85,   phone: '(512) 555-0211' },
  { id: 'JOB-0033', date: 'Jun 14', time: '2:00 PM',  customer: 'La Paloma Tacos',       location: '1300 E 6th St',       type: 'Grey Water', status: 'completed',   amount: 85,   phone: '(512) 555-0101' },
  { id: 'JOB-0032', date: 'Jun 13', time: '10:00 AM', customer: 'East Side King',        location: '1600 E 6th St',       type: 'Grey Water', status: 'completed',   amount: 85,   phone: '(512) 555-0174' },
  { id: 'JOB-0031', date: 'Jun 13', time: '8:00 AM',  customer: 'Seoul Taco',            location: '801 Red River St',    type: 'Grey Water', status: 'completed',   amount: 85,   phone: '(512) 555-0188' },
];

const ALL_INVOICES_INIT: Invoice[] = [
  { id: 'INV-0088', customer: 'ATX Burger Co.',       amount: 140, daysOut: 31, jobDate: 'May 18', status: 'overdue'     },
  { id: 'INV-0094', customer: 'Rolling Smoke BBQ',    amount: 95,  daysOut: 17, jobDate: 'Jun 1',  status: 'outstanding' },
  { id: 'INV-0101', customer: 'Ramen Nation',         amount: 85,  daysOut: 9,  jobDate: 'Jun 9',  status: 'outstanding' },
  { id: 'INV-0105', customer: 'Garden State Truck',   amount: 85,  daysOut: 4,  jobDate: 'Jun 14', status: 'outstanding' },
  { id: 'INV-0107', customer: 'Barton Springs Fest',  amount: 720, daysOut: 0,  jobDate: 'Jun 17', status: 'paid', paidDate: 'Jun 17' },
  { id: 'INV-0106', customer: 'La Paloma Tacos',      amount: 85,  daysOut: 0,  jobDate: 'Jun 17', status: 'paid', paidDate: 'Jun 18' },
  { id: 'INV-0104', customer: 'Seoul Taco',           amount: 85,  daysOut: 0,  jobDate: 'Jun 15', status: 'paid', paidDate: 'Jun 16' },
  { id: 'INV-0103', customer: 'East Side King',       amount: 85,  daysOut: 0,  jobDate: 'Jun 16', status: 'paid', paidDate: 'Jun 17' },
  { id: 'INV-0102', customer: 'Rolling Smoke BBQ',    amount: 95,  daysOut: 0,  jobDate: 'Jun 16', status: 'paid', paidDate: 'Jun 17' },
  { id: 'INV-0100', customer: 'Green Sprout Kitchen', amount: 85,  daysOut: 0,  jobDate: 'Jun 15', status: 'paid', paidDate: 'Jun 15' },
];

const CUSTOMERS = [
  { name: 'La Paloma Tacos',      contact: 'Omar Vega',      phone: '(512) 555-0101', email: 'omar@lapalomatacos.com',       jobs: 24, lastJob: 'Today',   spend: 1980, cadence: 'Weekly',    since: 'Jan 2024', location: '1300 E 6th St'      },
  { name: 'Seoul Taco',           contact: 'Ji-Young Park',  phone: '(512) 555-0188', email: 'jy@seoultacoatx.com',          jobs: 18, lastJob: 'Jun 15',  spend: 1530, cadence: 'Weekly',    since: 'Feb 2024', location: '801 Red River St'   },
  { name: 'Rolling Smoke BBQ',    contact: 'Trevor Adams',   phone: '(512) 555-0132', email: 'orders@rollingsmoke.co',        jobs: 14, lastJob: 'Jun 16',  spend: 1330, cadence: 'Bi-weekly', since: 'Mar 2024', location: '4303 S Congress Ave' },
  { name: 'East Side King',       contact: 'Sofia Reyes',    phone: '(512) 555-0174', email: 'sofia@eskatx.com',             jobs: 12, lastJob: 'Jun 13',  spend: 1020, cadence: 'Weekly',    since: 'Apr 2024', location: '1600 E 6th St'      },
  { name: 'Green Sprout Kitchen', contact: 'Priya Nair',     phone: '(512) 555-0211', email: 'priya@greensproutatx.com',     jobs: 10, lastJob: 'Jun 11',  spend: 850,  cadence: 'Bi-weekly', since: 'Apr 2024', location: 'SoCo District'      },
  { name: 'ATX Burger Co.',       contact: 'Chris Booth',    phone: '(512) 555-0141', email: 'chris@atxburger.co',           jobs: 8,  lastJob: 'Jun 9',   spend: 1120, cadence: 'Bi-weekly', since: 'Apr 2024', location: 'East Austin'        },
  { name: 'Garden State Truck',   contact: 'Monica Chen',    phone: '(512) 555-0199', email: 'monica@gardenstatetruck.com',  jobs: 7,  lastJob: 'Jun 14',  spend: 595,  cadence: 'Bi-weekly', since: 'Mar 2024', location: '2nd St District'    },
  { name: 'Barton Springs Fest',  contact: 'Jordan Miles',   phone: '(512) 555-0401', email: 'logistics@bsfest.com',         jobs: 6,  lastJob: 'Jun 17',  spend: 4320, cadence: 'Seasonal',  since: 'May 2024', location: 'Barton Springs Rd'  },
  { name: 'Ramen Nation',         contact: 'Kenji Sato',     phone: '(512) 555-0287', email: 'kenji@ramentx.com',            jobs: 5,  lastJob: 'Jun 9',   spend: 425,  cadence: 'Monthly',   since: 'May 2024', location: 'Domain Northside'   },
  { name: 'Voodoo Doughnut Cart', contact: 'Ray Fontenot',   phone: '(512) 555-0109', email: 'ray@voodooatx.com',            jobs: 4,  lastJob: 'Jun 15',  spend: 520,  cadence: 'Monthly',   since: 'Jun 2024', location: 'Rainey St Corridor' },
];

const AFFILIATES = [
  { id: 'AFF-001', name: 'Devon Park',      company: 'SoCo Market Events',        referrals: 12, active: 7, earned: 520, paid: 480, owed: 40,  tier: 'Gold',   since: 'Jan 2024', lastReferral: 'Jun 16', code: 'DPARK12'   },
  { id: 'AFF-002', name: 'Marcus Webb',     company: 'Austin Food Truck Alliance', referrals: 8,  active: 5, earned: 340, paid: 280, owed: 60,  tier: 'Silver', since: 'Feb 2024', lastReferral: 'Jun 10', code: 'AWEBB08'   },
  { id: 'AFF-003', name: 'Yolanda Reyes',   company: 'Rainey St Collective',       referrals: 5,  active: 3, earned: 210, paid: 150, owed: 60,  tier: 'Bronze', since: 'Mar 2024', lastReferral: 'Jun 5',  code: 'YREYES05'  },
  { id: 'AFF-004', name: 'Isabella Torres', company: 'ATX Event Supply Co.',       referrals: 3,  active: 2, earned: 120, paid: 120, owed: 0,   tier: 'Bronze', since: 'May 2024', lastReferral: 'May 28', code: 'ITORRES03' },
];

const FLEET_INIT: Truck[] = [
  {
    id: 'T-01', name: 'F-350 (Primary)', capacity: '300 gal', status: 'active',
    nextService: 'Jul 15', mileage: '48,220', alert: null,
    year: 2021, make: 'Ford', model: 'F-350', lastService: 'Apr 10, 2025',
    serviceLog: [
      { date: 'Apr 10, 2025', type: 'Oil & Filter Change', mileage: '45,100', cost: 89 },
      { date: 'Jan 20, 2025', type: 'Tire Rotation (2)',   mileage: '41,800', cost: 120 },
      { date: 'Oct 5, 2024',  type: 'Annual Inspection',   mileage: '38,200', cost: 210 },
    ],
  },
  {
    id: 'T-02', name: 'Sprinter Van', capacity: '150 gal', status: 'maintenance',
    nextService: 'Due Now', mileage: '61,440', alert: 'Oil change overdue',
    year: 2019, make: 'Mercedes', model: 'Sprinter', lastService: 'Nov 12, 2024',
    serviceLog: [
      { date: 'Nov 12, 2024', type: 'Oil & Filter Change', mileage: '56,100', cost: 120 },
      { date: 'Aug 3, 2024',  type: 'Brake Pads (Front)',  mileage: '52,300', cost: 380 },
      { date: 'May 15, 2024', type: 'Annual Inspection',   mileage: '48,900', cost: 240 },
    ],
  },
];

const EMAILS = [
  { id: 1, from: 'Jordan Miles',    subject: 'Re: Barton Springs Fest — Jun 21 booking',     preview: "Confirmed for 8 AM. We'll have 14 vendors on site this time...",     date: 'Today 2:14 PM', read: false, tag: 'customer'  },
  { id: 2, from: 'Marcus Webb',     subject: 'New referral — ATX Street Tacos',               preview: 'Hey Daniel, just referred another food truck owner your way...',      date: 'Today 11:30 AM',read: false, tag: 'affiliate' },
  { id: 3, from: 'Square Payments', subject: 'Payment received: $720 — INV-0107',            preview: 'A payment of $720 has been deposited to your account...',            date: 'Jun 17',        read: true,  tag: 'payment'  },
  { id: 4, from: 'Kenji Sato',      subject: 'Rescheduling Jun 20 appointment',               preview: 'Hi Daniel, we need to push the pickup back to 3 PM if possible...',  date: 'Jun 17',        read: true,  tag: 'customer'  },
  { id: 5, from: 'City of Austin',  subject: 'Waste disposal permit renewal — Action required',preview: 'Your grey water disposal permit #WD-2847 expires Aug 31...',        date: 'Jun 16',        read: true,  tag: 'admin'    },
  { id: 6, from: 'Devon Park',      subject: 'New affiliate inquiry — South Congress vendor', preview: 'Have another contact who might need your services weekly...',         date: 'Jun 15',        read: true,  tag: 'affiliate' },
  { id: 7, from: 'Priya Nair',      subject: 'Thanks for the quick turnaround yesterday',     preview: 'The crew was super professional and on time as always...',           date: 'Jun 15',        read: true,  tag: 'customer'  },
];

const CAMPAIGNS = [
  { id: 1, subject: 'June Service Update + Event Season Reminder', status: 'sent',      sentDate: 'Jun 1',  recipients: 47, opens: 31, openRate: 66 },
  { id: 2, subject: 'New Grease Disposal Service Now Available',    status: 'sent',      sentDate: 'May 15', recipients: 43, opens: 24, openRate: 56 },
  { id: 3, subject: 'Spring Event Season — Reserve Your Spot',      status: 'sent',      sentDate: 'Apr 10', recipients: 38, opens: 22, openRate: 58 },
  { id: 4, subject: 'Summer Pricing + Affiliate Program Launch',    status: 'scheduled', sentDate: 'Jun 25', recipients: 51, opens: null, openRate: null },
  { id: 5, subject: 'July Newsletter Draft',                        status: 'draft',     sentDate: null,     recipients: null, opens: null, openRate: null },
];

// chart data
const jobsPerWeek  = [{ week:'May W1',jobs:18},{week:'May W2',jobs:21},{week:'May W3',jobs:19},{week:'May W4',jobs:25},{week:'Jun W1',jobs:27},{week:'Jun W2',jobs:31}];
const revenueTrend = [{ week:'May W1',collected:1420,outstanding:280},{week:'May W2',collected:1730,outstanding:340},{week:'May W3',collected:1550,outstanding:500},{week:'May W4',collected:2040,outstanding:190},{week:'Jun W1',collected:2270,outstanding:420},{week:'Jun W2',collected:2650,outstanding:405}];
const invoiceAging = [{bracket:'1–7 days',amount:170},{bracket:'8–14 days',amount:85},{bracket:'15–30 days',amount:95},{bracket:'30+ days',amount:140}];
const busyDays     = [{day:'Mon',jobs:14},{day:'Tue',jobs:11},{day:'Wed',jobs:9},{day:'Thu',jobs:16},{day:'Fri',jobs:18},{day:'Sat',jobs:19},{day:'Sun',jobs:4}];
const jobsByType   = [{name:'Grey Water',value:68,color:ICY},{name:'Grease',value:17,color:'#64b5f6'},{name:'Event',value:15,color:'rgba(255,255,255,0.2)'}];

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s: Record<string, { color: string; bg: string }> = {
    'in-progress': { color: ICY,       bg: 'rgba(79,195,247,0.1)'   },
    upcoming:      { color: '#90a4ae', bg: 'rgba(144,164,174,0.07)' },
    completed:     { color: '#81c784', bg: 'rgba(129,199,132,0.1)'  },
    confirmed:     { color: '#81c784', bg: 'rgba(129,199,132,0.1)'  },
    pending:       { color: '#ffb74d', bg: 'rgba(255,183,77,0.1)'   },
    maintenance:   { color: '#ef9a9a', bg: 'rgba(239,154,154,0.1)'  },
    active:        { color: '#81c784', bg: 'rgba(129,199,132,0.1)'  },
    outstanding:   { color: '#ffb74d', bg: 'rgba(255,183,77,0.1)'   },
    overdue:       { color: '#ef9a9a', bg: 'rgba(239,154,154,0.1)'  },
    paid:          { color: '#81c784', bg: 'rgba(129,199,132,0.1)'  },
  };
  const { color, bg } = s[status] ?? s.upcoming;
  return (
    <span className="text-[9px] tracking-[0.2em] uppercase font-medium px-2 py-1 whitespace-nowrap"
      style={{ color, background: bg }}>{status.replace('-', ' ')}</span>
  );
}

function AgingBadge({ days }: { days: number }) {
  const color = days >= 30 ? '#ef9a9a' : days >= 15 ? '#ffb74d' : days >= 8 ? '#fff176' : '#81c784';
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

function FieldInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">{label}</label>
      <input {...props} className="w-full bg-white/5 text-white text-sm px-3 py-2.5 focus:outline-none focus:bg-white/8 placeholder:text-white/20 transition-colors" />
    </div>
  );
}

function ConsoleTray({ onNav, activeSection }: { onNav: (s: Section) => void; activeSection: Section }) {
  const apps = [
    { id: 'webmail'    as Section, icon: EnvelopeIcon,       title: 'Webmail'    },
    { id: 'newsletter' as Section, icon: NewspaperIcon,       title: 'Newsletter' },
    { id: 'invoices'   as Section, icon: DocumentTextIcon,    title: 'Invoices'   },
    { id: 'customers'  as Section, icon: UserGroupIcon,       title: 'Customers'  },
    { id: 'schedule'   as Section, icon: CalendarDaysIcon,    title: 'Schedule'   },
    { id: 'affiliates' as Section, icon: ArrowTrendingUpIcon, title: 'Affiliates' },
    { id: 'overview'   as Section, icon: ChartBarIcon,        title: 'Reports'    },
    { id: 'settings'   as Section, icon: Cog6ToothIcon,       title: 'Settings'   },
  ];
  return (
    <div className="flex flex-col items-center pt-8 pb-12">
      <div className="text-[10px] font-black text-white/40 tracking-[0.4em] uppercase mb-4">Platform Console</div>
      <div className="flex flex-wrap justify-center gap-2 p-1.5 bg-white/5 backdrop-blur-xl rounded-[32px] sm:rounded-full">
        {apps.map((app) => {
          const isActive = activeSection === app.id;
          return (
            <button key={app.id} onClick={() => onNav(app.id)}
              className={cn(
                'relative p-3 transition-all duration-300 rounded-full group/btn',
                isActive ? 'bg-white text-black scale-110 shadow-[0_0_20px_rgba(255,255,255,0.15)]' : 'text-white/60 hover:text-white hover:bg-white/10'
              )}>
              <app.icon className="w-5 h-5" />
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-white text-black text-[9px] font-black uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
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
      <div className="relative w-full max-w-lg bg-[#0d1117] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
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

function MobileDetailSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] sm:hidden">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 bg-[#0d1117] max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#0d1117]/95 backdrop-blur-sm flex items-center justify-between px-4 py-4">
          <div className="text-[10px] tracking-[0.3em] uppercase text-white/40 font-bold">{title}</div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="px-4 pb-12">{children}</div>
      </div>
    </div>
  );
}

function CreateJobModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ customer: '', location: '', type: 'Grey Water', date: '2025-06-19', time: '09:00', duration: '30', notes: '' });
  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const inputCls = "w-full bg-white/5 text-white text-sm px-3 py-2.5 focus:outline-none focus:bg-white/8 placeholder:text-white/20 transition-colors";
  const selCls  = `${inputCls} appearance-none`;
  return (
    <ModalShell title="Create New Job" onClose={onClose}>
      <div className="px-6 py-6 space-y-4">
        <div>
          <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Customer</label>
          <input list="cjob-customers" value={form.customer} onChange={e => upd('customer', e.target.value)} placeholder="Customer name…" className={inputCls} />
          <datalist id="cjob-customers">{CUSTOMERS.map(c => <option key={c.name} value={c.name} />)}</datalist>
        </div>
        <div>
          <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Location</label>
          <input value={form.location} onChange={e => upd('location', e.target.value)} placeholder="Street address or area…" className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Service Type</label>
            <select value={form.type} onChange={e => upd('type', e.target.value)} className={selCls} style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <option value="Grey Water">Grey Water</option>
              <option value="Grease">Grease Disposal</option>
              <option value="Event">Event (Multi-vendor)</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Est. Duration</label>
            <select value={form.duration} onChange={e => upd('duration', e.target.value)} className={selCls} style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
              <option value="90">90 min</option>
              <option value="120">2 hours</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Date</label>
            <input type="date" value={form.date} onChange={e => upd('date', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Time</label>
            <input type="time" value={form.time} onChange={e => upd('time', e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Notes</label>
          <textarea value={form.notes} onChange={e => upd('notes', e.target.value)} placeholder="Gate codes, special instructions…" rows={2}
            className={`${inputCls} resize-none`} />
        </div>
      </div>
      <div className="flex gap-3 px-6 pb-6">
        <button onClick={onClose} className="flex-1 py-2.5 text-[10px] font-bold tracking-widest uppercase text-white/30 bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
        <button onClick={onClose} className="flex-1 py-2.5 text-[10px] font-bold tracking-widest uppercase text-[#0d1117] hover:opacity-90 transition-opacity" style={{ background: ICY }}>
          Create Job →
        </button>
      </div>
    </ModalShell>
  );
}

function CreateInvoiceModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ customer: '', jobRef: '', amount: '', serviceDate: '', dueDate: '', notes: '' });
  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const inputCls = "w-full bg-white/5 text-white text-sm px-3 py-2.5 focus:outline-none focus:bg-white/8 placeholder:text-white/20 transition-colors";
  return (
    <ModalShell title="Create Invoice" onClose={onClose}>
      <div className="px-6 py-6 space-y-4">
        <div>
          <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Customer</label>
          <input list="cinv-customers" value={form.customer} onChange={e => upd('customer', e.target.value)} placeholder="Customer name…" className={inputCls} />
          <datalist id="cinv-customers">{CUSTOMERS.map(c => <option key={c.name} value={c.name} />)}</datalist>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Job Reference</label>
            <input value={form.jobRef} onChange={e => upd('jobRef', e.target.value)} placeholder="JOB-XXXX" className={`${inputCls} font-mono`} />
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Amount ($)</label>
            <input type="number" value={form.amount} onChange={e => upd('amount', e.target.value)} placeholder="85" className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Service Date</label>
            <input type="date" value={form.serviceDate} onChange={e => upd('serviceDate', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Due Date</label>
            <input type="date" value={form.dueDate} onChange={e => upd('dueDate', e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Notes</label>
          <textarea value={form.notes} onChange={e => upd('notes', e.target.value)} placeholder="Payment terms, service details…" rows={2}
            className={`${inputCls} resize-none`} />
        </div>
      </div>
      <div className="flex gap-3 px-6 pb-6">
        <button onClick={onClose} className="flex-1 py-2.5 text-[10px] font-bold tracking-widest uppercase text-white/30 bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
        <button onClick={onClose} className="flex-1 py-2.5 text-[10px] font-bold tracking-widest uppercase text-[#0d1117] hover:opacity-90 transition-opacity" style={{ background: ICY }}>
          Send Invoice →
        </button>
      </div>
    </ModalShell>
  );
}

function CompleteJobsModal({ onClose, jobs, onComplete }: { onClose: () => void; jobs: Job[]; onComplete: (ids: string[]) => void }) {
  const active = jobs.filter(j => ['in-progress', 'upcoming', 'confirmed'].includes(j.status));
  const [selected, setSelected] = useState<string[]>(jobs.filter(j => j.status === 'in-progress').map(j => j.id));
  const toggle = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  return (
    <ModalShell title="Mark Jobs Complete" onClose={onClose}>
      <div className="px-6 py-4 space-y-1 max-h-80 overflow-y-auto">
        {active.length === 0 && <div className="text-center py-8 text-white/30 text-sm">No active jobs</div>}
        {active.map(job => (
          <button key={job.id} onClick={() => toggle(job.id)}
            className={cn('w-full flex items-start gap-3 px-3 py-3 text-left transition-colors', selected.includes(job.id) ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]')}>
            <div className={cn('w-4 h-4 flex-shrink-0 mt-0.5 transition-colors', selected.includes(job.id) ? 'text-[#81c784]' : 'text-white/20')}>
              {selected.includes(job.id) ? <CheckCircleIcon className="w-4 h-4" /> : <div className="w-3.5 h-3.5 rounded-full border border-white/20 mt-px" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono text-white/30">{job.id}</span>
                <span className="text-sm text-white/80">{job.customer}</span>
                <StatusBadge status={job.status} />
              </div>
              <div className="text-[11px] text-white/30 mt-0.5">{job.time} · {job.date} · {job.type}</div>
            </div>
            <div className="text-white/50 font-mono text-sm flex-shrink-0">${job.amount}</div>
          </button>
        ))}
      </div>
      <div className="px-6 pb-2">
        <div className="text-[10px] text-white/20">{selected.length} of {active.length} selected</div>
      </div>
      <div className="flex gap-3 px-6 pb-6 mt-2">
        <button onClick={onClose} className="flex-1 py-2.5 text-[10px] font-bold tracking-widest uppercase text-white/30 bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
        <button onClick={() => { onComplete(selected); onClose(); }} disabled={selected.length === 0}
          className="flex-1 py-2.5 text-[10px] font-bold tracking-widest uppercase text-[#0d1117] hover:opacity-90 transition-opacity disabled:opacity-30"
          style={{ background: ICY }}>
          Mark {selected.length} Complete →
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Section Panels ───────────────────────────────────────────────────────────

function OverviewPanel({ jobs, invoices, onCompleteJob, onMarkPaid }: {
  jobs: Job[]; invoices: Invoice[];
  onCompleteJob: (id: string) => void;
  onMarkPaid: (id: string) => void;
}) {
  const [chartTab, setChartTab] = useState('jobs');
  const todayJobs = jobs.filter(j => j.date === 'Jun 18');
  const upcomingJobs = jobs.filter(j => j.date !== 'Jun 18' && j.status !== 'completed');
  const outstandingInvoices = invoices.filter(i => i.status !== 'paid');
  const repeatCustomers = CUSTOMERS.slice(0, 6);

  return (
    <div className="space-y-12">
      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-8">
        {[
          { icon: <ClipboardDocumentListIcon className="w-5 h-5" />, label: "Today's Jobs",      value: String(todayJobs.length),          sub: `${todayJobs.filter(j=>j.status==='in-progress').length} in progress · ${todayJobs.filter(j=>j.status==='upcoming').length} upcoming` },
          { icon: <CurrencyDollarIcon className="w-5 h-5" />,        label: 'This Week Revenue', value: '$2,650', sub: '↑ $380 vs last week' },
          { icon: <ExclamationTriangleIcon className="w-5 h-5" />,   label: 'Outstanding',       value: `$${outstandingInvoices.reduce((s,i)=>s+i.amount,0)}`, sub: `${outstandingInvoices.length} invoices · oldest ${Math.max(...outstandingInvoices.map(i=>i.daysOut))}d` },
          { icon: <CheckCircleIcon className="w-5 h-5" />,           label: 'Completion Rate',   value: '96%',    sub: '87 of 91 jobs this month' },
        ].map(card => (
          <div key={card.label}>
            <div className="text-white/25 mb-3">{card.icon}</div>
            <div className="text-4xl font-black text-white tabular-nums mb-1">{card.value}</div>
            <div className="text-[9px] tracking-[0.25em] uppercase text-white/30">{card.label}</div>
            <div className="text-[11px] text-white/20 mt-1.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Today's schedule + clock + fleet */}
      <div className="grid xl:grid-cols-3 gap-12">
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <SectionLabel eyebrow="Wednesday Jun 18" title="Today's Schedule" />
            <button className="flex items-center gap-1 text-[10px] tracking-widest uppercase text-white/25 hover:text-white/60 transition-colors">
              Full Route <ArrowRightIcon className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1">
            {todayJobs.map(job => (
              <div key={job.id} className={cn('flex items-start gap-4 py-3 hover:bg-white/[0.02] transition-colors px-2 -mx-2', job.status === 'in-progress' && 'bg-white/[0.02]')}>
                <div className="w-16 flex-shrink-0 pt-0.5">
                  <div className={cn('text-xs font-mono font-bold tabular-nums', job.status === 'in-progress' ? 'text-[#4fc3f7]' : 'text-white/35')}>{job.time}</div>
                  <div className="text-[9px] text-white/20 mt-0.5">est.</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium">{job.customer}</span>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-[11px] text-white/30"><MapPinIcon className="w-3 h-3 flex-shrink-0" />{job.location}</span>
                    <span className="text-[11px] text-white/20">{job.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={`tel:${job.phone}`} className="text-white/20 hover:text-white/50 transition-colors"><PhoneIcon className="w-4 h-4" /></a>
                  {job.status === 'in-progress' && (
                    <button onClick={() => onCompleteJob(job.id)}
                      className="text-[9px] tracking-widest uppercase font-bold px-2.5 py-1.5 text-[#81c784] bg-[#81c784]/10 hover:bg-[#81c784]/15 transition-colors">Done</button>
                  )}
                  {job.status === 'upcoming' && (
                    <button className="text-[9px] tracking-widest uppercase font-bold px-2.5 py-1.5 text-white/25 bg-white/5 hover:bg-white/10 transition-colors">Start</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-8">
          <div>
            <div className="mb-3"><SectionLabel eyebrow="Current Time" title="Clock / Timer" /></div>
            <ClockWidget className="bg-transparent min-h-[200px]" />
          </div>
          <div>
            <div className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-4">Fleet</div>
            <div className="space-y-4">
              {FLEET_INIT.map(truck => (
                <div key={truck.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <TruckIcon className={cn('w-4 h-4 flex-shrink-0', truck.status === 'active' ? 'text-white/30' : 'text-[#ef9a9a]/50')} />
                    <div className="min-w-0">
                      <div className="text-white/65 text-xs truncate">{truck.name}</div>
                      <div className="text-white/20 text-[10px]">{truck.capacity}</div>
                    </div>
                  </div>
                  <StatusBadge status={truck.status} />
                </div>
              ))}
              {FLEET_INIT.filter(t => t.alert).map(t => (
                <div key={t.id} className="flex items-center gap-1.5">
                  <ExclamationTriangleIcon className="w-3.5 h-3.5 text-[#ef9a9a]/60 flex-shrink-0" />
                  <span className="text-[10px] text-[#ef9a9a]/60">{t.alert}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming + calendar */}
      <div className="grid xl:grid-cols-3 gap-12">
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <SectionLabel eyebrow="Next 7 Days" title="Upcoming Jobs" />
          </div>
          {/* Mobile upcoming jobs */}
          <div className="sm:hidden space-y-2">
            {upcomingJobs.slice(0,6).map((job,i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/5">
                <div className="flex-shrink-0 w-14">
                  <div className="text-white/50 text-[11px] font-mono font-bold">{job.date}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white/80 text-sm truncate">{job.customer}</div>
                  <div className="text-white/30 text-[11px]">{job.type} · {job.location}</div>
                </div>
                <StatusBadge status={job.status} />
              </div>
            ))}
          </div>
          {/* Desktop upcoming jobs table */}
          <table className="hidden sm:table w-full text-sm">
            <thead><tr>{['Date','Customer','Location','Type','Status'].map(h => <th key={h} className="pb-3 text-left text-[9px] tracking-[0.25em] uppercase text-white/20 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {upcomingJobs.slice(0,6).map((job,i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 text-white/50 text-xs font-mono whitespace-nowrap pr-4">{job.date}</td>
                  <td className="py-2.5 text-white/70 text-xs pr-4">{job.customer}</td>
                  <td className="py-2.5 text-white/30 text-xs pr-4">{job.location}</td>
                  <td className="py-2.5 text-white/30 text-xs pr-4">{job.type}</td>
                  <td className="py-2.5"><StatusBadge status={job.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div className="mb-3"><SectionLabel eyebrow="Service Calendar" title="Schedule" /></div>
          <CalendarWidget interactive className="bg-transparent"
            dotsByDate={new Map([
              ['2025-06-18', { bookings: 5, events: 0, photos: 0, blocked: false }],
              ['2025-06-19', { bookings: 2, events: 1, photos: 0, blocked: false }],
              ['2025-06-20', { bookings: 2, events: 0, photos: 0, blocked: false }],
              ['2025-06-21', { bookings: 1, events: 1, photos: 0, blocked: false }],
              ['2025-06-23', { bookings: 2, events: 0, photos: 0, blocked: false }],
              ['2025-06-25', { bookings: 0, events: 0, photos: 0, blocked: true  }],
            ])}
          />
        </div>
      </div>

      {/* Outstanding invoices */}
      <div>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <SectionLabel eyebrow="Needs Attention" title="Outstanding Invoices" />
            <span className="text-[9px] font-bold px-2 py-0.5" style={{ color: '#ffb74d', background: 'rgba(255,183,77,0.1)' }}>${outstandingInvoices.reduce((s,i)=>s+i.amount,0)} total</span>
          </div>
        </div>
        {/* Mobile outstanding invoices */}
        <div className="sm:hidden space-y-2">
          {outstandingInvoices.map(inv => (
            <div key={inv.id} className="p-3 bg-white/5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-white/30 text-[10px] font-mono">{inv.id}</div>
                  <div className="text-white/70 text-sm mt-0.5">{inv.customer}</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold text-sm">${inv.amount}</div>
                  <AgingBadge days={inv.daysOut} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onMarkPaid(inv.id)} className="flex-1 py-2 text-[9px] tracking-widest uppercase font-bold text-[#81c784]/70 bg-[#81c784]/10">Mark Paid</button>
                <button className="flex-1 py-2 text-[9px] tracking-widest uppercase font-bold text-white/30 bg-white/[0.07]">Resend</button>
              </div>
            </div>
          ))}
        </div>
        {/* Desktop outstanding invoices table */}
        <table className="hidden sm:table w-full text-sm">
          <thead><tr>{['Invoice','Customer','Job Date','Amount','Overdue','Action'].map(h => <th key={h} className="pb-3 text-left text-[9px] tracking-[0.25em] uppercase text-white/20 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {outstandingInvoices.map(inv => (
              <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 text-white/40 text-xs font-mono pr-4">{inv.id}</td>
                <td className="py-2.5 text-white/70 text-xs pr-4">{inv.customer}</td>
                <td className="py-2.5 text-white/30 text-xs pr-4">{inv.jobDate}</td>
                <td className="py-2.5 text-white font-medium text-xs tabular-nums pr-4">${inv.amount}</td>
                <td className="py-2.5 pr-4"><AgingBadge days={inv.daysOut} /></td>
                <td className="py-2.5">
                  <button onClick={() => onMarkPaid(inv.id)} className="text-[9px] tracking-widest uppercase font-bold px-2.5 py-1 text-[#81c784]/70 bg-[#81c784]/10 hover:bg-[#81c784]/15 transition-colors mr-2">Mark Paid</button>
                  <button className="text-[9px] tracking-widest uppercase font-bold px-2.5 py-1 text-white/30 bg-white/5 hover:bg-white/10 transition-colors">Resend</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <div>
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <SectionLabel eyebrow="Analytics" title="Performance" />
          <div className="flex gap-1 p-1 bg-white/5 backdrop-blur-xl rounded-full">
            {[{id:'jobs',label:'Jobs/Wk'},{id:'revenue',label:'Revenue'},{id:'aging',label:'Aging'},{id:'demand',label:'Demand'},{id:'mix',label:'Job Mix'}].map(({id,label}) => (
              <button key={id} onClick={() => setChartTab(id)}
                className={cn('px-3 py-1.5 text-[9px] font-black tracking-widest uppercase rounded-full transition-all duration-200', chartTab===id ? 'bg-white text-black' : 'text-white/40 hover:text-white hover:bg-white/10')}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-56">
          {chartTab === 'jobs' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={jobsPerWeek} margin={{top:4,right:16,left:-20,bottom:0}}>
                <defs><linearGradient id="jobsGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={ICY} stopOpacity={0.2}/><stop offset="95%" stopColor={ICY} stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="week" tick={{fill:'rgba(255,255,255,0.25)',fontSize:9}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill:'rgba(255,255,255,0.2)',fontSize:8}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{stroke:'rgba(255,255,255,0.04)'}} />
                <Area type="monotone" dataKey="jobs" stroke={ICY} strokeWidth={2} fill="url(#jobsGrad)" dot={false} activeDot={{r:4,fill:ICY}} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {chartTab === 'revenue' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueTrend} margin={{top:4,right:16,left:-20,bottom:0}} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="week" tick={{fill:'rgba(255,255,255,0.25)',fontSize:9}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill:'rgba(255,255,255,0.2)',fontSize:8}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v:number)=>[`$${v}`,'']} />
                <Bar dataKey="collected" fill={ICY} radius={[2,2,0,0]} name="Collected" />
                <Bar dataKey="outstanding" fill="rgba(255,183,77,0.4)" radius={[2,2,0,0]} name="Outstanding" />
              </BarChart>
            </ResponsiveContainer>
          )}
          {chartTab === 'aging' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={invoiceAging} layout="vertical" margin={{top:4,right:16,left:16,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{fill:'rgba(255,255,255,0.2)',fontSize:8}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} />
                <YAxis type="category" dataKey="bracket" tick={{fill:'rgba(255,255,255,0.35)',fontSize:9}} axisLine={false} tickLine={false} width={72} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v:number)=>[`$${v}`,'Amount']} />
                <Bar dataKey="amount" radius={[0,2,2,0]}>{invoiceAging.map((_,i)=><Cell key={i} fill={[ICY,'#fff176','#ffb74d','#ef9a9a'][i]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {chartTab === 'demand' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={busyDays} margin={{top:4,right:16,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" tick={{fill:'rgba(255,255,255,0.3)',fontSize:10}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill:'rgba(255,255,255,0.2)',fontSize:8}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="jobs" radius={[2,2,0,0]}>{busyDays.map((e,i)=><Cell key={i} fill={e.day==='Sat'||e.day==='Fri'?ICY:'rgba(255,255,255,0.1)'} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {chartTab === 'mix' && (
            <div className="h-full flex items-center justify-center gap-16">
              <PieChart width={200} height={200}>
                <Pie data={jobsByType} cx={96} cy={96} innerRadius={52} outerRadius={88} dataKey="value" strokeWidth={0}>
                  {jobsByType.map(e=><Cell key={e.name} fill={e.color} />)}
                </Pie>
              </PieChart>
              <div className="space-y-5">
                {jobsByType.map(t=>(
                  <div key={t.name} className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:t.color}} />
                    <div><div className="text-white/70 text-sm font-medium">{t.name}</div><div className="text-white/25 text-[11px]">{t.value}% of jobs</div></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Repeat customers */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <SectionLabel eyebrow="Loyalty" title="Top Repeat Customers" />
        </div>
        {/* Mobile repeat customers */}
        <div className="sm:hidden space-y-1">
          {repeatCustomers.map(c => (
            <div key={c.name} className="flex items-center gap-3 py-2.5 px-3 bg-white/[0.03]">
              <div className="w-6 h-6 bg-white/8 flex items-center justify-center text-[10px] font-bold text-white/40 flex-shrink-0">{c.name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-white/70 text-xs truncate">{c.name}</div>
                <div className="text-white/25 text-[10px]">{c.cadence} · Last: {c.lastJob}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-white font-bold text-xs">{c.jobs} jobs</div>
                <div className="text-white/35 text-[10px] font-mono">${c.spend.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
        {/* Desktop repeat customers table */}
        <table className="hidden sm:table w-full text-sm">
          <thead><tr>{['Customer','Total Jobs','Last Service','Total Spend','Cadence'].map(h=><th key={h} className="pb-3 text-left text-[9px] tracking-[0.25em] uppercase text-white/20 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {repeatCustomers.map(c=>(
              <tr key={c.name} className="hover:bg-white/[0.02] transition-colors cursor-pointer">
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0"><span className="text-white/40 text-[9px] font-bold">{c.name.charAt(0)}</span></div>
                    <span className="text-white/70 text-xs">{c.name}</span>
                  </div>
                </td>
                <td className="py-2.5 text-white font-bold text-xs tabular-nums pr-4">{c.jobs}</td>
                <td className="py-2.5 text-white/30 text-xs pr-4">{c.lastJob}</td>
                <td className="py-2.5 text-white/55 text-xs tabular-nums pr-4">${c.spend.toLocaleString()}</td>
                <td className="py-2.5 text-white/30 text-xs">{c.cadence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SchedulePanel({ jobs }: { jobs: Job[] }) {
  const upcoming = jobs.filter(j => j.status !== 'completed');
  const byDate: Record<string, Job[]> = {};
  upcoming.forEach(j => { if (!byDate[j.date]) byDate[j.date] = []; byDate[j.date].push(j); });

  return (
    <div>
      <PanelHeader title="Schedule" sub="Upcoming service calendar · Austin, TX" />
      <div className="grid xl:grid-cols-3 gap-12">
        <div className="xl:col-span-2 space-y-10">
          {Object.entries(byDate).map(([date, dayJobs]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-xs font-bold text-white/50 uppercase tracking-widest">{date}</div>
                <div className="text-[10px] text-white/20 px-2 py-0.5" style={{background:'rgba(255,255,255,0.04)'}}>{dayJobs.length} job{dayJobs.length!==1?'s':''}</div>
              </div>
              <div className="space-y-1">
                {dayJobs.map(job => (
                  <div key={job.id} className={cn('flex items-start gap-4 py-3 px-2 -mx-2 hover:bg-white/[0.02] transition-colors', job.status==='in-progress'&&'bg-white/[0.02]')}>
                    <div className="w-16 flex-shrink-0 pt-0.5">
                      <div className={cn('text-xs font-mono font-bold tabular-nums', job.status==='in-progress'?'text-[#4fc3f7]':'text-white/35')}>{job.time}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-medium">{job.customer}</span>
                        <StatusBadge status={job.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[11px] text-white/30"><MapPinIcon className="w-3 h-3 flex-shrink-0" />{job.location}</span>
                        <span className="text-[11px] text-white/20">{job.type}</span>
                        <span className="text-[11px] font-mono text-white/20">${job.amount}</span>
                      </div>
                    </div>
                    <a href={`tel:${job.phone}`} className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0 pt-1"><PhoneIcon className="w-4 h-4" /></a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div>
          <div className="mb-3"><SectionLabel eyebrow="Service Calendar" title="Monthly View" /></div>
          <CalendarWidget interactive className="bg-transparent"
            dotsByDate={new Map([
              ['2025-06-18', { bookings: 5, events: 0, photos: 0, blocked: false }],
              ['2025-06-19', { bookings: 2, events: 1, photos: 0, blocked: false }],
              ['2025-06-20', { bookings: 2, events: 0, photos: 0, blocked: false }],
              ['2025-06-21', { bookings: 1, events: 1, photos: 0, blocked: false }],
              ['2025-06-23', { bookings: 2, events: 0, photos: 0, blocked: false }],
              ['2025-06-25', { bookings: 0, events: 0, photos: 0, blocked: true  }],
            ])}
          />
          <ClockWidget className="bg-transparent mt-6" />
        </div>
      </div>
    </div>
  );
}

function JobsPanel({ jobs, onCompleteJob }: { jobs: Job[]; onCompleteJob: (id: string) => void }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const filters = ['all', 'in-progress', 'upcoming', 'confirmed', 'completed'];
  const filtered = jobs.filter(j => {
    const matchFilter = filter === 'all' || j.status === filter;
    const matchSearch = !search || j.customer.toLowerCase().includes(search.toLowerCase()) || j.id.toLowerCase().includes(search.toLowerCase()) || j.location.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });
  return (
    <div>
      <PanelHeader title="Jobs" sub={`${jobs.length} total jobs`} />
      {/* Filter tabs — horizontally scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-3 sm:mb-0">
        <div className="flex gap-1 p-1 bg-white/5 rounded-full w-max sm:w-fit">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-3 py-1.5 text-[9px] font-black tracking-widest uppercase rounded-full transition-all whitespace-nowrap', filter===f?'bg-white text-black':'text-white/40 hover:text-white hover:bg-white/10')}>
              {f === 'all' ? `All (${jobs.length})` : f === 'in-progress' ? `Active (${jobs.filter(j=>j.status===f).length})` : `${f} (${jobs.filter(j=>j.status===f).length})`}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 mb-6 max-w-xs">
        <MagnifyingGlassIcon className="w-4 h-4 text-white/20 flex-shrink-0" />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search jobs…"
          className="flex-1 bg-transparent text-white text-xs focus:outline-none placeholder:text-white/20" />
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {filtered.map(job => (
          <button key={job.id} onClick={() => setSelectedJob(job)}
            className="w-full text-left p-4 bg-white/5 active:bg-white/10 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-white/30 text-[10px] font-mono">{job.id}</div>
                <div className="text-white/80 text-sm font-medium mt-0.5">{job.customer}</div>
              </div>
              <StatusBadge status={job.status} />
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/30">{job.date} · {job.time} · {job.type}</span>
              <span className="text-white/60 font-mono">${job.amount}</span>
            </div>
          </button>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 text-white/20 text-sm">No jobs match this filter</div>}
      </div>

      {/* Desktop table */}
      <table className="hidden sm:table w-full text-sm">
        <thead><tr>{['Job ID','Date','Time','Customer','Location','Type','Status','Amount',''].map(h=><th key={h} className="pb-3 text-left text-[9px] tracking-[0.25em] uppercase text-white/20 font-medium pr-4">{h}</th>)}</tr></thead>
        <tbody>
          {filtered.map(job => (
            <tr key={job.id} className="hover:bg-white/[0.02] transition-colors group">
              <td className="py-2.5 text-white/30 text-[10px] font-mono pr-4">{job.id}</td>
              <td className="py-2.5 text-white/40 text-xs pr-4 whitespace-nowrap">{job.date}</td>
              <td className="py-2.5 text-white/40 text-xs font-mono pr-4 whitespace-nowrap">{job.time}</td>
              <td className="py-2.5 text-white/80 text-xs pr-4">{job.customer}</td>
              <td className="py-2.5 text-white/30 text-xs pr-4">{job.location}</td>
              <td className="py-2.5 text-white/30 text-xs pr-4">{job.type}</td>
              <td className="py-2.5 pr-4"><StatusBadge status={job.status} /></td>
              <td className="py-2.5 text-white/60 text-xs font-mono tabular-nums pr-4">${job.amount}</td>
              <td className="py-2.5">
                {(job.status === 'in-progress' || job.status === 'upcoming') && (
                  <button onClick={() => onCompleteJob(job.id)}
                    className="opacity-0 group-hover:opacity-100 text-[9px] tracking-widest uppercase font-bold px-2.5 py-1 text-[#81c784]/70 bg-[#81c784]/10 hover:bg-[#81c784]/15 transition-all">
                    Complete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && <div className="hidden sm:block text-center py-12 text-white/20 text-sm">No jobs match this filter</div>}

      {/* Mobile detail sheet */}
      {selectedJob && (
        <MobileDetailSheet title="Job Details" onClose={() => setSelectedJob(null)}>
          <div className="space-y-6 pt-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-white/30 text-[10px] font-mono">{selectedJob.id}</div>
                <div className="text-white font-bold text-base mt-1">{selectedJob.customer}</div>
              </div>
              <StatusBadge status={selectedJob.status} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { l: 'Date', v: selectedJob.date },
                { l: 'Time', v: selectedJob.time },
                { l: 'Type', v: selectedJob.type },
                { l: 'Amount', v: `$${selectedJob.amount}` },
              ].map(({ l, v }) => (
                <div key={l}>
                  <div className="text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1.5">{l}</div>
                  <div className="text-white/70 text-sm font-medium">{v}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1.5">Location</div>
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <MapPinIcon className="w-4 h-4 text-white/30 flex-shrink-0" />{selectedJob.location}
              </div>
            </div>
            <div>
              <div className="text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1.5">Phone</div>
              <a href={`tel:${selectedJob.phone}`} className="flex items-center gap-2 text-sm font-medium" style={{ color: ICY }}>
                <PhoneIcon className="w-4 h-4" />{selectedJob.phone}
              </a>
            </div>
            {(selectedJob.status === 'in-progress' || selectedJob.status === 'upcoming') && (
              <button onClick={() => { onCompleteJob(selectedJob.id); setSelectedJob(null); }}
                className="w-full py-3 text-[10px] font-bold tracking-widest uppercase text-[#0d1117]"
                style={{ background: '#81c784' }}>
                Mark Complete
              </button>
            )}
          </div>
        </MobileDetailSheet>
      )}
    </div>
  );
}

function CustomersPanel() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<typeof CUSTOMERS[0] | null>(null);
  const filtered = CUSTOMERS.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.contact.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PanelHeader title="Customers" sub={`${CUSTOMERS.length} customers · Austin, TX`} />
      <div className="flex items-center gap-2 mb-6 max-w-sm">
        <MagnifyingGlassIcon className="w-4 h-4 text-white/20 flex-shrink-0" />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customers…"
          className="flex-1 bg-transparent text-white text-xs focus:outline-none placeholder:text-white/20" />
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {filtered.map(c => (
          <button key={c.name} onClick={() => setSelected(c)}
            className="w-full text-left p-4 bg-white/5 active:bg-white/10 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 bg-white/10 text-xs font-bold text-white/50">
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white/90 text-sm font-medium truncate">{c.name}</div>
                <div className="text-white/35 text-[11px]">{c.contact}</div>
              </div>
              <ChevronDownIcon className="w-4 h-4 text-white/20 flex-shrink-0 -rotate-90" />
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors">
                <PhoneIcon className="w-3 h-3" />{c.phone}
              </a>
              <div className="flex items-center gap-3 text-white/30">
                <span><span className="text-white/60 font-bold">{c.jobs}</span> jobs</span>
                <span className="font-mono">${c.spend.toLocaleString()}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <table className="hidden sm:table w-full text-sm">
        <thead><tr>{['Customer','Contact','Phone','Email','Jobs','Last Service','Total Spend','Cadence'].map(h=><th key={h} className="pb-3 text-left text-[9px] tracking-[0.25em] uppercase text-white/20 font-medium pr-4">{h}</th>)}</tr></thead>
        <tbody>
          {filtered.map(c => (
            <tr key={c.name} className="hover:bg-white/[0.02] transition-colors cursor-pointer group">
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white/40">{c.name.charAt(0)}</div>
                  <div>
                    <div className="text-white/80 text-xs font-medium">{c.name}</div>
                    <div className="text-white/25 text-[10px]">{c.location}</div>
                  </div>
                </div>
              </td>
              <td className="py-3 text-white/40 text-xs pr-4">{c.contact}</td>
              <td className="py-3 pr-4">
                <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-white/30 hover:text-white/70 text-xs transition-colors">
                  <PhoneIcon className="w-3 h-3" />{c.phone}
                </a>
              </td>
              <td className="py-3 pr-4">
                <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-white/30 hover:text-white/70 text-xs transition-colors">
                  <EnvelopeIcon className="w-3 h-3" />{c.email}
                </a>
              </td>
              <td className="py-3 text-white font-bold text-xs tabular-nums pr-4">{c.jobs}</td>
              <td className="py-3 text-white/30 text-xs pr-4">{c.lastJob}</td>
              <td className="py-3 text-white/60 text-xs font-mono tabular-nums pr-4">${c.spend.toLocaleString()}</td>
              <td className="py-3 text-white/30 text-xs">{c.cadence}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile detail sheet */}
      {selected && (
        <MobileDetailSheet title="Customer" onClose={() => setSelected(null)}>
          <div className="space-y-6 pt-2">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 flex items-center justify-center text-xl font-bold text-white/50 flex-shrink-0">
                {selected.name.charAt(0)}
              </div>
              <div>
                <div className="text-white font-bold text-base">{selected.name}</div>
                <div className="text-white/30 text-xs mt-0.5">{selected.location}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { l: 'Jobs', v: String(selected.jobs) },
                { l: 'Spend', v: `$${selected.spend.toLocaleString()}` },
                { l: 'Since', v: selected.since },
              ].map(({ l, v }) => (
                <div key={l}>
                  <div className="text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1">{l}</div>
                  <div className="text-white font-bold text-sm">{v}</div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1.5">Contact</div>
                <div className="text-white/70 text-sm">{selected.contact}</div>
              </div>
              <div>
                <div className="text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1.5">Phone</div>
                <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-sm font-medium" style={{ color: ICY }}>
                  <PhoneIcon className="w-4 h-4" />{selected.phone}
                </a>
              </div>
              <div>
                <div className="text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1.5">Email</div>
                <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-sm break-all" style={{ color: ICY }}>
                  <EnvelopeIcon className="w-4 h-4 flex-shrink-0" />{selected.email}
                </a>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1.5">Last Service</div>
                  <div className="text-white/70 text-sm">{selected.lastJob}</div>
                </div>
                <div>
                  <div className="text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1.5">Cadence</div>
                  <div className="text-white/70 text-sm">{selected.cadence}</div>
                </div>
              </div>
            </div>
          </div>
        </MobileDetailSheet>
      )}
    </div>
  );
}

function InvoicesPanel({ invoices, onMarkPaid }: { invoices: Invoice[]; onMarkPaid: (id: string) => void }) {
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Invoice | null>(null);
  const outstanding = invoices.filter(i => i.status !== 'paid');
  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter);
  const totalOwed = outstanding.reduce((s,i)=>s+i.amount,0);

  return (
    <div>
      <PanelHeader title="Invoices" sub={`$${totalOwed} outstanding across ${outstanding.length} invoices`} />
      <div className="flex gap-1 p-1 bg-white/5 rounded-full mb-6 w-fit">
        {['all','outstanding','overdue','paid'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className={cn('px-3 py-1.5 text-[9px] font-black tracking-widest uppercase rounded-full transition-all', filter===f?'bg-white text-black':'text-white/40 hover:text-white hover:bg-white/10')}>
            {f} ({invoices.filter(i=>f==='all'?true:i.status===f).length})
          </button>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {filtered.map(inv => (
          <button key={inv.id} onClick={() => setSelected(inv)}
            className="w-full text-left p-4 bg-white/5 active:bg-white/10 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-white/35 text-[10px] font-mono">{inv.id}</div>
                <div className="text-white/80 text-sm font-medium mt-0.5">{inv.customer}</div>
              </div>
              <StatusBadge status={inv.status} />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-white font-bold text-lg tabular-nums">${inv.amount}</div>
              <div>{inv.status === 'paid'
                ? <span className="text-[10px] text-white/25">{inv.paidDate}</span>
                : <AgingBadge days={inv.daysOut} />}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <table className="hidden sm:table w-full text-sm">
        <thead><tr>{['Invoice','Customer','Job Date','Amount','Status','Days Out','Action'].map(h=><th key={h} className="pb-3 text-left text-[9px] tracking-[0.25em] uppercase text-white/20 font-medium pr-4">{h}</th>)}</tr></thead>
        <tbody>
          {filtered.map(inv=>(
            <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
              <td className="py-2.5 text-white/40 text-[10px] font-mono pr-4">{inv.id}</td>
              <td className="py-2.5 text-white/70 text-xs pr-4">{inv.customer}</td>
              <td className="py-2.5 text-white/30 text-xs pr-4">{inv.jobDate}</td>
              <td className="py-2.5 text-white font-medium text-xs tabular-nums pr-4">${inv.amount}</td>
              <td className="py-2.5 pr-4"><StatusBadge status={inv.status} /></td>
              <td className="py-2.5 pr-4">{inv.status==='paid' ? <span className="text-[10px] text-white/20">{inv.paidDate}</span> : <AgingBadge days={inv.daysOut} />}</td>
              <td className="py-2.5">
                {inv.status !== 'paid' && (
                  <div className="flex gap-2">
                    <button onClick={()=>onMarkPaid(inv.id)} className="text-[9px] tracking-widest uppercase font-bold px-2.5 py-1 text-[#81c784]/70 bg-[#81c784]/10 hover:bg-[#81c784]/15 transition-colors">Mark Paid</button>
                    <button className="text-[9px] tracking-widest uppercase font-bold px-2.5 py-1 text-white/30 bg-white/5 hover:bg-white/10 transition-colors">Resend</button>
                  </div>
                )}
                {inv.status === 'paid' && <span className="flex items-center gap-1 text-[10px] text-[#81c784]/50"><CheckIcon className="w-3 h-3" />Paid {inv.paidDate}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile detail sheet */}
      {selected && (
        <MobileDetailSheet title="Invoice" onClose={() => setSelected(null)}>
          <div className="space-y-6 pt-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] font-mono text-white/30">{selected.id}</div>
                <div className="text-white font-black text-3xl tabular-nums mt-1">${selected.amount}</div>
              </div>
              <StatusBadge status={selected.status} />
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1.5">Customer</div>
                <div className="text-white/70 text-sm">{selected.customer}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1.5">Job Date</div>
                  <div className="text-white/70 text-sm">{selected.jobDate}</div>
                </div>
                <div>
                  <div className="text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1.5">
                    {selected.status === 'paid' ? 'Paid Date' : 'Days Out'}
                  </div>
                  <div className="text-sm">
                    {selected.status === 'paid'
                      ? <span className="text-white/50">{selected.paidDate}</span>
                      : <AgingBadge days={selected.daysOut} />}
                  </div>
                </div>
              </div>
            </div>
            {selected.status !== 'paid' && (
              <div className="flex gap-3">
                <button onClick={() => { onMarkPaid(selected.id); setSelected(null); }}
                  className="flex-1 py-3 text-[10px] font-bold tracking-widest uppercase text-[#0d1117]"
                  style={{ background: '#81c784' }}>
                  Mark Paid
                </button>
                <button className="flex-1 py-3 text-[10px] font-bold tracking-widest uppercase text-white/30 bg-white/5">
                  Resend
                </button>
              </div>
            )}
            {selected.status === 'paid' && (
              <div className="flex items-center gap-2 text-sm text-[#81c784]/60">
                <CheckIcon className="w-4 h-4" />Paid {selected.paidDate}
              </div>
            )}
          </div>
        </MobileDetailSheet>
      )}
    </div>
  );
}

function FleetPanel() {
  const [fleet, setFleet] = useState(FLEET_INIT);
  const toggleStatus = (id: string) => setFleet(f => f.map(t => t.id === id ? { ...t, status: t.status === 'active' ? 'maintenance' : 'active', alert: t.status === 'active' ? 'Manually set to maintenance' : null } : t));
  return (
    <div>
      <PanelHeader title="Fleet" sub={`${fleet.length} vehicles · ${fleet.filter(t=>t.status==='active').length} active`} />
      <div className="grid sm:grid-cols-2 gap-12">
        {fleet.map(truck => (
          <div key={truck.id}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <TruckIcon className={cn('w-5 h-5', truck.status==='active'?'text-white/35':'text-[#ef9a9a]/50')} />
                <div>
                  <div className="text-white text-sm font-bold">{truck.name}</div>
                  <div className="text-white/20 text-[10px]">{truck.year} {truck.make} {truck.model} · {truck.id}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={truck.status} />
                <button onClick={() => toggleStatus(truck.id)}
                  className="text-[9px] tracking-widest uppercase text-white/25 hover:text-white/50 bg-white/5 hover:bg-white/10 px-2 py-1 transition-colors">
                  Toggle
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[{l:'Capacity',v:truck.capacity},{l:'Mileage',v:truck.mileage},{l:'Next Service',v:truck.nextService}].map(row=>(
                <div key={row.l}>
                  <div className="text-[9px] tracking-[0.2em] uppercase text-white/20 mb-0.5">{row.l}</div>
                  <div className={cn('text-sm font-medium', row.l==='Next Service'&&truck.status==='maintenance'?'text-[#ef9a9a]/70':'text-white/50')}>{row.v}</div>
                </div>
              ))}
            </div>
            {truck.alert && (
              <div className="flex items-center gap-1.5 mb-4">
                <ExclamationTriangleIcon className="w-3.5 h-3.5 text-[#ef9a9a]/60 flex-shrink-0" />
                <span className="text-[10px] text-[#ef9a9a]/60">{truck.alert}</span>
              </div>
            )}
            <div className="text-[9px] tracking-[0.25em] uppercase text-white/20 mb-3">Service Log</div>
            <div className="space-y-3">
              {truck.serviceLog.map((entry, i) => (
                <div key={i} className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-white/55 text-xs">{entry.type}</div>
                    <div className="text-white/25 text-[10px]">{entry.date} · {entry.mileage} mi</div>
                  </div>
                  <div className="text-white/35 text-xs font-mono flex-shrink-0">${entry.cost}</div>
                </div>
              ))}
            </div>
            <button className="flex items-center gap-1.5 text-[9px] tracking-widest uppercase text-white/25 hover:text-white/50 bg-white/5 hover:bg-white/8 px-3 py-2 transition-colors mt-5">
              <WrenchScrewdriverIcon className="w-3 h-3" /> Log Service
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AffiliatesPanel() {
  const [selected, setSelected] = useState<typeof AFFILIATES[0] | null>(null);
  const totalEarned = AFFILIATES.reduce((s,a)=>s+a.earned,0);
  const totalOwed   = AFFILIATES.reduce((s,a)=>s+a.owed,0);
  const totalRefs   = AFFILIATES.reduce((s,a)=>s+a.referrals,0);
  const tierColor: Record<string,string> = { Gold: '#fbbf24', Silver: '#94a3b8', Bronze: '#c2855a' };

  return (
    <div>
      <PanelHeader title="Affiliates" sub="Referral program · $10 commission per referred job (first 3 months)" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-8 mb-12">
        {[
          {icon:<UserGroupIcon className="w-5 h-5"/>,label:'Partners',value:String(AFFILIATES.length)},
          {icon:<GiftIcon className="w-5 h-5"/>,label:'Total Referrals',value:String(totalRefs)},
          {icon:<BanknotesIcon className="w-5 h-5"/>,label:'Total Earned',value:`$${totalEarned}`},
          {icon:<ArrowTrendingUpIcon className="w-5 h-5"/>,label:'Commissions Owed',value:`$${totalOwed}`},
        ].map(card=>(
          <div key={card.label}>
            <div className="text-white/25 mb-3">{card.icon}</div>
            <div className="text-3xl font-black text-white tabular-nums mb-1">{card.value}</div>
            <div className="text-[9px] tracking-[0.25em] uppercase text-white/30">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Mobile affiliate cards */}
      <div className="sm:hidden space-y-2 mb-12">
        {AFFILIATES.map(a => (
          <button key={a.id} onClick={() => setSelected(a)}
            className="w-full text-left p-4 bg-white/5 active:bg-white/10 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 flex items-center justify-center text-xs font-bold text-white/50 flex-shrink-0">
                  {a.name.charAt(0)}
                </div>
                <div>
                  <div className="text-white/80 text-sm font-medium">{a.name}</div>
                  <div className="text-white/30 text-[11px]">{a.company}</div>
                </div>
              </div>
              <span className="text-[9px] font-bold tracking-widest uppercase flex-shrink-0" style={{ color: tierColor[a.tier] }}>
                <StarIcon className="w-3 h-3 inline mr-0.5 -mt-0.5" />{a.tier}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-white font-bold text-sm">{a.referrals}</div>
                <div className="text-[9px] uppercase tracking-wide text-white/25">Refs</div>
              </div>
              <div>
                <div className="text-white/60 font-mono text-sm">${a.earned}</div>
                <div className="text-[9px] uppercase tracking-wide text-white/25">Earned</div>
              </div>
              <div>
                <div className={cn('font-mono text-sm font-bold', a.owed > 0 ? 'text-[#ffb74d]' : 'text-white/20')}>
                  {a.owed > 0 ? `$${a.owed}` : '—'}
                </div>
                <div className="text-[9px] uppercase tracking-wide text-white/25">Owed</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Desktop affiliate table */}
      <table className="hidden sm:table w-full text-sm mb-12">
        <thead><tr>{['Partner','Company','Tier','Referrals','Active Customers','Earned','Owed','Last Referral','Code'].map(h=><th key={h} className="pb-3 text-left text-[9px] tracking-[0.25em] uppercase text-white/20 font-medium pr-4">{h}</th>)}</tr></thead>
        <tbody>
          {AFFILIATES.map(a=>(
            <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white/40">{a.name.charAt(0)}</div>
                  <span className="text-white/80 text-xs">{a.name}</span>
                </div>
              </td>
              <td className="py-2.5 text-white/35 text-xs pr-4">{a.company}</td>
              <td className="py-2.5 pr-4"><span className="text-[9px] font-bold tracking-widest uppercase" style={{color:tierColor[a.tier]}}><StarIcon className="w-3 h-3 inline mr-0.5 -mt-0.5" />{a.tier}</span></td>
              <td className="py-2.5 text-white font-bold text-xs tabular-nums pr-4">{a.referrals}</td>
              <td className="py-2.5 text-white/50 text-xs tabular-nums pr-4">{a.active}</td>
              <td className="py-2.5 text-white/60 text-xs font-mono tabular-nums pr-4">${a.earned}</td>
              <td className="py-2.5 pr-4"><span className={cn('text-xs font-mono font-bold tabular-nums', a.owed>0?'text-[#ffb74d]':'text-white/20')}>{a.owed>0?`$${a.owed}`:'—'}</span></td>
              <td className="py-2.5 text-white/30 text-xs pr-4">{a.lastReferral}</td>
              <td className="py-2.5">
                <div className="flex items-center gap-1.5">
                  <code className="text-[10px] text-white/35 font-mono">{a.code}</code>
                  <button className="text-white/20 hover:text-white/50 transition-colors"><LinkIcon className="w-3 h-3" /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <SectionLabel eyebrow="Program" title="Tier Structure" />
        <div className="grid sm:grid-cols-3 gap-6 mt-6">
          {[
            {tier:'Bronze',color:'#c2855a',req:'1–5 referrals',perk:'$10/job commission'},
            {tier:'Silver',color:'#94a3b8',req:'6–10 referrals',perk:'$12/job + priority listings'},
            {tier:'Gold',  color:'#fbbf24',req:'11+ referrals', perk:'$15/job + co-marketing'},
          ].map(t=>(
            <div key={t.tier} className="p-4 bg-white/5 sm:bg-transparent">
              <div className="text-sm font-bold mb-1" style={{color:t.color}}><StarIcon className="w-4 h-4 inline mr-1 -mt-0.5" />{t.tier}</div>
              <div className="text-white/40 text-xs mb-0.5">{t.req}</div>
              <div className="text-white/25 text-[11px]">{t.perk}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile affiliate detail sheet */}
      {selected && (
        <MobileDetailSheet title="Affiliate" onClose={() => setSelected(null)}>
          <div className="space-y-6 pt-2">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 flex items-center justify-center text-xl font-bold text-white/50 flex-shrink-0">
                {selected.name.charAt(0)}
              </div>
              <div>
                <div className="text-white font-bold text-base">{selected.name}</div>
                <div className="text-white/30 text-xs mt-0.5">{selected.company}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { l: 'Tier', v: <span style={{ color: tierColor[selected.tier] }}><StarIcon className="w-3.5 h-3.5 inline mr-0.5 -mt-0.5" />{selected.tier}</span> },
                { l: 'Member Since', v: <span className="text-white/70">{selected.since}</span> },
                { l: 'Total Referrals', v: <span className="text-white font-bold">{selected.referrals}</span> },
                { l: 'Active Customers', v: <span className="text-white/70">{selected.active}</span> },
                { l: 'Total Earned', v: <span className="text-white/70 font-mono">${selected.earned}</span> },
                { l: 'Commissions Owed', v: <span className={selected.owed > 0 ? 'text-[#ffb74d] font-bold' : 'text-white/25'}>{selected.owed > 0 ? `$${selected.owed}` : '—'}</span> },
              ].map(({ l, v }) => (
                <div key={l}>
                  <div className="text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1.5">{l}</div>
                  <div className="text-sm font-medium">{v}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1.5">Last Referral</div>
              <div className="text-white/70 text-sm">{selected.lastReferral}</div>
            </div>
            <div>
              <div className="text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1.5">Referral Code</div>
              <div className="flex items-center gap-3">
                <code className="text-white/60 font-mono text-base tracking-widest">{selected.code}</code>
                <button className="text-white/25 hover:text-white/60 transition-colors">
                  <LinkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </MobileDetailSheet>
      )}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className={cn('relative w-8 h-4 rounded-full transition-colors duration-200 flex-shrink-0', checked?'':'bg-white/10')} style={checked?{background:ICY}:undefined}>
      <span className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-200', checked?'left-4.5':'left-0.5')} style={checked?{left:'calc(100% - 14px)'}:{left:'2px'}} />
    </button>
  );
}

function SettingsPanel() {
  const [biz, setBiz] = useState({ name:'Silva Star Water Solutions', address:'4201 S Congress Ave Suite 12', city:'Austin', state:'TX', zip:'78745', phone:'(512) 555-8820', email:'info@silvastarwater.com', taxId:'82-4917503' });
  const [rates, setRates] = useState({ greyWaterGal:'0.28', grease:'125', eventBase:'420', eventPerVendor:'80', radius:'25' });
  const [notifs, setNotifs] = useState({ newJob:true, paymentReminder:true, fleetAlert:true, weeklyReport:false, affiliateActivity:true });
  const [saved, setSaved] = useState(false);
  const updBiz = (k: keyof typeof biz, v: string) => setBiz(b=>({...b,[k]:v}));
  const updRates = (k: keyof typeof rates, v: string) => setRates(r=>({...r,[k]:v}));
  const toggleNotif = (k: keyof typeof notifs) => setNotifs(n=>({...n,[k]:!n[k]}));
  const save = () => { setSaved(true); setTimeout(()=>setSaved(false),2500); };
  const inputCls = "w-full bg-white/5 text-white text-sm px-3 py-2.5 focus:outline-none focus:bg-white/8 placeholder:text-white/20 transition-colors";

  return (
    <div className="max-w-2xl space-y-12">
      <PanelHeader title="Settings" sub="Business configuration and preferences" />

      <div>
        <SectionLabel eyebrow="Company" title="Business Information" />
        <div className="mt-6 grid grid-cols-2 gap-5">
          <div className="col-span-2">
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Business Name</label>
            <input value={biz.name} onChange={e=>updBiz('name',e.target.value)} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Street Address</label>
            <input value={biz.address} onChange={e=>updBiz('address',e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">City</label>
            <input value={biz.city} onChange={e=>updBiz('city',e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">State</label>
              <input value={biz.state} onChange={e=>updBiz('state',e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">ZIP</label>
              <input value={biz.zip} onChange={e=>updBiz('zip',e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Phone</label>
            <input value={biz.phone} onChange={e=>updBiz('phone',e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Email</label>
            <input value={biz.email} onChange={e=>updBiz('email',e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Tax ID</label>
            <input value={biz.taxId} onChange={e=>updBiz('taxId',e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      <div>
        <SectionLabel eyebrow="Pricing" title="Service Rates" />
        <div className="mt-6 grid grid-cols-2 gap-5">
          {[
            {k:'greyWaterGal',l:'Grey Water Rate ($/gal)'},
            {k:'grease',l:'Grease Disposal (flat $)'},
            {k:'eventBase',l:'Event Base Rate ($, up to 5 vendors)'},
            {k:'eventPerVendor',l:'Per Vendor Above 5 ($)'},
            {k:'radius',l:'Service Radius (miles)'},
          ].map(({k,l})=>(
            <div key={k}>
              <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">{l}</label>
              <input value={rates[k as keyof typeof rates]} onChange={e=>updRates(k as keyof typeof rates,e.target.value)} className={inputCls} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel eyebrow="Alerts" title="Notifications" />
        <div className="mt-6 space-y-5">
          {[
            {k:'newJob',l:'New job booked',d:'Email alert when a customer books or confirms'},
            {k:'paymentReminder',l:'Payment overdue reminders',d:'Auto-send reminders for invoices 7, 14, 30 days past due'},
            {k:'fleetAlert',l:'Fleet maintenance alerts',d:'Alert when a vehicle is due for service'},
            {k:'weeklyReport',l:'Weekly summary report',d:'Monday morning digest: jobs completed, revenue, outstanding'},
            {k:'affiliateActivity',l:'Affiliate activity',d:'Notify when a new referral is made'},
          ].map(({k,l,d})=>(
            <div key={k} className="flex items-start justify-between gap-4">
              <div>
                <div className="text-white/70 text-sm">{l}</div>
                <div className="text-white/25 text-[11px] mt-0.5">{d}</div>
              </div>
              <Toggle checked={notifs[k as keyof typeof notifs]} onChange={()=>toggleNotif(k as keyof typeof notifs)} />
            </div>
          ))}
        </div>
      </div>

      <button onClick={save}
        className="px-8 py-3 text-[10px] font-black tracking-widest uppercase transition-all"
        style={saved ? { background: '#81c784', color: '#0d1117' } : { background: ICY, color: '#0d1117' }}>
        {saved ? '✓ Changes Saved' : 'Save Changes'}
      </button>
    </div>
  );
}

function WebmailPanel() {
  const [tab, setTab] = useState<'inbox' | 'sent' | 'drafts'>('inbox');
  const [selected, setSelected] = useState<number | null>(null);
  const tagColor: Record<string, string> = { customer: ICY, affiliate: '#c084fc', payment: '#81c784', admin: '#ffb74d' };
  const inbox = EMAILS;
  const selectedEmail = inbox.find(e => e.id === selected);

  return (
    <div>
      <PanelHeader title="Webmail" sub="info@silvastarwater.com"
        action={
          <button className="px-4 py-2 text-[10px] font-black tracking-widest uppercase text-[#0d1117]" style={{ background: ICY }}>
            + Compose
          </button>
        }
      />
      <div className="flex gap-1 p-1 bg-white/5 rounded-full mb-6 w-fit">
        {(['inbox', 'sent', 'drafts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-3 py-1.5 text-[9px] font-black tracking-widest uppercase rounded-full transition-all', tab === t ? 'bg-white text-black' : 'text-white/40 hover:text-white hover:bg-white/10')}>
            {t}{t === 'inbox' ? ` (${inbox.filter(e => !e.read).length})` : ''}
          </button>
        ))}
      </div>

      <div className="grid xl:grid-cols-5 gap-8">
        {/* Email list */}
        <div className="xl:col-span-2 space-y-0.5">
          {tab === 'sent' && <div className="text-white/20 text-sm py-8 text-center">No sent messages</div>}
          {tab === 'drafts' && <div className="text-white/20 text-sm py-8 text-center">No drafts</div>}
          {tab === 'inbox' && inbox.map(email => (
            <button key={email.id} onClick={() => setSelected(email.id)}
              className={cn('w-full text-left px-3 py-3 transition-colors hover:bg-white/[0.03]', selected === email.id && 'bg-white/[0.05]')}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className={cn('text-xs font-medium', email.read ? 'text-white/50' : 'text-white')}>{email.from}</span>
                <span className="text-[10px] text-white/20 whitespace-nowrap flex-shrink-0">{email.date}</span>
              </div>
              <div className={cn('text-xs mb-1 truncate', email.read ? 'text-white/40' : 'text-white/80 font-medium')}>{email.subject}</div>
              <div className="flex items-center gap-2">
                {!email.read && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ICY }} />}
                <span className="text-[10px] text-white/20 truncate">{email.preview}</span>
                <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 flex-shrink-0" style={{ color: tagColor[email.tag], background: `${tagColor[email.tag]}18` }}>{email.tag}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Email detail */}
        <div className="xl:col-span-3">
          {!selectedEmail && (
            <div className="flex flex-col items-center justify-center h-48 text-white/15">
              <EnvelopeIcon className="w-10 h-10 mb-3" />
              <span className="text-sm">Select a message</span>
            </div>
          )}
          {selectedEmail && (
            <div>
              <div className="mb-4">
                <div className="text-white font-bold text-base mb-1">{selectedEmail.subject}</div>
                <div className="flex items-center gap-3 text-[11px] text-white/30">
                  <span>From: {selectedEmail.from}</span>
                  <span>·</span>
                  <span>{selectedEmail.date}</span>
                </div>
              </div>
              <div className="text-white/55 text-sm leading-relaxed">
                {selectedEmail.preview} Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
              </div>
              <div className="flex gap-3 mt-6">
                <button className="px-4 py-2 text-[9px] font-black tracking-widest uppercase text-[#0d1117]" style={{ background: ICY }}>Reply</button>
                <button className="px-4 py-2 text-[9px] font-black tracking-widest uppercase text-white/30 bg-white/5 hover:bg-white/10 transition-colors">Forward</button>
                <button className="px-4 py-2 text-[9px] font-black tracking-widest uppercase text-white/30 bg-white/5 hover:bg-white/10 transition-colors">Archive</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NewsletterPanel() {
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState({ subject: '', body: '' });
  const sent = CAMPAIGNS.filter(c => c.status === 'sent');
  const avgOpen = Math.round(sent.reduce((s, c) => s + (c.openRate ?? 0), 0) / sent.length);
  const totalSubs = 51;

  return (
    <div>
      <PanelHeader title="Newsletter" sub={`${totalSubs} subscribers · ${avgOpen}% avg open rate`}
        action={
          <button onClick={() => setComposing(true)} className="px-4 py-2 text-[10px] font-black tracking-widest uppercase text-[#0d1117]" style={{ background: ICY }}>
            + New Campaign
          </button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-8 mb-12">
        {[
          { label: 'Subscribers', value: String(totalSubs) },
          { label: 'Avg Open Rate', value: `${avgOpen}%` },
          { label: 'Campaigns Sent', value: String(sent.length) },
        ].map(k => (
          <div key={k.label}>
            <div className="text-3xl font-black text-white tabular-nums mb-1">{k.value}</div>
            <div className="text-[9px] tracking-[0.25em] uppercase text-white/30">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Compose panel */}
      {composing && (
        <div className="mb-10">
          <SectionLabel eyebrow="Composing" title="New Campaign" />
          <div className="mt-5 space-y-4 max-w-2xl">
            <div>
              <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Subject Line</label>
              <input value={draft.subject} onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))}
                placeholder="e.g. July Service Update + Pricing"
                className="w-full bg-white/5 text-white text-sm px-3 py-2.5 focus:outline-none placeholder:text-white/20" />
            </div>
            <div>
              <label className="block text-[9px] tracking-[0.25em] uppercase text-white/30 mb-1.5">Message Body</label>
              <textarea value={draft.body} onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
                placeholder="Write your message to customers and partners..."
                rows={5} className="w-full bg-white/5 text-white text-sm px-3 py-2.5 focus:outline-none placeholder:text-white/20 resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setComposing(false)}
                className="px-5 py-2 text-[9px] font-black tracking-widest uppercase text-[#0d1117]" style={{ background: ICY }}>
                Send to {totalSubs} subscribers
              </button>
              <button onClick={() => setComposing(false)}
                className="px-5 py-2 text-[9px] font-black tracking-widest uppercase text-white/30 bg-white/5 hover:bg-white/10 transition-colors">
                Save Draft
              </button>
              <button onClick={() => setComposing(false)} className="px-5 py-2 text-[9px] font-black tracking-widest uppercase text-white/25 hover:text-white/50 transition-colors">
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign list */}
      <SectionLabel eyebrow="History" title="Campaigns" />
      <table className="w-full text-sm mt-5">
        <thead>
          <tr>{['Subject', 'Status', 'Date', 'Recipients', 'Opens', 'Open Rate'].map(h => (
            <th key={h} className="pb-3 text-left text-[9px] tracking-[0.25em] uppercase text-white/20 font-medium pr-4">{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {CAMPAIGNS.map(c => (
            <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
              <td className="py-2.5 text-white/70 text-xs pr-4 max-w-xs">{c.subject}</td>
              <td className="py-2.5 pr-4"><StatusBadge status={c.status} /></td>
              <td className="py-2.5 text-white/35 text-xs font-mono pr-4">{c.sentDate ?? '—'}</td>
              <td className="py-2.5 text-white/50 text-xs tabular-nums pr-4">{c.recipients ?? '—'}</td>
              <td className="py-2.5 text-white/50 text-xs tabular-nums pr-4">{c.opens ?? '—'}</td>
              <td className="py-2.5 pr-4">
                {c.openRate != null
                  ? <span className="text-xs font-bold tabular-nums" style={{ color: c.openRate >= 60 ? '#81c784' : c.openRate >= 50 ? '#fff176' : '#ffb74d' }}>{c.openRate}%</span>
                  : <span className="text-white/20 text-xs">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',   label: 'Overview',   icon: <HomeIcon className="w-4 h-4" />                  },
  { id: 'schedule',   label: 'Schedule',   icon: <CalendarDaysIcon className="w-4 h-4" />           },
  { id: 'jobs',       label: 'Jobs',       icon: <ClipboardDocumentListIcon className="w-4 h-4" />  },
  { id: 'customers',  label: 'Customers',  icon: <UserGroupIcon className="w-4 h-4" />              },
  { id: 'invoices',   label: 'Invoices',   icon: <DocumentTextIcon className="w-4 h-4" />           },
  { id: 'fleet',      label: 'Fleet',      icon: <TruckIcon className="w-4 h-4" />                  },
  { id: 'affiliates', label: 'Affiliates', icon: <ArrowTrendingUpIcon className="w-4 h-4" />        },
  { id: 'settings',   label: 'Settings',   icon: <Cog6ToothIcon className="w-4 h-4" />              },
];

function Sidebar({ activeSection, onNav, onAction, outstandingCount, onClose }: {
  activeSection: Section;
  onNav: (s: Section) => void;
  onAction: (a: ModalType) => void;
  outstandingCount: number;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-black/60 w-64 overflow-hidden">
      <div className="px-5 py-5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: ICY }}>
            <BeakerIcon className="w-4 h-4 text-[#0d1117]" />
          </div>
          <div>
            <div className="text-white font-bold text-sm tracking-wider uppercase leading-none">Silva Star</div>
            <div className="text-[8px] tracking-[0.25em] uppercase leading-none mt-0.5 text-white/35">Water Solutions</div>
          </div>
        </div>
        {onClose && <button onClick={onClose} className="text-white/40 hover:text-white lg:hidden"><XMarkIcon className="w-4 h-4" /></button>}
      </div>

      <div className="px-4 pb-4 space-y-2 flex-shrink-0">
        <button onClick={() => onAction('create-job')}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold tracking-wider uppercase text-[#0d1117] hover:opacity-90 transition-opacity"
          style={{ background: ICY }}>
          <PlusIcon className="w-3.5 h-3.5" /> Create Job
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onAction('invoice')}
            className="flex items-center justify-center gap-1.5 px-2 py-2 text-[10px] font-bold tracking-wider uppercase text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 transition-colors">
            <DocumentTextIcon className="w-3 h-3" /> Invoice
          </button>
          <button onClick={() => onAction('complete')}
            className="flex items-center justify-center gap-1.5 px-2 py-2 text-[10px] font-bold tracking-wider uppercase text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 transition-colors">
            <CheckCircleIcon className="w-3 h-3" /> Complete
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => { onNav(item.id); onClose?.(); }}
            className={cn('w-full flex items-center gap-3 px-3 py-2.5 text-xs tracking-wider uppercase transition-all text-left',
              activeSection === item.id ? 'text-[#4fc3f7] bg-white/5' : 'text-white/35 hover:text-white/70 hover:bg-white/5')}>
            <span className={activeSection === item.id ? 'text-[#4fc3f7]' : 'text-white/25'}>{item.icon}</span>
            {item.label}
            {item.id === 'invoices' && outstandingCount > 0 && (
              <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(255,183,77,0.15)', color: '#ffb74d' }}>{outstandingCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="px-4 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">DS</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate">Daniel Silva</div>
            <div className="text-white/30 text-[10px] truncate">Owner / Operator</div>
          </div>
          <ChevronDownIcon className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function SilvaStarDashboard() {
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [modal, setModal] = useState<ModalType>(null);
  const [jobs, setJobs] = useState<Job[]>(ALL_JOBS_INIT);
  const [invoices, setInvoices] = useState<Invoice[]>(ALL_INVOICES_INIT);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const outstandingCount = invoices.filter(i => i.status !== 'paid').length;

  const markJobsComplete = (ids: string[]) =>
    setJobs(prev => prev.map(j => ids.includes(j.id) ? { ...j, status: 'completed' } : j));

  const markInvoicePaid = (id: string) =>
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'paid', paidDate: 'Jun 18' } : i));

  const handleNav = (s: Section) => {
    setActiveSection(s);
    mainRef.current?.scrollTo({ top: 0 });
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
    window.scrollTo(0, 0);
  }, [activeSection]);

  return (
    <div className="min-h-screen bg-[#0d1117] flex font-sans">

      {/* Sidebar – desktop */}
      <div className="hidden lg:block flex-shrink-0" style={{ width: 256 }}>
        <div className="fixed top-0 left-0 bottom-0 w-64 z-30">
          <Sidebar activeSection={activeSection} onNav={handleNav} onAction={setModal} outstandingCount={outstandingCount} />
        </div>
      </div>

      {/* Sidebar – mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64">
            <Sidebar activeSection={activeSection} onNav={handleNav} onAction={setModal} outstandingCount={outstandingCount} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Modals */}
      {modal === 'create-job' && <CreateJobModal onClose={() => setModal(null)} />}
      {modal === 'invoice'    && <CreateInvoiceModal onClose={() => setModal(null)} />}
      {modal === 'complete'   && <CompleteJobsModal onClose={() => setModal(null)} jobs={jobs} onComplete={markJobsComplete} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-[#0d1117]/90 backdrop-blur-md h-14 flex items-center px-4 sm:px-6 gap-4 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-white/40 hover:text-white">
            <Bars3Icon className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-sm tracking-wider uppercase">{NAV_ITEMS.find(n=>n.id===activeSection)?.label ?? (activeSection === 'webmail' ? 'Webmail' : activeSection === 'newsletter' ? 'Newsletter' : 'Dashboard')}</div>
            <div className="text-white/25 text-[10px] tracking-widest">Silva Star Water Solutions · Austin, TX</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-white/30 mr-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#81c784] animate-pulse" />
              {jobs.filter(j=>j.date==='Jun 18'&&j.status!=='completed').length} jobs today
            </div>
            <button className="relative text-white/30 hover:text-white transition-colors">
              <BellIcon className="w-5 h-5" />
              {outstandingCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#ffb74d]" />}
            </button>
            <button onClick={() => setModal('create-job')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase text-[#0d1117] hover:opacity-90 transition-opacity"
              style={{ background: ICY }}>
              <PlusIcon className="w-3 h-3" /> New Job
            </button>
          </div>
        </header>

        <main ref={mainRef} className="flex-1 px-4 sm:px-6 py-8 overflow-y-auto">
          {activeSection === 'overview'   && <OverviewPanel jobs={jobs} invoices={invoices} onCompleteJob={id=>markJobsComplete([id])} onMarkPaid={markInvoicePaid} />}
          {activeSection === 'schedule'   && <SchedulePanel jobs={jobs} />}
          {activeSection === 'jobs'       && <JobsPanel jobs={jobs} onCompleteJob={id=>markJobsComplete([id])} />}
          {activeSection === 'customers'  && <CustomersPanel />}
          {activeSection === 'invoices'   && <InvoicesPanel invoices={invoices} onMarkPaid={markInvoicePaid} />}
          {activeSection === 'fleet'      && <FleetPanel />}
          {activeSection === 'affiliates' && <AffiliatesPanel />}
          {activeSection === 'settings'   && <SettingsPanel />}
          {activeSection === 'webmail'    && <WebmailPanel />}
          {activeSection === 'newsletter' && <NewsletterPanel />}
          <ConsoleTray onNav={handleNav} activeSection={activeSection} />
        </main>
      </div>
    </div>
  );
}
