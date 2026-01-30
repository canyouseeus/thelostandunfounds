/**
 * SAGE MODE - UI Design Experimentation Interface
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useSageMode } from '../contexts/SageModeContext';
import {
  SparklesIcon,
  CheckBadgeIcon,
  StopIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

export default function SageMode() {
  const {
    state,
    toggleSageMode,
    updateSelection,
    addNote,
    updateCustomCode,
    exportReport,
    clearState,
  } = useSageMode();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeComponent, setActiveComponent] = useState<string | null>(null);
  const [noteCode, setNoteCode] = useState('');
  const [noteText, setNoteText] = useState('');

  const categories = Array.from(
    new Set(state.selections.map(s => s.category))
  );

  const filteredSelections =
    selectedCategory === 'all'
      ? state.selections
      : state.selections.filter(s => s.category === selectedCategory);

  const handleAddNote = () => {
    if (activeComponent && noteText.trim()) {
      addNote(activeComponent, noteCode, noteText);
      setNoteCode('');
      setNoteText('');
      setActiveComponent(null);
    }
  };

  const handleExport = () => {
    const report = exportReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sage-mode-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Helmet>
        <title>SAGE MODE | Admin | THE LOST+UNFOUNDS</title>
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-2 tracking-wide flex items-center gap-3">
                <SparklesIcon className="w-10 h-10 text-yellow-400" />
                SAGE MODE
              </h1>
              <p className="text-white/60 text-sm">
                UI Design Experimentation & Component Preview System
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSageMode}
                className={`px-6 py-3 rounded-none border font-medium transition ${state.enabled
                    ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400 hover:bg-yellow-400/30'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                  }`}
              >
                {state.enabled ? 'SAGE MODE: ON' : 'SAGE MODE: OFF'}
              </button>
              <Link
                to="/designsystem/preview"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white font-medium transition flex items-center gap-2"
              >
                <EyeIcon className="w-4 h-4" />
                Preview
              </Link>
              <Link
                to="/sagemode/reports"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white font-medium transition flex items-center gap-2"
              >
                <DocumentTextIcon className="w-4 h-4" />
                Reports
              </Link>
            </div>
          </div>

          {state.enabled && (
            <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-none p-4">
              <p className="text-yellow-400 text-sm">
                <strong>SAGE MODE ACTIVE:</strong> Select components below to experiment with design changes.
                Add notes and code snippets for each component, then preview changes on the Preview page.
              </p>
            </div>
          )}
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-none border text-sm font-medium transition ${selectedCategory === 'all'
                  ? 'bg-white text-black border-white'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                }`}
            >
              All
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-none border text-sm font-medium transition ${selectedCategory === category
                    ? 'bg-white text-black border-white'
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                  }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Component Selection */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-black/50 border border-white/10 rounded-none p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <CheckBadgeIcon className="w-5 h-5" />
                Select Components
              </h2>
              <div className="space-y-2">
                {filteredSelections.map(selection => (
                  <div
                    key={selection.id}
                    className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-none border border-white/10 transition"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateSelection(selection.id, !selection.selected)}
                        className="flex items-center justify-center w-5 h-5 border border-white/40 rounded-none"
                      >
                        {selection.selected ? (
                          <CheckBadgeIcon className="w-4 h-4 text-white" />
                        ) : (
                          <StopIcon className="w-4 h-4 text-white/40" />
                        )}
                      </button>
                      <div>
                        <div className="text-white font-medium">{selection.name}</div>
                        <div className="text-white/60 text-xs">{selection.category}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveComponent(selection.id)}
                      className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white transition"
                    >
                      Add Note
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Code Section */}
            <div className="bg-black/50 border border-white/10 rounded-none p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <CodeBracketIcon className="w-5 h-5" />
                Custom Code / CSS
              </h2>
              <textarea
                value={state.customCode}
                onChange={(e) => updateCustomCode(e.target.value)}
                placeholder="Paste custom CSS, component code, or design specifications here..."
                className="w-full h-48 px-4 py-3 bg-black/50 border border-white/20 rounded-none text-white placeholder-white/40 font-mono text-sm focus:outline-none focus:border-white/40 resize-none"
              />
              <p className="text-white/60 text-xs mt-2">
                This code will be applied to the preview page for testing design changes.
              </p>
            </div>
          </div>

          {/* Notes Panel */}
          <div className="space-y-4">
            <div className="bg-black/50 border border-white/10 rounded-none p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5" />
                Component Notes
              </h2>

              {activeComponent ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-white/80 text-sm mb-2">
                      Component: {state.selections.find(s => s.id === activeComponent)?.name}
                    </label>
                    <textarea
                      value={noteCode}
                      onChange={(e) => setNoteCode(e.target.value)}
                      placeholder="Paste code snippet or component code here..."
                      className="w-full h-32 px-3 py-2 bg-black/50 border border-white/20 rounded-none text-white placeholder-white/40 font-mono text-xs focus:outline-none focus:border-white/40 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Notes</label>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Describe the changes you want to make..."
                      className="w-full h-32 px-3 py-2 bg-black/50 border border-white/20 rounded-none text-white placeholder-white/40 text-sm focus:outline-none focus:border-white/40 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddNote}
                      className="flex-1 px-4 py-2 bg-white text-black font-medium rounded-none hover:bg-white/90 transition"
                    >
                      Save Note
                    </button>
                    <button
                      onClick={() => {
                        setActiveComponent(null);
                        setNoteCode('');
                        setNoteText('');
                      }}
                      className="px-4 py-2 bg-white/10 border border-white/20 text-white font-medium rounded-none hover:bg-white/20 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {state.notes.length === 0 ? (
                    <p className="text-white/60 text-sm">No notes yet. Select a component and click "Add Note" to get started.</p>
                  ) : (
                    state.notes.map(note => {
                      const component = state.selections.find(s => s.id === note.componentId);
                      return (
                        <div
                          key={note.id}
                          className="p-3 bg-white/5 border border-white/10 rounded-none"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-white font-medium text-sm">{component?.name}</div>
                            <div className="text-white/40 text-xs">
                              {new Date(note.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                          {note.code && (
                            <pre className="text-xs text-white/60 bg-black/50 p-2 rounded-none mb-2 overflow-x-auto">
                              {note.code.substring(0, 100)}...
                            </pre>
                          )}
                          <p className="text-white/70 text-xs">{note.notes}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="bg-black/50 border border-white/10 rounded-none p-6">
              <h2 className="text-xl font-bold text-white mb-4">Actions</h2>
              <div className="space-y-2">
                <button
                  onClick={handleExport}
                  className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white font-medium transition flex items-center justify-center gap-2"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Export Report
                </button>
                <button
                  onClick={clearState}
                  className="w-full px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-none text-red-400 font-medium transition"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
