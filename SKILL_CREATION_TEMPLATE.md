# Skill Creation Guide for AI Agents

## When to Create a Skill

Create a skill when you identify a **reusable workflow** that:
- Combines 2+ tools or operations
- Includes validation, error handling, or logging
- Will be used in multiple places
- Has clear input/output parameters

## Skill Creation Checklist

- [ ] Skill file created: `src/skills/[name]-skill.ts`
- [ ] Skill registered in `src/services/skills-registry.ts`
- [ ] Parameters validated
- [ ] Error handling implemented
- [ ] Logging added for important steps
- [ ] Aliases defined for easy invocation
- [ ] Documentation added

## Template

```typescript
/**
 * [Skill Name] Skill
 * 
 * [Description of what this skill does]
 */

import { SkillDefinition, SkillMetadata, SkillExecutionContext } from '../../../tools-registry/src/skills/types';

const metadata: SkillMetadata = {
  name: 'skill-name',
  description: 'Clear description of what this skill does',
  category: 'category', // auth, subscription, tools, etc.
  tags: ['tag1', 'tag2'],
  aliases: ['@alias1', '@alias2'],
  version: '1.0.0',
  requiredParams: ['param1'],
  optionalParams: ['param2'],
  example: 'skill-name({ param1: "value" })',
};

const skill: SkillDefinition = {
  name: 'skill-name',
  description: metadata.description,
  metadata,
  parameters: [
    {
      name: 'param1',
      type: 'string', // 'string' | 'number' | 'boolean' | 'object' | 'array'
      description: 'What this parameter is for',
      required: true,
      validation: (value) => {
        // Add validation logic
        if (!value) {
          return 'Parameter is required';
        }
        return true;
      },
    },
  ],
  
  validate: (params) => {
    // Cross-parameter validation
    if (!params.param1) {
      return 'param1 is required';
    }
    return true;
  },
  
  execute: async (params, context) => {
    const { param1, param2 } = params;
    
    context?.log?.(`Starting workflow: ${param1}`, 'info');
    
    try {
      // Step 1: Use tools from MCP registry
      const tool1 = await context?.tools?.import('namespace', 'toolName');
      const result1 = await tool1({ input: param1 });
      
      context?.log?.('Step 1 complete', 'info');
      
      // Step 2: Call other skills if needed
      const otherResult = await context?.skills?.execute('other-skill', {
        input: result1.output,
      });
      
      context?.log?.('Step 2 complete', 'info');
      
      // Step 3: Final processing
      // ...
      
      return {
        success: true,
        result: finalResult,
        message: 'Workflow completed successfully',
      };
    } catch (error) {
      context?.log?.(
        `Workflow failed: ${error instanceof Error ? error.message : String(error)}`,
        'error'
      );
      throw error;
    }
  },
  
  errorHandler: (error, params) => {
    // Custom error handling
    return {
      success: false,
      error: error.message,
      params,
    };
  },
};

export default skill;
```

## Registration

Add to `src/services/skills-registry.ts` in `registerPlatformSkills()`:

```typescript
skillRegistry.registerMetadata({
  name: 'skill-name',
  description: 'Clear description',
  category: 'category',
  tags: ['tag1', 'tag2'],
  aliases: ['@alias1'],
  definitionPath: 'skills/skill-name-skill.ts',
  requiredParams: ['param1'],
  optionalParams: ['param2'],
});
```

## Examples

See existing skills for reference:
- `src/skills/auth-signup-skill.ts` - Auth workflow
- `src/skills/subscription-check-skill.ts` - Access checking
- `src/skills/tiktok-download-skill.ts` - Multi-step workflow

