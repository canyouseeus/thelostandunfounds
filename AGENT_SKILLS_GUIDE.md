# Agent Skills Integration Guide

## Overview

This guide explains how AI agents (like Cursor AI) can discover, use, and create skills when building the site.

## How Agents Use Skills

### 1. Discovery Phase

Before implementing a workflow, agents should search for existing skills:

```typescript
import { searchAvailableSkills } from './services/mcp-registry';

// Search for skills related to the task
const skills = await searchAvailableSkills('payment workflow');
if (skills.length > 0) {
  // Use existing skill
  await useSkill(skills[0].name, params);
}
```

### 2. Decision Phase

Agents use `findOrCreateSkill()` to decide:
- **Use existing skill** if found
- **Create new skill** if pattern is reusable
- **Use tools directly** if simple operation

```typescript
import { findOrCreateSkill } from './services/agent-skills-helper';

const decision = await findOrCreateSkill(
  'Process payment and send confirmation email',
  ['payment', 'email'],
  { userId: 'user123', amount: 9.99 }
);

if (decision.action === 'use') {
  await useSkill(decision.skill, params);
} else if (decision.action === 'create') {
  // Create new skill using @create-skill meta-skill
  await useSkill('@create-skill', decision.suggestedMetadata);
}
```

### 3. Execution Phase

Agents execute skills with fallback to tools:

```typescript
import { executeSkillOrFallback } from './services/agent-skills-helper';

const result = await executeSkillOrFallback(
  '@payment-confirm',
  { userId, amount },
  [
    { namespace: 'paypal', toolName: 'createOrder', params: { amount } },
    { namespace: 'email', toolName: 'sendEmail', params: { to: userEmail } },
  ]
);
```

## Agent Workflow

### Step-by-Step Process

1. **Receive Task**: "Add feature to process payments and send confirmation"

2. **Search Skills**: 
   ```typescript
   const skills = await searchAvailableSkills('payment confirmation');
   ```

3. **Check Match**: Does any skill match the requirements?

4. **Decision**:
   - ✅ Skill exists → Use it
   - ❌ No skill, reusable pattern → Create skill
   - ❌ No skill, one-off → Use tools directly

5. **Execute**: Use skill or create new one

### Example: Building a Feature

**User Request**: "Add a feature to upgrade subscription and send welcome email"

**Agent Process**:

```typescript
// 1. Search for existing skills
const skills = await searchAvailableSkills('subscription upgrade email');

// 2. Check if skill exists
if (skills.length === 0) {
  // 3. Decide: Create skill (reusable workflow)
  const decision = await findOrCreateSkill(
    'Upgrade subscription and send welcome email',
    ['subscription', 'upgrade', 'email'],
    { userId, tier }
  );
  
  if (decision.action === 'create') {
    // 4. Create skill using meta-skill
    await useSkill('@create-skill', {
      name: 'subscription-upgrade-welcome-skill',
      description: 'Upgrade user subscription and send welcome email',
      category: 'subscription',
      aliases: ['@upgrade-welcome'],
      requiredParams: ['userId', 'tier'],
      executeCode: `
        // Check current tier
        const getTier = await context?.tools?.import('subscription', 'getTier');
        const currentTier = await getTier({ userId });
        
        // Upgrade subscription
        const upgrade = await context?.tools?.import('subscription', 'createSubscription');
        await upgrade({ userId, tier });
        
        // Send welcome email
        const sendEmail = await context?.tools?.import('email', 'sendEmail');
        await sendEmail({ 
          to: userEmail, 
          subject: 'Welcome to Premium!',
          body: 'Your subscription has been upgraded.'
        });
        
        return { success: true, tier };
      `,
    });
    
    // 5. Register skill (auto-done by create-skill)
    // 6. Use the new skill
    await useSkill('@upgrade-welcome', { userId, tier });
  }
}
```

## Creating Skills Programmatically

### Using the @create-skill Meta-Skill

```typescript
import { useSkill } from './services/mcp-registry';

// Create a new skill
const result = await useSkill('@create-skill', {
  name: 'my-new-skill',
  description: 'Does something useful',
  category: 'tools',
  aliases: ['@myskill'],
  requiredParams: ['param1'],
  optionalParams: ['param2'],
  executeCode: `
    // Your skill logic here
    const tool = await context?.tools?.import('namespace', 'toolName');
    const result = await tool({ input: params.param1 });
    return { success: true, result };
  `,
});

// Result includes:
// - skillFile: Path to created file
// - registrationCode: Code to add to skills-registry.ts
```

### Manual Creation

1. Create file: `src/skills/[name]-skill.ts`
2. Follow template: `SKILL_CREATION_TEMPLATE.md`
3. Register in: `src/services/skills-registry.ts`

## Cursor Rules Integration

The `.cursorrules-skills` file tells agents:
- ✅ Always search for skills before implementing workflows
- ✅ Use existing skills when found
- ✅ Create skills for reusable patterns
- ✅ Use tools directly for simple operations

## Helper Functions

### `findOrCreateSkill()`
Decides whether to use existing skill, create new one, or use tools directly.

### `executeSkillOrFallback()`
Tries skill first, falls back to tools if skill doesn't exist.

### `listAllSkillsByCategory()`
Lists all skills organized by category for discovery.

### `getSkillExample()`
Gets example code for using a skill.

## Best Practices for Agents

1. **Always Search First**: Check for existing skills before creating new code
2. **Create Reusable Skills**: If pattern will be reused, create a skill
3. **Use Aliases**: Make skills easy to invoke (`@signup` vs `sign-up-flow`)
4. **Document Well**: Include clear descriptions and examples
5. **Validate Inputs**: Always validate parameters in skills
6. **Handle Errors**: Provide meaningful error messages

## Examples

See:
- `src/services/agent-skills-helper.ts` - Helper functions
- `src/skills/` - Example skills
- `SKILL_CREATION_TEMPLATE.md` - Skill creation template
- `.cursorrules-skills` - Cursor rules for agents

## Integration Points

- **`.cursorrules`** - Main rules file (includes skills section)
- **`.cursorrules-skills`** - Detailed skills rules
- **`agent-skills-helper.ts`** - Helper functions for agents
- **`skills-registry.ts`** - Skills registration and management

