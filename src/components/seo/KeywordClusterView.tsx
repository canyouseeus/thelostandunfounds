import { useState } from 'react';
import type { KeywordCluster } from '../../types/seo';

interface KeywordClusterViewProps {
  cluster: KeywordCluster | null;
  onGenerate: (keyword: string, category?: string) => void;
}

export default function KeywordClusterView({ cluster, onGenerate }: KeywordClusterViewProps) {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      onGenerate(keyword.trim(), category || undefined);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Keyword Cluster Generator</h2>
      <p className="text-gray-600 mb-6">
        Generate semantic keyword clusters around your primary keyword. Perfect for discovering
        content opportunities aligned with TLAU's creative audience.
      </p>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-2">
              Primary Keyword *
            </label>
            <input
              type="text"
              id="keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., ai art tools"
              required
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Category (Optional)
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Auto-detect</option>
              <option value="ai">AI</option>
              <option value="web-dev">Web Development</option>
              <option value="creativity">Creativity</option>
              <option value="bitcoin">Bitcoin</option>
              <option value="diy-tech">DIY Tech</option>
              <option value="systems-thinking">Systems Thinking</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Generate Cluster
        </button>
      </form>

      {cluster && (
        <div className="mt-8 space-y-6">
          <div className="border-t pt-6">
            <h3 className="text-xl font-semibold mb-4">Primary Keyword</h3>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-lg">{cluster.primaryKeyword.term}</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {cluster.category}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                <div>
                  <span className="text-gray-600">Intent:</span>
                  <span className="ml-2 font-medium capitalize">{cluster.primaryKeyword.intent}</span>
                </div>
                {cluster.primaryKeyword.difficulty && (
                  <div>
                    <span className="text-gray-600">Difficulty:</span>
                    <span className="ml-2 font-medium">{cluster.primaryKeyword.difficulty}/100</span>
                  </div>
                )}
                {cluster.primaryKeyword.searchVolume && (
                  <div>
                    <span className="text-gray-600">Volume:</span>
                    <span className="ml-2 font-medium">{cluster.primaryKeyword.searchVolume.toLocaleString()}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Relevance:</span>
                  <span className="ml-2 font-medium">{(cluster.primaryKeyword.relevance * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>

          {cluster.relatedKeywords.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-xl font-semibold mb-4">Related Keywords</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cluster.relatedKeywords.map((kw, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{kw.term}</span>
                      <span className="text-xs px-2 py-1 bg-gray-200 rounded capitalize">
                        {kw.intent}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Relevance: {(kw.relevance * 100).toFixed(0)}%
                      {kw.difficulty && ` • Difficulty: ${kw.difficulty}/100`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cluster.semanticVariations.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-xl font-semibold mb-4">Semantic Variations</h3>
              <div className="flex flex-wrap gap-2">
                {cluster.semanticVariations.map((kw, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                  >
                    {kw.term}
                  </span>
                ))}
              </div>
            </div>
          )}

          {cluster.contentOpportunities.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-xl font-semibold mb-4">Content Opportunities</h3>
              <div className="space-y-3">
                {cluster.contentOpportunities.map((op, idx) => (
                  <div key={idx} className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{op.title}</h4>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs capitalize">
                          {op.type}
                        </span>
                        <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs capitalize">
                          {op.competition}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      SEO Value: {op.estimatedValue}/100 • Audience Alignment: {(op.audienceAlignment * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      Keywords: {op.targetKeywords.map(k => k.term).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
