/**
 * TLAU SEO Agent Service
 * 
 * Core SEO service implementing keyword mapping, topic clustering,
 * content analysis, and SEO strategy generation aligned with TLAU's
 * creative agency identity and audience.
 */

import type {
  Keyword,
  KeywordCluster,
  ContentOpportunity,
  ContentOutline,
  SEOAnalysis,
  ContentScore,
  TopicCluster,
  SEOStrategy,
  ContentGenerationRequest,
  ContentGenerationResponse,
  SEORecommendation,
  LinkRecommendation,
} from '../types/seo';

// TLAU's core focus areas aligned with audience interests
const TLAU_FOCUS_AREAS = [
  'ai',
  'web-dev',
  'creativity',
  'bitcoin',
  'diy-tech',
  'systems-thinking',
] as const;

// Audience-aligned keyword seeds
const AUDIENCE_KEYWORD_SEEDS = {
  'creative-artists': [
    'ai art tools',
    'digital creativity',
    'creative coding',
    'generative art',
    'design systems',
  ],
  'gamers': [
    'game development',
    'indie game tools',
    'game design',
    'interactive storytelling',
  ],
  'solopreneurs': [
    'solo business tools',
    'one-person business',
    'indie maker tools',
    'solopreneur resources',
  ],
  'freelancers': [
    'freelance tools',
    'client management',
    'freelance business',
    'independent contractor',
  ],
  'handymen': [
    'diy tech projects',
    'home automation',
    'smart home diy',
    'tech repair',
  ],
  'wage-workers': [
    'side hustle ideas',
    'passive income',
    'skill building',
    'career transition',
  ],
  'service-professionals': [
    'service business tools',
    'client management',
    'service automation',
  ],
  'side-hustlers': [
    'side project ideas',
    'indie maker',
    'passive income',
    'side hustle tools',
  ],
  'entrepreneurs': [
    'startup tools',
    'business automation',
    'indie startup',
    'bootstrapped business',
  ],
} as const;

export class TLAUSEOAgent {
  /**
   * Generate semantic keyword clusters around a primary keyword
   */
  async generateKeywordCluster(
    primaryKeyword: string,
    category?: typeof TLAU_FOCUS_AREAS[number]
  ): Promise<KeywordCluster> {
    // Simulate AI-powered keyword expansion
    const relatedKeywords = this.expandKeywords(primaryKeyword);
    const semanticVariations = this.generateSemanticVariations(primaryKeyword);
    
    const cluster: KeywordCluster = {
      id: this.generateId(),
      primaryKeyword: {
        term: primaryKeyword,
        intent: this.detectIntent(primaryKeyword),
        relevance: 1.0,
        difficulty: this.estimateDifficulty(primaryKeyword),
        searchVolume: this.estimateSearchVolume(primaryKeyword),
      },
      relatedKeywords: relatedKeywords.map(term => ({
        term,
        intent: this.detectIntent(term),
        relevance: this.calculateRelevance(term, primaryKeyword),
        difficulty: this.estimateDifficulty(term),
        searchVolume: this.estimateSearchVolume(term),
      })),
      semanticVariations: semanticVariations.map(term => ({
        term,
        intent: this.detectIntent(term),
        relevance: this.calculateRelevance(term, primaryKeyword),
        difficulty: this.estimateDifficulty(term),
        searchVolume: this.estimateSearchVolume(term),
      })),
      topic: this.extractTopic(primaryKeyword),
      category: category || this.categorizeKeyword(primaryKeyword),
      contentOpportunities: await this.generateContentOpportunities(
        primaryKeyword,
        relatedKeywords,
        semanticVariations
      ),
    };

    return cluster;
  }

  /**
   * Analyze content for SEO performance
   */
  async analyzeContent(
    content: string,
    url: string,
    targetKeywords?: string[]
  ): Promise<SEOAnalysis> {
    const title = this.extractTitle(content);
    const metaDescription = this.extractMetaDescription(content);
    const headings = this.extractHeadings(content);
    const links = this.extractLinks(content);
    const images = this.extractImages(content);

    const metrics = {
      titleLength: title.length,
      titleOptimal: title.length >= 30 && title.length <= 60,
      metaDescriptionLength: metaDescription.length,
      metaDescriptionOptimal: metaDescription.length >= 120 && metaDescription.length <= 160,
      headingStructure: this.analyzeHeadingStructure(headings),
      keywordDensity: this.calculateKeywordDensity(content, targetKeywords || []),
      internalLinks: links.internal.length,
      externalLinks: links.external.length,
      imageOptimization: this.analyzeImages(images),
      mobileFriendly: true, // Would need actual testing
      readabilityScore: this.calculateReadability(content),
    };

    const score = this.calculateOverallScore(metrics);
    const recommendations = this.generateRecommendations(metrics, content, targetKeywords);
    const keywordPerformance = targetKeywords
      ? targetKeywords.map(kw => this.analyzeKeywordPerformance(kw, content))
      : [];

    return {
      url,
      title,
      score,
      metrics,
      recommendations,
      keywordPerformance,
      technicalIssues: this.detectTechnicalIssues(content, metrics),
    };
  }

  /**
   * Score content for SEO quality
   */
  async scoreContent(
    content: string,
    targetKeywords: string[],
    outline?: ContentOutline
  ): Promise<ContentScore> {
    const title = this.extractTitle(content);
    const headings = this.extractHeadings(content);
    const links = this.extractLinks(content);
    const metaTags = this.extractMetaTags(content);

    const breakdown = {
      title: this.scoreTitle(title, targetKeywords),
      headings: this.scoreHeadings(headings, targetKeywords),
      keywordUsage: this.scoreKeywordUsage(content, targetKeywords),
      internalLinking: this.scoreInternalLinking(links.internal),
      metaTags: this.scoreMetaTags(metaTags),
      contentLength: this.scoreContentLength(content),
      readability: this.calculateReadability(content),
    };

    const overall = Object.values(breakdown).reduce((sum, score) => sum + score, 0) / Object.keys(breakdown).length;

    return {
      overall: Math.round(overall),
      readability: breakdown.readability,
      keywordOptimization: breakdown.keywordUsage,
      structure: breakdown.headings,
      engagement: (breakdown.contentLength + breakdown.readability) / 2,
      seoBestPractices: (breakdown.title + breakdown.metaTags + breakdown.internalLinking) / 3,
      breakdown,
    };
  }

  /**
   * Generate content outline with SEO optimization
   */
  async generateContentOutline(
    topic: string,
    keywords: string[],
    type: ContentOpportunity['type'] = 'blog-post'
  ): Promise<ContentOutline> {
    const primaryKeyword = keywords[0] || topic;
    const title = this.generateTitle(topic, primaryKeyword, type);
    const summary = this.generateSummary(topic, keywords);
    const sections = this.generateSections(topic, keywords, type);
    const recommendedLinks = await this.generateLinkRecommendations(topic, keywords);
    const metadata = this.generateMetadata(title, summary, keywords);

    return {
      title,
      summary,
      keywords: keywords.map(term => ({
        term,
        intent: this.detectIntent(term),
        relevance: 1.0,
      })),
      sections,
      recommendedLinks,
      metadata,
    };
  }

  /**
   * Generate topic clusters for content strategy
   */
  async generateTopicClusters(
    focusKeywords: string[]
  ): Promise<TopicCluster[]> {
    const clusters: TopicCluster[] = [];

    for (const keyword of focusKeywords) {
      const cluster = await this.generateKeywordCluster(keyword);
      
      // Identify pillar content
      const pillarContent = cluster.contentOpportunities
        .sort((a, b) => b.estimatedValue - a.estimatedValue)[0];
      
      // Supporting content
      const supportingContent = cluster.contentOpportunities
        .filter(op => op !== pillarContent)
        .slice(0, 5);

      const topicCluster: TopicCluster = {
        id: cluster.id,
        name: cluster.topic,
        description: `Content cluster around ${cluster.topic} for ${TLAU_FOCUS_AREAS.join(', ')} audiences`,
        keywords: [cluster.primaryKeyword, ...cluster.relatedKeywords],
        contentPieces: cluster.contentOpportunities,
        pillarContent,
        supportingContent,
        internalLinkingStrategy: await this.generateLinkRecommendations(
          cluster.topic,
          cluster.relatedKeywords.map(k => k.term)
        ),
      };

      clusters.push(topicCluster);
    }

    return clusters;
  }

  /**
   * Generate comprehensive SEO strategy
   */
  async generateSEOStrategy(
    focusKeywords: string[],
    existingContent?: string[]
  ): Promise<SEOStrategy> {
    const topicClusters = await this.generateTopicClusters(focusKeywords);
    
    // Build content calendar from opportunities
    const contentCalendar = topicClusters
      .flatMap(cluster => cluster.contentPieces)
      .map((op, index) => ({
        id: this.generateId(),
        title: op.title,
        type: op.type,
        targetKeywords: op.targetKeywords,
        publishDate: new Date(Date.now() + index * 7 * 24 * 60 * 60 * 1000), // Weekly
        status: 'planned' as const,
        priority: Math.round(op.estimatedValue / 10),
      }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 12); // 3 months

    // Generate internal linking map
    const internalLinkingMap = this.buildInternalLinkingMap(topicClusters);

    return {
      focusKeywords: focusKeywords.map(term => ({
        term,
        intent: this.detectIntent(term),
        relevance: 1.0,
      })),
      topicClusters,
      contentCalendar,
      internalLinkingMap,
    };
  }

  // Helper methods

  private expandKeywords(keyword: string): string[] {
    // Simulate AI keyword expansion
    const variations = [
      `${keyword} tools`,
      `${keyword} guide`,
      `how to ${keyword}`,
      `best ${keyword}`,
      `${keyword} for beginners`,
      `${keyword} tutorial`,
      `learn ${keyword}`,
    ];
    return variations.slice(0, 5);
  }

  private generateSemanticVariations(keyword: string): string[] {
    // Generate semantic variations
    const synonyms: Record<string, string[]> = {
      'ai': ['artificial intelligence', 'machine learning', 'automation'],
      'web development': ['web dev', 'frontend', 'backend', 'full stack'],
      'creativity': ['creative', 'design', 'art', 'innovation'],
      'bitcoin': ['crypto', 'cryptocurrency', 'blockchain', 'btc'],
      'diy': ['do it yourself', 'maker', 'build', 'craft'],
    };

    for (const [key, values] of Object.entries(synonyms)) {
      if (keyword.toLowerCase().includes(key)) {
        return values.map(v => keyword.replace(new RegExp(key, 'i'), v));
      }
    }

    return [];
  }

  private detectIntent(keyword: string): Keyword['intent'] {
    const transactional = ['buy', 'purchase', 'price', 'cost', 'deal'];
    const commercial = ['best', 'top', 'review', 'compare'];
    const informational = ['how', 'what', 'why', 'guide', 'learn', 'tutorial'];
    const navigational = ['login', 'sign in', 'official', 'website'];

    const lower = keyword.toLowerCase();
    if (transactional.some(t => lower.includes(t))) return 'transactional';
    if (commercial.some(c => lower.includes(c))) return 'commercial';
    if (informational.some(i => lower.includes(i))) return 'informational';
    if (navigational.some(n => lower.includes(n))) return 'navigational';
    return 'informational';
  }

  private estimateDifficulty(keyword: string): number {
    // Simple estimation - in production, use actual SEO API
    const common = ['ai', 'web', 'tool', 'guide'];
    const hasCommon = common.some(c => keyword.toLowerCase().includes(c));
    return hasCommon ? Math.floor(Math.random() * 40) + 30 : Math.floor(Math.random() * 40) + 50;
  }

  private estimateSearchVolume(keyword: string): number {
    // Simple estimation - in production, use actual SEO API
    return Math.floor(Math.random() * 10000) + 100;
  }

  private calculateRelevance(keyword: string, primary: string): number {
    // Simple relevance calculation
    const sharedWords = keyword.split(' ').filter(w => primary.toLowerCase().includes(w.toLowerCase()));
    return Math.min(sharedWords.length / keyword.split(' ').length, 1.0);
  }

  private extractTopic(keyword: string): string {
    return keyword.split(' ').slice(0, 3).join(' ');
  }

  private categorizeKeyword(keyword: string): KeywordCluster['category'] {
    const lower = keyword.toLowerCase();
    if (lower.includes('ai') || lower.includes('artificial intelligence')) return 'ai';
    if (lower.includes('web') || lower.includes('dev') || lower.includes('code')) return 'web-dev';
    if (lower.includes('creative') || lower.includes('design') || lower.includes('art')) return 'creativity';
    if (lower.includes('bitcoin') || lower.includes('crypto') || lower.includes('blockchain')) return 'bitcoin';
    if (lower.includes('diy') || lower.includes('maker') || lower.includes('build')) return 'diy-tech';
    if (lower.includes('system') || lower.includes('process') || lower.includes('workflow')) return 'systems-thinking';
    return 'general';
  }

  private async generateContentOpportunities(
    primary: string,
    related: string[],
    semantic: string[]
  ): Promise<ContentOpportunity[]> {
    const opportunities: ContentOpportunity[] = [];
    const types: ContentOpportunity['type'][] = ['blog-post', 'guide', 'tutorial', 'tool', 'resource'];

    // Primary opportunity
    opportunities.push({
      title: `${primary.charAt(0).toUpperCase() + primary.slice(1)}: Complete Guide`,
      type: 'guide',
      targetKeywords: [{ term: primary, intent: 'informational', relevance: 1.0 }],
      estimatedValue: 85,
      competition: 'medium',
      audienceAlignment: 0.9,
    });

    // Related opportunities
    related.slice(0, 3).forEach((keyword, index) => {
      opportunities.push({
        title: `How to ${keyword}`,
        type: types[index % types.length],
        targetKeywords: [{ term: keyword, intent: 'informational', relevance: 0.8 }],
        estimatedValue: 60 + Math.random() * 20,
        competition: 'low',
        audienceAlignment: 0.7,
      });
    });

    return opportunities;
  }

  private extractTitle(content: string): string {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1] : 'Untitled';
  }

  private extractMetaDescription(content: string): string {
    const match = content.match(/description:\s*(.+)/i);
    return match ? match[1] : '';
  }

  private extractHeadings(content: string): string[] {
    const matches = content.matchAll(/^#{1,3}\s+(.+)$/gm);
    return Array.from(matches).map(m => m[1]);
  }

  private extractLinks(content: string): { internal: string[]; external: string[] } {
    const matches = content.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
    const links = Array.from(matches).map(m => m[2]);
    return {
      internal: links.filter(l => !l.startsWith('http')),
      external: links.filter(l => l.startsWith('http')),
    };
  }

  private extractImages(content: string): string[] {
    const matches = content.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g);
    return Array.from(matches).map(m => m[2]);
  }

  private analyzeHeadingStructure(headings: string[]): SEOAnalysis['metrics']['headingStructure'] {
    const h1Count = headings.filter(h => h.startsWith('#')).length;
    const h2Count = headings.filter(h => h.startsWith('##')).length;
    const h3Count = headings.filter(h => h.startsWith('###')).length;
    
    return {
      h1Count,
      h2Count,
      h3Count,
      hierarchyValid: h1Count === 1 && h2Count > 0,
      issues: h1Count !== 1 ? ['Should have exactly one H1'] : [],
    };
  }

  private calculateKeywordDensity(content: string, keywords: string[]): Record<string, number> {
    const words = content.toLowerCase().split(/\s+/);
    const totalWords = words.length;
    const density: Record<string, number> = {};

    keywords.forEach(keyword => {
      const keywordWords = keyword.toLowerCase().split(/\s+/);
      let count = 0;
      for (let i = 0; i <= words.length - keywordWords.length; i++) {
        if (words.slice(i, i + keywordWords.length).join(' ') === keywordWords.join(' ')) {
          count++;
        }
      }
      density[keyword] = (count / totalWords) * 100;
    });

    return density;
  }

  private analyzeImages(images: string[]): SEOAnalysis['metrics']['imageOptimization'] {
    return {
      totalImages: images.length,
      imagesWithAlt: images.length, // Would need actual analysis
      imagesOptimized: images.length,
      issues: [],
    };
  }

  private calculateReadability(content: string): number {
    // Simplified readability score
    const sentences = content.split(/[.!?]+/).length;
    const words = content.split(/\s+/).length;
    const avgWordsPerSentence = words / sentences;
    
    // Flesch Reading Ease approximation
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * (content.split(/[aeiou]/i).length / words));
    return Math.max(0, Math.min(100, score));
  }

  private calculateOverallScore(metrics: SEOAnalysis['metrics']): number {
    let score = 0;
    if (metrics.titleOptimal) score += 10;
    if (metrics.metaDescriptionOptimal) score += 10;
    if (metrics.headingStructure.hierarchyValid) score += 15;
    if (metrics.internalLinks >= 3) score += 15;
    if (metrics.externalLinks >= 1) score += 10;
    if (metrics.imageOptimization.imagesWithAlt === metrics.imageOptimization.totalImages) score += 10;
    if (metrics.readabilityScore && metrics.readabilityScore > 60) score += 15;
    if (metrics.mobileFriendly) score += 10;
    return Math.min(100, score);
  }

  private generateRecommendations(
    metrics: SEOAnalysis['metrics'],
    content: string,
    targetKeywords?: string[]
  ): SEORecommendation[] {
    const recommendations: SEORecommendation[] = [];

    if (!metrics.titleOptimal) {
      recommendations.push({
        type: 'important',
        category: 'metadata',
        title: 'Optimize Title Length',
        description: `Title is ${metrics.titleLength} characters. Optimal length is 30-60 characters.`,
        impact: 'high',
        effort: 'low',
        priority: 8,
      });
    }

    if (!metrics.metaDescriptionOptimal) {
      recommendations.push({
        type: 'important',
        category: 'metadata',
        title: 'Optimize Meta Description',
        description: `Meta description is ${metrics.metaDescriptionLength} characters. Optimal length is 120-160 characters.`,
        impact: 'high',
        effort: 'low',
        priority: 8,
      });
    }

    if (metrics.internalLinks < 3) {
      recommendations.push({
        type: 'suggestion',
        category: 'on-page',
        title: 'Add More Internal Links',
        description: `Currently ${metrics.internalLinks} internal links. Aim for at least 3-5 internal links per page.`,
        impact: 'medium',
        effort: 'medium',
        priority: 6,
      });
    }

    return recommendations;
  }

  private analyzeKeywordPerformance(keyword: string, content: string): SEOAnalysis['keywordPerformance'][0] {
    const lowerContent = content.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    const occurrences = (lowerContent.match(new RegExp(lowerKeyword, 'g')) || []).length;
    
    return {
      keyword,
      trend: occurrences > 3 ? 'up' : 'stable',
    };
  }

  private detectTechnicalIssues(
    content: string,
    metrics: SEOAnalysis['metrics']
  ): SEOAnalysis['technicalIssues'] {
    const issues: SEOAnalysis['technicalIssues'] = [];

    if (!metrics.headingStructure.hierarchyValid) {
      issues.push({
        type: 'warning',
        category: 'structure',
        message: 'Heading hierarchy is not optimal',
        fix: 'Ensure one H1 tag and proper H2/H3 nesting',
      });
    }

    return issues;
  }

  private scoreTitle(title: string, keywords: string[]): number {
    let score = 50;
    const lowerTitle = title.toLowerCase();
    
    keywords.forEach(keyword => {
      if (lowerTitle.includes(keyword.toLowerCase())) score += 10;
    });
    
    if (title.length >= 30 && title.length <= 60) score += 20;
    if (title.length < 30 || title.length > 60) score -= 10;
    
    return Math.min(100, Math.max(0, score));
  }

  private scoreHeadings(headings: string[], keywords: string[]): number {
    let score = 50;
    const headingText = headings.join(' ').toLowerCase();
    
    keywords.forEach(keyword => {
      if (headingText.includes(keyword.toLowerCase())) score += 10;
    });
    
    if (headings.length >= 3) score += 20;
    
    return Math.min(100, Math.max(0, score));
  }

  private scoreKeywordUsage(content: string, keywords: string[]): number {
    const density = this.calculateKeywordDensity(content, keywords);
    let score = 50;
    
    Object.values(density).forEach(d => {
      if (d >= 0.5 && d <= 2.5) score += 10; // Optimal range
      if (d > 2.5) score -= 5; // Over-optimization
      if (d < 0.5) score -= 5; // Under-optimization
    });
    
    return Math.min(100, Math.max(0, score));
  }

  private scoreInternalLinking(links: string[]): number {
    if (links.length >= 5) return 100;
    if (links.length >= 3) return 80;
    if (links.length >= 1) return 60;
    return 30;
  }

  private scoreMetaTags(metaTags: any): number {
    let score = 50;
    if (metaTags.title) score += 20;
    if (metaTags.description) score += 20;
    if (metaTags.keywords) score += 10;
    return Math.min(100, score);
  }

  private scoreContentLength(content: string): number {
    const wordCount = content.split(/\s+/).length;
    if (wordCount >= 1500) return 100;
    if (wordCount >= 1000) return 80;
    if (wordCount >= 500) return 60;
    return 40;
  }

  private extractMetaTags(content: string): any {
    const title = this.extractTitle(content);
    const description = this.extractMetaDescription(content);
    return { title, description };
  }

  private generateTitle(topic: string, keyword: string, type: ContentOpportunity['type']): string {
    const templates: Record<ContentOpportunity['type'], string> = {
      'blog-post': `${topic}: A Complete Guide`,
      'guide': `The Complete Guide to ${topic}`,
      'tutorial': `How to ${topic}: Step-by-Step Tutorial`,
      'case-study': `${topic}: Case Study`,
      'tool': `${topic} Tool: Everything You Need to Know`,
      'resource': `${topic} Resources and Tools`,
    };
    return templates[type] || `${topic}: Complete Guide`;
  }

  private generateSummary(topic: string, keywords: string[]): string {
    return `Learn everything about ${topic} with this comprehensive guide. Perfect for ${keywords.slice(0, 2).join(' and ')} enthusiasts looking to deepen their understanding.`;
  }

  private generateSections(
    topic: string,
    keywords: string[],
    type: ContentOpportunity['type']
  ): ContentOutline['sections'] {
    const baseSections = [
      { heading: 'Introduction', keywords: [keywords[0]], wordCount: 200 },
      { heading: `Understanding ${topic}`, keywords: keywords.slice(0, 2), wordCount: 400 },
      { heading: 'Key Concepts', keywords: keywords.slice(1, 3), wordCount: 500 },
      { heading: 'Best Practices', keywords: keywords.slice(0, 2), wordCount: 400 },
      { heading: 'Conclusion', keywords: [keywords[0]], wordCount: 200 },
    ];

    return baseSections.map(section => ({
      heading: section.heading,
      keywords: section.keywords.map(term => ({
        term,
        intent: this.detectIntent(term),
        relevance: 0.8,
      })),
      wordCount: section.wordCount,
    }));
  }

  private async generateLinkRecommendations(
    topic: string,
    keywords: string[]
  ): Promise<LinkRecommendation[]> {
    // Generate internal linking recommendations
    return keywords.slice(0, 3).map(keyword => ({
      text: `Learn more about ${keyword}`,
      url: `/${keyword.toLowerCase().replace(/\s+/g, '-')}`,
      type: 'internal' as const,
      anchorText: keyword,
      context: `Related to ${topic}`,
      value: 75,
    }));
  }

  private generateMetadata(
    title: string,
    summary: string,
    keywords: string[]
  ): ContentOutline['metadata'] {
    return {
      title,
      description: summary,
      keywords,
      ogTitle: title,
      ogDescription: summary,
    };
  }

  private buildInternalLinkingMap(clusters: TopicCluster[]): SEOStrategy['internalLinkingMap'] {
    const map: SEOStrategy['internalLinkingMap'] = [];
    
    clusters.forEach(cluster => {
      cluster.supportingContent.forEach(content => {
        if (cluster.pillarContent) {
          map.push({
            sourceUrl: `/${content.title.toLowerCase().replace(/\s+/g, '-')}`,
            targetUrl: `/${cluster.pillarContent.title.toLowerCase().replace(/\s+/g, '-')}`,
            anchorText: cluster.pillarContent.title,
            keyword: cluster.pillarContent.targetKeywords[0]?.term || '',
            value: 85,
          });
        }
      });
    });

    return map;
  }

  private generateId(): string {
    return `seo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const seoAgent = new TLAUSEOAgent();
