/**
 * SEO Types for TLAU SEO Agent
 * 
 * Types and interfaces for SEO analysis, keyword mapping, and content generation
 */

export interface Keyword {
  term: string;
  searchVolume?: number;
  difficulty?: number;
  cpc?: number;
  intent: 'informational' | 'navigational' | 'transactional' | 'commercial';
  relevance: number; // 0-1 score
  trend?: 'rising' | 'stable' | 'declining';
}

export interface KeywordCluster {
  id: string;
  primaryKeyword: Keyword;
  relatedKeywords: Keyword[];
  semanticVariations: Keyword[];
  topic: string;
  category: 'ai' | 'web-dev' | 'creativity' | 'bitcoin' | 'diy-tech' | 'systems-thinking' | 'general';
  contentOpportunities: ContentOpportunity[];
}

export interface ContentOpportunity {
  title: string;
  type: 'blog-post' | 'guide' | 'tutorial' | 'case-study' | 'tool' | 'resource';
  targetKeywords: Keyword[];
  estimatedValue: number; // SEO value score 0-100
  competition: 'low' | 'medium' | 'high';
  audienceAlignment: number; // 0-1 score
  outline?: ContentOutline;
}

export interface ContentOutline {
  title: string;
  summary: string;
  keywords: Keyword[];
  sections: ContentSection[];
  recommendedLinks: LinkRecommendation[];
  metadata: ContentMetadata;
}

export interface ContentSection {
  heading: string;
  subheadings?: string[];
  keywords: Keyword[];
  wordCount?: number;
  notes?: string;
}

export interface LinkRecommendation {
  text: string;
  url: string;
  type: 'internal' | 'external';
  anchorText: string;
  context: string;
  value: number; // Link value score 0-100
}

export interface ContentMetadata {
  title: string;
  description: string;
  keywords: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  schema?: SchemaMarkup;
}

export interface SchemaMarkup {
  type: 'Article' | 'HowTo' | 'CreativeWork' | 'WebPage' | 'Organization';
  properties: Record<string, any>;
}

export interface SEOAnalysis {
  url: string;
  title: string;
  score: number; // Overall SEO score 0-100
  metrics: SEOMetrics;
  recommendations: SEORecommendation[];
  keywordPerformance: KeywordPerformance[];
  technicalIssues: TechnicalIssue[];
}

export interface SEOMetrics {
  titleLength: number;
  titleOptimal: boolean;
  metaDescriptionLength: number;
  metaDescriptionOptimal: boolean;
  headingStructure: HeadingStructure;
  keywordDensity: Record<string, number>;
  internalLinks: number;
  externalLinks: number;
  imageOptimization: ImageOptimization;
  mobileFriendly: boolean;
  pageSpeed?: number;
  readabilityScore?: number;
}

export interface HeadingStructure {
  h1Count: number;
  h2Count: number;
  h3Count: number;
  hierarchyValid: boolean;
  issues: string[];
}

export interface ImageOptimization {
  totalImages: number;
  imagesWithAlt: number;
  imagesOptimized: number;
  issues: string[];
}

export interface SEORecommendation {
  type: 'critical' | 'important' | 'suggestion';
  category: 'content' | 'technical' | 'on-page' | 'off-page' | 'metadata';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  priority: number; // 1-10
}

export interface KeywordPerformance {
  keyword: string;
  position?: number; // SERP position
  impressions?: number;
  clicks?: number;
  ctr?: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TechnicalIssue {
  type: 'error' | 'warning' | 'info';
  category: 'crawl' | 'indexing' | 'rendering' | 'performance' | 'mobile';
  message: string;
  fix?: string;
}

export interface ContentScore {
  overall: number; // 0-100
  readability: number;
  keywordOptimization: number;
  structure: number;
  engagement: number;
  seoBestPractices: number;
  breakdown: {
    title: number;
    headings: number;
    keywordUsage: number;
    internalLinking: number;
    metaTags: number;
    contentLength: number;
    readability: number;
  };
}

export interface TopicCluster {
  id: string;
  name: string;
  description: string;
  keywords: Keyword[];
  contentPieces: ContentOpportunity[];
  pillarContent?: ContentOpportunity;
  supportingContent: ContentOpportunity[];
  internalLinkingStrategy: LinkRecommendation[];
}

export interface SEOStrategy {
  focusKeywords: Keyword[];
  topicClusters: TopicCluster[];
  contentCalendar: ContentCalendarItem[];
  internalLinkingMap: InternalLinkingMap;
  competitorAnalysis?: CompetitorAnalysis;
}

export interface ContentCalendarItem {
  id: string;
  title: string;
  type: ContentOpportunity['type'];
  targetKeywords: Keyword[];
  publishDate: Date;
  status: 'planned' | 'in-progress' | 'published' | 'archived';
  priority: number;
}

export interface InternalLinkingMap {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  keyword: string;
  value: number;
}

export interface CompetitorAnalysis {
  competitors: Competitor[];
  keywordGaps: Keyword[];
  contentGaps: ContentOpportunity[];
  opportunities: SEORecommendation[];
}

export interface Competitor {
  domain: string;
  name: string;
  strengths: string[];
  weaknesses: string[];
  topKeywords: Keyword[];
  backlinkCount?: number;
  domainAuthority?: number;
}

export interface ContentGenerationRequest {
  topic: string;
  keywords: string[];
  type: ContentOpportunity['type'];
  targetAudience?: string[];
  tone?: 'professional' | 'casual' | 'creative' | 'technical';
  length?: 'short' | 'medium' | 'long';
  includeOutline?: boolean;
  includeMetadata?: boolean;
}

export interface ContentGenerationResponse {
  content: string; // Markdown format
  outline: ContentOutline;
  metadata: ContentMetadata;
  score: ContentScore;
  recommendations: SEORecommendation[];
}
