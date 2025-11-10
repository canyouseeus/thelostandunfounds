/**
 * Meta-Skill: Create New Skill
 * 
 * This skill helps AI agents create new skills programmatically.
 * It generates skill files following the project's conventions.
 */

import { SkillDefinition, SkillMetadata, SkillExecutionContext } from '../../../tools-registry/src/skills/types';
import * as fs from 'fs/promises';
import * as path from 'path';

const metadata: SkillMetadata = {
  name: 'create-skill',
  description: 'Create a new skill file following project conventions',
  category: 'meta',
  tags: ['meta', 'code-generation', 'skill-creation'],
  aliases: ['@create-skill', '@new-skill'],
  version: '1.0.0',
  requiredParams: ['name', 'description', 'category'],
  optionalParams: ['aliases', 'requiredParams', 'optionalParams', 'executeCode'],
  example: 'create-skill({ name: "my-skill", description: "Does something", category: "tools" })',
};

const skill: SkillDefinition = {
  name: 'create-skill',
  description: metadata.description,
  metadata,
  parameters: [
    {
      name: 'name',
      type: 'string',
      description: 'Skill name (kebab-case)',
      required: true,
      validation: (value) => {
        if (!value || !/^[a-z0-9-]+$/.test(value)) {
          return 'Name must be kebab-case (lowercase letters, numbers, hyphens)';
        }
        return true;
      },
    },
    {
      name: 'description',
      type: 'string',
      description: 'Skill description',
      required: true,
    },
    {
      name: 'category',
      type: 'string',
      description: 'Skill category (auth, subscription, tools, etc.)',
      required: true,
    },
    {
      name: 'aliases',
      type: 'array',
      description: 'Array of aliases (e.g., ["@alias1", "@alias2"])',
      required: false,
    },
    {
      name: 'requiredParams',
      type: 'array',
      description: 'Array of required parameter names',
      required: false,
    },
    {
      name: 'optionalParams',
      type: 'array',
      description: 'Array of optional parameter names',
      required: false,
    },
    {
      name: 'executeCode',
      type: 'string',
      description: 'JavaScript/TypeScript code for the execute function',
      required: false,
    },
  ],
  
  validate: (params) => {
    if (!params.name || !/^[a-z0-9-]+$/.test(params.name)) {
      return 'Name must be kebab-case';
    }
    if (!params.description) {
      return 'Description is required';
    }
    if (!params.category) {
      return 'Category is required';
    }
    return true;
  },
  
  execute: async (params, context) => {
    const {
      name,
      description,
      category,
      aliases = [],
      requiredParams = [],
      optionalParams = [],
      executeCode,
    } = params;
    
    context?.log?.(`Creating skill: ${name}`, 'info');
    
    try {
      // Generate skill file content
      const skillFileName = `${name}-skill.ts`;
      const skillFilePath = path.join(process.cwd(), 'src', 'skills', skillFileName);
      
      // Build parameter definitions
      const paramDefinitions = [
        ...requiredParams.map((p: string) => ({
          name: p,
          type: 'string',
          description: `${p} parameter`,
          required: true,
        })),
        ...optionalParams.map((p: string) => ({
          name: p,
          type: 'string',
          description: `${p} parameter`,
          required: false,
        })),
      ];
      
      // Generate skill code
      const skillCode = `/**
 * ${description}
 * 
 * Auto-generated skill
 */

import { SkillDefinition, SkillMetadata, SkillExecutionContext } from '../../../tools-registry/src/skills/types';

const metadata: SkillMetadata = {
  name: '${name}',
  description: '${description}',
  category: '${category}',
  tags: ['${category}'],
  aliases: ${JSON.stringify(aliases)},
  version: '1.0.0',
  requiredParams: ${JSON.stringify(requiredParams)},
  optionalParams: ${JSON.stringify(optionalParams)},
  example: '${name}({ ${requiredParams[0] || 'param'}: "value" })',
};

const skill: SkillDefinition = {
  name: '${name}',
  description: metadata.description,
  metadata,
  parameters: ${JSON.stringify(paramDefinitions, null, 2)},
  
  validate: (params) => {
    ${requiredParams.map((p: string) => `if (!params.${p}) {
      return '${p} is required';
    }`).join('\n    ')}
    return true;
  },
  
  execute: async (params, context) => {
    const { ${[...requiredParams, ...optionalParams].join(', ')} } = params;
    
    context?.log?.(\`Starting ${name} workflow\`, 'info');
    
    try {
      ${executeCode || `// TODO: Implement skill logic
      // Use tools: const tool = await context?.tools?.import('namespace', 'toolName');
      // Call other skills: await context?.skills?.execute('other-skill', params);
      
      return {
        success: true,
        message: 'Skill executed successfully',
      };`}
    } catch (error) {
      context?.log?.(
        \`${name} failed: \${error instanceof Error ? error.message : String(error)}\`,
        'error'
      );
      throw error;
    }
  },
  
  errorHandler: (error, params) => {
    return {
      success: false,
      error: error.message,
      params,
    };
  },
};

export default skill;
`;
      
      // Ensure skills directory exists
      const skillsDir = path.dirname(skillFilePath);
      await fs.mkdir(skillsDir, { recursive: true });
      
      // Write skill file
      await fs.writeFile(skillFilePath, skillCode, 'utf-8');
      context?.log?.(`Skill file created: ${skillFilePath}`, 'info');
      
      // Generate registration code
      const registrationCode = `
skillRegistry.registerMetadata({
  name: '${name}',
  description: '${description}',
  category: '${category}',
  tags: ['${category}'],
  aliases: ${JSON.stringify(aliases)},
  definitionPath: 'skills/${skillFileName}',
  requiredParams: ${JSON.stringify(requiredParams)},
  optionalParams: ${JSON.stringify(optionalParams)},
});`;
      
      return {
        success: true,
        skillFile: skillFilePath,
        registrationCode,
        message: `Skill ${name} created successfully. Add registration code to skills-registry.ts`,
      };
    } catch (error) {
      context?.log?.(
        `Skill creation failed: ${error instanceof Error ? error.message : String(error)}`,
        'error'
      );
      throw error;
    }
  },
  
  errorHandler: (error, params) => {
    return {
      success: false,
      error: error.message,
      skillName: params.name,
    };
  },
};

export default skill;

