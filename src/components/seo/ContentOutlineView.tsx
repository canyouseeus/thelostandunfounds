import { useState } from 'react';
import type { ContentOutline } from '../../types/seo';

interface ContentOutlineViewProps {
  outline: ContentOutline | null;
  onGenerate: (topic: string, keywords: string[], type?: string) => void;
}

export default function ContentOutlineView({ outline, onGenerate }: ContentOutlineViewProps) {
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [type, setType] = useState<string>('blog-post');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim() && keywords.trim()) {
      const keywordArray = keywords.split(',').map(k => k.trim()).filter(Boolean);
      onGenerate(topic.trim(), keywordArray, type);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Content Outline Generator</h2>
      <p className="text-gray-600 mb-6">
        Generate SEO-optimized content outlines that align with TLAU's creative voice
        and audience interests.
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
              placeholder="e.g., Building AI Tools for Creators"
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
              placeholder="ai tools, creative tools, maker tools"
              required
            />
          </div>
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
        </div>
        <button
          type="submit"
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Generate Outline
        </button>
      </form>

      {outline && (
        <div className="mt-8 space-y-6">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg">
            <h3 className="text-2xl font-bold mb-2">{outline.title}</h3>
            <p className="text-gray-700">{outline.summary}</p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-xl font-semibold mb-4">Content Structure</h3>
            <div className="space-y-4">
              {outline.sections.map((section, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-lg mb-2">{section.heading}</h4>
                  {section.subheadings && section.subheadings.length > 0 && (
                    <ul className="ml-4 mb-2 space-y-1">
                      {section.subheadings.map((sub, subIdx) => (
                        <li key={subIdx} className="text-sm text-gray-600">• {sub}</li>
                      ))}
                    </ul>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {section.wordCount && (
                      <span>Target: ~{section.wordCount} words</span>
                    )}
                    <span>
                      Keywords: {section.keywords.map(k => k.term).join(', ')}
                    </span>
                  </div>
                  {section.notes && (
                    <p className="mt-2 text-sm text-gray-500 italic">{section.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {outline.recommendedLinks.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-xl font-semibold mb-4">Recommended Links</h3>
              <div className="space-y-2">
                {outline.recommendedLinks.map((link, idx) => (
                  <div key={idx} className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <a
                        href={link.url}
                        className="font-medium text-blue-600 hover:text-blue-800"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.anchorText}
                      </a>
                      <span className={`px-2 py-1 rounded text-xs ${
                        link.type === 'internal' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {link.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{link.context}</p>
                    <div className="text-xs text-gray-500 mt-1">Value: {link.value}/100</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-6">
            <h3 className="text-xl font-semibold mb-4">Metadata</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-700">Title:</span>
                <span className="ml-2">{outline.metadata.title}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Description:</span>
                <span className="ml-2">{outline.metadata.description}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Keywords:</span>
                <span className="ml-2">{outline.metadata.keywords.join(', ')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
