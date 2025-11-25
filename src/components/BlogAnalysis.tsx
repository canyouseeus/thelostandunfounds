/**
 * Blog Post AI Analysis Component
 * Displays AI breakdown and tool suggestions for blog posts
 */

import { useState, useEffect } from 'react';
import { Sparkles, ExternalLink, Loader2 } from 'lucide-react';

interface ToolSuggestion {
  name: string;
  description: string;
  category: string;
  url?: string;
}

interface TermDefinition {
  term: string;
  definition: string;
  category?: string;
}

interface AnalysisResult {
  summary: string;
  keyPoints: string[];
  toolsMentioned: string[];
  termsAndConcepts: TermDefinition[];
  comparableTools: ToolSuggestion[];
  alternatives: ToolSuggestion[];
}

interface BlogAnalysisProps {
  title: string;
  content: string;
  excerpt?: string | null;
}

export default function BlogAnalysis({ title, content, excerpt }: BlogAnalysisProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/blog-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            content,
            excerpt,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to analyze blog post');
        }

        const data = await response.json();
        setAnalysis(data);
      } catch (err: any) {
        console.error('Error fetching analysis:', err);
        setError(err.message || 'Failed to load analysis');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [title, content, excerpt]);

  if (loading) {
    return (
      <div className="mt-12 border-t border-white/10 pt-8">
        <div className="flex items-center gap-2 text-white/60 mb-4">
          <Loader2 className="w-5 h-5 animate-spin" />
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6" />
            AI Breakdown
          </h2>
        </div>
        <p className="text-white/60">Analyzing post content...</p>
      </div>
    );
  }

  if (error || !analysis) {
    return null; // Don't show error, just don't display the section
  }

  return (
    <div className="mt-12 border-t border-white/10 pt-8">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2 text-left">
        <Sparkles className="w-6 h-6" />
        AI Breakdown
      </h2>

      {/* Summary */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-white mb-3 text-left">Summary</h3>
        <p className="text-white/80 text-lg leading-relaxed text-justify text-left">
          {analysis.summary}
        </p>
      </div>

      {/* Key Points */}
      {analysis.keyPoints.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-white mb-3 text-left">Key Points</h3>
          <ul className="space-y-2 text-left">
            {analysis.keyPoints.map((point, index) => (
              <li key={index} className="text-white/80 flex items-start gap-2">
                <span className="text-white/60 mt-1">•</span>
                <span className="text-justify">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tools Mentioned */}
      {analysis.toolsMentioned.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-white mb-3 text-left">Tools Mentioned</h3>
          <div className="flex flex-wrap gap-2">
            {analysis.toolsMentioned.map((tool, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-white/10 border border-white/20 rounded text-white/90 text-sm"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Terms & Concepts Glossary */}
      {analysis.termsAndConcepts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-white mb-4 text-left">Terms & Concepts</h3>
          <div className="space-y-4">
            {analysis.termsAndConcepts.map((term, index) => (
              <div
                key={index}
                className="bg-black/50 border border-white/10 rounded-none p-4 hover:border-white/20 transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="text-lg font-semibold text-white text-left">{term.term}</h4>
                    {term.category && (
                      <span className="text-xs text-white/50 text-left">{term.category}</span>
                    )}
                  </div>
                </div>
                <p className="text-white/70 text-sm leading-relaxed text-left">{term.definition}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparable Tools */}
      {analysis.comparableTools.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-white mb-4 text-left">Comparable Tools</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {analysis.comparableTools.map((tool, index) => (
              <div
                key={index}
                className="bg-black/50 border border-white/10 rounded-none p-4 hover:border-white/20 transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-lg font-semibold text-white text-left">{tool.name}</h4>
                  {tool.url && (
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/60 hover:text-white transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <p className="text-white/70 text-sm mb-2 text-left">{tool.description}</p>
                <span className="text-xs text-white/50 text-left">{tool.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alternatives */}
      {analysis.alternatives.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-white mb-4 text-left">Alternative Tools</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {analysis.alternatives.map((tool, index) => (
              <div
                key={index}
                className="bg-black/50 border border-white/10 rounded-none p-4 hover:border-white/20 transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-lg font-semibold text-white text-left">{tool.name}</h4>
                  {tool.url && (
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/60 hover:text-white transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <p className="text-white/70 text-sm mb-2 text-left">{tool.description}</p>
                <span className="text-xs text-white/50 text-left">{tool.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
