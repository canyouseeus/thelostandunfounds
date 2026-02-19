# Skills System Integration for thelostandunfounds.com

## Overview

The skills system integrates seamlessly with your MCP registry, allowing you to create reusable workflows that combine multiple MCP tools.

## How It Works

### Architecture

```
MCP Registry (Tools) ←→ Skills System ←→ Your Application
     ↓                      ↓
  PayPal Tools         Auth Workflows
  Google Drive         Subscription Workflows  
  Vercel              TikTok Download Workflows
  Railway
  Supabase
```

### Key Features

1. **Skills use MCP Tools**: Skills can call any tool from your MCP registry
2. **Composable**: Skills can call other skills
3. **Simple Invocation**: Use aliases like `@signup` or `@tiktok`
4. **Integrated**: Works alongside your existing `mcp-registry.ts` service

## Setup

### 1. Initialize Skills System

```typescript
import { initializeMCPRegistry, initializeSkillsSystem } from './services/mcp-registry';

// Initialize MCP registry first
const { servers, tools } = await initializeMCPRegistry();

// Then initialize skills system (it will link to tool registry)
await initializeSkillsSystem(toolRegistry);
```

### 2. Use Skills in Your Components

```typescript
import { useSkill } from './services/mcp-registry';

// In your React component
const handleSignUp = async () => {
  const result = await useSkill('@signup', {
    email: 'user@example.com',
    password: 'secure123',
  });
  
  if (result.success) {
    console.log('User created:', result.user);
  }
};
```

## Available Skills

### Auth Skills

- **`@signup`** / **`sign-up-flow`** - Complete sign-up workflow
  ```typescript
  await useSkill('@signup', {
    email: 'user@example.com',
    password: 'secure123',
  });
  ```

- **`@signin`** / **`sign-in-flow`** - Sign in workflow
  ```typescript
  await useSkill('@signin', {
    email: 'user@example.com',
    password: 'secure123',
  });
  ```

- **`@google`** / **`google-sign-in-flow`** - Google OAuth sign-in
  ```typescript
  await useSkill('@google', {
    redirectTo: '/dashboard',
  });
  ```

### Subscription Skills

- **`@check`** / **`check-access`** - Check if user can access a tool
  ```typescript
  const access = await useSkill('@check', {
    userId: 'user123',
    toolId: 'tiktok-downloader',
    action: 'download',
  });
  
  if (access.allowed) {
    // Proceed with download
  }
  ```

- **`@upgrade`** / **`upgrade-subscription`** - Upgrade user subscription
  ```typescript
  await useSkill('@upgrade', {
    userId: 'user123',
    tier: 'premium',
  });
  ```

### Tool Skills

- **`@tiktok`** / **`download-tiktok`** - Complete TikTok download workflow
  ```typescript
  const result = await useSkill('@tiktok', {
    userId: 'user123',
    url: 'https://tiktok.com/@user/video/123',
    folderId: 'optional-folder-id',
  });
  
  console.log('Downloaded to:', result.driveUrl);
  ```

## Creating Custom Skills

### Step 1: Create Skill File

```typescript
// src/skills/my-skill.ts
import { SkillDefinition, SkillMetadata, SkillExecutionContext } from '../../../tools-registry/src/skills/types';

const metadata: SkillMetadata = {
  name: 'my-skill',
  description: 'My custom workflow',
  category: 'custom',
  aliases: ['@myskill'],
  requiredParams: ['param1'],
};

const skill: SkillDefinition = {
  name: 'my-skill',
  description: metadata.description,
  metadata,
  parameters: [
    {
      name: 'param1',
      type: 'string',
      description: 'Parameter description',
      required: true,
    },
  ],
  execute: async (params, context) => {
    // Use MCP tools
    const tool = await context?.tools?.import('namespace', 'toolName');
    const result = await tool(params);
    
    // Or call other skills
    const otherResult = await context?.skills?.execute('other-skill', params);
    
    return { success: true, result };
  },
};

export default skill;
```

### Step 2: Register Skill

```typescript
// In skills-registry.ts, add to registerPlatformSkills():
skillRegistry.registerMetadata({
  name: 'my-skill',
  description: 'My custom workflow',
  category: 'custom',
  aliases: ['@myskill'],
  definitionPath: 'skills/my-skill.ts',
  requiredParams: ['param1'],
});
```

### Step 3: Use It!

```typescript
const result = await useSkill('@myskill', {
  param1: 'value',
});
```

## Skills Using MCP Tools

Skills can use any tool from your MCP registry:

```typescript
execute: async (params, context) => {
  // Import PayPal tool
  const createOrder = await context?.tools?.import('paypal', 'createOrder');
  const order = await createOrder({ amount: 9.99, currency: 'USD' });
  
  // Import Google Drive tool
  const uploadFile = await context?.tools?.import('gdrive', 'uploadFile');
  const file = await uploadFile({ filePath: 'path/to/file' });
  
  // Import Vercel tool
  const deploy = await context?.tools?.import('vercel', 'deploy');
  const deployment = await deploy({ project: 'my-app' });
  
  return { order, file, deployment };
}
```

## Skills Calling Other Skills

Skills can compose other skills:

```typescript
execute: async (params, context) => {
  // Check access first
  const access = await context?.skills?.execute('check-access', {
    userId: params.userId,
    toolId: 'my-tool',
    action: 'use',
  });
  
  if (!access.allowed) {
    throw new Error('Access denied');
  }
  
  // Then proceed with workflow
  // ...
}
```

## Integration Example

### In a React Component

```typescript
import { useState } from 'react';
import { useSkill } from '../services/mcp-registry';

function TikTokDownloader() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleDownload = async () => {
    setLoading(true);
    try {
      const result = await useSkill('@tiktok', {
        userId: currentUser.id,
        url,
      });
      
      if (result.success) {
        alert(`Downloaded! View at: ${result.driveUrl}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <input 
        value={url} 
        onChange={(e) => setUrl(e.target.value)}
        placeholder="TikTok URL"
      />
      <button onClick={handleDownload} disabled={loading}>
        {loading ? 'Downloading...' : 'Download'}
      </button>
    </div>
  );
}
```

## Benefits

1. **Reusable Workflows**: Define once, use everywhere
2. **Composable**: Build complex workflows from simple skills
3. **Type-Safe**: Full TypeScript support
4. **Discoverable**: Search and list available skills
5. **Integrated**: Works seamlessly with MCP registry

## Next Steps

1. **Use Existing Skills**: Try `@signup`, `@check`, `@tiktok`
2. **Create Custom Skills**: Add workflows specific to your needs
3. **Compose Skills**: Build complex workflows from simpler ones
4. **Share Skills**: Skills can be shared across projects

## Files Created

- `src/services/skills-registry.ts` - Skills integration service
- `src/skills/auth-signup-skill.ts` - Sign-up workflow
- `src/skills/subscription-check-skill.ts` - Access checking workflow
- `src/skills/tiktok-download-skill.ts` - TikTok download workflow

## See Also

- [Skills System README](../../tools-registry/src/skills/README.md)
- [Quick Start Guide](../../tools-registry/src/skills/QUICK_START.md)
- [MCP Registry Service](./src/services/mcp-registry.ts)


