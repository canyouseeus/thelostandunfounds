import { useState } from 'react';
import { seoAgent } from '../../services/seo';
import type {
  KeywordCluster,
  SEOAnalysis,
  ContentOutline,
  TopicCluster,
  SEOStrategy,
  ContentGenerationRequest,
  ContentGenerationResponse,
} from '../../types/seo';
import KeywordClusterView from '../seo/KeywordClusterView';
import ContentAnalysisView from '../seo/ContentAnalysisView';
import ContentOutlineView from '../seo/ContentOutlineView';
import TopicClustersView from '../seo/TopicClustersView';
import SEOStrategyView from '../seo/SEOStrategyView';
import ContentGeneratorView from '../seo/ContentGeneratorView';

type ViewMode = 
  | 'keyword-cluster'
  | 'content-analysis'
  | 'content-outline'
  | 'topic-clusters'
  | 'seo-strategy'
  | 'content-generator';

export default function SEODashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('keyword-cluster');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [keywordCluster, setKeywordCluster] = useState<KeywordCluster | null>(null);
  const [contentAnalysis, setContentAnalysis] = useState<SEOAnalysis | null>(null);
  const [contentOutline, setContentOutline] = useState<ContentOutline | null>(null);
  const [topicClusters, setTopicClusters] = useState<TopicCluster[] | null>(null);
  const [seoStrategy, setSEOStrategy] = useState<SEOStrategy | null>(null);
  const [generatedContent, setGeneratedContent] = useState<ContentGenerationResponse | null>(null);

  const handleGenerateKeywordCluster = async (keyword: string, category?: string) => {
    setLoading(true);
    setError(null);
    try {
      const cluster = await seoAgent.generateKeywordCluster(
        keyword,
        category as any
      );
      setKeywordCluster(cluster);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate keyword cluster');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeContent = async (content: string, url: string, keywords?: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const analysis = await seoAgent.analyzeContent(content, url, keywords);
      setContentAnalysis(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze content');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateContentOutline = async (
    topic: string,
    keywords: string[],
    type?: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const outline = await seoAgent.generateContentOutline(
        topic,
        keywords,
        type as any
      );
      setContentOutline(outline);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content outline');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTopicClusters = async (keywords: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const clusters = await seoAgent.generateTopicClusters(keywords);
      setTopicClusters(clusters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate topic clusters');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSEOStrategy = async (keywords: string[], existingContent?: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const strategy = await seoAgent.generateSEOStrategy(keywords, existingContent);
      setSEOStrategy(strategy);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate SEO strategy');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateContent = async (request: ContentGenerationRequest) => {
    setLoading(true);
    setError(null);
    try {
      // Import the server tool
      const { generateContent } = await import('../../servers/seo/index');
      const response = await generateContent(request);
      setGeneratedContent(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            TLAU SEO Agent
          </h1>
          <p className="text-gray-600">
            Intelligent SEO strategies for creative builders and independent thinkers
          </p>
        </div>

        {/* Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-4 border-b border-gray-200">
            {[
              { id: 'keyword-cluster', label: 'Keyword Clusters' },
              { id: 'content-analysis', label: 'Content Analysis' },
              { id: 'content-outline', label: 'Content Outline' },
              { id: 'topic-clusters', label: 'Topic Clusters' },
              { id: 'seo-strategy', label: 'SEO Strategy' },
              { id: 'content-generator', label: 'Content Generator' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setViewMode(item.id as ViewMode)}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  viewMode === item.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="mb-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Processing...</p>
          </div>
        )}

        {/* Content Views */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {viewMode === 'keyword-cluster' && (
            <KeywordClusterView
              cluster={keywordCluster}
              onGenerate={handleGenerateKeywordCluster}
            />
          )}

          {viewMode === 'content-analysis' && (
            <ContentAnalysisView
              analysis={contentAnalysis}
              onAnalyze={handleAnalyzeContent}
            />
          )}

          {viewMode === 'content-outline' && (
            <ContentOutlineView
              outline={contentOutline}
              onGenerate={handleGenerateContentOutline}
            />
          )}

          {viewMode === 'topic-clusters' && (
            <TopicClustersView
              clusters={topicClusters}
              onGenerate={handleGenerateTopicClusters}
            />
          )}

          {viewMode === 'seo-strategy' && (
            <SEOStrategyView
              strategy={seoStrategy}
              onGenerate={handleGenerateSEOStrategy}
            />
          )}

          {viewMode === 'content-generator' && (
            <ContentGeneratorView
              content={generatedContent}
              onGenerate={handleGenerateContent}
            />
          )}
        </div>
      </div>
    </div>
  );
}
