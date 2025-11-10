/**
 * TLAU Master Agent
 * 
 * Master sub-agent for THE LOST + UNFOUNDS (TLAU).
 * Handles SEO, content, image/media processing, merchandising, automation, and MCP server integration.
 * Logs all tasks for CEO review.
 */

import { getOrchestratorAgent } from './orchestrator-agent';
import { initializeMCPRegistry, searchAvailableTools } from './mcp-registry';
import * as fs from 'fs';
import * as path from 'path';

export interface MasterAgentConfig {
  agent_name: string;
  version: string;
  description: string;
  identity: {
    organization: string;
    type: string;
    focus: string[];
  };
  audience_profile: {
    primary: string[];
    shared_traits: string[];
  };
  core_objectives: {
    prompt_analysis: string[];
    seo_and_content: string[];
    image_and_media: string[];
    merchandising: string[];
    automation_and_logging: string[];
  };
  logging_format: {
    prompt_text: string;
    task_category: string;
    tools_used: string[];
    execution_plan: string;
    notes?: string;
  };
  voice_and_tone: {
    style: string;
    mood: string;
    notes: string;
  };
  philosophy: {
    principles: string[];
  };
  output_formats: {
    primary: string;
    fallback: string;
    structured_fields: string[];
  };
}

export interface TaskLog {
  timestamp: string;
  prompt_text: string;
  task_category: 'SEO' | 'content' | 'image' | 'automation' | 'merchandising' | 'mixed' | 'unknown';
  tools_used: string[];
  execution_plan: string;
  notes?: string;
  agent_id: string;
  metadata?: Record<string, any>;
}

export interface TaskAnalysis {
  category: TaskLog['task_category'];
  confidence: number;
  keywords: string[];
  requiresMCP: boolean;
  mcpCandidates: string[];
  executionSteps: string[];
}

const DEFAULT_CONFIG: MasterAgentConfig = {
  agent_name: "TLAU_Master_Agent",
  version: "1.0",
  description: "Master sub-agent for THE LOST + UNFOUNDS (TLAU). Handles SEO, content, image/media processing, merchandising, automation, and MCP server integration. Logs all tasks for CEO review.",
  identity: {
    organization: "THE LOST + UNFOUNDS",
    type: "creative_agency",
    focus: [
      "AI",
      "web development",
      "digital creativity",
      "Bitcoin",
      "DIY tech",
      "systems thinking"
    ],
  },
  audience_profile: {
    primary: [
      "creative artists",
      "gamers",
      "solopreneurs",
      "freelancers",
      "handymen",
      "wage workers",
      "service-based professionals",
      "side hustlers",
      "entrepreneurs"
    ],
    shared_traits: [
      "independent",
      "curious",
      "tech-inclined",
      "values self-reliance",
      "learns by doing",
      "interested in AI, design, and new systems of work"
    ],
  },
  core_objectives: {
    prompt_analysis: [
      "Categorize task type: SEO, content, image, automation, merchandising, etc.",
      "Check availability of MCP servers or other tools",
      "Recommend MCP server usage or alternative workflows"
    ],
    seo_and_content: [
      "Build keyword clusters for creativity, AI, side hustles, tech, Bitcoin, merch/products",
      "Generate meta titles, descriptions, H1/H2 tags, blog ideas, and content plans",
      "Map content architecture: Home, About, Tools, Blog, Shop, Community, AI Tutorials, Bitcoin Hub, Merch/Product pages, Web Dev/DIY hub"
    ],
    image_and_media: [
      "Read EXIF metadata (camera, lens, ISO, copyright)",
      "Remove GPS/location data",
      "Generate SEO-friendly filenames, alt text, captions, JSON-LD",
      "Upload processed files to repository or website"
    ],
    merchandising: [
      "Recommend seasonal products, accessories, fanny packs, hoodies, t-shirts, etc.",
      "Suggest product content, naming, SEO, and cross-linking strategies"
    ],
    automation_and_logging: [
      "Log all prompts and tasks in JSON for CEO review",
      "Recommend enhancements, next steps, recurring automations"
    ],
  },
  logging_format: {
    prompt_text: "<original user prompt>",
    task_category: "<SEO / content / image / automation / merchandising>",
    tools_used: ["<MCP server>", "<AI agent>", "<external tools>"],
    execution_plan: "<brief plan or instructions>",
    notes: "<optional commentary>",
  },
  voice_and_tone: {
    style: "grounded, imaginative, human-centered",
    mood: "playful but practical, encourages experimentation",
    notes: "Reflects TLAU ethos: combine multiple systems to create new possibilities",
  },
  philosophy: {
    principles: [
      "Use system integration and multi-tool creativity",
      "Follow Gunpei Yokoi's lateral thinking with withered technology",
      "Optimize for automation, repeatability, scalability, SEO impact",
      "Always log, track, and make outputs reviewable by CEO agent"
    ],
  },
  output_formats: {
    primary: "markdown for content, JSON for logs and metadata",
    fallback: "plaintext",
    structured_fields: ["title", "summary", "keywords", "content_outline", "recommended_links"],
  },
};

export class TLAUMasterAgent {
  private config: MasterAgentConfig;
  private logPath: string;
  private orchestrator: ReturnType<typeof getOrchestratorAgent>;

  constructor(config?: Partial<MasterAgentConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logPath = path.resolve(process.cwd(), 'Resources/task_logs/master_agent_tasks.jsonl');
    this.orchestrator = getOrchestratorAgent();
    this.ensureLogDirectory();
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
      try {
        const logDir = path.dirname(this.logPath);
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
      } catch (error) {
        console.warn('Failed to initialize log directory:', error);
      }
    }
  }

  /**
   * Main entry point: Process task
   */
  async processTask(
    prompt: string,
    options?: {
      user_id?: string;
      context?: Record<string, any>;
    }
  ): Promise<{
    analysis: TaskAnalysis;
    execution: any;
    log: TaskLog;
    recommendations?: string[];
  }> {
    // Step 1: Analyze task category
    const analysis = await this.analyzeTask(prompt);

    // Step 2: Check MCP availability
    const mcpCheck = await this.checkMCPTools(analysis);

    // Step 3: Execute task based on category
    const execution = await this.executeTask(prompt, analysis, mcpCheck);

    // Step 4: Generate recommendations
    const recommendations = this.generateRecommendations(analysis, execution);

    // Step 5: Create and save log
    const log: TaskLog = {
      timestamp: new Date().toISOString(),
      prompt_text: prompt,
      task_category: analysis.category,
      tools_used: [...mcpCheck.mcpCandidates, ...(execution.toolsUsed || [])],
      execution_plan: execution.plan || analysis.executionSteps.join('\n'),
      notes: execution.notes,
      agent_id: this.config.agent_name,
      metadata: {
        confidence: analysis.confidence,
        keywords: analysis.keywords,
        recommendations,
      },
    };

    await this.logTask(log);

    return {
      analysis,
      execution,
      log,
      recommendations,
    };
  }

  /**
   * Analyze task to determine category
   */
  private async analyzeTask(prompt: string): Promise<TaskAnalysis> {
    const lowerPrompt = prompt.toLowerCase();
    const keywords: string[] = [];
    let category: TaskLog['task_category'] = 'unknown';
    let confidence = 0.5;

    // SEO keywords
    const seoKeywords = ['seo', 'meta', 'keyword', 'title', 'description', 'h1', 'h2', 'alt text', 'schema', 'json-ld'];
    const seoMatches = seoKeywords.filter(kw => lowerPrompt.includes(kw));
    if (seoMatches.length > 0) {
      keywords.push(...seoMatches);
      category = 'SEO';
      confidence = Math.min(0.9, 0.5 + seoMatches.length * 0.1);
    }

    // Content keywords
    const contentKeywords = ['blog', 'article', 'post', 'content', 'write', 'draft', 'outline', 'copy'];
    const contentMatches = contentKeywords.filter(kw => lowerPrompt.includes(kw));
    if (contentMatches.length > 0 && confidence < 0.7) {
      keywords.push(...contentMatches);
      if (category === 'unknown') {
        category = 'content';
        confidence = Math.min(0.9, 0.5 + contentMatches.length * 0.1);
      } else {
        category = 'mixed';
        confidence = Math.max(confidence, Math.min(0.8, 0.5 + contentMatches.length * 0.1));
      }
    }

    // Image/media keywords
    const imageKeywords = ['image', 'photo', 'picture', 'exif', 'gps', 'metadata', 'camera', 'lens', 'iso', 'alt text', 'caption'];
    const imageMatches = imageKeywords.filter(kw => lowerPrompt.includes(kw));
    if (imageMatches.length > 0) {
      keywords.push(...imageMatches);
      if (category === 'unknown' || category === 'SEO') {
        category = 'image';
        confidence = Math.max(confidence, Math.min(0.95, 0.6 + imageMatches.length * 0.1));
      } else {
        category = 'mixed';
        confidence = Math.max(confidence, Math.min(0.85, 0.5 + imageMatches.length * 0.1));
      }
    }

    // Merchandising keywords
    const merchKeywords = ['merch', 'product', 'shop', 't-shirt', 'hoodie', 'fanny pack', 'accessory', 'seasonal', 'inventory'];
    const merchMatches = merchKeywords.filter(kw => lowerPrompt.includes(kw));
    if (merchMatches.length > 0) {
      keywords.push(...merchMatches);
      if (category === 'unknown') {
        category = 'merchandising';
        confidence = Math.min(0.9, 0.5 + merchMatches.length * 0.1);
      } else {
        category = 'mixed';
        confidence = Math.max(confidence, Math.min(0.8, 0.5 + merchMatches.length * 0.1));
      }
    }

    // Automation keywords
    const automationKeywords = ['automate', 'schedule', 'recurring', 'workflow', 'pipeline', 'batch'];
    const automationMatches = automationKeywords.filter(kw => lowerPrompt.includes(kw));
    if (automationMatches.length > 0) {
      keywords.push(...automationMatches);
      if (category === 'unknown') {
        category = 'automation';
        confidence = Math.min(0.9, 0.5 + automationMatches.length * 0.1);
      } else {
        category = 'mixed';
        confidence = Math.max(confidence, Math.min(0.8, 0.5 + automationMatches.length * 0.1));
      }
    }

    // Generate execution steps
    const executionSteps = this.generateExecutionSteps(category, prompt, keywords);

    return {
      category,
      confidence,
      keywords: [...new Set(keywords)],
      requiresMCP: false, // Will be determined by MCP check
      mcpCandidates: [],
      executionSteps,
    };
  }

  /**
   * Generate execution steps based on category
   */
  private generateExecutionSteps(
    category: TaskLog['task_category'],
    prompt: string,
    keywords: string[]
  ): string[] {
    const steps: string[] = [];

    switch (category) {
      case 'SEO':
        steps.push('Analyze SEO requirements');
        steps.push('Generate keyword clusters');
        steps.push('Create meta titles and descriptions');
        steps.push('Generate H1/H2 tag suggestions');
        if (keywords.includes('schema') || keywords.includes('json-ld')) {
          steps.push('Generate JSON-LD structured data');
        }
        break;

      case 'content':
        steps.push('Analyze content requirements');
        steps.push('Generate content outline');
        steps.push('Create keyword clusters');
        steps.push('Draft content following TLAU voice and tone');
        steps.push('Suggest internal linking opportunities');
        break;

      case 'image':
        steps.push('Identify image/media files');
        steps.push('Extract EXIF metadata (camera, lens, ISO, copyright)');
        steps.push('Remove GPS/location data');
        steps.push('Generate SEO-friendly filename');
        steps.push('Create alt text and captions');
        steps.push('Generate JSON-LD for images');
        steps.push('Upload or move to repository/website');
        break;

      case 'merchandising':
        steps.push('Analyze product requirements');
        steps.push('Recommend seasonal products');
        steps.push('Suggest product naming and SEO');
        steps.push('Create product content strategy');
        steps.push('Suggest cross-linking opportunities');
        break;

      case 'automation':
        steps.push('Analyze automation requirements');
        steps.push('Design workflow');
        steps.push('Identify recurring patterns');
        steps.push('Create automation plan');
        steps.push('Log for CEO review');
        break;

      default:
        steps.push('Analyze prompt requirements');
        steps.push('Determine best approach');
        steps.push('Execute task');
    }

    return steps;
  }

  /**
   * Check MCP tools availability
   */
  private async checkMCPTools(analysis: TaskAnalysis): Promise<{
    mcpCandidates: string[];
    requiresMCP: boolean;
  }> {
    try {
      await initializeMCPRegistry();
      const candidates: string[] = [];

      // Search for relevant MCP tools based on category and keywords
      for (const keyword of analysis.keywords.slice(0, 5)) {
        try {
          const tools = await Promise.race([
            searchAvailableTools(keyword, { limit: 5 }),
            new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 3000)),
          ]);

          if (tools && Array.isArray(tools)) {
            tools.forEach((tool: any) => {
              const toolName = tool.name || tool.tool || `${tool.namespace || 'unknown'}:${tool.name || 'unknown'}`;
              if (!candidates.includes(toolName)) {
                candidates.push(toolName);
              }
            });
          }
        } catch (error) {
          // Continue searching
        }
      }

      // Category-specific MCP tool searches
      if (analysis.category === 'image') {
        const imageTools = await searchAvailableTools('image', { limit: 5 });
        if (imageTools) {
          imageTools.forEach((tool: any) => {
            const toolName = tool.name || tool.tool || `${tool.namespace || 'unknown'}:${tool.name || 'unknown'}`;
            if (!candidates.includes(toolName)) {
              candidates.push(toolName);
            }
          });
        }
      }

      return {
        mcpCandidates: candidates.slice(0, 10),
        requiresMCP: candidates.length > 0 || analysis.category === 'image' || analysis.category === 'automation',
      };
    } catch (error) {
      console.warn('MCP tool check failed:', error);
      return {
        mcpCandidates: [],
        requiresMCP: false,
      };
    }
  }

  /**
   * Execute task based on category
   */
  private async executeTask(
    prompt: string,
    analysis: TaskAnalysis,
    mcpCheck: ReturnType<typeof this.checkMCPTools>
  ): Promise<{
    plan: string;
    toolsUsed: string[];
    notes?: string;
    output?: any;
  }> {
    const toolsUsed: string[] = [...mcpCheck.mcpCandidates];
    let plan = '';
    let notes = '';
    let output: any = null;

    switch (analysis.category) {
      case 'SEO':
        const seoResult = await this.handleSEO(prompt, analysis);
        plan = seoResult.plan;
        notes = seoResult.notes;
        output = seoResult.output;
        break;

      case 'content':
        const contentResult = await this.handleContent(prompt, analysis);
        plan = contentResult.plan;
        notes = contentResult.notes;
        output = contentResult.output;
        break;

      case 'image':
        const imageResult = await this.handleImage(prompt, analysis);
        plan = imageResult.plan;
        notes = imageResult.notes;
        output = imageResult.output;
        break;

      case 'merchandising':
        const merchResult = await this.handleMerchandising(prompt, analysis);
        plan = merchResult.plan;
        notes = merchResult.notes;
        output = merchResult.output;
        break;

      case 'automation':
        const autoResult = await this.handleAutomation(prompt, analysis);
        plan = autoResult.plan;
        notes = autoResult.notes;
        output = autoResult.output;
        break;

      default:
        plan = `Process task: ${prompt}`;
        notes = 'Task category unclear, proceeding with general approach';
    }

    return {
      plan,
      toolsUsed,
      notes,
      output,
    };
  }

  /**
   * Handle SEO tasks
   */
  private async handleSEO(
    prompt: string,
    analysis: TaskAnalysis
  ): Promise<{ plan: string; notes: string; output: any }> {
    const plan = `
1. Analyze SEO requirements from prompt
2. Generate keyword clusters for: creativity, AI, side hustles, tech, Bitcoin, merch/products
3. Create meta titles and descriptions
4. Generate H1/H2 tag suggestions
5. Map to content architecture: Home, About, Tools, Blog, Shop, Community, AI Tutorials, Bitcoin Hub, Merch/Product pages, Web Dev/DIY hub
6. Generate JSON-LD structured data if needed
    `.trim();

    const notes = `SEO optimization following TLAU focus areas: ${this.config.identity.focus.join(', ')}`;

    const output = {
      keyword_clusters: this.generateKeywordClusters(),
      meta_suggestions: this.generateMetaSuggestions(prompt),
      content_architecture_mapping: this.mapContentArchitecture(prompt),
    };

    return { plan, notes, output };
  }

  /**
   * Handle content tasks
   */
  private async handleContent(
    prompt: string,
    analysis: TaskAnalysis
  ): Promise<{ plan: string; notes: string; output: any }> {
    const plan = `
1. Analyze content requirements
2. Generate content outline following TLAU voice and tone
3. Create keyword clusters
4. Draft content with playful but practical tone
5. Suggest internal linking opportunities
6. Map to content architecture
    `.trim();

    const notes = `Content created in TLAU style: ${this.config.voice_and_tone.style}, ${this.config.voice_and_tone.mood}`;

    const output = {
      outline: this.generateContentOutline(prompt),
      keywords: this.generateKeywordClusters(),
      voice_guidelines: this.config.voice_and_tone,
    };

    return { plan, notes, output };
  }

  /**
   * Handle image/media tasks
   */
  private async handleImage(
    prompt: string,
    analysis: TaskAnalysis
  ): Promise<{ plan: string; notes: string; output: any }> {
    const plan = `
1. Identify image/media files (check for Google Drive, local files, URLs)
2. Extract EXIF metadata: camera, lens, ISO, copyright
3. Remove GPS/location data for privacy
4. Generate SEO-friendly filename based on content and keywords
5. Create descriptive alt text and captions
6. Generate JSON-LD structured data for images
7. Upload or move processed files to repository/website
8. Log metadata and execution plan for CEO review
    `.trim();

    const notes = 'Image processing following TLAU workflow: extract metadata, remove GPS, optimize for SEO, log for review';

    const output = {
      workflow: 'image_processing',
      steps: [
        'EXIF extraction',
        'GPS removal',
        'SEO optimization',
        'File upload',
        'CEO logging',
      ],
      example_workflow: this.config.core_objectives.image_and_media,
    };

    return { plan, notes, output };
  }

  /**
   * Handle merchandising tasks
   */
  private async handleMerchandising(
    prompt: string,
    analysis: TaskAnalysis
  ): Promise<{ plan: string; notes: string; output: any }> {
    const plan = `
1. Analyze product requirements and seasonality
2. Recommend products: fanny packs, hoodies, t-shirts, accessories
3. Suggest product naming following TLAU brand
4. Create SEO-optimized product content
5. Develop cross-linking strategy
6. Map to Shop content architecture
    `.trim();

    const notes = 'Merchandising recommendations aligned with TLAU audience: creative artists, gamers, solopreneurs, freelancers';

    const output = {
      product_recommendations: this.generateProductRecommendations(),
      seo_strategy: 'Product-focused keyword clusters, seasonal optimization',
      cross_linking: 'Link to Blog, Community, Tools pages',
    };

    return { plan, notes, output };
  }

  /**
   * Handle automation tasks
   */
  private async handleAutomation(
    prompt: string,
    analysis: TaskAnalysis
  ): Promise<{ plan: string; notes: string; output: any }> {
    const plan = `
1. Analyze automation requirements
2. Design workflow following TLAU philosophy: automation, repeatability, scalability
3. Identify recurring patterns
4. Create automation plan
5. Log for CEO review
6. Recommend enhancements and next steps
    `.trim();

    const notes = `Automation following TLAU principles: ${this.config.philosophy.principles.join('; ')}`;

    const output = {
      automation_plan: 'Workflow designed for repeatability and scalability',
      logging: 'All tasks logged for CEO review',
      recommendations: 'Enhancements and next steps included in log',
    };

    return { plan, notes, output };
  }

  /**
   * Generate keyword clusters
   */
  private generateKeywordClusters(): Record<string, string[]> {
    return {
      creativity: ['creative tools', 'digital art', 'design systems', 'creative workflow'],
      ai: ['AI tools', 'machine learning', 'automation', 'AI tutorials'],
      side_hustles: ['freelancing', 'solopreneur', 'side projects', 'independent work'],
      tech: ['web development', 'DIY tech', 'systems thinking', 'tech tutorials'],
      bitcoin: ['Bitcoin', 'cryptocurrency', 'decentralized', 'Bitcoin hub'],
      merch: ['TLAU merch', 'products', 'accessories', 'seasonal items'],
    };
  }

  /**
   * Generate meta suggestions
   */
  private generateMetaSuggestions(prompt: string): {
    title: string;
    description: string;
    h1: string;
    h2: string[];
  } {
    // Simple implementation - in production, use AI to generate these
    const title = prompt.substring(0, 60) + (prompt.length > 60 ? '...' : '');
    const description = prompt.substring(0, 160) + (prompt.length > 160 ? '...' : '');
    const h1 = prompt.split(/[.!?]/)[0].substring(0, 80);
    const h2 = prompt.split(/[.!?]/).slice(1, 3).map(s => s.trim().substring(0, 80));

    return { title, description, h1, h2 };
  }

  /**
   * Map to content architecture
   */
  private mapContentArchitecture(prompt: string): string[] {
    const lowerPrompt = prompt.toLowerCase();
    const mappings: string[] = [];

    if (lowerPrompt.includes('home') || lowerPrompt.includes('landing')) mappings.push('Home');
    if (lowerPrompt.includes('about')) mappings.push('About');
    if (lowerPrompt.includes('tool')) mappings.push('Tools');
    if (lowerPrompt.includes('blog') || lowerPrompt.includes('article')) mappings.push('Blog');
    if (lowerPrompt.includes('shop') || lowerPrompt.includes('merch') || lowerPrompt.includes('product')) mappings.push('Shop');
    if (lowerPrompt.includes('community')) mappings.push('Community');
    if (lowerPrompt.includes('ai') || lowerPrompt.includes('tutorial')) mappings.push('AI Tutorials');
    if (lowerPrompt.includes('bitcoin')) mappings.push('Bitcoin Hub');
    if (lowerPrompt.includes('web dev') || lowerPrompt.includes('diy')) mappings.push('Web Dev/DIY hub');

    return mappings.length > 0 ? mappings : ['Home', 'Blog'];
  }

  /**
   * Generate content outline
   */
  private generateContentOutline(prompt: string): {
    title: string;
    sections: string[];
    keywords: string[];
  } {
    return {
      title: prompt.split(/[.!?]/)[0],
      sections: [
        'Introduction',
        'Main Content',
        'Examples/Case Studies',
        'Conclusion',
        'Next Steps',
      ],
      keywords: this.generateKeywordClusters().creativity.slice(0, 5),
    };
  }

  /**
   * Generate product recommendations
   */
  private generateProductRecommendations(): string[] {
    return [
      'Fanny packs',
      'Hoodies',
      'T-shirts',
      'Accessories',
      'Seasonal items',
    ];
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    analysis: TaskAnalysis,
    execution: ReturnType<typeof this.executeTask>
  ): string[] {
    const recommendations: string[] = [];

    if (analysis.category === 'image') {
      recommendations.push('Consider creating blog post featuring the images');
      recommendations.push('Add internal links to related content');
      recommendations.push('Share on social media with optimized captions');
    }

    if (analysis.category === 'content') {
      recommendations.push('Cross-link to related tools and products');
      recommendations.push('Add to content calendar for recurring updates');
      recommendations.push('Consider creating companion visual content');
    }

    if (analysis.category === 'merchandising') {
      recommendations.push('Create product launch content');
      recommendations.push('Link to related blog posts');
      recommendations.push('Set up seasonal automation');
    }

    if (execution.toolsUsed.length === 0 && analysis.requiresMCP) {
      recommendations.push('Consider using MCP tools for enhanced functionality');
    }

    return recommendations;
  }

  /**
   * Log task to file
   */
  private async logTask(log: TaskLog): Promise<void> {
    if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
      try {
        const logLine = JSON.stringify(log) + '\n';
        fs.appendFileSync(this.logPath, logLine, 'utf-8');
      } catch (error) {
        console.error('Failed to log task:', error);
      }
    } else {
      console.log('Task Log:', log);
    }
  }

  /**
   * Get configuration
   */
  getConfig(): MasterAgentConfig {
    return { ...this.config };
  }
}

// Export singleton instance
let masterAgentInstance: TLAUMasterAgent | null = null;

/**
 * Get or create master agent instance
 */
export function getMasterAgent(config?: Partial<MasterAgentConfig>): TLAUMasterAgent {
  if (!masterAgentInstance) {
    masterAgentInstance = new TLAUMasterAgent(config);
  }
  return masterAgentInstance;
}

/**
 * Initialize master agent with custom config
 */
export function initializeMasterAgent(config: Partial<MasterAgentConfig>): TLAUMasterAgent {
  masterAgentInstance = new TLAUMasterAgent(config);
  return masterAgentInstance;
}
