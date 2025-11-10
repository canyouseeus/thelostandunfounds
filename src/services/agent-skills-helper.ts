/**
 * Agent Helper: Discover and Use Skills
 * 
 * This helper provides functions for AI agents to discover, use, and create skills.
 */

import { 
  useSkill, 
  searchAvailableSkills, 
  getAllSkills,
  getSkillMetadata 
} from './mcp-registry';

/**
 * Agent Helper: Find or Create Skill
 * 
 * This function helps agents decide whether to use an existing skill
 * or create a new one based on the task requirements.
 */
export async function findOrCreateSkill(
  taskDescription: string,
  requiredOperations: string[],
  params: Record<string, any> = {}
) {
  // Step 1: Search for existing skills
  const keywords = extractKeywords(taskDescription);
  const existingSkills = await searchAvailableSkills(keywords.join(' '));
  
  // Step 2: Check if any existing skill matches
  for (const skill of existingSkills) {
    const skillOps = skill.tags || [];
    const matches = requiredOperations.some(op => 
      skillOps.some(tag => tag.toLowerCase().includes(op.toLowerCase()))
    );
    
    if (matches) {
      return {
        action: 'use',
        skill: skill.name,
        aliases: skill.aliases,
        message: `Found existing skill: ${skill.name}. Use it with: useSkill('${skill.aliases?.[0] || skill.name}', params)`,
      };
    }
  }
  
  // Step 3: Determine if we should create a skill
  const shouldCreateSkill = 
    requiredOperations.length >= 2 || // Multiple operations
    taskDescription.includes('workflow') ||
    taskDescription.includes('process') ||
    taskDescription.includes('complete');
  
  if (shouldCreateSkill) {
    return {
      action: 'create',
      skillName: generateSkillName(taskDescription),
      message: `Create new skill: ${generateSkillName(taskDescription)}. Use @create-skill meta-skill or follow SKILL_CREATION_TEMPLATE.md`,
      suggestedMetadata: {
        name: generateSkillName(taskDescription),
        description: taskDescription,
        category: inferCategory(taskDescription),
        tags: requiredOperations,
        aliases: [`@${generateSkillName(taskDescription).replace('-skill', '')}`],
        requiredParams: Object.keys(params).filter(k => params[k] !== undefined),
      },
    };
  }
  
  // Step 4: Use tools directly (not a skill)
  return {
    action: 'use-tools',
    message: 'This is a simple operation. Use tools directly instead of creating a skill.',
    suggestedTools: requiredOperations,
  };
}

/**
 * Extract keywords from task description
 */
function extractKeywords(description: string): string[] {
  const words = description.toLowerCase().split(/\s+/);
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
  return words.filter(w => w.length > 3 && !stopWords.includes(w));
}

/**
 * Generate skill name from description
 */
function generateSkillName(description: string): string {
  const keywords = extractKeywords(description);
  const name = keywords.slice(0, 3).join('-');
  return `${name}-skill`;
}

/**
 * Infer category from description
 */
function inferCategory(description: string): string {
  const desc = description.toLowerCase();
  if (desc.includes('auth') || desc.includes('login') || desc.includes('sign')) return 'auth';
  if (desc.includes('subscription') || desc.includes('payment') || desc.includes('billing')) return 'subscription';
  if (desc.includes('download') || desc.includes('upload') || desc.includes('file')) return 'tools';
  if (desc.includes('deploy') || desc.includes('build')) return 'deployment';
  return 'utilities';
}

/**
 * Agent Helper: Execute Skill with Fallback
 * 
 * Tries to use a skill, falls back to tools if skill doesn't exist
 */
export async function executeSkillOrFallback(
  skillNameOrAlias: string,
  params: Record<string, any>,
  fallbackTools: Array<{ namespace: string; toolName: string; params: any }>
) {
  try {
    // Try to use skill first
    const result = await useSkill(skillNameOrAlias, params);
    if (result.success) {
      return { method: 'skill', result };
    }
  } catch (error) {
    // Skill doesn't exist or failed, use tools as fallback
    console.warn(`Skill ${skillNameOrAlias} not available, using tools fallback`);
  }
  
  // Execute tools sequentially
  const results = [];
  for (const tool of fallbackTools) {
    const { useTool } = await import('./mcp-registry');
    const result = await useTool(tool.namespace, tool.toolName, tool.params);
    results.push(result);
  }
  
  return { method: 'tools', results };
}

/**
 * Agent Helper: List All Available Skills
 * 
 * Returns all skills organized by category
 */
export async function listAllSkillsByCategory() {
  const allSkills = await getAllSkills();
  const byCategory: Record<string, any[]> = {};
  
  for (const skill of allSkills) {
    const category = skill.category || 'uncategorized';
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push({
      name: skill.name,
      aliases: skill.aliases,
      description: skill.description,
    });
  }
  
  return byCategory;
}

/**
 * Agent Helper: Get Skill Usage Example
 * 
 * Returns example code for using a skill
 */
export async function getSkillExample(skillNameOrAlias: string) {
  const metadata = await getSkillMetadata(skillNameOrAlias);
  if (!metadata) {
    return null;
  }
  
  const alias = metadata.aliases?.[0] || metadata.name;
  const exampleParams = metadata.requiredParams?.reduce((acc, param) => {
    acc[param] = `"${param}-value"`;
    return acc;
  }, {} as Record<string, string>) || {};
  
  return {
    skill: metadata.name,
    alias,
    example: `await useSkill('${alias}', ${JSON.stringify(exampleParams, null, 2)})`,
    description: metadata.description,
    requiredParams: metadata.requiredParams,
    optionalParams: metadata.optionalParams,
  };
}

// Export for use in agents
export {
  useSkill,
  searchAvailableSkills,
  getAllSkills,
  getSkillMetadata,
};

