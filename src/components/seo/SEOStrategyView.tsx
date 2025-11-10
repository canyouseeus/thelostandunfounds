import { useState } from 'react';
import type { SEOStrategy } from '../../types/seo';

interface SEOStrategyViewProps {
  strategy: SEOStrategy | null;
  onGenerate: (keywords: string[], existingContent?: string[]) => void;
}

export default function SEOStrategyView({ strategy, onGenerate }: SEOStrategyViewProps) {
  const [keywords, setKeywords] = useState('');
  const [existingContent, setExistingContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keywords.trim()) {
      const keywordArray = keywords.split(',').map(k => k.trim()).filter(Boolean);
      const existingArray = existingContent.trim()
        ? existingContent.split(',').map(c => c.trim()).filter(Boolean)
        : undefined;
      onGenerate(keywordArray, existingArray);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">SEO Strategy Generator</h2>
      <p className="text-gray-600 mb-6">
        Generate a comprehensive SEO strategy with topic clusters, content calendar,
        and internal linking map. Perfect for planning long-term content growth.
      </p>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-2">
              Focus Keywords (comma-separated) *
            </label>
            <input
              type="text"
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="ai tools, creative coding, indie maker tools"
              required
            />
          </div>
          <div>
            <label htmlFor="existing" className="block text-sm font-medium text-gray-700 mb-2">
              Existing Content URLs (comma-separated, optional)
            </label>
            <input
              type="text"
              id="existing"
              value={existingContent}
              onChange={(e) => setExistingContent(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="/blog/post-1, /tools/tool-1"
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Generate Strategy
        </button>
      </form>

      {strategy && (
        <div className="mt-8 space-y-8">
          {/* Focus Keywords */}
          <div className="border-t pt-6">
            <h3 className="text-xl font-semibold mb-4">Focus Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {strategy.focusKeywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-medium"
                >
                  {kw.term}
                </span>
              ))}
            </div>
          </div>

          {/* Topic Clusters Summary */}
          <div className="border-t pt-6">
            <h3 className="text-xl font-semibold mb-4">Topic Clusters ({strategy.topicClusters.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {strategy.topicClusters.map((cluster) => (
                <div key={cluster.id} className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">{cluster.name}</h4>
                  <p className="text-sm text-gray-600 mb-2">{cluster.description}</p>
                  <div className="text-xs text-gray-500">
                    {cluster.contentPieces.length} content pieces • {cluster.keywords.length} keywords
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content Calendar */}
          {strategy.contentCalendar.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-xl font-semibold mb-4">Content Calendar (Next 3 Months)</h3>
              <div className="space-y-3">
                {strategy.contentCalendar.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{item.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {item.publishDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs capitalize ${
                          item.status === 'published' ? 'bg-green-100 text-green-800' :
                          item.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs capitalize">
                          {item.type}
                        </span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                          Priority: {item.priority}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {item.targetKeywords.slice(0, 3).map((kw, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-gray-100 rounded"
                        >
                          {kw.term}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Internal Linking Map */}
          {strategy.internalLinkingMap.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-xl font-semibold mb-4">Internal Linking Map</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-4">
                  {strategy.internalLinkingMap.length} internal link opportunities identified
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {strategy.internalLinkingMap.slice(0, 10).map((link, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs text-blue-600">{link.sourceUrl}</span>
                        <span className="text-xs text-gray-500">→</span>
                        <span className="font-mono text-xs text-green-600">{link.targetUrl}</span>
                      </div>
                      <div className="text-sm text-gray-700 mt-1">
                        Anchor: <span className="font-medium">"{link.anchorText}"</span>
                        {' • '}
                        Keyword: <span className="font-medium">{link.keyword}</span>
                        {' • '}
                        Value: <span className="font-medium">{link.value}/100</span>
                      </div>
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
