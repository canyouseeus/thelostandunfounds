/**
 * SEO Server Tools
 * 
 * Server-side SEO tools for TLAU SEO Agent
 * Can be used with MCP registry or directly
 */

import { seoAgent } from '../../services/seo';
import type {
  KeywordCluster,
  SEOAnalysis,
  ContentScore,
  ContentOutline,
  TopicCluster,
  SEOStrategy,
  ContentGenerationRequest,
  ContentGenerationResponse,
} from '../types/seo';

export interface GenerateKeywordClusterParams {
  primaryKeyword: string;
  category?: 'ai' | 'web-dev' | 'creativity' | 'bitcoin' | 'diy-tech' | 'systems-thinking' | 'general';
}

export interface AnalyzeContentParams {
  content: string;
  url: string;
  targetKeywords?: string[];
}

export interface ScoreContentParams {
  content: string;
  targetKeywords: string[];
  outline?: ContentOutline;
}

export interface GenerateContentOutlineParams {
  topic: string;
  keywords: string[];
  type?: 'blog-post' | 'guide' | 'tutorial' | 'case-study' | 'tool' | 'resource';
}

export interface GenerateTopicClustersParams {
  focusKeywords: string[];
}

export interface GenerateSEOStrategyParams {
  focusKeywords: string[];
  existingContent?: string[];
}

/**
 * Generate keyword cluster around a primary keyword
 */
export async function generateKeywordCluster(
  params: GenerateKeywordClusterParams
): Promise<{ cluster: KeywordCluster }> {
  const cluster = await seoAgent.generateKeywordCluster(
    params.primaryKeyword,
    params.category
  );
  return { cluster };
}

/**
 * Analyze content for SEO performance
 */
export async function analyzeContent(
  params: AnalyzeContentParams
): Promise<{ analysis: SEOAnalysis }> {
  const analysis = await seoAgent.analyzeContent(
    params.content,
    params.url,
    params.targetKeywords
  );
  return { analysis };
}

/**
 * Score content for SEO quality
 */
export async function scoreContent(
  params: ScoreContentParams
): Promise<{ score: ContentScore }> {
  const score = await seoAgent.scoreContent(
    params.content,
    params.targetKeywords,
    params.outline
  );
  return { score };
}

/**
 * Generate content outline with SEO optimization
 */
export async function generateContentOutline(
  params: GenerateContentOutlineParams
): Promise<{ outline: ContentOutline }> {
  const outline = await seoAgent.generateContentOutline(
    params.topic,
    params.keywords,
    params.type
  );
  return { outline };
}

/**
 * Generate topic clusters for content strategy
 */
export async function generateTopicClusters(
  params: GenerateTopicClustersParams
): Promise<{ clusters: TopicCluster[] }> {
  const clusters = await seoAgent.generateTopicClusters(params.focusKeywords);
  return { clusters };
}

/**
 * Generate comprehensive SEO strategy
 */
export async function generateSEOStrategy(
  params: GenerateSEOStrategyParams
): Promise<{ strategy: SEOStrategy }> {
  const strategy = await seoAgent.generateSEOStrategy(
    params.focusKeywords,
    params.existingContent
  );
  return { strategy };
}

/**
 * Generate content with SEO optimization
 */
export async function generateContent(
  params: ContentGenerationRequest
): Promise<ContentGenerationResponse> {
  // Generate outline
  const outline = await seoAgent.generateContentOutline(
    params.topic,
    params.keywords,
    params.type
  );

  // Generate content markdown
  const content = generateMarkdownContent(outline, params);

  // Score the content
  const score = await seoAgent.scoreContent(
    content,
    params.keywords,
    outline
  );

  // Generate recommendations
  const analysis = await seoAgent.analyzeContent(
    content,
    `/${params.topic.toLowerCase().replace(/\s+/g, '-')}`,
    params.keywords
  );

  return {
    content,
    outline,
    metadata: outline.metadata,
    score,
    recommendations: analysis.recommendations,
  };
}

/**
 * Generate markdown content from outline
 */
function generateMarkdownContent(
  outline: ContentOutline,
  params: ContentGenerationRequest
): string {
  let markdown = `# ${outline.title}\n\n`;
  markdown += `${outline.summary}\n\n`;

  outline.sections.forEach((section, index) => {
    const level = index === 0 ? '##' : '###';
    markdown += `${level} ${section.heading}\n\n`;
    
    if (section.subheadings) {
      section.subheadings.forEach(subheading => {
        markdown += `#### ${subheading}\n\n`;
      });
    }

    // Generate placeholder content
    const keywords = section.keywords.map(k => k.term).join(', ');
    markdown += `Content about ${keywords}. `;
    markdown += `This section should be approximately ${section.wordCount || 300} words. `;
    markdown += `Focus on ${keywords} and how it relates to ${params.topic}.\n\n`;
  });

  // Add recommended links section
  if (outline.recommendedLinks.length > 0) {
    markdown += `## Related Resources\n\n`;
    outline.recommendedLinks.forEach(link => {
      markdown += `- [${link.anchorText}](${link.url}) - ${link.context}\n`;
    });
    markdown += `\n`;
  }

  return markdown;
}

// Export all tools for MCP registry
export const seoTools = {
  generateKeywordCluster,
  analyzeContent,
  scoreContent,
  generateContentOutline,
  generateTopicClusters,
  generateSEOStrategy,
  generateContent,
};
