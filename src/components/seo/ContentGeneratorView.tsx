import { useState } from 'react';
import type { ContentGenerationRequest, ContentGenerationResponse } from '../../types/seo';

interface ContentGeneratorViewProps {
  content: ContentGenerationResponse | null;
  onGenerate: (request: ContentGenerationRequest) => void;
}

export default function ContentGeneratorView({ content, onGenerate }: ContentGeneratorViewProps) {
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [type, setType] = useState<string>('blog-post');
  const [tone, setTone] = useState<string>('creative');
  const [length, setLength] = useState<string>('medium');
  const [targetAudience, setTargetAudience] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim() && keywords.trim()) {
      const keywordArray = keywords.split(',').map(k => k.trim()).filter(Boolean);
      const audienceArray = targetAudience.trim()
        ? targetAudience.split(',').map(a => a.trim()).filter(Boolean)
        : undefined;

      onGenerate({
        topic: topic.trim(),
        keywords: keywordArray,
        type: type as ContentGenerationRequest['type'],
        tone: tone as ContentGenerationRequest['tone'],
        length: length as ContentGenerationRequest['length'],
        targetAudience: audienceArray,
        includeOutline: true,
        includeMetadata: true,
      });
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">AI Content Generator</h2>
      <p className="text-gray-600 mb-6">
        Generate SEO-optimized content in TLAU's creative voice. Perfect for
        building content that resonates with independent thinkers and creative builders.
      </p>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
              Topic *
            </label>
            <input
              type="text"
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Building AI Tools for Independent Creators"
              required
            />
          </div>
          <div>
            <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-2">
              Target Keywords (comma-separated) *
            </label>
            <input
              type="text"
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="ai tools, creative tools, indie maker"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Content Type
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="blog-post">Blog Post</option>
                <option value="guide">Guide</option>
                <option value="tutorial">Tutorial</option>
                <option value="case-study">Case Study</option>
                <option value="tool">Tool</option>
                <option value="resource">Resource</option>
              </select>
            </div>
            <div>
              <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-2">
                Tone
              </label>
              <select
                id="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="creative">Creative</option>
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="technical">Technical</option>
              </select>
            </div>
            <div>
              <label htmlFor="length" className="block text-sm font-medium text-gray-700 mb-2">
                Length
              </label>
              <select
                id="length"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="short">Short (~500 words)</option>
                <option value="medium">Medium (~1000 words)</option>
                <option value="long">Long (~2000+ words)</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="audience" className="block text-sm font-medium text-gray-700 mb-2">
              Target Audience (comma-separated, optional)
            </label>
            <input
              type="text"
              id="audience"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="creative artists, solopreneurs, indie makers"
            />
            <p className="mt-1 text-xs text-gray-500">
              Examples: creative artists, gamers, solopreneurs, freelancers, handymen
            </p>
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Generate Content
        </button>
      </form>

      {content && (
        <div className="mt-8 space-y-6">
          {/* Content Score */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Content SEO Score</h3>
              <div className="text-4xl font-bold" style={{ color: content.score.overall >= 80 ? '#10b981' : content.score.overall >= 60 ? '#f59e0b' : '#ef4444' }}>
                {content.score.overall}/100
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Readability:</span>
                <span className="ml-2 font-medium">{content.score.readability.toFixed(0)}</span>
              </div>
              <div>
                <span className="text-gray-600">Keyword Opt:</span>
                <span className="ml-2 font-medium">{content.score.keywordOptimization.toFixed(0)}</span>
              </div>
              <div>
                <span className="text-gray-600">Structure:</span>
                <span className="ml-2 font-medium">{content.score.structure.toFixed(0)}</span>
              </div>
              <div>
                <span className="text-gray-600">Engagement:</span>
                <span className="ml-2 font-medium">{content.score.engagement.toFixed(0)}</span>
              </div>
            </div>
          </div>

          {/* Generated Content */}
          <div className="border-t pt-6">
            <h3 className="text-xl font-semibold mb-4">Generated Content</h3>
            <div className="bg-gray-50 p-6 rounded-lg">
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
                {content.content}
              </pre>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(content.content);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Copy Content
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([content.content], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${content.outline.title.toLowerCase().replace(/\s+/g, '-')}.md`;
                  a.click();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Download Markdown
              </button>
            </div>
          </div>

          {/* Recommendations */}
          {content.recommendations.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-xl font-semibold mb-4">SEO Recommendations</h3>
              <div className="space-y-3">
                {content.recommendations
                  .sort((a, b) => b.priority - a.priority)
                  .map((rec, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-l-4 ${
                        rec.type === 'critical'
                          ? 'bg-red-50 border-red-500'
                          : rec.type === 'important'
                          ? 'bg-yellow-50 border-yellow-500'
                          : 'bg-blue-50 border-blue-500'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{rec.title}</h4>
                        <span className="px-2 py-1 bg-white rounded text-xs capitalize">
                          {rec.impact} impact
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{rec.description}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Outline */}
          {content.outline && (
            <div className="border-t pt-6">
              <h3 className="text-xl font-semibold mb-4">Content Outline</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">{content.outline.title}</h4>
                <p className="text-sm text-gray-700 mb-4">{content.outline.summary}</p>
                <div className="space-y-2">
                  {content.outline.sections.map((section, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-medium">{section.heading}</span>
                      {section.wordCount && (
                        <span className="text-gray-500 ml-2">(~{section.wordCount} words)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
