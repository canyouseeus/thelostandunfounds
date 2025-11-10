/**
 * Skills Integration for MCP Registry
 * 
 * This file integrates the skills system with the MCP registry for thelostandunfounds.com.
 * Skills can use MCP tools and be invoked with simple commands.
 */

let skillRegistry: any = null;
let executeSkill: any = null;
let searchSkills: any = null;
let listSkills: any = null;
let skillsLoaded = false;

/**
 * Load skills system (optional dependency)
 */
async function loadSkillsSystem() {
  if (skillsLoaded) return;
  
  try {
    // Try to dynamically import skills from tools-registry
    // Use @tools alias (same pattern as mcp-registry.ts)
    const skillsModule = await import(/* @vite-ignore */ '@tools/skills' as string);
    skillRegistry = skillsModule.skillRegistry || skillsModule.default;
    executeSkill = skillsModule.executeSkill;
    searchSkills = skillsModule.searchSkills;
    listSkills = skillsModule.listSkills;
    skillsLoaded = true;
  } catch (error) {
    // Skills system is optional - create a minimal fallback
    if (typeof window !== 'undefined') {
      console.warn('Skills system not available, using fallback:', error);
    }
    skillRegistry = {
      registerMetadata: () => {},
      setToolRegistry: () => {},
      getMetadata: () => undefined,
    };
    executeSkill = async () => ({ success: false, error: new Error('Skills system not available') });
    searchSkills = () => [];
    listSkills = () => [];
    skillsLoaded = true;
  }
}

/**
 * Initialize skills system with MCP registry
 */
export async function initializeSkillsSystem(toolRegistryInstance: any) {
  try {
    await loadSkillsSystem();
    
    if (skillRegistry && toolRegistryInstance) {
      // Link tool registry to skills (so skills can use MCP tools)
      skillRegistry.setToolRegistry(toolRegistryInstance);
    }
    
    // Register platform skills
    await registerPlatformSkills();
    
    return { initialized: true, skillsCount: await getSkillsCount() };
  } catch (error) {
    console.warn('Skills system initialization warning:', error);
    return { initialized: false, skillsCount: 0 };
  }
}

/**
 * Register platform-specific skills
 */
async function registerPlatformSkills() {
  if (!skillRegistry) return;
  
  // Register auth workflow skills
  skillRegistry.registerMetadata({
    name: 'sign-up-flow',
    description: 'Complete sign-up workflow: create account, verify email, initialize subscription',
    category: 'auth',
    tags: ['auth', 'signup', 'onboarding'],
    aliases: ['@signup', '@register'],
    requiredParams: ['email', 'password'],
    optionalParams: ['redirectTo'],
    definitionPath: 'skills/auth-signup-skill.ts',
  });
  
  skillRegistry.registerMetadata({
    name: 'sign-in-flow',
    description: 'Complete sign-in workflow: authenticate user and restore session',
    category: 'auth',
    tags: ['auth', 'signin', 'login'],
    aliases: ['@signin', '@login'],
    requiredParams: ['email', 'password'],
    optionalParams: ['remember'],
    definitionPath: 'skills/auth-signin-skill.ts',
  });
  
  skillRegistry.registerMetadata({
    name: 'google-sign-in-flow',
    description: 'Sign in with Google OAuth flow',
    category: 'auth',
    tags: ['auth', 'google', 'oauth'],
    aliases: ['@google', '@oauth'],
    optionalParams: ['redirectTo'],
    definitionPath: 'skills/auth-google-skill.ts',
  });
  
  // Register subscription workflow skills
  skillRegistry.registerMetadata({
    name: 'upgrade-subscription',
    description: 'Upgrade user subscription: check limits, process payment, update tier',
    category: 'subscription',
    tags: ['subscription', 'upgrade', 'payment'],
    aliases: ['@upgrade', '@subscribe'],
    requiredParams: ['userId', 'tier'],
    optionalParams: ['paymentMethod'],
    definitionPath: 'skills/subscription-upgrade-skill.ts',
  });
  
  skillRegistry.registerMetadata({
    name: 'check-access',
    description: 'Check if user can access a tool/feature based on subscription tier',
    category: 'subscription',
    tags: ['subscription', 'access', 'permissions'],
    aliases: ['@check', '@can-access'],
    requiredParams: ['userId', 'toolId', 'action'],
    definitionPath: 'skills/subscription-check-skill.ts',
  });
  
  // Register TikTok downloader workflow skill
  skillRegistry.registerMetadata({
    name: 'download-tiktok',
    description: 'Complete TikTok download workflow: validate URL, check limits, download, upload to Drive',
    category: 'tools',
    tags: ['tiktok', 'download', 'gdrive'],
    aliases: ['@tiktok', '@download'],
    requiredParams: ['userId', 'url'],
    optionalParams: ['folderId'],
    definitionPath: 'skills/tiktok-download-skill.ts',
  });
  
  // Register meta-skill for creating new skills
  skillRegistry.registerMetadata({
    name: 'create-skill',
    description: 'Create a new skill file following project conventions',
    category: 'meta',
    tags: ['meta', 'code-generation', 'skill-creation'],
    aliases: ['@create-skill', '@new-skill'],
    requiredParams: ['name', 'description', 'category'],
    optionalParams: ['aliases', 'requiredParams', 'optionalParams', 'executeCode'],
    definitionPath: 'skills/create-skill-skill.ts',
  });
}

/**
 * Get skills count
 */
async function getSkillsCount() {
  if (!listSkills) return 0;
  const skills = listSkills();
  return skills.length;
}

/**
 * Execute a skill by name or alias
 */
export async function useSkill(skillNameOrAlias: string, params: Record<string, any> = {}) {
  await loadSkillsSystem();
  if (!executeSkill) {
    throw new Error('Skills system not available');
  }
  return await executeSkill(skillNameOrAlias, params);
}

/**
 * Search for skills by keyword
 */
export async function searchAvailableSkills(keyword: string, options?: any) {
  await loadSkillsSystem();
  if (!searchSkills) return [];
  return searchSkills(keyword, options) || [];
}

/**
 * List all available skills
 */
export async function getAllSkills(category?: string) {
  await loadSkillsSystem();
  if (!listSkills) return [];
  return listSkills(category) || [];
}

/**
 * Get skill metadata
 */
export async function getSkillMetadata(skillNameOrAlias: string) {
  await loadSkillsSystem();
  if (!skillRegistry) return null;
  return skillRegistry.getMetadata(skillNameOrAlias);
}

// Export registry instance for direct access if needed
export { skillRegistry };

