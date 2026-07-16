import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CubeIcon,
  BeakerIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';

type Machine = {
  kicker: string;
  name: string;
  role: string;
  roleAccent: string;
  Icon: typeof CubeIcon;
  specs: { k: string; v: string }[];
  materials: { label: string; hero?: boolean }[];
  apps: string[];
  foot: string;
};

const MACHINES: Machine[] = [
  {
    kicker: 'FDM · Fused Deposition',
    name: 'QIDI Q2',
    role: 'The industrial workhorse',
    roleAccent: 'Layered plastic for rigidity, strength, and heat resistance. When it has to work.',
    Icon: CubeIcon,
    specs: [
      { k: 'Build Volume', v: '270 × 270 × 256 mm' },
      { k: 'Max Speed', v: '600 mm/s' },
      { k: 'Hotend', v: 'Up to 370 °C' },
      { k: 'Chamber', v: 'Heated 65 °C' },
      { k: 'Motion', v: 'CoreXY · Enclosed · Filtered' },
    ],
    materials: [
      { label: 'PLA' },
      { label: 'PETG' },
      { label: 'ABS' },
      { label: 'ASA' },
      { label: 'TPU' },
      { label: 'PA / Nylon', hero: true },
      { label: 'PC / Polycarbonate', hero: true },
      { label: 'PPS-CF / Carbon-Fiber', hero: true },
    ],
    apps: [
      'Jigs, fixtures & tooling for manufacturers',
      'Functional replacement parts — gears, brackets, housings',
      'End-use components — enclosures, mounts, adapters',
      'Drone / robotics / RC parts in carbon-fiber',
      'Automotive & marine parts (ASA / PC)',
      'Flexible parts — gaskets, seals, grips (TPU)',
    ],
    foot: 'Sells on strength & materials — functional, industrial, durable.',
  },
  {
    kicker: 'MSLA · 405nm Resin',
    name: 'Elegoo Mars 5 Ultra',
    role: 'The precision specialist',
    roleAccent: 'UV-cured resin at 9K for flawless surface and micron detail. When it has to look perfect.',
    Icon: BeakerIcon,
    specs: [
      { k: 'Build Volume', v: '153 × 78 × 165 mm' },
      { k: 'Resolution', v: '9K · 8520 × 4320 px' },
      { k: 'XY Detail', v: '18 µm' },
      { k: 'Layer Height', v: '0.01 – 0.2 mm' },
      { k: 'Light Source', v: '405nm COB · Tilt-Release' },
    ],
    materials: [
      { label: 'Standard' },
      { label: 'Tough / ABS-like' },
      { label: 'Water-Washable' },
      { label: 'Castable', hero: true },
      { label: 'Flexible' },
      { label: 'Biocompatible / Dental', hero: true },
      { label: 'High-Temp' },
    ],
    apps: [
      'Dental models & surgical guides (biocompatible)',
      'Jewelry casting masters (castable — high margin)',
      'Miniatures & terrain for tabletop gaming',
      'Figurines, busts & collectibles',
      'Anatomical / medical models for training',
      'Looks-like prototypes — presentation-grade finish',
    ],
    foot: 'Sells on detail & finish — precise, refined, beautiful.',
  },
];

const CLIENTS = [
  { t: 'Manufacturers & Shops', d: 'Custom jigs, fixtures, tooling — no minimum order.' },
  { t: 'Product & Startups', d: 'Works-like & looks-like prototypes on demand.' },
  { t: 'Dental & Medical', d: 'Models, guides, anatomical & training aids.' },
  { t: 'Jewelers', d: 'Castable masters for rings, pendants, custom pieces.' },
  { t: 'Repair & Service', d: 'Obsolete / discontinued parts, reverse-engineered.' },
  { t: 'Architecture', d: 'Scale & presentation models for client pitches.' },
  { t: 'Gov & Institutions', d: 'Training aids, equipment parts, STEM & models.' },
  { t: 'Gaming & Collectors', d: 'Minis, terrain, display & custom commissions.' },
];

const MATRIX = [
  { need: 'Strong / structural part', machine: 'FDM · Q2', mat: 'PC, Nylon, CF', best: 'Load-bearing brackets, housings, tooling' },
  { need: 'Heat / UV exposure', machine: 'FDM · Q2', mat: 'ASA, PC', best: 'Automotive, marine, outdoor' },
  { need: 'Flexible / rubber-like', machine: 'FDM · Q2', mat: 'TPU', best: 'Gaskets, grips, seals, bumpers' },
  { need: 'Ultra-fine detail', machine: 'Resin · Mars 5', mat: 'Standard / Tough', best: 'Miniatures, figurines, cosmetic parts' },
  { need: 'Casting master', machine: 'Resin · Mars 5', mat: 'Castable', best: 'Jewelry, dental crowns' },
  { need: 'Skin / oral contact', machine: 'Resin · Mars 5', mat: 'Biocompatible', best: 'Dental guides, medical models' },
];

const IMG_SEARCH = 'https://www.google.com/search?tbm=isch&q=';
const EXAMPLES: { name: string; machine: 'FDM' | 'Resin'; query: string }[] = [
  { name: 'Dental Model / Mold', machine: 'Resin', query: '3D printed dental model resin' },
  { name: 'Jewelry Casting Master', machine: 'Resin', query: 'castable resin ring 3D print jewelry' },
  { name: 'Tabletop Miniature (28mm)', machine: 'Resin', query: 'resin 3D printed miniature 28mm' },
  { name: 'Anatomical Model', machine: 'Resin', query: '3D printed anatomical heart model' },
  { name: 'Custom Figurine / Bust', machine: 'Resin', query: 'custom 3D printed bust portrait figurine' },
  { name: 'Custom Jig / Fixture', machine: 'FDM', query: '3D printed jig fixture manufacturing' },
  { name: 'Replacement Part', machine: 'FDM', query: '3D printed replacement gear part' },
  { name: 'Drone / Carbon-Fiber Part', machine: 'FDM', query: 'carbon fiber 3D printed drone frame' },
  { name: 'Enclosure / Housing', machine: 'FDM', query: '3D printed electronics enclosure ASA' },
  { name: 'Flexible Gasket / Seal', machine: 'FDM', query: 'TPU 3D printed gasket seal' },
];

function MachineBlock({ machine, index, invert }: { machine: Machine; index: number; invert: boolean }) {
  const { Icon } = machine;

  const shell = invert ? 'bg-white text-black' : 'bg-black text-white';
  const mutedStrong = invert ? 'text-black/40' : 'text-white/40';
  const mutedSoft = invert ? 'text-black/60' : 'text-white/50';
  const line = invert ? 'border-black/10' : 'border-white/10';
  const lineDash = invert ? 'border-black/15' : 'border-white/15';
  const chipBase = invert
    ? 'border-black/20 text-black/70'
    : 'border-white/20 text-white/70';
  const chipHero = invert ? 'bg-black text-white' : 'bg-white text-black';
  const markerBorder = invert ? 'border-black/40' : 'border-white/40';

  return (
    <section className={`${shell} py-16 md:py-24`}>
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        <div className="flex items-center gap-4 mb-2">
          <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${mutedStrong}`}>
            0{index + 1}
          </span>
          <span className={`text-[10px] font-black uppercase tracking-[0.35em] ${mutedSoft} font-mono`}>
            {machine.kicker}
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <h2 className="text-[clamp(2rem,6vw,4rem)] font-black uppercase tracking-tighter leading-[0.9]">
              {machine.name}
            </h2>
            <p className="text-lg md:text-2xl font-light mt-2">{machine.role}</p>
            <p className={`text-sm md:text-base font-light mt-2 max-w-xl ${mutedSoft}`}>
              {machine.roleAccent}
            </p>
          </div>
          <Icon className={`w-14 h-14 md:w-20 md:h-20 shrink-0 ${invert ? 'text-black/15' : 'text-white/15'}`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Specs + Materials */}
          <div>
            <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${mutedStrong} mb-4`}>
              Specifications
            </p>
            <div className={`border-t ${lineDash}`}>
              {machine.specs.map(({ k, v }) => (
                <div key={k} className={`flex items-center justify-between gap-6 py-3 border-b ${lineDash}`}>
                  <span className={`text-[10px] font-black uppercase tracking-[0.25em] ${mutedStrong}`}>{k}</span>
                  <span className="text-sm font-mono tabular-nums text-right">{v}</span>
                </div>
              ))}
            </div>

            <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${mutedStrong} mt-10 mb-4`}>
              Materials — The Selling Point
            </p>
            <div className="flex flex-wrap gap-2">
              {machine.materials.map(({ label, hero }) => (
                <span
                  key={label}
                  className={`text-xs font-mono uppercase tracking-wider px-3 py-1.5 ${
                    hero ? `${chipHero} font-bold` : `border ${chipBase}`
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Applications */}
          <div>
            <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${mutedStrong} mb-4`}>
              What We Make
            </p>
            <ul className="space-y-4">
              {machine.apps.map((app) => (
                <li key={app} className="flex items-start gap-4">
                  <span className={`mt-1.5 w-2.5 h-2.5 shrink-0 rotate-45 border ${markerBorder}`} />
                  <span className={`text-sm md:text-base font-light ${mutedSoft}`}>{app}</span>
                </li>
              ))}
            </ul>
            <p className={`text-xs font-mono italic mt-10 pt-6 border-t ${line} ${mutedStrong}`}>
              {machine.foot}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Capabilities() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Helmet>
        <title>THE LOST+UNFOUNDS | Fabrication Capabilities</title>
        <meta
          name="description"
          content="Custom additive manufacturing — industrial FDM and 9K resin printing. Functional engineering-grade parts and micron-precise detail work. No minimum order, fast turnaround."
        />
        <link rel="canonical" href="https://www.thelostandunfounds.com/capabilities" />
      </Helmet>

      {/* Hero */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-8">
              Additive Manufacturing · Custom Fabrication
            </p>
            <h1 className="text-[clamp(2.5rem,9vw,8rem)] font-black tracking-tighter leading-[0.85] uppercase mb-6">
              Capabilities
            </h1>
            <p className="text-base md:text-2xl font-light text-white/50 max-w-2xl mx-auto mb-10">
              The right part, in the right material, at the right accuracy.
              Two machines — industrial FDM and 9K resin.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/contact"
                className="w-full sm:w-auto px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 whitespace-nowrap"
              >
                Request a Quote
                <ArrowRightIcon className="w-4 h-4 shrink-0" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Positioning statement */}
      <section className="py-16 md:py-24 border-t border-white/10">
        <div className="max-w-4xl mx-auto px-6 md:px-8 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 mb-8">
            The Approach
          </p>
          <p className="text-xl md:text-3xl font-light leading-snug text-white/80">
            We don't sell 3D printing. We produce{' '}
            <span className="text-white font-normal">functional engineering-grade components</span> on FDM and{' '}
            <span className="text-white font-normal">micron-precise detail work</span> on resin — with in-house
            design, reverse engineering, and fast local turnaround.
          </p>
        </div>
      </section>

      {/* Machines */}
      {MACHINES.map((machine, i) => (
        <MachineBlock key={machine.name} machine={machine} index={i} invert={i % 2 === 1} />
      ))}

      {/* Which machine for the job — matrix */}
      <section className="py-16 md:py-24 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 mb-3 text-center">
            Reference
          </p>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-center mb-12">
            Which machine for the job
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-white/20">
                  {['Need', 'Machine', 'Material', 'Best For'].map((h) => (
                    <th
                      key={h}
                      className="py-4 pr-6 text-[10px] font-black uppercase tracking-[0.3em] text-white/30"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <tr key={row.need} className="border-b border-white/10">
                    <td className="py-4 pr-6 font-black uppercase tracking-tight text-sm">{row.need}</td>
                    <td className="py-4 pr-6">
                      <span className="text-xs font-mono uppercase tracking-wider border border-white/20 px-3 py-1 whitespace-nowrap">
                        {row.machine}
                      </span>
                    </td>
                    <td className="py-4 pr-6 font-mono text-sm text-white/60">{row.mat}</td>
                    <td className="py-4 text-sm font-light text-white/50">{row.best}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* See examples */}
      <section className="py-16 md:py-24 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 mb-3 text-center">
            Examples
          </p>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-center mb-4">
            See what we make
          </h2>
          <p className="text-white/40 text-sm font-light text-center max-w-xl mx-auto mb-12">
            Real-world examples of each product. Opens image results in a new tab.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EXAMPLES.map((ex) => (
              <a
                key={ex.name}
                href={`${IMG_SEARCH}${encodeURIComponent(ex.query)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 p-5 border border-white/10 hover:border-white/40 transition-colors"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 w-14 shrink-0">
                  {ex.machine}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-black uppercase tracking-tight text-sm md:text-base">
                    {ex.name}
                  </span>
                  <span className="block font-mono text-[11px] text-white/30 truncate">{ex.query}</span>
                </span>
                <ArrowTopRightOnSquareIcon className="w-4 h-4 shrink-0 text-white/30 group-hover:text-white transition-colors" />
              </a>
            ))}
          </div>
          <p className="text-white/30 text-xs font-light text-center mt-8">
            Tip — add "for sale" or check Etsy / eBay with these terms to see live market pricing.
          </p>
        </div>
      </section>

      {/* Who we serve */}
      <section className="py-16 md:py-24 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 mb-3 text-center">
            Clients
          </p>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-center mb-12">
            Who we make for
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {CLIENTS.map((c, i) => (
              <motion.div
                key={c.t}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 4) * 0.08 }}
                className="p-6 border border-white/10 hover:border-white/30 transition-colors"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-4">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="text-base md:text-lg font-black uppercase tracking-tight mb-2">{c.t}</h3>
                <p className="text-white/40 text-sm leading-relaxed font-light">{c.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-32 border-t border-white/10">
        <div className="max-w-xl mx-auto px-6 text-center">
          <WrenchScrewdriverIcon className="w-12 h-12 md:w-16 md:h-16 text-white/10 mx-auto mb-10" />
          <h2 className="text-[clamp(2rem,8vw,4rem)] font-black uppercase tracking-tighter mb-4 leading-none">
            Let's make <br /> your part
          </h2>
          <p className="text-white/40 text-base font-light mb-10">
            Send a file, a sketch, or a broken part — we'll quote material, accuracy, and turnaround.
            No minimum order.
          </p>
          <Link
            to="/contact"
            className="inline-flex px-8 py-4 bg-white text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-zinc-200 transition-colors items-center justify-center gap-3 whitespace-nowrap"
          >
            Get In Touch
            <ArrowRightIcon className="w-4 h-4 shrink-0" />
          </Link>
        </div>
      </section>
    </div>
  );
}
