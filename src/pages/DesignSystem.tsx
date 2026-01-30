/**
 * Design System Page - Visual UI/UX Library Reference
 */

import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { BentoCard } from '../components/ui/bento-grid';
import { AdminBentoCard, AdminBentoRow } from '../components/ui/admin-bento-card';
import { CollapsibleSection } from '../components/ui/collapsible-section';
import {
  Expandable,
  ExpandableCard,
  ExpandableCardHeader,
  ExpandableCardContent,
  ExpandableCardFooter,
  ExpandableContent,
  ExpandableTrigger,
} from '../components/ui/expandable';
// Heroicons is the official standard. Lucide and Phosphor are being phased out.

import {
  HomeIcon,
  UserIcon,
  Cog6ToothIcon,
  CameraIcon,
  PhotoIcon,
  HeartIcon,
  GlobeAltIcon,
  ArrowTrendingUpIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  Squares2X2Icon,
  BookOpenIcon,
  DocumentTextIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';

type TabType = 'dashboard' | 'typography' | 'colors' | 'components' | 'spacing' | 'layout' | 'gallery' | 'blog' | 'icons';

export default function DesignSystem() {
  const [activeTab, setActiveTab] = useState<TabType>('typography');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard Widgets' },
    { id: 'typography', label: 'Typography' },
    { id: 'colors', label: 'Colors' },
    { id: 'components', label: 'Components' },
    { id: 'spacing', label: 'Spacing' },
    { id: 'layout', label: 'Layout' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'blog', label: 'Blog' },
    { id: 'icons', label: 'Icons' },
  ];

  return (
    <>
      <Helmet>
        <title>Design System | THE LOST+UNFOUNDS</title>
        <meta name="description" content="Visual UI/UX library reference for THE LOST+UNFOUNDS design system" />
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 tracking-wide">
            DESIGN SYSTEM
          </h1>
          <p className="text-white/60 text-sm mb-6">
            Visual reference for fonts, colors, components, and design patterns
          </p>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 pb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition ${activeTab === tab.id
                  ? 'text-white bg-white/10'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === 'dashboard' && <DashboardSection />}
          {activeTab === 'typography' && <TypographySection />}
          {activeTab === 'colors' && <ColorsSection />}
          {activeTab === 'components' && <ComponentsSection />}
          {activeTab === 'spacing' && <SpacingSection />}
          {activeTab === 'layout' && <LayoutSection />}
          {activeTab === 'gallery' && <GallerySection />}
          {activeTab === 'blog' && <BlogSection />}
          {activeTab === 'icons' && <IconsSection />}
        </div>
      </div>
    </>
  );
}

// ... existing sections ...

function IconsSection() {
  const iconSets = [
    {
      name: 'Heroicons (Outline)',
      description: 'OFFICIAL PROJECT STANDARD. Soft, rounded, friendly vibe. Matches Tailwind UI.',
      install: 'npm install @heroicons/react',
      selected: true,
      icons: [
        { name: 'Home', component: <HomeIcon className="w-6 h-6 text-green-400" /> },
        { name: 'User', component: <UserIcon className="w-6 h-6 text-green-400" /> },
        { name: 'Cog', component: <Cog6ToothIcon className="w-6 h-6 text-green-400" /> },
        { name: 'Camera', component: <CameraIcon className="w-6 h-6 text-green-400" /> },
        { name: 'Photo', component: <PhotoIcon className="w-6 h-6 text-green-400" /> },
        { name: 'Globe', component: <GlobeAltIcon className="w-6 h-6 text-green-400" /> },
      ]
    }
  ];

  return (
    <div className="space-y-12">
      <div className="bg-white/5 border-l-2 border-green-400 pl-6 py-4">
        <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-wide">ICON LIBRARY STANDARD</h2>
        <p className="text-white/80">
          <strong>Heroicons (Outline)</strong> has been selected as the official icon system for THE LOST+UNFOUNDS.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {iconSets.map((set) => (
          <div key={set.name} className={`bg-black/40 border p-6 relative ${set.selected ? 'border-green-400/50 bg-green-900/10' : 'border-white/10 opacity-50'}`}>
            {set.selected && (
              <div className="absolute top-0 right-0 bg-green-400 text-black text-[10px] font-black uppercase px-2 py-1">
                Selected
              </div>
            )}
            <h3 className={`text-xl font-bold mb-2 uppercase ${set.selected ? 'text-green-400' : 'text-white'}`}>{set.name}</h3>
            <p className="text-white/60 text-xs mb-6 h-10">{set.description}</p>

            <div className="grid grid-cols-3 gap-6 mb-8">
              {set.icons.map((icon, idx) => (
                <div key={idx} className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-white/5 rounded-full ring-1 ring-white/10">
                    {icon.component}
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-white/40">{icon.name}</span>
                </div>
              ))}
            </div>

            <div className="bg-black p-3 rounded-none border border-white/5">
              <code className="text-xs text-green-400 font-mono block overflow-x-auto whitespace-nowrap">
                {set.install}
              </code>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-6 uppercase">SIDE-BY-SIDE COMPARISON (REFERENCE)</h2>
        <div className="bg-black border border-white/10 overflow-hidden">
          <div className="grid grid-cols-2 bg-white/5 border-b border-white/10 text-xs font-bold text-white/60 uppercase tracking-widest">
            <div className="p-4">Icon Type</div>
            <div className="p-4 border-l border-white/10 text-white">Heroicons (New Standard)</div>
          </div>

          {[
            { label: 'Camera', hero: <CameraIcon className="w-6 h-6 text-white" /> },
            { label: 'User', hero: <UserIcon className="w-6 h-6 text-white" /> },
            { label: 'Image', hero: <PhotoIcon className="w-6 h-6 text-white" /> },
            { label: 'Settings', hero: <Cog6ToothIcon className="w-6 h-6 text-white" /> },
            { label: 'Globe', hero: <GlobeAltIcon className="w-6 h-6 text-white" /> },
            { label: 'Mail', hero: <EnvelopeIcon className="w-6 h-6 text-white" /> },
          ].map((row, idx) => (
            <div key={idx} className="grid grid-cols-2 border-b last:border-0 border-white/5 hover:bg-white/5 transition-colors">
              <div className="p-4 flex items-center text-xs font-bold text-white/40 uppercase tracking-widest">
                {row.label}
              </div>
              <div className="p-4 border-l border-white/10 flex items-center justify-center">
                {row.hero}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TypographySection() {
  return (
    <div className="space-y-8">
      {/* Brand Identity Rule */}
      <div className="mb-12 pl-6 py-2 bg-white/5">
        <h2 className="text-2xl font-black text-white mb-2 tracking-wide uppercase">BRAND IDENTITY RULE</h2>
        <p className="text-white/80 text-lg">
          The brand name <span className="text-white font-bold">THE LOST+UNFOUNDS</span> must always be styled as
          <span className="text-white font-bold bg-white/10 px-2 py-0.5 mx-1">UPPERCASE</span> and
          <span className="text-white font-bold bg-white/10 px-2 py-0.5 mx-1">BOLD</span>.
        </p>
        <p className="text-white/60 text-sm mt-2">
          Correct: <strong className="text-white">THE LOST+UNFOUNDS</strong><br />
          Incorrect: The Lost+Unfounds, The Lost + Unfounds, the lost+unfounds
        </p>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-4 uppercase">FONT FAMILY</h2>
        <div className="bg-black p-6">
          <div className="space-y-4">
            <div>
              <p className="text-white/60 text-sm mb-2">Primary Font Stack</p>
              <p className="text-white text-lg" style={{ fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif' }}>
                Inter, system-ui, Avenir, Helvetica, Arial, sans-serif
              </p>
            </div>
            <div>
              <p className="text-white/60 text-sm mb-2">Font Family Applied</p>
              <p className="text-white text-lg">
                The quick brown fox jumps over the lazy dog
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-4 uppercase">FONT SIZES</h2>
        <div className="bg-black p-6 space-y-6">
          <div>
            <p className="text-white/60 text-sm mb-2">text-xs (0.75rem / 12px)</p>
            <p className="text-xs text-white">Sample text at extra small size</p>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">text-sm (0.875rem / 14px)</p>
            <p className="text-sm text-white">Sample text at small size</p>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">text-base (1rem / 16px)</p>
            <p className="text-base text-white">Sample text at base size</p>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">text-lg (1.125rem / 18px)</p>
            <p className="text-lg text-white">Sample text at large size</p>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">text-xl (1.25rem / 20px)</p>
            <p className="text-xl text-white">Sample text at extra large size</p>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">text-2xl (1.5rem / 24px)</p>
            <p className="text-2xl text-white">Sample text at 2xl size</p>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">text-4xl (2.25rem / 36px)</p>
            <p className="text-4xl text-white">Sample text at 4xl size</p>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">text-5xl (3rem / 48px)</p>
            <p className="text-5xl text-white">Sample text at 5xl size</p>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">text-6xl (3.75rem / 60px)</p>
            <p className="text-6xl text-white">Sample text at 6xl size</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-4 uppercase">FONT WEIGHTS</h2>
        <div className="bg-black p-6 space-y-4">
          <div>
            <p className="text-white/60 text-sm mb-2">font-normal (400)</p>
            <p className="text-white font-normal text-lg">Normal weight text</p>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">font-medium (500)</p>
            <p className="text-white font-medium text-lg">Medium weight text</p>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">font-semibold (600)</p>
            <p className="text-white font-semibold text-lg">Semibold weight text</p>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">font-bold (700)</p>
            <p className="text-white font-bold text-lg">Bold weight text</p>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">font-black (900)</p>
            <p className="text-white font-black text-lg">Black weight text</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-4 uppercase">DASHBOARD TYPOGRAPHY</h2>
        <div className="bg-black p-6 space-y-8">
          <div>
            <p className="text-white/60 text-sm mb-2">Section Header (Uppercase, Tracking Widest, XS)</p>
            <p className="text-xs font-bold text-white uppercase tracking-widest text-left">
              Key Performance Metrics
            </p>
            <p className="text-xs text-white/40 font-mono mt-1">text-xs font-bold uppercase tracking-widest</p>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">Bento Card Title (Uppercase, Tracking Wider, Alpha)</p>
            <p className="font-medium text-sm tracking-wider text-white/80 uppercase text-left">
              Total Revenue
            </p>
            <p className="text-xs text-white/40 font-mono mt-1">font-medium text-sm tracking-wider text-white/80 uppercase</p>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">Data Value (Black, Tracking Tighter, 4XL)</p>
            <p className="text-4xl font-black text-white tracking-tighter text-left">
              $1,234.56
            </p>
            <p className="text-xs text-white/40 font-mono mt-1">text-4xl font-black text-white tracking-tighter</p>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">Label / Subtext (Uppercase, Widest, XXS/XS)</p>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest text-left">
              Compared to last month
            </p>
            <p className="text-xs text-white/40 font-mono mt-1">text-[10px] font-bold text-white/40 uppercase tracking-widest</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-4 uppercase">TEXT STYLES</h2>
        <div className="bg-black p-6 space-y-4">
          <div>
            <p className="text-white/60 text-sm mb-2">Uppercase with tracking-wide</p>
            <p className="text-white text-lg uppercase tracking-wide">UPPERCASE TEXT WITH WIDE TRACKING</p>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">Line clamp (4 lines)</p>
            <p className="text-white text-sm line-clamp-4">
              This is a long text that will be clamped to 4 lines. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
            </p>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">Text with opacity variations</p>
            <p className="text-white text-lg">100% opacity</p>
            <p className="text-white/90 text-lg">90% opacity</p>
            <p className="text-white/80 text-lg">80% opacity</p>
            <p className="text-white/70 text-lg">70% opacity</p>
            <p className="text-white/60 text-lg">60% opacity</p>
            <p className="text-white/50 text-lg">50% opacity</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorsSection() {
  const colorGroups = [
    {
      title: 'PRIMARY COLORS',
      colors: [
        { name: 'Black', class: 'bg-black', hex: '#000000', text: 'text-white' },
        { name: 'White', class: 'bg-white', hex: '#FFFFFF', text: 'text-black' },
      ],
    },
    {
      title: 'WHITE OPACITY VARIATIONS',
      colors: [
        { name: 'White 100%', class: 'bg-white', hex: 'rgba(255, 255, 255, 1)', text: 'text-black' },
        { name: 'White 90%', class: 'bg-white/90', hex: 'rgba(255, 255, 255, 0.9)', text: 'text-black' },
        { name: 'White 80%', class: 'bg-white/80', hex: 'rgba(255, 255, 255, 0.8)', text: 'text-black' },
        { name: 'White 70%', class: 'bg-white/70', hex: 'rgba(255, 255, 255, 0.7)', text: 'text-black' },
        { name: 'White 60%', class: 'bg-white/60', hex: 'rgba(255, 255, 255, 0.6)', text: 'text-black' },
        { name: 'White 50%', class: 'bg-white/50', hex: 'rgba(255, 255, 255, 0.5)', text: 'text-white' },
        { name: 'White 40%', class: 'bg-white/40', hex: 'rgba(255, 255, 255, 0.4)', text: 'text-white' },
        { name: 'White 30%', class: 'bg-white/30', hex: 'rgba(255, 255, 255, 0.3)', text: 'text-white' },
        { name: 'White 20%', class: 'bg-white/20', hex: 'rgba(255, 255, 255, 0.2)', text: 'text-white' },
        { name: 'White 10%', class: 'bg-white/10', hex: 'rgba(255, 255, 255, 0.1)', text: 'text-white' },
        { name: 'Dashboard Card', class: 'bg-[#0a0a0a]', hex: '#0a0a0a', text: 'text-white' },
      ],
    },

    {
      title: 'ACCENT COLORS',
      colors: [
        { name: 'Green (Success)', class: 'bg-[#008000]', hex: '#008000', text: 'text-white' },
        { name: 'Red 400', class: 'bg-red-400', hex: '#F87171', text: 'text-white' },
        { name: 'Red 500', class: 'bg-red-500', hex: '#EF4444', text: 'text-white' },
        { name: 'Red 900/20', class: 'bg-red-900/20', hex: 'rgba(127, 29, 29, 0.2)', text: 'text-white' },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {colorGroups.map((group, idx) => (
        <div key={idx}>
          <h2 className="text-2xl font-bold text-white mb-4 uppercase">{group.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.colors.map((color, colorIdx) => (
              <div
                key={colorIdx}
                className="bg-black p-4"
              >
                <div className={`${color.class} h-20 rounded-none mb-3`}></div>
                <p className={`${color.text} font-semibold mb-1`}>{color.name}</p>
                <p className="text-white/60 text-xs mb-1">Class: {color.class}</p>
                <p className="text-white/60 text-xs">Hex: {color.hex}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ComponentsSection() {
  return (
    <div className="space-y-8">
      {/* Buttons */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4 uppercase">BUTTONS</h2>
        <div className="bg-black p-6 space-y-6">
          <div>
            <p className="text-white/60 text-sm mb-3">Button Variants</p>
            <div className="flex flex-wrap gap-4">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-3">Button Sizes</p>
            <div className="flex flex-wrap items-center gap-4">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">🔍</Button>
            </div>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-3">Custom Styled Buttons</p>
            <div className="flex flex-wrap gap-4">
              <button className="px-6 py-2 bg-white hover:bg-white/90 rounded-none text-black text-sm font-medium transition">
                White Button
              </button>
              <button className="px-6 py-2 bg-transparent hover:bg-white/10 text-white text-sm font-medium transition">
                Outline Button
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4 uppercase">BADGES</h2>
        <div className="bg-black p-6">
          <div className="flex flex-wrap gap-4">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4 uppercase">CARDS</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-none p-6">
            <h3 className="text-base font-black text-black mb-2">White Card</h3>
            <p className="text-black/70 text-sm">Card with white background and black text</p>
          </div>
          <div className="bg-black p-6">
            <h3 className="text-base font-black text-white mb-2">Black Card</h3>
            <p className="text-white/70 text-sm">Card with black background and white text</p>
          </div>
        </div>
      </div>

      {/* Avatar */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4 uppercase">AVATAR</h2>
        <div className="bg-black p-6">
          <div className="flex gap-4">
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80" alt="Portrait" />
              <AvatarFallback>AB</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>CD</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      {/* Bento Card */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4 uppercase">BENTO CARD</h2>
        <div className="bg-black p-6">
          <BentoCard className="bg-white/10">
            <h3 className="text-white font-bold mb-2">Bento Card Example</h3>
            <p className="text-white/70 text-sm">A flexible card component for grid layouts</p>
          </BentoCard>
        </div>
      </div>
    </div>
  );
}

function SpacingSection() {
  const spacingSizes = [
    { name: '0', class: 'p-0', value: '0px' },
    { name: '1', class: 'p-1', value: '0.25rem / 4px' },
    { name: '2', class: 'p-2', value: '0.5rem / 8px' },
    { name: '3', class: 'p-3', value: '0.75rem / 12px' },
    { name: '4', class: 'p-4', value: '1rem / 16px' },
    { name: '6', class: 'p-6', value: '1.5rem / 24px' },
    { name: '8', class: 'p-8', value: '2rem / 32px' },
    { name: '12', class: 'p-12', value: '3rem / 48px' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-4 uppercase">SPACING SCALE</h2>
        <div className="bg-black p-6 space-y-4">
          {spacingSizes.map((spacing) => (
            <div key={spacing.name} className="flex items-center gap-4">
              <div className="w-20 text-white/60 text-sm">{spacing.name}</div>
              <div className="flex-1">
                <div className={`${spacing.class} bg-white/20 rounded-none`}>
                  <div className="bg-white h-4 w-4"></div>
                </div>
              </div>
              <div className="w-32 text-white/60 text-xs text-right">{spacing.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-4 uppercase">GAP SIZES</h2>
        <div className="bg-black p-6 space-y-4">
          {[2, 4, 6, 8].map((gap) => (
            <div key={gap}>
              <p className="text-white/60 text-sm mb-2">gap-{gap} ({gap * 0.25}rem / {gap * 4}px)</p>
              <div className={`flex gap-${gap}`}>
                <div className="bg-white/20 rounded-none p-4">Item 1</div>
                <div className="bg-white/20 rounded-none p-4">Item 2</div>
                <div className="bg-white/20 rounded-none p-4">Item 3</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LayoutSection() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-4 uppercase">GRID LAYOUTS</h2>
        <div className="bg-black p-6 space-y-6">
          <div>
            <p className="text-white/60 text-sm mb-3">Single Column (Mobile)</p>
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white/10 rounded-none p-4 text-white text-center">
                  Item {i}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-3">Two Columns (md:grid-cols-2)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white/10 rounded-none p-4 text-white text-center">
                  Item {i}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-3">Three Columns (md:grid-cols-3)</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white/10 rounded-none p-4 text-white text-center">
                  Item {i}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-4 uppercase">CONTAINER WIDTHS</h2>
        <div className="space-y-4">
          <div>
            <p className="text-white/60 text-sm mb-2">max-w-4xl</p>
            <div className="max-w-4xl mx-auto bg-white/10 rounded-none p-4 text-white text-center">
              Content container
            </div>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">max-w-7xl</p>
            <div className="max-w-7xl mx-auto bg-white/10 rounded-none p-4 text-white text-center">
              Wide content container
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-4 uppercase">BORDER RADIUS</h2>
        <div className="bg-black p-6">
          <p className="text-white/60 text-sm mb-4">All components use rounded-none (no border radius)</p>
          <div className="flex gap-4">
            <div className="bg-white/10 rounded-none p-4 text-white">
              rounded-none
            </div>
            <div className="bg-white/10 rounded p-4 text-white">
              rounded (for comparison)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardSection() {
  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 uppercase">BENTO GRID SYSTEM</h2>
        <p className="text-white/60 max-w-3xl">
          The new dashboard design uses a robust Bento grid system powered by <code>AdminBentoCard</code>.
          It supports responsive column spans, specific typography hierarchies, and standard interactions.
        </p>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-widest">LIVE EXAMPLE</h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#050505] p-6">

          {/* Key Metric Large */}
          <AdminBentoCard
            colSpan={6}
            title="Total Revenue"
            icon={<CurrencyDollarIcon className="w-4 h-4" />}
          >
            <div className="mt-2">
              <div className="text-4xl font-black text-white tracking-tighter">
                $42,069.00
              </div>
              <div className="flex flex-col gap-1 mt-2">
                <div className="text-[10px] font-bold text-green-500 uppercase tracking-widest flex items-center gap-2">
                  <ArrowTrendingUpIcon className="w-3 h-3" /> +12.5% vs last month
                </div>
              </div>
            </div>
          </AdminBentoCard>

          {/* Secondary Metric */}
          <AdminBentoCard
            colSpan={3}
            title="Active Users"
            icon={<UsersIcon className="w-4 h-4" />}
          >
            <div className="mt-2">
              <div className="text-4xl font-black text-white tracking-tighter">
                1,234
              </div>
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-2">
                +12 today
              </div>
            </div>
          </AdminBentoCard>

          {/* Tertiary Metric */}
          <AdminBentoCard
            colSpan={3}
            title="Server Status"
            icon={<ChartBarIcon className="w-4 h-4" />}
          >
            <div className="mt-2">
              <div className="text-2xl font-black text-green-500 tracking-tighter uppercase">
                Healthy
              </div>
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-2">
                99.9% Uptime
              </div>
            </div>
          </AdminBentoCard>

          {/* List Card */}
          <AdminBentoCard
            colSpan={4}
            title="Recent Activity"
            icon={<ChartBarIcon className="w-4 h-4" />}
            footer={
              <button className="text-[10px] font-bold text-white/60 uppercase tracking-widest hover:text-white flex items-center gap-2 transition-colors">
                View All Activity <ArrowRightIcon className="w-3 h-3" />
              </button>
            }
          >
            <div className="space-y-1">
              <AdminBentoRow
                label="New User"
                value="alice@example.com"
                valueClassName="text-white"
              />
              <AdminBentoRow
                label="New Order"
                value="$129.00 - Order #4421"
                valueClassName="text-green-400"
              />
              <AdminBentoRow
                label="System Alert"
                value="Database backup completed"
                valueClassName="text-white/60"
              />
            </div>
          </AdminBentoCard>

          {/* Interactive/Action Card */}
          <AdminBentoCard
            colSpan={8}
            title="Quick Actions"
            icon={<ArrowTopRightOnSquareIcon className="w-4 h-4" />}
          >
            <div className="flex flex-col md:flex-row gap-4 h-full items-center justify-center p-4">
              <button className="flex items-center justify-center gap-3 px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-sm hover:bg-white/90 transition-all hover:scale-105 active:scale-95 w-full md:w-auto rounded-none">
                Create New Post
              </button>
              <button className="flex items-center justify-center gap-3 px-8 py-4 bg-transparent text-white font-black uppercase tracking-widest text-sm hover:bg-white/10 transition-all w-full md:w-auto rounded-none">
                Deploy Site
              </button>
            </div>
          </AdminBentoCard>

        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-2 uppercase">COLLAPSIBLE SECTIONS</h2>
        <p className="text-white/60 mb-6">
          Used to organize high-level dashboard modules.
        </p>

        <div className="p-6 rounded-none">
          <CollapsibleSection
            title="Example Module"
            icon={<ChartBarIcon className="w-5 h-5" />}
            defaultOpen={true}
            className=""
          >
            <div className="p-4 bg-white/5 text-white/60 text-sm">
              Collapsible content goes here. It supports any children elements.
            </div>
          </CollapsibleSection>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-widest">COMPONENT API</h3>
        <div className="bg-black rounded-none p-6 text-sm text-white/80 font-mono overflow-x-auto">
          <pre>{`<AdminBentoCard 
  colSpan={12}                 // 1-12 grid columns
  rowSpan={1}                  // Optional row span
  title="Card Title"           // Header text
  icon={<Icon />}              // Header icon
  footer={<FooterContent />}   // Optional footer
  action={<ActionButton />}    // Optional header action
>
  {/* Content goes here */}
</AdminBentoCard>`}</pre>
        </div>
      </div>
    </div>
  );
}

function GallerySection() {
  return (
    <div className="space-y-12">
      {/* Gallery Stats */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 uppercase">GALLERY DASHBOARD</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminBentoCard
            colSpan={1}
            title="Total Photos"
            icon={<CameraIcon className="w-4 h-4" />}
          >
            <div className="mt-2">
              <div className="text-4xl font-black text-white tracking-tighter">
                12,450
              </div>
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-2">
                +125 this week
              </div>
            </div>
          </AdminBentoCard>
          <AdminBentoCard
            colSpan={1}
            title="Albums"
            icon={<Squares2X2Icon className="w-4 h-4" />}
          >
            <div className="mt-2">
              <div className="text-4xl font-black text-white tracking-tighter">
                24
              </div>
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-2">
                Active Collections
              </div>
            </div>
          </AdminBentoCard>
        </div>
      </div>

      {/* Album Cards */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 uppercase">ALBUM CARDS</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="group cursor-pointer">
              <div className="aspect-[4/3] bg-white/5 overflow-hidden mb-3 relative">
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
                <img
                  src={`https://images.unsplash.com/photo-${i === 1 ? '1492691527719-9d1e07e534b4' : i === 2 ? '1470071459604-3b5ec3a7fe05' : '1447752875204-b265b4554362'}?w=800&q=80`}
                  alt="Album Cover"
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 text-[10px] font-bold text-white uppercase tracking-wider z-20">
                  {i * 12 + 4} Photos
                </div>
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-wide mb-1 group-hover:text-white/80 transition-colors">
                {i === 1 ? 'Mountain Expeditions' : i === 2 ? 'Urban Exploration' : 'Nature Patterns'}
              </h3>
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest">
                Edited • {new Date().toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Photo Grid */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 uppercase">PHOTO GRID LAYOUT</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="aspect-square bg-white/5 overflow-hidden relative group">
              <img
                src={`https://images.unsplash.com/photo-${1500000000000 + i * 100000}?w=400&h=400&fit=crop&q=80`}
                alt="Gallery Item"
                className="w-full h-full object-cover transition-opacity duration-300 opacity-80 group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button className="p-2 bg-white text-black hover:bg-white/90 transition-colors rounded-none">
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BlogSection() {
  return (
    <div className="space-y-12">
      {/* Blog Stats */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 uppercase">BLOG METRICS</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AdminBentoCard
            colSpan={1}
            title="Total Articles"
            icon={<DocumentTextIcon className="w-4 h-4" />}
          >
            <div className="mt-2">
              <div className="text-4xl font-black text-white tracking-tighter">
                84
              </div>
            </div>
          </AdminBentoCard>
          <AdminBentoCard
            colSpan={1}
            title="Subscribers"
            icon={<EnvelopeIcon className="w-4 h-4" />}
          >
            <div className="mt-2">
              <div className="text-4xl font-black text-white tracking-tighter">
                2,401
              </div>
              <div className="text-[10px] font-bold text-green-500 uppercase tracking-widest mt-2">
                +15% vs last month
              </div>
            </div>
          </AdminBentoCard>
        </div>
      </div>

      {/* Article Cards */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 uppercase">ARTICLE CARDS (EXPANDABLE)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Expandable
            expandDirection="vertical"
            expandBehavior="replace"
            initialDelay={0}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {({ isExpanded }) => (
              <ExpandableTrigger>
                <div
                  className="rounded-none"
                  style={{
                    minHeight: isExpanded ? '420px' : '220px',
                    transition: 'min-height 0.2s ease-out',
                  }}
                >
                  <ExpandableCard
                    className="bg-black rounded-none h-full flex flex-col relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] cursor-pointer"
                    collapsedSize={{ height: 220 }}
                    expandedSize={{ height: 420 }}
                    hoverToExpand={false}
                    expandDelay={0}
                    collapseDelay={0}
                  >
                    <ExpandableCardHeader className="mb-1 pb-1">
                      <h2 className="text-base font-black text-white mb-0 tracking-wide transition whitespace-nowrap overflow-hidden text-ellipsis">
                        The Art of Silence
                      </h2>
                      <time className="text-white/60 text-xs font-medium block mt-1">
                        October 24, 2024
                      </time>
                    </ExpandableCardHeader>

                    <ExpandableCardContent className="flex-1 min-h-0">
                      <div className="mb-1">
                        <p className="text-white/70 text-sm leading-relaxed line-clamp-4 text-left">
                          Silence is not merely the absence of noise, but a presence of its own. In the voids between sounds, we find space to think, to breathe, and to exist without expectation.
                        </p>
                      </div>

                      <ExpandableContent
                        preset="fade"
                        stagger
                        staggerChildren={0.1}
                        keepMounted={false}
                      >
                        <div className="mb-3">
                          <img
                            src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80"
                            alt="Article Cover"
                            className="w-full h-32 object-cover rounded-none bg-white/5"
                          />
                        </div>
                        <div className="mb-2">
                          <p className="text-white/60 text-xs leading-relaxed text-left line-clamp-6">
                            This extended content reveals more about the philosophy of silence, exploring how modern connectivity has eroded our capacity for solitude and quiet reflection.
                          </p>
                        </div>
                        <button className="inline-block mt-2 text-white/80 hover:text-white text-xs font-semibold transition">
                          Read Full Article →
                        </button>
                      </ExpandableContent>
                    </ExpandableCardContent>

                    <ExpandableCardFooter className="mt-auto p-3 pt-2 pb-3">
                      <div className="flex items-center justify-end gap-2 min-w-0 w-full">
                        {!isExpanded && (
                          <span className="text-white/90 text-xs font-semibold transition flex-shrink-0 whitespace-nowrap">
                            Click to expand →
                          </span>
                        )}
                      </div>
                    </ExpandableCardFooter>
                  </ExpandableCard>
                </div>
              </ExpandableTrigger>
            )}
          </Expandable>
        </div>
      </div>

      {/* Blog Typography */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 uppercase">BLOG TYPOGRAPHY</h2>
        <div className="bg-black p-8 max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-wide text-left">
            The Future of Digital Minimalism
          </h1>
          <div className="flex items-center gap-2 text-white/60 text-sm mb-8 font-mono uppercase tracking-widest">
            <span>By The Lost Unfounds</span>
            <span>•</span>
            <span>5 min read</span>
          </div>

          <div className="space-y-6 text-white/90 leading-relaxed font-serif text-lg">
            <p>
              <strong className="text-white font-sans uppercase tracking-widest mr-2">Abstract —</strong>
              Digital minimalism is not about rejecting technology, but about clearing away the clutter to make room for what truly matters.
            </p>
            <p>
              In a world that constantly demands our attention, choosing where to direct it becomes a revolutionary act. We are often <strong>over-connected</strong> yet <em>under-fulfilled</em>.
            </p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4 font-sans uppercase tracking-tight">The Cost of Connectivity</h2>
            <p>
              Every notification is a potential distraction. Every buzz in our pocket pulls us away from the present moment. <a href="#" className="text-white font-bold underline decoration-white/30 underline-offset-4 hover:decoration-white transition-all">Research suggests</a> that regaining focus after an interruption can take up to 23 minutes.
            </p>

            <blockquote className="border-l-2 border-white pl-6 py-2 my-8 text-xl italic text-white/80">
              "We expect more from technology and less from each other."
            </blockquote>
          </div>
        </div>
      </div>

      {/* Subscription Form */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 uppercase">NEWSLETTER FORM</h2>
        <div className="bg-[#050505] p-8 max-w-xl">
          <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2">Join the Inner Circle</h3>
          <p className="text-white/60 text-sm mb-6">Get exclusive updates, behind-the-scenes content, and early access.</p>

          <form className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="ENTER YOUR EMAIL"
              className="bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 text-sm focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all font-mono uppercase"
            />
            <button
              type="button"
              className="bg-white text-black font-black uppercase tracking-widest text-xs px-6 py-3 hover:bg-white/90 transition-colors"
            >
              Subscribe
            </button>
            <p className="text-white/30 text-[10px] uppercase tracking-widest text-center mt-2">
              No spam. Unsubscribe anytime.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
