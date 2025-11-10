/**
 * TLAU Master Agent v1.1
 * 
 * Master sub-agent for THE LOST + UNFOUNDS (TLAU).
 * Manages modular tasks, dashboards, MCP server integration, media, products, payments,
 * and logs for CEO review. Dashboard-aware and repository-aware.
 */

import { getOrchestratorAgent } from './orchestrator-agent';
import { initializeMCPRegistry, searchAvailableTools } from './mcp-registry';
import * as fs from 'fs';
import * as path from 'path';

export type ModuleStatus = 'To Do' | 'In Progress' | 'Testing' | 'Completed';
export type ModuleCategory = 'SEO' | 'content' | 'image' | 'automation' | 'merch' | 'payments' | 'mixed' | 'unknown';
export type ModulePriority = 'high' | 'medium' | 'low';

export interface ModuleLog {
  module_id: string;
  title: string;
  category: ModuleCategory;
  status: ModuleStatus;
  dependencies: string[];
  inputs: string;
  outputs: string;
  assigned_to?: string;
  priority: ModulePriority;
  execution_plan: string;
  tools_used: string[];
  notes?: string;
  timestamp: string;
  repository_reference?: string;
  linked_modules?: string[];
}

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
  };
  core_objectives: {
    repository_awareness: string[];
    task_module_management: string[];
    seo_and_content: string[];
    media_product_management: string[];
    merchandising: string[];
    automation_mcp_integration: string[];
    payments: string[];
  };
  logging_format: {
    module_id: string;
    title: string;
    category: string;
    status: string;
    dependencies: string[];
    inputs: string;
    outputs: string;
    assigned_to: string;
    priority: string;
    execution_plan: string;
    tools_used: string[];
    notes: string;
    timestamp: string;
    repository_reference: string;
  };
  workflow_steps: string[];
  dashboard_integration: string[];
  voice_and_tone: {
    style: string;
    mood: string;
    notes: string;
  };
  output_formats: {
    primary: string;
    fallback: string;
    structured_fields: string[];
  };
}

export interface TaskAnalysis {
  category: ModuleCategory;
  confidence: number;
  keywords: string[];
  requiresMCP: boolean;
  mcpCandidates: string[];
  executionSteps: string[];
}

export interface ModuleExecutionResult {
  module: ModuleLog;
  analysis: TaskAnalysis;
  execution: {
    plan: string;
    toolsUsed: string[];
    notes?: string;
    output?: any;
  };
  recommendations?: string[];
  repositoryMatches?: string[];
}

export interface DashboardAnalytics {
  completed_modules: number;
  in_progress_modules: number;
  testing_modules: number;
  todo_modules: number;
  processed_media: number;
  generated_content: number;
  products_added: number;
  payouts_executed: number;
  modules_by_category: Record<ModuleCategory, number>;
}

const DEFAULT_CONFIG: MasterAgentConfig = {
  agent_name: "TLAU_Master_Agent",
  version: "1.1",
  description: "Master sub-agent for THE LOST + UNFOUNDS (TLAU). Manages modular tasks, dashboards, MCP server integration, media, products, payments, and logs for CEO review. References TLAU repository to integrate with existing setup.",
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
  },
  core_objectives: {
    repository_awareness: [
      "Reference the TLAU repository to compare new tasks/modules with existing setup",
      "Plan task execution to integrate seamlessly with current modules, workflows, media, products, and MCP server configuration"
    ],
    task_module_management: [
      "Treat each task as a self-contained module with title, description, category, status, dependencies, inputs, outputs, assigned user, and priority",
      "Track module progress: To Do → In Progress → Testing → Completed",
      "Recommend MCP servers, AI agents, or workflows",
      "Log execution metadata per module"
    ],
    seo_and_content: [
      "Generate keyword clusters, meta titles, descriptions, H1/H2 tags, blog ideas, 30-day content plans",
      "Map site structure and link content modules to existing repository pages"
    ],
    media_product_management: [
      "Track images, digital products, and merch items",
      "Extract EXIF metadata, remove location data, generate SEO-friendly filenames, alt text, captions, JSON-LD",
      "Link media/products to the module that processed them"
    ],
    merchandising: [
      "Recommend seasonal products, accessories, fanny packs, hoodies, t-shirts, coloring books, journals",
      "Track product creation, SEO, and cross-linking"
    ],
    automation_mcp_integration: [
      "Trigger MCP servers and AI agents for task execution",
      "Log inputs, outputs, and execution metadata",
      "Provide testing checklists and optional improvements"
    ],
    payments: [
      "Automate share payouts via PayPal",
      "Direct deposits to Strike",
      "Enable payouts to other users",
      "Track payment modules in dashboard and logs"
    ],
  },
  logging_format: {
    module_id: "<unique task/module ID>",
    title: "<task name>",
    category: "<SEO / content / image / automation / merch / payments>",
    status: "<To Do / In Progress / Testing / Completed>",
    dependencies: ["<MCP server>", "<AI agent>", "<external tools>"],
    inputs: "<files, prompts, or data>",
    outputs: "<generated files or content>",
    assigned_to: "<user>",
    priority: "<high/medium/low>",
    execution_plan: "<steps executed or to be executed>",
    tools_used: ["<MCP server>", "<AI agent>", "<external tools>"],
    notes: "<optional commentary>",
    timestamp: "<date/time>",
    repository_reference: "<existing module or workflow in TLAU repository for integration>",
  },
  workflow_steps: [
    "Reference TLAU repository to assess current setup",
    "Create/assign modular task",
    "Execute and test module independently",
    "Trigger MCP/AI agents if needed",
    "Verify outputs (media, content, products, payments)",
    "Push/deploy module",
    "Update dashboard and logs",
    "Link outputs to dependent modules as needed"
  ],
  dashboard_integration: [
    "Display tasks/modules in Kanban board: To Do, In Progress, Testing, Completed",
    "Show module details: description, inputs/outputs, dependencies, logs",
    "Track MCP server assignments and status",
    "Provide analytics: completed modules, processed media, generated content, products added, payouts executed"
  ],
  voice_and_tone: {
    style: "grounded, imaginative, human-centered",
    mood: "playful but practical, encourages experimentation",
    notes: "Reflects TLAU ethos: combine multiple systems to create new possibilities",
  },
  output_formats: {
    primary: "markdown for content, JSON for logs and metadata",
    fallback: "plaintext",
    structured_fields: ["title", "summary", "keywords", "content_outline", "recommended_links"],
  },
};

export class TLAUMasterAgent {
  private config: MasterAgentConfig;
  private modulesPath: string;
  private analyticsPath: string;
  private orchestrator: ReturnType<typeof getOrchestratorAgent>;
  private modules: Map<string, ModuleLog> = new Map();

  constructor(config?: Partial<MasterAgentConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.modulesPath = path.resolve(process.cwd(), 'Resources/module_logs/modules.jsonl');
    this.analyticsPath = path.resolve(process.cwd(), 'Resources/module_logs/analytics.json');
    this.orchestrator = getOrchestratorAgent();
    this.ensureLogDirectory();
    this.loadModules();
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
      try {
        const logDir = path.dirname(this.modulesPath);
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
      } catch (error) {
        console.warn('Failed to initialize log directory:', error);
      }
    }
  }

  /**
   * Load existing modules from log file
   */
  private loadModules(): void {
    if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
      try {
        if (fs.existsSync(this.modulesPath)) {
          const content = fs.readFileSync(this.modulesPath, 'utf-8');
          const lines = content.trim().split('\n').filter(line => line.trim());
          lines.forEach(line => {
            try {
              const module: ModuleLog = JSON.parse(line);
              this.modules.set(module.module_id, module);
            } catch (error) {
              // Skip invalid JSON lines
            }
          });
        }
      } catch (error) {
        console.warn('Failed to load modules:', error);
      }
    }
  }

  /**
   * Generate unique module ID
   */
  private generateModuleId(title: string): string {
    const timestamp = Date.now();
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30);
    return `module-${slug}-${timestamp}`;
  }

  /**
   * Check repository for existing modules/workflows
   */
  private async checkRepository(prompt: string, category: ModuleCategory): Promise<string[]> {
    const matches: string[] = [];
    
    if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
      try {
        // Check for existing files/modules in the repository
        const repoPaths = [
          'src/services',
          'src/pages',
          'src/components',
          'src/servers',
          'api',
        ];

        for (const repoPath of repoPaths) {
          const fullPath = path.resolve(process.cwd(), repoPath);
          if (fs.existsSync(fullPath)) {
            const files = this.findFiles(fullPath, ['.ts', '.tsx', '.js', '.jsx']);
            files.forEach(file => {
              const content = fs.readFileSync(file, 'utf-8');
              const lowerPrompt = prompt.toLowerCase();
              const keywords = lowerPrompt.split(/\s+/).filter(w => w.length > 3);
              
              // Check if file content matches keywords
              const lowerContent = content.toLowerCase();
              if (keywords.some(keyword => lowerContent.includes(keyword))) {
                matches.push(file.replace(process.cwd(), '').replace(/^\//, ''));
              }
            });
          }
        }

        // Also check existing modules
        this.modules.forEach((module, id) => {
          if (module.category === category || module.category === 'mixed') {
            const moduleLower = module.title.toLowerCase();
            const promptLower = prompt.toLowerCase();
            if (promptLower.split(/\s+/).some(word => moduleLower.includes(word))) {
              matches.push(`module:${id}`);
            }
          }
        });
      } catch (error) {
        console.warn('Repository check failed:', error);
      }
    }

    return matches.slice(0, 5); // Limit to 5 matches
  }

  /**
   * Find files recursively
   */
  private findFiles(dir: string, extensions: string[]): string[] {
    const files: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          files.push(...this.findFiles(fullPath, extensions));
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
    return files;
  }

  /**
   * Main entry point: Process task as module
   */
  async processTask(
    prompt: string,
    options?: {
      user_id?: string;
      assigned_to?: string;
      priority?: ModulePriority;
      context?: Record<string, any>;
    }
  ): Promise<ModuleExecutionResult> {
    // Step 1: Reference repository
    const analysis = await this.analyzeTask(prompt);
    const repositoryMatches = await this.checkRepository(prompt, analysis.category);

    // Step 2: Create module
    const moduleId = this.generateModuleId(prompt);
    const module: ModuleLog = {
      module_id: moduleId,
      title: prompt.split(/[.!?]/)[0].substring(0, 100),
      category: analysis.category,
      status: 'To Do',
      dependencies: [],
      inputs: prompt,
      outputs: '',
      assigned_to: options?.assigned_to || options?.user_id,
      priority: options?.priority || 'medium',
      execution_plan: '',
      tools_used: [],
      timestamp: new Date().toISOString(),
      repository_reference: repositoryMatches.length > 0 ? repositoryMatches.join(', ') : undefined,
    };

    // Step 3: Check MCP availability
    const mcpCheck = await this.checkMCPTools(analysis);
    module.dependencies = [...mcpCheck.mcpCandidates];
    module.tools_used = [...mcpCheck.mcpCandidates];

    // Step 4: Execute task
    module.status = 'In Progress';
    const execution = await this.executeTask(prompt, analysis, mcpCheck, repositoryMatches);
    module.execution_plan = execution.plan;
    module.outputs = JSON.stringify(execution.output || {});
    module.tools_used = [...module.tools_used, ...execution.toolsUsed];
    if (execution.notes) {
      module.notes = execution.notes;
    }

    // Step 5: Generate recommendations
    const recommendations = this.generateRecommendations(analysis, execution, repositoryMatches);

    // Step 6: Save module
    await this.saveModule(module);

    return {
      module,
      analysis,
      execution,
      recommendations,
      repositoryMatches,
    };
  }

  /**
   * Update module status
   */
  async updateModuleStatus(
    moduleId: string,
    status: ModuleStatus,
    notes?: string
  ): Promise<ModuleLog | null> {
    const module = this.modules.get(moduleId);
    if (!module) {
      return null;
    }

    module.status = status;
    module.timestamp = new Date().toISOString();
    if (notes) {
      module.notes = (module.notes ? module.notes + '\n' : '') + notes;
    }

    await this.saveModule(module);
    return module;
  }

  /**
   * Link modules together
   */
  async linkModules(sourceModuleId: string, targetModuleId: string): Promise<boolean> {
    const sourceModule = this.modules.get(sourceModuleId);
    const targetModule = this.modules.get(targetModuleId);

    if (!sourceModule || !targetModule) {
      return false;
    }

    if (!sourceModule.linked_modules) {
      sourceModule.linked_modules = [];
    }
    if (!sourceModule.linked_modules.includes(targetModuleId)) {
      sourceModule.linked_modules.push(targetModuleId);
    }

    await this.saveModule(sourceModule);
    return true;
  }

  /**
   * Get dashboard analytics
   */
  getAnalytics(): DashboardAnalytics {
    const analytics: DashboardAnalytics = {
      completed_modules: 0,
      in_progress_modules: 0,
      testing_modules: 0,
      todo_modules: 0,
      processed_media: 0,
      generated_content: 0,
      products_added: 0,
      payouts_executed: 0,
      modules_by_category: {
        SEO: 0,
        content: 0,
        image: 0,
        automation: 0,
        merch: 0,
        payments: 0,
        mixed: 0,
        unknown: 0,
      },
    };

    this.modules.forEach(module => {
      // Status counts
      switch (module.status) {
        case 'Completed':
          analytics.completed_modules++;
          break;
        case 'In Progress':
          analytics.in_progress_modules++;
          break;
        case 'Testing':
          analytics.testing_modules++;
          break;
        case 'To Do':
          analytics.todo_modules++;
          break;
      }

      // Category counts
      analytics.modules_by_category[module.category]++;

      // Domain-specific counts
      if (module.category === 'image') {
        analytics.processed_media++;
      }
      if (module.category === 'content') {
        analytics.generated_content++;
      }
      if (module.category === 'merch') {
        analytics.products_added++;
      }
      if (module.category === 'payments') {
        analytics.payouts_executed++;
      }
    });

    return analytics;
  }

  /**
   * Get modules by status
   */
  getModulesByStatus(status: ModuleStatus): ModuleLog[] {
    return Array.from(this.modules.values()).filter(m => m.status === status);
  }

  /**
   * Get modules by category
   */
  getModulesByCategory(category: ModuleCategory): ModuleLog[] {
    return Array.from(this.modules.values()).filter(m => m.category === category);
  }

  /**
   * Get module by ID
   */
  getModule(moduleId: string): ModuleLog | undefined {
    return this.modules.get(moduleId);
  }

  /**
   * Analyze task to determine category
   */
  private async analyzeTask(prompt: string): Promise<TaskAnalysis> {
    const lowerPrompt = prompt.toLowerCase();
    const keywords: string[] = [];
    let category: ModuleCategory = 'unknown';
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
    if (contentMatches.length > 0) {
      keywords.push(...contentMatches);
      if (category === 'unknown') {
        category = 'content';
        confidence = Math.min(0.9, 0.5 + contentMatches.length * 0.1);
      } else {
        category = 'mixed';
        confidence = Math.max(confidence, Math.min(0.8, 0.5 + contentMatches.length * 0.1));
      }
    }

    // Image keywords
    const imageKeywords = ['image', 'photo', 'picture', 'exif', 'gps', 'metadata', 'camera', 'lens', 'iso', 'alt text', 'caption', 'fujifilm'];
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
    const merchKeywords = ['merch', 'product', 'shop', 't-shirt', 'hoodie', 'fanny pack', 'accessory', 'seasonal', 'inventory', 'coloring book', 'journal'];
    const merchMatches = merchKeywords.filter(kw => lowerPrompt.includes(kw));
    if (merchMatches.length > 0) {
      keywords.push(...merchMatches);
      if (category === 'unknown') {
        category = 'merch';
        confidence = Math.min(0.9, 0.5 + merchMatches.length * 0.1);
      } else {
        category = 'mixed';
        confidence = Math.max(confidence, Math.min(0.8, 0.5 + merchMatches.length * 0.1));
      }
    }

    // Payments keywords
    const paymentKeywords = ['payment', 'payout', 'paypal', 'strike', 'deposit', 'share', 'revenue', 'split'];
    const paymentMatches = paymentKeywords.filter(kw => lowerPrompt.includes(kw));
    if (paymentMatches.length > 0) {
      keywords.push(...paymentMatches);
      if (category === 'unknown') {
        category = 'payments';
        confidence = Math.min(0.9, 0.5 + paymentMatches.length * 0.1);
      } else {
        category = 'mixed';
        confidence = Math.max(confidence, Math.min(0.8, 0.5 + paymentMatches.length * 0.1));
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

    const executionSteps = this.generateExecutionSteps(category, prompt, keywords);

    return {
      category,
      confidence,
      keywords: [...new Set(keywords)],
      requiresMCP: false,
      mcpCandidates: [],
      executionSteps,
    };
  }

  /**
   * Generate execution steps
   */
  private generateExecutionSteps(
    category: ModuleCategory,
    prompt: string,
    keywords: string[]
  ): string[] {
    const steps: string[] = [];

    switch (category) {
      case 'SEO':
        steps.push('Reference TLAU repository for existing SEO modules');
        steps.push('Generate keyword clusters');
        steps.push('Create meta titles and descriptions');
        steps.push('Generate H1/H2 tag suggestions');
        steps.push('Map to content architecture');
        if (keywords.includes('schema') || keywords.includes('json-ld')) {
          steps.push('Generate JSON-LD structured data');
        }
        break;

      case 'content':
        steps.push('Reference repository for existing content');
        steps.push('Generate content outline');
        steps.push('Create keyword clusters');
        steps.push('Draft content following TLAU voice');
        steps.push('Suggest internal linking');
        steps.push('Map to content architecture');
        break;

      case 'image':
        steps.push('Check repository for existing media modules');
        steps.push('Identify image/media files');
        steps.push('Extract EXIF metadata (camera, lens, ISO, copyright)');
        steps.push('Remove GPS/location data');
        steps.push('Generate SEO-friendly filename');
        steps.push('Create alt text and captions');
        steps.push('Generate JSON-LD for images');
        steps.push('Upload or move to repository/website');
        steps.push('Link media to processing module');
        break;

      case 'merch':
        steps.push('Check repository for existing product modules');
        steps.push('Analyze product requirements');
        steps.push('Recommend seasonal products');
        steps.push('Suggest product naming and SEO');
        steps.push('Create product content strategy');
        steps.push('Suggest cross-linking');
        break;

      case 'payments':
        steps.push('Check repository for existing payment modules');
        steps.push('Identify payment type (PayPal, Strike, user payout)');
        steps.push('Calculate share amounts');
        steps.push('Execute payout workflow');
        steps.push('Log payment details');
        steps.push('Update dashboard');
        break;

      case 'automation':
        steps.push('Reference repository for existing workflows');
        steps.push('Analyze automation requirements');
        steps.push('Design workflow');
        steps.push('Identify recurring patterns');
        steps.push('Create automation plan');
        steps.push('Set up testing checklist');
        break;

      default:
        steps.push('Reference TLAU repository');
        steps.push('Analyze requirements');
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

      // Category-specific searches
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

      if (analysis.category === 'payments') {
        const paymentTools = await searchAvailableTools('paypal', { limit: 5 });
        if (paymentTools) {
          paymentTools.forEach((tool: any) => {
            const toolName = tool.name || tool.tool || `${tool.namespace || 'unknown'}:${tool.name || 'unknown'}`;
            if (!candidates.includes(toolName)) {
              candidates.push(toolName);
            }
          });
        }
      }

      return {
        mcpCandidates: candidates.slice(0, 10),
        requiresMCP: candidates.length > 0 || analysis.category === 'image' || analysis.category === 'payments' || analysis.category === 'automation',
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
    mcpCheck: ReturnType<typeof this.checkMCPTools>,
    repositoryMatches: string[]
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
        const seoResult = await this.handleSEO(prompt, analysis, repositoryMatches);
        plan = seoResult.plan;
        notes = seoResult.notes;
        output = seoResult.output;
        break;

      case 'content':
        const contentResult = await this.handleContent(prompt, analysis, repositoryMatches);
        plan = contentResult.plan;
        notes = contentResult.notes;
        output = contentResult.output;
        break;

      case 'image':
        const imageResult = await this.handleImage(prompt, analysis, repositoryMatches);
        plan = imageResult.plan;
        notes = imageResult.notes;
        output = imageResult.output;
        break;

      case 'merch':
        const merchResult = await this.handleMerchandising(prompt, analysis, repositoryMatches);
        plan = merchResult.plan;
        notes = merchResult.notes;
        output = merchResult.output;
        break;

      case 'payments':
        const paymentResult = await this.handlePayments(prompt, analysis, repositoryMatches);
        plan = paymentResult.plan;
        notes = paymentResult.notes;
        output = paymentResult.output;
        break;

      case 'automation':
        const autoResult = await this.handleAutomation(prompt, analysis, repositoryMatches);
        plan = autoResult.plan;
        notes = autoResult.notes;
        output = autoResult.output;
        break;

      default:
        plan = `Process task: ${prompt}\nReference repository: ${repositoryMatches.join(', ') || 'none'}`;
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
    analysis: TaskAnalysis,
    repositoryMatches: string[]
  ): Promise<{ plan: string; notes: string; output: any }> {
    const plan = `
1. Reference TLAU repository: ${repositoryMatches.join(', ') || 'No matches found'}
2. Analyze SEO requirements from prompt
3. Generate keyword clusters for: creativity, AI, side hustles, tech, Bitcoin, merch/products
4. Create meta titles and descriptions
5. Generate H1/H2 tag suggestions
6. Map to content architecture: Home, About, Tools, Blog, Shop, Community, AI Tutorials, Bitcoin Hub, Merch/Product pages, Web Dev/DIY hub
7. Generate JSON-LD structured data if needed
8. Link to existing repository modules
    `.trim();

    const notes = `SEO optimization following TLAU focus areas. Repository references: ${repositoryMatches.length > 0 ? repositoryMatches.join(', ') : 'none'}`;

    const output = {
      keyword_clusters: this.generateKeywordClusters(),
      meta_suggestions: this.generateMetaSuggestions(prompt),
      content_architecture_mapping: this.mapContentArchitecture(prompt),
      repository_integration: repositoryMatches,
    };

    return { plan, notes, output };
  }

  /**
   * Handle content tasks
   */
  private async handleContent(
    prompt: string,
    analysis: TaskAnalysis,
    repositoryMatches: string[]
  ): Promise<{ plan: string; notes: string; output: any }> {
    const plan = `
1. Reference TLAU repository: ${repositoryMatches.join(', ') || 'No matches found'}
2. Analyze content requirements
3. Generate content outline following TLAU voice and tone
4. Create keyword clusters
5. Draft content with playful but practical tone
6. Suggest internal linking opportunities
7. Map to content architecture
8. Link to existing repository content
    `.trim();

    const notes = `Content created in TLAU style. Repository references: ${repositoryMatches.length > 0 ? repositoryMatches.join(', ') : 'none'}`;

    const output = {
      outline: this.generateContentOutline(prompt),
      keywords: this.generateKeywordClusters(),
      voice_guidelines: this.config.voice_and_tone,
      repository_integration: repositoryMatches,
    };

    return { plan, notes, output };
  }

  /**
   * Handle image/media tasks
   */
  private async handleImage(
    prompt: string,
    analysis: TaskAnalysis,
    repositoryMatches: string[]
  ): Promise<{ plan: string; notes: string; output: any }> {
    const plan = `
1. Check repository for existing media modules: ${repositoryMatches.join(', ') || 'No matches found'}
2. Identify image/media files (check for Google Drive, local files, URLs)
3. Extract EXIF metadata: camera, lens, ISO, copyright
4. Remove GPS/location data for privacy
5. Generate SEO-friendly filename based on content and keywords
6. Create descriptive alt text and captions
7. Generate JSON-LD structured data for images
8. Upload or move processed files to repository/website
9. Link media to processing module
10. Log metadata and execution plan for CEO review
    `.trim();

    const notes = 'Image processing following TLAU workflow. Repository references: ' + (repositoryMatches.length > 0 ? repositoryMatches.join(', ') : 'none');

    const output = {
      workflow: 'image_processing',
      steps: [
        'EXIF extraction',
        'GPS removal',
        'SEO optimization',
        'File upload',
        'Module linking',
        'CEO logging',
      ],
      repository_integration: repositoryMatches,
    };

    return { plan, notes, output };
  }

  /**
   * Handle merchandising tasks
   */
  private async handleMerchandising(
    prompt: string,
    analysis: TaskAnalysis,
    repositoryMatches: string[]
  ): Promise<{ plan: string; notes: string; output: any }> {
    const plan = `
1. Check repository for existing product modules: ${repositoryMatches.join(', ') || 'No matches found'}
2. Analyze product requirements and seasonality
3. Recommend products: fanny packs, hoodies, t-shirts, accessories, coloring books, journals
4. Suggest product naming following TLAU brand
5. Create SEO-optimized product content
6. Develop cross-linking strategy
7. Map to Shop content architecture
8. Link to existing product modules
    `.trim();

    const notes = 'Merchandising recommendations aligned with TLAU audience. Repository references: ' + (repositoryMatches.length > 0 ? repositoryMatches.join(', ') : 'none');

    const output = {
      product_recommendations: this.generateProductRecommendations(),
      seo_strategy: 'Product-focused keyword clusters, seasonal optimization',
      cross_linking: 'Link to Blog, Community, Tools pages',
      repository_integration: repositoryMatches,
    };

    return { plan, notes, output };
  }

  /**
   * Handle payments tasks
   */
  private async handlePayments(
    prompt: string,
    analysis: TaskAnalysis,
    repositoryMatches: string[]
  ): Promise<{ plan: string; notes: string; output: any }> {
    const plan = `
1. Check repository for existing payment modules: ${repositoryMatches.join(', ') || 'No matches found'}
2. Identify payment type: PayPal, Strike direct deposit, or user payout
3. Calculate share amounts and percentages
4. Execute payout workflow:
   - PayPal: Use PayPal MCP server
   - Strike: Direct deposit via Strike API
   - User payout: Internal payout system
5. Log payment details (amount, recipient, timestamp)
6. Update dashboard with payment status
7. Link payment to related modules/tasks
8. Generate payment confirmation
    `.trim();

    const notes = 'Payment processing following TLAU automation principles. Repository references: ' + (repositoryMatches.length > 0 ? repositoryMatches.join(', ') : 'none');

    const output = {
      payment_type: this.detectPaymentType(prompt),
      workflow: 'payment_processing',
      steps: [
        'Payment type identification',
        'Amount calculation',
        'Payout execution',
        'Logging',
        'Dashboard update',
      ],
      repository_integration: repositoryMatches,
    };

    return { plan, notes, output };
  }

  /**
   * Detect payment type from prompt
   */
  private detectPaymentType(prompt: string): string {
    const lower = prompt.toLowerCase();
    if (lower.includes('paypal')) return 'PayPal';
    if (lower.includes('strike')) return 'Strike';
    if (lower.includes('user') || lower.includes('payout')) return 'User Payout';
    return 'Unknown';
  }

  /**
   * Handle automation tasks
   */
  private async handleAutomation(
    prompt: string,
    analysis: TaskAnalysis,
    repositoryMatches: string[]
  ): Promise<{ plan: string; notes: string; output: any }> {
    const plan = `
1. Reference repository for existing workflows: ${repositoryMatches.join(', ') || 'No matches found'}
2. Analyze automation requirements
3. Design workflow following TLAU philosophy: automation, repeatability, scalability
4. Identify recurring patterns
5. Create automation plan
6. Set up testing checklist
7. Log for CEO review
8. Recommend enhancements and next steps
9. Link to dependent modules
    `.trim();

    const notes = `Automation following TLAU principles. Repository references: ${repositoryMatches.length > 0 ? repositoryMatches.join(', ') : 'none'}`;

    const output = {
      automation_plan: 'Workflow designed for repeatability and scalability',
      testing_checklist: [
        'Test module independently',
        'Verify inputs and outputs',
        'Check MCP server integration',
        'Validate logging',
        'Test error handling',
      ],
      logging: 'All tasks logged for CEO review',
      recommendations: 'Enhancements and next steps included in log',
      repository_integration: repositoryMatches,
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
      'Coloring books',
      'Journals',
      'Seasonal items',
    ];
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    analysis: TaskAnalysis,
    execution: ReturnType<typeof this.executeTask>,
    repositoryMatches: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (analysis.category === 'image') {
      recommendations.push('Consider creating blog post featuring the images');
      recommendations.push('Add internal links to related content');
      recommendations.push('Share on social media with optimized captions');
      if (repositoryMatches.length > 0) {
        recommendations.push(`Link to existing modules: ${repositoryMatches.join(', ')}`);
      }
    }

    if (analysis.category === 'content') {
      recommendations.push('Cross-link to related tools and products');
      recommendations.push('Add to content calendar for recurring updates');
      recommendations.push('Consider creating companion visual content');
      if (repositoryMatches.length > 0) {
        recommendations.push(`Reference existing content: ${repositoryMatches.join(', ')}`);
      }
    }

    if (analysis.category === 'merch') {
      recommendations.push('Create product launch content');
      recommendations.push('Link to related blog posts');
      recommendations.push('Set up seasonal automation');
    }

    if (analysis.category === 'payments') {
      recommendations.push('Set up recurring payment automation');
      recommendations.push('Create payment tracking dashboard');
      recommendations.push('Link payments to related revenue modules');
    }

    if (execution.toolsUsed.length === 0 && analysis.requiresMCP) {
      recommendations.push('Consider using MCP tools for enhanced functionality');
    }

    if (repositoryMatches.length === 0) {
      recommendations.push('Consider creating reusable module for future tasks');
    }

    return recommendations;
  }

  /**
   * Save module to log file
   */
  private async saveModule(module: ModuleLog): Promise<void> {
    this.modules.set(module.module_id, module);

    if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
      try {
        const logLine = JSON.stringify(module) + '\n';
        fs.appendFileSync(this.modulesPath, logLine, 'utf-8');

        // Update analytics
        const analytics = this.getAnalytics();
        fs.writeFileSync(this.analyticsPath, JSON.stringify(analytics, null, 2), 'utf-8');
      } catch (error) {
        console.error('Failed to save module:', error);
      }
    } else {
      console.log('Module Log:', module);
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
