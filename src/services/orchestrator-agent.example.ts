/**
 * TLAU Orchestrator Agent - Usage Example
 * 
 * This file demonstrates how to use the orchestrator agent in your application.
 */

import { getOrchestratorAgent, initializeOrchestrator } from './orchestrator-agent';

/**
 * Example: Initialize orchestrator with custom configuration
 */
export async function initializeOrchestratorExample() {
  const orchestrator = initializeOrchestrator({
    hooks: {
      on_prompt_received: true,
      log_prompt: true,
      check_mcp: true,
      notify_ceo_agent: true,
    },
    logging: {
      log_path: 'Resources/prompt_logs/prompts.md',
      metadata_fields: ['timestamp', 'user_id', 'prompt_summary', 'requires_mcp', 'mcp_candidates', 'sensitive_data_removed', 'suggested_actions', 'agent_id'],
    },
  });

  return orchestrator;
}

/**
 * Example: Process a prompt through the orchestrator
 */
export async function processPromptExample(prompt: string, userId?: string) {
  const orchestrator = getOrchestratorAgent();
  
  const result = await orchestrator.processPrompt(prompt, {
    user_id: userId,
  });

  console.log('Orchestrator Result:', {
    shouldUseMCP: result.should_use_mcp,
    mcpCandidates: result.mcp_candidates,
    suggestedActions: result.suggested_actions,
  });

  return result;
}

/**
 * Example: Process a prompt that requires MCP resources
 */
export async function processMCPPromptExample() {
  const prompt = "Deploy my application to Vercel and create a GitHub repository";
  
  const result = await processPromptExample(prompt, 'user123');
  
  if (result.should_use_mcp) {
    console.log('This prompt should use MCP resources');
    console.log('Available MCP tools:', result.mcp_candidates);
  }
  
  return result;
}

/**
 * Example: Process a simple local prompt
 */
export async function processLocalPromptExample() {
  const prompt = "Fix the typo in the header text";
  
  const result = await processPromptExample(prompt, 'user123');
  
  if (!result.should_use_mcp) {
    console.log('This prompt can be handled locally');
  }
  
  return result;
}

/**
 * Example: Hook into Cursor's prompt handling (if applicable)
 * 
 * This would be integrated into your main application flow
 */
export async function handleIncomingPrompt(prompt: string, context?: Record<string, any>) {
  const orchestrator = getOrchestratorAgent();
  
  // Process through orchestrator
  const orchestrationResult = await orchestrator.processPrompt(prompt, {
    user_id: context?.user_id,
    context,
  });

  // Use the result to decide how to handle the prompt
  if (orchestrationResult.should_use_mcp) {
    // Route to MCP-enabled handler
    return {
      handler: 'mcp',
      tools: orchestrationResult.mcp_candidates,
      actions: orchestrationResult.suggested_actions,
    };
  } else {
    // Route to local handler
    return {
      handler: 'local',
      actions: orchestrationResult.suggested_actions,
    };
  }
}
