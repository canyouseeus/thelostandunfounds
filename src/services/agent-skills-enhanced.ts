/**
 * Enhanced Agent Skills Helper
 * 
 * Advanced functions for AI agents to intelligently discover, use, and create skills.
 */

import { 
  useSkill, 
  searchAvailableSkills, 
  getAllSkills,
  getSkillMetadata 
} from './mcp-registry';

/**
 * Smart Skill Discovery with semantic matching
 */
export async function smartSkillDiscovery(taskDescription: string) {
  const semanticKeywords = extractSemanticKeywords(taskDescription);
  const operationTypes = identifyOperationTypes(taskDescription);
  
  const searches = [
    searchAvailableSkills(taskDescription),
    searchAvailableSkills(semanticKeywords.join(' ')),
    ...operationTypes.map(op => searchAvailableSkills(op)),
  ];
  
  const allResults = await Promise.all(searches);
  const uniqueSkills = new Map();
  
  for (const results of allResults) {
    for (const skill of results) {
      if (!uniqueSkills.has(skill.name)) {
        const score = calculateSkillRelevance(skill, taskDescription, operationTypes);
        uniqueSkills.set(skill.name, { ...skill, score });
      }
    }
  }
  
  const sortedSkills = Array.from(uniqueSkills.values())
    .sort((a, b) => b.score - a.score);
  
  return {
    bestMatch: sortedSkills[0] || null,
    alternatives: sortedSkills.slice(1, 5),
    confidence: sortedSkills[0]?.score || 0,
  };
}

/**
 * Auto-Compose Skills for complex tasks
 */
export async function autoComposeSkills(
  taskDescription: string,
  params: Record<string, any>
) {
  const subTasks = decomposeTask(taskDescription);
  const skillPlan = [];
  
  for (const subTask of subTasks) {
    const discovery = await smartSkillDiscovery(subTask.description);
    if (discovery.bestMatch) {
      skillPlan.push({
        skill: discovery.bestMatch.name,
        alias: discovery.bestMatch.aliases?.[0],
        params: extractParamsForSkill(subTask, params),
        description: subTask.description,
      });
    }
  }
  
  return {
    skills: skillPlan.map(p => p.skill),
    executionPlan: skillPlan,
  };
}

/**
 * Pattern Templates for common workflows
 */
export const skillPatterns = {
  'auth-workflow': {
    description: 'Authentication workflow with session management',
    steps: ['validate', 'authenticate', 'create-session', 'track'],
    category: 'auth',
  },
  'payment-workflow': {
    description: 'Payment processing with confirmation',
    steps: ['validate', 'process-payment', 'send-confirmation', 'log'],
    category: 'payment',
  },
};

/**
 * Use Pattern Template
 */
export async function usePatternTemplate(patternName: keyof typeof skillPatterns) {
  const pattern = skillPatterns[patternName];
  if (!pattern) throw new Error(`Pattern ${patternName} not found`);
  
  const existing = await searchAvailableSkills(pattern.description);
  if (existing.length > 0) {
    return { action: 'use-existing', skill: existing[0] };
  }
  
  return { action: 'create-from-pattern', pattern };
}

// Helper functions
function extractSemanticKeywords(description: string): string[] {
  const semanticMap: Record<string, string[]> = {
    'payment': ['pay', 'charge', 'billing', 'transaction'],
    'auth': ['login', 'signin', 'signup', 'register'],
    'subscription': ['subscribe', 'upgrade', 'tier'],
  };
  
  const keywords: string[] = [];
  const desc = description.toLowerCase();
  
  for (const [key, synonyms] of Object.entries(semanticMap)) {
    if (synonyms.some(syn => desc.includes(syn)) || desc.includes(key)) {
      keywords.push(key);
    }
  }
  
  return keywords;
}

function identifyOperationTypes(description: string): string[] {
  const operations: string[] = [];
  const desc = description.toLowerCase();
  
  if (desc.includes('create') || desc.includes('add')) operations.push('create');
  if (desc.includes('update') || desc.includes('modify')) operations.push('update');
  if (desc.includes('get') || desc.includes('fetch')) operations.push('read');
  if (desc.includes('validate') || desc.includes('check')) operations.push('validate');
  
  return operations;
}

function calculateSkillRelevance(skill: any, taskDescription: string, operationTypes: string[]): number {
  let score = 0;
  const desc = taskDescription.toLowerCase();
  const skillDesc = (skill.description || '').toLowerCase();
  const skillTags = (skill.tags || []).map((t: string) => t.toLowerCase());
  
  if (skillDesc.includes(desc) || desc.includes(skillDesc)) score += 10;
  for (const tag of skillTags) {
    if (desc.includes(tag)) score += 5;
  }
  if (skill.category && desc.includes(skill.category)) score += 3;
  
  return score;
}

function decomposeTask(description: string): Array<{ description: string; type: string }> {
  const conjunctions = ['and', 'then', 'after'];
  const parts = description.split(new RegExp(conjunctions.join('|'), 'i'));
  
  return parts.map(part => ({
    description: part.trim(),
    type: identifyOperationTypes(part)[0] || 'unknown',
  }));
}

function extractParamsForSkill(subTask: any, allParams: Record<string, any>): Record<string, any> {
  const relevant: Record<string, any> = {};
  const desc = subTask.description.toLowerCase();
  
  for (const [key, value] of Object.entries(allParams)) {
    if (desc.includes(key.toLowerCase())) {
      relevant[key] = value;
    }
  }
  
  return relevant;
}

export { useSkill, searchAvailableSkills, getAllSkills, getSkillMetadata };
