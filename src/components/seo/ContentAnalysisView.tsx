import { useState } from 'react';
import type { SEOAnalysis } from '../../types/seo';

interface ContentAnalysisViewProps {
  analysis: SEOAnalysis | null;
  onAnalyze: (content: string, url: string, keywords?: string[]) => void;
}

export default function ContentAnalysisView({ analysis, onAnalyze }: ContentAnalysisViewProps) {
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [keywords, setKeywords] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim() && url.trim()) {
      const keywordArray = keywords.trim()
        ? keywords.split(',').map(k => k.trim()).filter(Boolean)
        : undefined;
      onAnalyze(content.trim(), url.trim(), keywordArray);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Content SEO Analysis</h2>
      <p className="text-gray-600 mb-6">
        Analyze your content for SEO performance. Get actionable recommendations
        to improve search visibility and engagement.
      </p>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              URL *
            </label>
            <input
              type="text"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com/page"
              required
            />
          </div>
          <div>
            <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-2">
              Target Keywords (comma-separated, optional)
            </label>
            <input
              type="text"
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="keyword1, keyword2, keyword3"
            />
          </div>
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Content (Markdown) *
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="# Title&#10;&#10;Your content here..."
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Analyze Content
        </button>
      </form>

      {analysis && (
        <div className="mt-8 space-y-6">
          {/* Overall Score */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Overall SEO Score</h3>
              <div className="text-4xl font-bold" style={{ color: analysis.score >= 80 ? '#10b981' : analysis.score >= 60 ? '#f59e0b' : '#ef4444' }}>
                {analysis.score}/100
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full transition-all"
                style={{
                  width: `${analysis.score}%`,
                  backgroundColor: analysis.score >= 80 ? '#10b981' : analysis.score >= 60 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
          </div>

          {/* Metrics */}
          <div className="border-t pt-6">
            <h3 className="text-xl font-semibold mb-4">Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Title Length</div>
                <div className="text-2xl font-bold">{analysis.metrics.titleLength}</div>
                <div className={`text-xs mt-1 ${analysis.metrics.titleOptimal ? 'text-green-600' : 'text-red-600'}`}>
                  {analysis.metrics.titleOptimal ? '✓ Optimal' : '✗ Not optimal (30-60 chars)'}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Meta Description</div>
                <div className="text-2xl font-bold">{analysis.metrics.metaDescriptionLength}</div>
                <div className={`text-xs mt-1 ${analysis.metrics.metaDescriptionOptimal ? 'text-green-600' : 'text-red-600'}`}>
                  {analysis.metrics.metaDescriptionOptimal ? '✓ Optimal' : '✗ Not optimal (120-160 chars)'}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Internal Links</div>
                <div className="text-2xl font-bold">{analysis.metrics.internalLinks}</div>
                <div className="text-xs mt-1 text-gray-500">External: {analysis.metrics.externalLinks}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Heading Structure</div>
                <div className="text-2xl font-bold">
                  H1: {analysis.metrics.headingStructure.h1Count} | H2: {analysis.metrics.headingStructure.h2Count}
                </div>
                <div className={`text-xs mt-1 ${analysis.metrics.headingStructure.hierarchyValid ? 'text-green-600' : 'text-red-600'}`}>
                  {analysis.metrics.headingStructure.hierarchyValid ? '✓ Valid' : '✗ Invalid'}
                </div>
              </div>
              {analysis.metrics.readabilityScore && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Readability</div>
                  <div className="text-2xl font-bold">{Math.round(analysis.metrics.readabilityScore)}</div>
                  <div className="text-xs mt-1 text-gray-500">Flesch Reading Ease</div>
                </div>
              )}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Images</div>
                <div className="text-2xl font-bold">{analysis.metrics.imageOptimization.totalImages}</div>
                <div className="text-xs mt-1 text-gray-500">
                  {analysis.metrics.imageOptimization.imagesWithAlt} with alt text
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-xl font-semibold mb-4">Recommendations</h3>
              <div className="space-y-3">
                {analysis.recommendations
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
                      <div className="mt-2 text-xs text-gray-500">
                        Effort: {rec.effort} • Priority: {rec.priority}/10
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Keyword Performance */}
          {analysis.keywordPerformance.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-xl font-semibold mb-4">Keyword Performance</h3>
              <div className="space-y-2">
                {analysis.keywordPerformance.map((kp, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                    <span className="font-medium">{kp.keyword}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      kp.trend === 'up' ? 'bg-green-100 text-green-800' :
                      kp.trend === 'down' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {kp.trend}
                    </span>
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
