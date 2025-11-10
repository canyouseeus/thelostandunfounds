import { useState } from 'react';
import type { TopicCluster } from '../../types/seo';

interface TopicClustersViewProps {
  clusters: TopicCluster[] | null;
  onGenerate: (keywords: string[]) => void;
}

export default function TopicClustersView({ clusters, onGenerate }: TopicClustersViewProps) {
  const [keywords, setKeywords] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keywords.trim()) {
      const keywordArray = keywords.split(',').map(k => k.trim()).filter(Boolean);
      onGenerate(keywordArray);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Topic Clusters Generator</h2>
      <p className="text-gray-600 mb-6">
        Generate topic clusters for comprehensive content strategy. Build pillar content
        and supporting articles that create a strong SEO foundation.
      </p>

      <form onSubmit={handleSubmit} className="mb-6">
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
            placeholder="ai tools, web development, creative coding"
            required
          />
          <p className="mt-2 text-sm text-gray-500">
            Enter 3-5 primary keywords to generate topic clusters around
          </p>
        </div>
        <button
          type="submit"
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Generate Clusters
        </button>
      </form>

      {clusters && clusters.length > 0 && (
        <div className="mt-8 space-y-8">
          {clusters.map((cluster) => (
            <div key={cluster.id} className="border-t pt-6">
              <div className="mb-4">
                <h3 className="text-2xl font-bold mb-2">{cluster.name}</h3>
                <p className="text-gray-600">{cluster.description}</p>
              </div>

              {/* Keywords */}
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {cluster.keywords.slice(0, 10).map((kw, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {kw.term}
                    </span>
                  ))}
                </div>
              </div>

              {/* Pillar Content */}
              {cluster.pillarContent && (
                <div className="mb-4 bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-green-900">Pillar Content</h4>
                    <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs capitalize">
                      {cluster.pillarContent.type}
                    </span>
                  </div>
                  <h5 className="font-medium mb-1">{cluster.pillarContent.title}</h5>
                  <p className="text-sm text-gray-700 mb-2">
                    SEO Value: {cluster.pillarContent.estimatedValue}/100
                  </p>
                  <div className="text-xs text-gray-600">
                    Keywords: {cluster.pillarContent.targetKeywords.map(k => k.term).join(', ')}
                  </div>
                </div>
              )}

              {/* Supporting Content */}
              {cluster.supportingContent.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Supporting Content</h4>
                  <div className="space-y-2">
                    {cluster.supportingContent.map((content, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-start justify-between mb-1">
                          <h5 className="font-medium">{content.title}</h5>
                          <span className="px-2 py-1 bg-gray-200 rounded text-xs capitalize ml-2">
                            {content.type}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Value: {content.estimatedValue}/100 • Competition: {content.competition}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Internal Linking Strategy */}
              {cluster.internalLinkingStrategy.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Internal Linking Strategy</h4>
                  <div className="space-y-2">
                    {cluster.internalLinkingStrategy.slice(0, 5).map((link, idx) => (
                      <div key={idx} className="bg-purple-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-purple-900">{link.anchorText}</span>
                          <span className="text-xs text-purple-600">Value: {link.value}/100</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {link.text} → <span className="font-mono text-xs">{link.url}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
