/**
 * Support Page — open a technical support ticket, see your own, and find the
 * guides. Tickets go to the company inbox and the admin Support console.
 */

import { Link } from 'react-router-dom';
import {
  QuestionMarkCircleIcon,
  BookOpenIcon,
  CameraIcon,
  ArrowRightIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

import { Helmet } from 'react-helmet-async';
import { useAuth } from '../contexts/AuthContext';
import SupportRequestForm from '../components/support/SupportRequestForm';
import MyTickets from '../components/support/MyTickets';

const surface = { borderRadius: 0 } as const;

const guides = [
  { to: '/docs#faq', icon: QuestionMarkCircleIcon, title: 'FAQ', text: 'Answers to the questions we get most' },
  { to: '/docs', icon: BookOpenIcon, title: 'Documentation', text: 'Guides for affiliates, clients and the platform' },
  { to: '/docs/photographer-guide', icon: CameraIcon, title: 'Photographer Guide', text: 'Galleries, uploads, availability and job pay' },
];

export default function Support() {
  const { user } = useAuth();

  return (
    <>
      <Helmet>
        <title>THE LOST+UNFOUNDS | Support Center</title>
        <meta name="description" content="Get technical support from THE LOST+UNFOUNDS. Open a ticket for help with your affiliate account, photographer dashboard, galleries, bookings or payouts." />
        <link rel="canonical" href="https://www.thelostandunfounds.com/support" />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left">
        <div className="mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">SUPPORT CENTER</h1>
          <p className="text-lg text-white/70">
            Something not working? Open a ticket. We reply by email, and the whole conversation stays on the ticket page.
          </p>
        </div>

        {user && <MyTickets className="mb-8" />}

        {!user && (
          <div className="mb-10">
            <h2 className="text-xl font-black uppercase tracking-widest text-white mb-4">Open A Ticket</h2>
            <SupportRequestForm />
            <p className="text-sm text-white/50 mt-3">
              Have an account? Sign in first (top right) and your tickets show up on your dashboard.
            </p>
          </div>
        )}

        <h2 className="text-xl font-black uppercase tracking-widest text-white mb-4">Guides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-10">
          {guides.map(g => (
            <Link
              key={g.to}
              to={g.to}
              className="group bg-white/5 hover:bg-white/10 px-5 py-4 flex items-start justify-between gap-3 transition-colors"
              style={surface}
            >
              <div className="flex items-start gap-3">
                <g.icon className="w-5 h-5 text-white mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white">{g.title}</h3>
                  <p className="text-sm text-white/60 mt-1">{g.text}</p>
                </div>
              </div>
              <ArrowRightIcon className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all mt-1 shrink-0" />
            </Link>
          ))}
        </div>

        {/* "Support" reads two ways, and people arriving here looking to back
            the work had nowhere to go. Send them to checkout. */}
        <Link
          to="/pay"
          className="group bg-white text-black px-6 py-5 flex items-center justify-between hover:bg-white/90 transition-colors"
          style={surface}
        >
          <div className="flex items-center gap-4">
            <HeartIcon className="w-5 h-5 shrink-0" />
            <div>
              <h3 className="text-lg font-bold leading-none">Support The Work</h3>
              <p className="text-sm text-black/70 mt-1.5">Chip in any amount, or settle an invoice</p>
            </div>
          </div>
          <ArrowRightIcon className="w-5 h-5 text-black/50 group-hover:text-black group-hover:translate-x-2 transition-all" />
        </Link>
      </div>
    </>
  );
}
