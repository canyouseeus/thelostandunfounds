/**
 * Documentation Main Page
 * Central hub for all documentation
 */

import { useEffect, useState } from 'react';
import { Book, FileText, HelpCircle, Shield, Code, Wrench } from 'lucide-react';
import GettingStarted from './docs/GettingStarted';
import ToolsDocs from './docs/Tools';
import APIDocs from './docs/API';
import FAQ from './docs/FAQ';
import Privacy from './docs/Privacy';
import Terms from './docs/Terms';

const docSections = [
  { id: 'getting-started', label: 'Getting Started', icon: Book },
  { id: 'tools-guide', label: 'Tools Guide', icon: Wrench },
  { id: 'api-reference', label: 'API Reference', icon: Code },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'privacy', label: 'Privacy Policy', icon: Shield },
  { id: 'terms', label: 'Terms of Service', icon: FileText },
];

export default function Docs() {
  const [activeSection, setActiveSection] = useState('getting-started');

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = docSections.map(s => s.id);
      const scrollPosition = window.scrollY + 200; // Offset for header

      for (let i = sections.length - 1; i >= 0; i--) {
        const element = document.getElementById(sections[i]);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">DOCUMENTATION</h1>
        <p className="text-white/70">Everything you need to know about <strong className="font-bold text-white">THE LOST+UNFOUNDS</strong></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <nav className="bg-transparent p-0">
            <h2 className="text-white font-black tracking-widest uppercase mb-6 text-sm">Documentation</h2>
            <ul className="space-y-1">
              {docSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;

                return (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection(section.id);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-none transition cursor-pointer border-l-2 ${isActive
                        ? 'border-white bg-white/10 text-white font-bold'
                        : 'border-transparent text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="uppercase tracking-wider text-xs">{section.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-transparent space-y-16">
            <section id="getting-started" className="scroll-mt-8">
              <GettingStarted />
            </section>

            <section id="tools-guide" className="scroll-mt-8">
              <ToolsDocs />
            </section>

            <section id="api-reference" className="scroll-mt-8">
              <APIDocs />
            </section>

            <section id="faq" className="scroll-mt-8">
              <FAQ />
            </section>

            <section id="privacy" className="scroll-mt-8">
              <Privacy />
            </section>

            <section id="terms" className="scroll-mt-8">
              <Terms />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

