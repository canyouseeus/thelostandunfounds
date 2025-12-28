/**
 * Subscription Check Access Skill
 * 
 * Checks if a user can access a tool/feature based on their subscription tier.
 * This skill combines subscription checking with usage tracking.
 */

import { SkillDefinition, SkillMetadata, SkillExecutionContext } from '../../../tools-registry/src/skills/types';

const metadata: SkillMetadata = {
  name: 'check-access',
  description: 'Check if user can access a tool/feature based on subscription tier',
  category: 'subscription',
  tags: ['subscription', 'access', 'permissions'],
  aliases: ['@check', '@can-access'],
  version: '1.0.0',
  requiredParams: ['userId', 'toolId', 'action'],
  example: 'check-access({ userId: "user123", toolId: "tiktok-downloader", action: "download" })',
};

const skill: SkillDefinition = {
  name: 'check-access',
  description: metadata.description,
  metadata,
  parameters: [
    {
      name: 'userId',
      type: 'string',
      description: 'User ID',
      required: true,
    },
    {
      name: 'toolId',
      type: 'string',
      description: 'Tool identifier (e.g., "tiktok-downloader")',
      required: true,
    },
    {
      name: 'action',
      type: 'string',
      description: 'Action to check (e.g., "download", "upload")',
      required: true,
    },
  ],
  
  validate: (params) => {
    if (!params.userId) {
      return 'User ID is required';
    }
    if (!params.toolId) {
      return 'Tool ID is required';
    }
    if (!params.action) {
      return 'Action is required';
    }
    return true;
  },
  
  execute: async (params, context) => {
    const { userId, toolId, action } = params;
    
    context?.log?.(`Checking access for user ${userId} to ${toolId}/${action}`, 'info');
    
    try {
      // Step 1: Get user's subscription tier
      const getTierTool = await context?.tools?.import('subscription', 'getTier');
      const tier = await getTierTool({ userId });
      
      context?.log?.(`User tier: ${tier}`, 'info');
      
      // Step 2: Check if user can perform action
      const canPerformActionTool = await context?.tools?.import('subscription', 'canPerformAction');
      const accessCheck = await canPerformActionTool({
        userId,
        toolId,
        action,
      });
      
      // Step 3: Get tool limits for context
      const getToolLimitsTool = await context?.tools?.import('subscription', 'getToolLimits');
      const limits = await getToolLimitsTool({ toolId, tier });
      
      context?.log?.(
        `Access ${accessCheck.allowed ? 'granted' : 'denied'}. Remaining: ${accessCheck.remaining ?? 'unlimited'}`,
        accessCheck.allowed ? 'info' : 'warn'
      );
      
      return {
        success: true,
        allowed: accessCheck.allowed,
        tier,
        remaining: accessCheck.remaining,
        limit: accessCheck.limit,
        limits,
        message: accessCheck.allowed
          ? 'Access granted'
          : `Access denied. ${accessCheck.remaining === 0 ? 'Daily limit reached' : `Remaining: ${accessCheck.remaining}`}`,
      };
    } catch (error) {
      context?.log?.(
        `Access check failed: ${error instanceof Error ? error.message : String(error)}`,
        'error'
      );
      throw error;
    }
  },
  
  errorHandler: (error, params) => {
    // Default to allowing access if check fails (fail-open for better UX)
    return {
      success: true,
      allowed: true,
      error: error.message,
      userId: params.userId,
      toolId: params.toolId,
      action: params.action,
    };
  },
};

export default skill;


