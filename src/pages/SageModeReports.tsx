/**
 * SAGE MODE Reports - View and manage design experiment reports
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useSageMode } from '../contexts/SageModeContext';
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function SageModeReports() {
  const { state, exportReport, clearState } = useSageMode();
  const [copied, setCopied] = useState(false);

  const selectedComponents = state.selections.filter(s => s.selected);
  const reportData = exportReport();

  const handleCopy = () => {
    navigator.clipboard.writeText(reportData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([reportData], { type: 'application/json' });
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
        <title>SAGE MODE Reports | Admin | THE LOST+UNFOUNDS</title>
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-2 tracking-wide flex items-center gap-3">
                <DocumentTextIcon className="w-10 h-10 text-yellow-400" />
                SAGE MODE REPORTS
              </h1>
              <p className="text-white/60 text-sm">
                View and export design experiment reports
              </p>
            </div>
            <Link
              to="/sagemode"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white font-medium transition flex items-center gap-2"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to SAGE MODE
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Summary */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-black/50 border border-white/10 rounded-none p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5" />
                Current Report
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-none border border-white/10">
                  <span className="text-white/80">SAGE MODE Status</span>
                  <span className={`px-3 py-1 rounded-none text-xs font-medium ${state.enabled
                      ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
                      : 'bg-white/10 text-white/60 border border-white/20'
                    }`}>
                    {state.enabled ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-none border border-white/10">
                  <span className="text-white/80">Selected Components</span>
                  <span className="text-white font-mono">{selectedComponents.length}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-none border border-white/10">
                  <span className="text-white/80">Notes</span>
                  <span className="text-white font-mono">{state.notes.length}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-none border border-white/10">
                  <span className="text-white/80">Custom Code</span>
                  <span className="text-white font-mono">
                    {state.customCode.length > 0 ? `${state.customCode.length} chars` : 'None'}
                  </span>
                </div>
              </div>

              {/* Selected Components List */}
              {selectedComponents.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4" />
                    Selected Components
                  </h3>
                  <div className="space-y-2">
                    {selectedComponents.map(comp => (
                      <div
                        key={comp.id}
                        className="p-3 bg-white/5 border border-white/10 rounded-none"
                      >
                        <div className="text-white font-medium text-sm">{comp.name}</div>
                        <div className="text-white/60 text-xs">{comp.category}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {state.notes.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-white font-medium mb-3">Component Notes</h3>
                  <div className="space-y-3">
                    {state.notes.map(note => {
                      const component = state.selections.find(s => s.id === note.componentId);
                      return (
                        <div
                          key={note.id}
                          className="p-4 bg-white/5 border border-white/10 rounded-none"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-white font-medium text-sm">{component?.name}</div>
                            <div className="text-white/40 text-xs flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              {new Date(note.timestamp).toLocaleString()}
                            </div>
                          </div>
                          {note.code && (
                            <pre className="text-xs text-white/60 bg-black/50 p-3 rounded-none mb-2 overflow-x-auto">
                              {note.code}
                            </pre>
                          )}
                          <p className="text-white/70 text-sm">{note.notes}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Code */}
              {state.customCode && (
                <div>
                  <h3 className="text-white font-medium mb-3">Custom Code</h3>
                  <pre className="text-xs text-white/60 bg-black/50 p-4 rounded-none border border-white/10 overflow-x-auto">
                    {state.customCode}
                  </pre>
                </div>
              )}
            </div>

            {/* JSON Report */}
            <div className="bg-black/50 border border-white/10 rounded-none p-6">
              <h2 className="text-xl font-bold text-white mb-4">JSON Report</h2>
              <pre className="text-xs text-white/60 bg-black/50 p-4 rounded-none border border-white/10 overflow-x-auto max-h-96">
                {reportData}
              </pre>
            </div>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            <div className="bg-black/50 border border-white/10 rounded-none p-6">
              <h2 className="text-xl font-bold text-white mb-4">Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={handleDownload}
                  className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white font-medium transition flex items-center justify-center gap-2"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Download Report
                </button>
                <button
                  onClick={handleCopy}
                  className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white font-medium transition flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircleIcon className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <DocumentTextIcon className="w-4 h-4" />
                      Copy Report
                    </>
                  )}
                </button>
                <Link
                  to="/designsystem/preview"
                  className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white font-medium transition flex items-center justify-center gap-2"
                >
                  View Preview
                </Link>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-none p-6">
              <h3 className="text-red-400 font-medium mb-2">Danger Zone</h3>
              <p className="text-red-400/70 text-xs mb-4">
                This will permanently delete all SAGE MODE data including selections, notes, and custom code.
              </p>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to clear all SAGE MODE data? This cannot be undone.')) {
                    clearState();
                  }
                }}
                className="w-full px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-none text-red-400 font-medium transition flex items-center justify-center gap-2"
              >
                <TrashIcon className="w-4 h-4" />
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
