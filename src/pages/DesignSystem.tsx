/**
 * Design System Page - Visual UI/UX Library Reference
 */

import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { BentoCard } from '../components/ui/bento-grid';

type TabType = 'typography' | 'colors' | 'components' | 'spacing' | 'layout';

export default function DesignSystem() {
  const [activeTab, setActiveTab] = useState<TabType>('typography');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'typography', label: 'Typography' },
    { id: 'colors', label: 'Colors' },
    { id: 'components', label: 'Components' },
    { id: 'spacing', label: 'Spacing' },
    { id: 'layout', label: 'Layout' },
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
          <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'text-white border-b-2 border-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === 'typography' && <TypographySection />}
          {activeTab === 'colors' && <ColorsSection />}
          {activeTab === 'components' && <ComponentsSection />}
          {activeTab === 'spacing' && <SpacingSection />}
          {activeTab === 'layout' && <LayoutSection />}
        </div>
      </div>
    </>
  );
}

function TypographySection() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Font Family</h2>
        <div className="bg-black border border-white/20 rounded-none p-6">
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
        <h2 className="text-2xl font-bold text-white mb-4">Font Sizes</h2>
        <div className="bg-black border border-white/20 rounded-none p-6 space-y-6">
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
        <h2 className="text-2xl font-bold text-white mb-4">Font Weights</h2>
        <div className="bg-black border border-white/20 rounded-none p-6 space-y-4">
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
        <h2 className="text-2xl font-bold text-white mb-4">Text Styles</h2>
        <div className="bg-black border border-white/20 rounded-none p-6 space-y-4">
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
      title: 'Primary Colors',
      colors: [
        { name: 'Black', class: 'bg-black', hex: '#000000', text: 'text-white' },
        { name: 'White', class: 'bg-white', hex: '#FFFFFF', text: 'text-black' },
      ],
    },
    {
      title: 'White Opacity Variations',
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
      ],
    },
    {
      title: 'Border Colors',
      colors: [
        { name: 'Border White', class: 'border-white', hex: '#FFFFFF', text: 'text-white' },
        { name: 'Border White 20%', class: 'border-white/20', hex: 'rgba(255, 255, 255, 0.2)', text: 'text-white' },
        { name: 'Border White 10%', class: 'border-white/10', hex: 'rgba(255, 255, 255, 0.1)', text: 'text-white' },
      ],
    },
    {
      title: 'Accent Colors',
      colors: [
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
          <h2 className="text-2xl font-bold text-white mb-4">{group.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.colors.map((color, colorIdx) => (
              <div
                key={colorIdx}
                className="bg-black border border-white/20 rounded-none p-4"
              >
                <div className={`${color.class} h-20 rounded-none mb-3 border border-white/10`}></div>
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
        <h2 className="text-2xl font-bold text-white mb-4">Buttons</h2>
        <div className="bg-black border border-white/20 rounded-none p-6 space-y-6">
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
              <button className="px-6 py-2 bg-white hover:bg-white/90 border border-white/20 rounded-none text-black text-sm font-medium transition">
                White Button
              </button>
              <button className="px-6 py-2 bg-transparent hover:bg-white/10 border border-white rounded-none text-white text-sm font-medium transition">
                Outline Button
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Badges</h2>
        <div className="bg-black border border-white/20 rounded-none p-6">
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
        <h2 className="text-2xl font-bold text-white mb-4">Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border-0 rounded-none p-6">
            <h3 className="text-base font-black text-black mb-2">White Card</h3>
            <p className="text-black/70 text-sm">Card with white background and black text</p>
          </div>
          <div className="bg-black border border-white/20 rounded-none p-6">
            <h3 className="text-base font-black text-white mb-2">Black Card</h3>
            <p className="text-white/70 text-sm">Card with black background and white text</p>
          </div>
        </div>
      </div>

      {/* Avatar */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Avatar</h2>
        <div className="bg-black border border-white/20 rounded-none p-6">
          <div className="flex gap-4">
            <Avatar>
              <AvatarFallback>TL</AvatarFallback>
            </Avatar>
            <Avatar>
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
        <h2 className="text-2xl font-bold text-white mb-4">Bento Card</h2>
        <div className="bg-black border border-white/20 rounded-none p-6">
          <BentoCard className="bg-white/10 border border-white/20">
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
        <h2 className="text-2xl font-bold text-white mb-4">Spacing Scale</h2>
        <div className="bg-black border border-white/20 rounded-none p-6 space-y-4">
          {spacingSizes.map((spacing) => (
            <div key={spacing.name} className="flex items-center gap-4">
              <div className="w-20 text-white/60 text-sm">{spacing.name}</div>
              <div className="flex-1">
                <div className={`${spacing.class} bg-white/20 border border-white/40 rounded-none`}>
                  <div className="bg-white h-4 w-4"></div>
                </div>
              </div>
              <div className="w-32 text-white/60 text-xs text-right">{spacing.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Gap Sizes</h2>
        <div className="bg-black border border-white/20 rounded-none p-6 space-y-4">
          {[2, 4, 6, 8].map((gap) => (
            <div key={gap}>
              <p className="text-white/60 text-sm mb-2">gap-{gap} ({gap * 0.25}rem / {gap * 4}px)</p>
              <div className={`flex gap-${gap}`}>
                <div className="bg-white/20 border border-white/40 rounded-none p-4">Item 1</div>
                <div className="bg-white/20 border border-white/40 rounded-none p-4">Item 2</div>
                <div className="bg-white/20 border border-white/40 rounded-none p-4">Item 3</div>
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
        <h2 className="text-2xl font-bold text-white mb-4">Grid Layouts</h2>
        <div className="bg-black border border-white/20 rounded-none p-6 space-y-6">
          <div>
            <p className="text-white/60 text-sm mb-3">Single Column (Mobile)</p>
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white/10 border border-white/20 rounded-none p-4 text-white text-center">
                  Item {i}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-3">Two Columns (md:grid-cols-2)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white/10 border border-white/20 rounded-none p-4 text-white text-center">
                  Item {i}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-3">Three Columns (md:grid-cols-3)</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white/10 border border-white/20 rounded-none p-4 text-white text-center">
                  Item {i}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Container Widths</h2>
        <div className="space-y-4">
          <div>
            <p className="text-white/60 text-sm mb-2">max-w-4xl</p>
            <div className="max-w-4xl mx-auto bg-white/10 border border-white/20 rounded-none p-4 text-white text-center">
              Content container
            </div>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">max-w-7xl</p>
            <div className="max-w-7xl mx-auto bg-white/10 border border-white/20 rounded-none p-4 text-white text-center">
              Wide content container
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Border Radius</h2>
        <div className="bg-black border border-white/20 rounded-none p-6">
          <p className="text-white/60 text-sm mb-4">All components use rounded-none (no border radius)</p>
          <div className="flex gap-4">
            <div className="bg-white/10 border border-white/20 rounded-none p-4 text-white">
              rounded-none
            </div>
            <div className="bg-white/10 border border-white/20 rounded p-4 text-white">
              rounded (for comparison)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
