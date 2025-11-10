/**
 * TLAU Master Agent - Usage Examples
 * 
 * Examples demonstrating how to use the Master Agent for various task types.
 */

import { getMasterAgent, initializeMasterAgent } from './master-agent';

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
 * Example: Process SEO task
 */
export async function processSEOTaskExample() {
  const agent = getMasterAgent();
  
  const prompt = "Generate SEO meta tags and keyword clusters for a blog post about AI tools for creatives";
  
  const result = await agent.processTask(prompt, {
    user_id: 'user123',
  });

  console.log('Task Category:', result.analysis.category);
  console.log('Confidence:', result.analysis.confidence);
  console.log('Execution Plan:', result.execution.plan);
  console.log('Output:', result.execution.output);
  console.log('Recommendations:', result.recommendations);

  return result;
}

/**
 * Example: Process image/media task
 */
export async function processImageTaskExample() {
  const agent = getMasterAgent();
  
  const prompt = "Process new Fujifilm X-S20 photos from Google Drive, optimize for SEO, log for CEO review";
  
  const result = await agent.processTask(prompt, {
    user_id: 'user123',
    context: {
      source: 'google_drive',
      camera: 'Fujifilm X-S20',
    },
  });

  console.log('Image Processing Workflow:', result.execution.output);
  console.log('Steps:', result.analysis.executionSteps);
  console.log('MCP Tools:', result.analysis.mcpCandidates);

  return result;
}

/**
 * Example: Process content task
 */
export async function processContentTaskExample() {
  const agent = getMasterAgent();
  
  const prompt = "Create a blog post outline about DIY tech projects for solopreneurs";
  
  const result = await agent.processTask(prompt, {
    user_id: 'user123',
  });

  console.log('Content Outline:', result.execution.output?.outline);
  console.log('Voice Guidelines:', result.execution.output?.voice_guidelines);
  console.log('Keywords:', result.execution.output?.keywords);

  return result;
}

/**
 * Example: Process merchandising task
 */
export async function processMerchandisingTaskExample() {
  const agent = getMasterAgent();
  
  const prompt = "Recommend seasonal products and create SEO strategy for TLAU merch shop";
  
  const result = await agent.processTask(prompt, {
    user_id: 'user123',
  });

  console.log('Product Recommendations:', result.execution.output?.product_recommendations);
  console.log('SEO Strategy:', result.execution.output?.seo_strategy);
  console.log('Cross-linking:', result.execution.output?.cross_linking);

  return result;
}

/**
 * Example: Process automation task
 */
export async function processAutomationTaskExample() {
  const agent = getMasterAgent();
  
  const prompt = "Design an automation workflow for processing new blog images and generating SEO metadata";
  
  const result = await agent.processTask(prompt, {
    user_id: 'user123',
  });

  console.log('Automation Plan:', result.execution.output?.automation_plan);
  console.log('Logging Strategy:', result.execution.output?.logging);
  console.log('Recommendations:', result.execution.output?.recommendations);

  return result;
}

/**
 * Example: Process mixed task
 */
export async function processMixedTaskExample() {
  const agent = getMasterAgent();
  
  const prompt = "Create SEO-optimized blog post with images about Bitcoin for creative entrepreneurs";
  
  const result = await agent.processTask(prompt, {
    user_id: 'user123',
  });

  console.log('Task Category:', result.analysis.category); // Should be 'mixed'
  console.log('Keywords:', result.analysis.keywords);
  console.log('Execution Steps:', result.analysis.executionSteps);

  return result;
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

  // Then process through master agent
  const masterAgent = getMasterAgent();
  const masterResult = await masterAgent.processTask(prompt, {
    user_id: 'user123',
  });

  return {
    orchestration: orchestrationResult,
    master: masterResult,
  };
}

/**
 * Example: Batch processing multiple tasks
 */
export async function batchProcessTasksExample(prompts: string[]) {
  const agent = getMasterAgent();
  const results = [];

  for (const prompt of prompts) {
    const result = await agent.processTask(prompt, {
      user_id: 'user123',
    });
    results.push({
      prompt,
      category: result.analysis.category,
      confidence: result.analysis.confidence,
      recommendations: result.recommendations,
    });
  }

  return results;
}
