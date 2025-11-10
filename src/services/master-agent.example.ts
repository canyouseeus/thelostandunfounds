/**
 * TLAU Master Agent v1.1 - Usage Examples
 * 
 * Examples demonstrating modular task management, dashboard integration,
 * repository awareness, and payments support.
 */

import { getMasterAgent, initializeMasterAgent, ModuleStatus, ModuleCategory, ModulePriority } from './master-agent';

/**
 * Example: Initialize master agent
 */
export async function initializeMasterAgentExample() {
  const agent = initializeMasterAgent({
    // Use default config, or customize as needed
  });

  return agent;
}

/**
 * Example: Process task as module
 */
export async function processTaskAsModuleExample() {
  const agent = getMasterAgent();
  
  const prompt = "Process new Fujifilm X-S20 photos from Google Drive, optimize for SEO, log for CEO review";
  
  const result = await agent.processTask(prompt, {
    user_id: 'user123',
    assigned_to: 'user123',
    priority: 'high',
  });

  console.log('Module ID:', result.module.module_id);
  console.log('Status:', result.module.status);
  console.log('Category:', result.module.category);
  console.log('Repository Matches:', result.repositoryMatches);
  console.log('Execution Plan:', result.execution.plan);
  console.log('Recommendations:', result.recommendations);

  return result;
}

/**
 * Example: Update module status
 */
export async function updateModuleStatusExample(moduleId: string) {
  const agent = getMasterAgent();
  
  // Move to Testing
  await agent.updateModuleStatus(moduleId, 'Testing', 'Module ready for testing');
  
  // Move to Completed
  await agent.updateModuleStatus(moduleId, 'Completed', 'All tests passed');
  
  const module = agent.getModule(moduleId);
  console.log('Updated Module:', module);
  
  return module;
}

/**
 * Example: Link modules together
 */
export async function linkModulesExample() {
  const agent = getMasterAgent();
  
  // Create image processing module
  const imageResult = await agent.processTask(
    "Process photos from Google Drive",
    { assigned_to: 'user123', priority: 'high' }
  );
  
  // Create blog post module
  const blogResult = await agent.processTask(
    "Create blog post about photography workflow",
    { assigned_to: 'user123', priority: 'medium' }
  );
  
  // Link them together
  await agent.linkModules(imageResult.module.module_id, blogResult.module.module_id);
  
  console.log('Linked modules:', {
    source: imageResult.module.module_id,
    target: blogResult.module.module_id,
  });
  
  return { imageResult, blogResult };
}

/**
 * Example: Get dashboard analytics
 */
export async function getDashboardAnalyticsExample() {
  const agent = getMasterAgent();
  
  const analytics = agent.getAnalytics();
  
  console.log('Dashboard Analytics:', {
    completed: analytics.completed_modules,
    in_progress: analytics.in_progress_modules,
    testing: analytics.testing_modules,
    todo: analytics.todo_modules,
    processed_media: analytics.processed_media,
    generated_content: analytics.generated_content,
    products_added: analytics.products_added,
    payouts_executed: analytics.payouts_executed,
    by_category: analytics.modules_by_category,
  });
  
  return analytics;
}

/**
 * Example: Get modules by status (for Kanban board)
 */
export async function getKanbanBoardExample() {
  const agent = getMasterAgent();
  
  const kanban = {
    'To Do': agent.getModulesByStatus('To Do'),
    'In Progress': agent.getModulesByStatus('In Progress'),
    'Testing': agent.getModulesByStatus('Testing'),
    'Completed': agent.getModulesByStatus('Completed'),
  };
  
  console.log('Kanban Board:', kanban);
  
  return kanban;
}

/**
 * Example: Process payments module
 */
export async function processPaymentsModuleExample() {
  const agent = getMasterAgent();
  
  const prompt = "Process share payouts via PayPal for Q4 revenue split";
  
  const result = await agent.processTask(prompt, {
    user_id: 'admin123',
    assigned_to: 'admin123',
    priority: 'high',
  });

  console.log('Payment Module:', {
    id: result.module.module_id,
    category: result.module.category,
    execution_plan: result.execution.plan,
    output: result.execution.output,
  });

  // Update status as payment is processed
  await agent.updateModuleStatus(result.module.module_id, 'Completed', 'Payments processed successfully');
  
  return result;
}

/**
 * Example: Process SEO module with repository awareness
 */
export async function processSEOModuleExample() {
  const agent = getMasterAgent();
  
  const prompt = "Generate SEO meta tags and keyword clusters for Bitcoin hub page";
  
  const result = await agent.processTask(prompt, {
    user_id: 'user123',
    assigned_to: 'user123',
    priority: 'medium',
  });

  console.log('SEO Module:', {
    id: result.module.module_id,
    repository_matches: result.repositoryMatches,
    keyword_clusters: result.execution.output?.keyword_clusters,
    meta_suggestions: result.execution.output?.meta_suggestions,
  });

  return result;
}

/**
 * Example: Process merchandising module
 */
export async function processMerchandisingModuleExample() {
  const agent = getMasterAgent();
  
  const prompt = "Recommend seasonal products and create SEO strategy for TLAU merch shop";
  
  const result = await agent.processTask(prompt, {
    user_id: 'user123',
    assigned_to: 'user123',
    priority: 'medium',
  });

  console.log('Merchandising Module:', {
    id: result.module.module_id,
    product_recommendations: result.execution.output?.product_recommendations,
    seo_strategy: result.execution.output?.seo_strategy,
  });

  return result;
}

/**
 * Example: Process automation module
 */
export async function processAutomationModuleExample() {
  const agent = getMasterAgent();
  
  const prompt = "Design automation workflow for processing new blog images and generating SEO metadata";
  
  const result = await agent.processTask(prompt, {
    user_id: 'user123',
    assigned_to: 'user123',
    priority: 'high',
  });

  console.log('Automation Module:', {
    id: result.module.module_id,
    automation_plan: result.execution.output?.automation_plan,
    testing_checklist: result.execution.output?.testing_checklist,
  });

  return result;
}

/**
 * Example: Complete workflow - Image processing to blog post
 */
export async function completeWorkflowExample() {
  const agent = getMasterAgent();
  
  // Step 1: Process images
  const imageModule = await agent.processTask(
    "Process Fujifilm X-S20 photos from Google Drive",
    { assigned_to: 'user123', priority: 'high' }
  );
  
  // Step 2: Update status to Testing
  await agent.updateModuleStatus(imageModule.module.module_id, 'Testing', 'Verifying image processing');
  
  // Step 3: Create blog post module
  const blogModule = await agent.processTask(
    "Create blog post about photography workflow using processed images",
    { assigned_to: 'user123', priority: 'medium' }
  );
  
  // Step 4: Link modules
  await agent.linkModules(imageModule.module.module_id, blogModule.module.module_id);
  
  // Step 5: Mark image module as completed
  await agent.updateModuleStatus(imageModule.module.module_id, 'Completed', 'Images processed and linked to blog');
  
  // Step 6: Get analytics
  const analytics = agent.getAnalytics();
  
  return {
    imageModule,
    blogModule,
    analytics,
  };
}

/**
 * Example: Get modules by category
 */
export async function getModulesByCategoryExample(category: ModuleCategory) {
  const agent = getMasterAgent();
  
  const modules = agent.getModulesByCategory(category);
  
  console.log(`Modules in category "${category}":`, modules);
  
  return modules;
}

/**
 * Example: Integration with orchestrator agent
 */
export async function integratedWorkflowExample(prompt: string) {
  // First, route through orchestrator
  const { getOrchestratorAgent } = await import('./orchestrator-agent');
  const orchestrator = getOrchestratorAgent();
  
  const orchestrationResult = await orchestrator.processPrompt(prompt, {
    user_id: 'user123',
  });

  // Then process through master agent as module
  const masterAgent = getMasterAgent();
  const masterResult = await masterAgent.processTask(prompt, {
    user_id: 'user123',
    priority: orchestrationResult.should_use_mcp ? 'high' : 'medium',
  });

  return {
    orchestration: orchestrationResult,
    module: masterResult,
  };
}
