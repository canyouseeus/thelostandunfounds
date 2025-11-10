# TLAU Master Agent v1.1

Master sub-agent for THE LOST + UNFOUNDS (TLAU). Manages modular tasks, dashboards, MCP server integration, media, products, payments, and logs for CEO review. **Dashboard-aware and repository-aware.**

## What's New in v1.1

- **Modular Task Management**: Every task is treated as a self-contained module with status tracking
- **Dashboard Integration**: Kanban board support (To Do → In Progress → Testing → Completed)
- **Repository Awareness**: Automatically references existing TLAU repository to integrate with current setup
- **Payments Module**: Support for PayPal, Strike, and user payouts
- **Module Linking**: Connect related modules together
- **Analytics**: Track completed modules, processed media, generated content, products, payouts

## Overview

The TLAU Master Agent v1.1 is a specialized agent that processes tasks as **modules** across multiple domains:
- **SEO & Content**: Keyword clusters, meta tags, content outlines, blog ideas
- **Image & Media**: EXIF extraction, GPS removal, SEO optimization
- **Merchandising**: Product recommendations, SEO strategies, cross-linking
- **Payments**: PayPal payouts, Strike deposits, user payouts
- **Automation**: Workflow design, recurring patterns, CEO logging

## Module Management

Every task is treated as a **self-contained module** with:

- **Module ID**: Unique identifier
- **Title**: Task name
- **Category**: SEO, content, image, automation, merch, payments, mixed, unknown
- **Status**: To Do → In Progress → Testing → Completed
- **Dependencies**: MCP servers, AI agents, external tools
- **Inputs/Outputs**: Files, prompts, generated content
- **Assigned To**: User assignment
- **Priority**: high, medium, low
- **Repository Reference**: Links to existing TLAU modules/workflows

## Quick Start

```typescript
import { getMasterAgent } from './services/master-agent';

const agent = getMasterAgent();

// Process a task as a module
const result = await agent.processTask(
  "Process Fujifilm X-S20 photos from Google Drive, optimize for SEO",
  {
    user_id: 'user123',
    assigned_to: 'user123',
    priority: 'high',
  }
);

console.log('Module ID:', result.module.module_id);
console.log('Status:', result.module.status);
console.log('Repository Matches:', result.repositoryMatches);
console.log('Execution Plan:', result.execution.plan);
```

## Module Status Workflow

```typescript
// Create module (starts as "To Do")
const result = await agent.processTask("Process images");

// Move to "In Progress" (automatic when processing)
// Update to "Testing"
await agent.updateModuleStatus(result.module.module_id, 'Testing', 'Ready for testing');

// Complete module
await agent.updateModuleStatus(result.module.module_id, 'Completed', 'All tests passed');
```

## Dashboard Integration

### Kanban Board

```typescript
const kanban = {
  'To Do': agent.getModulesByStatus('To Do'),
  'In Progress': agent.getModulesByStatus('In Progress'),
  'Testing': agent.getModulesByStatus('Testing'),
  'Completed': agent.getModulesByStatus('Completed'),
};
```

### Analytics

```typescript
const analytics = agent.getAnalytics();

console.log({
  completed_modules: analytics.completed_modules,
  in_progress_modules: analytics.in_progress_modules,
  processed_media: analytics.processed_media,
  generated_content: analytics.generated_content,
  products_added: analytics.products_added,
  payouts_executed: analytics.payouts_executed,
  modules_by_category: analytics.modules_by_category,
});
```

## Repository Awareness

The agent automatically checks the TLAU repository for existing modules and workflows:

```typescript
const result = await agent.processTask("Process images from Google Drive");

// Repository matches are included in the result
console.log('Repository Matches:', result.repositoryMatches);
// Example: ['src/services/master-agent.ts', 'src/pages/ToolsDashboard.tsx', 'module:abc123']
```

## Module Linking

Link related modules together:

```typescript
// Create image processing module
const imageModule = await agent.processTask("Process photos");

// Create blog post module
const blogModule = await agent.processTask("Create blog post");

// Link them
await agent.linkModules(imageModule.module.module_id, blogModule.module.module_id);
```

## Payments Module

Process payments with automatic tracking:

```typescript
// PayPal payout
const paypalResult = await agent.processTask(
  "Process share payouts via PayPal for Q4 revenue",
  { assigned_to: 'admin123', priority: 'high' }
);

// Strike deposit
const strikeResult = await agent.processTask(
  "Direct deposit to Strike for Bitcoin payments",
  { assigned_to: 'admin123', priority: 'high' }
);

// User payout
const userPayoutResult = await agent.processTask(
  "Payout to user123 for completed task",
  { assigned_to: 'admin123', priority: 'medium' }
);
```

## Module Log Format

All modules are logged in JSON Lines format:

```json
{
  "module_id": "module-process-images-1234567890",
  "title": "Process Fujifilm X-S20 photos",
  "category": "image",
  "status": "Completed",
  "dependencies": ["google_drive_mcp", "image_processor"],
  "inputs": "Process Fujifilm X-S20 photos from Google Drive",
  "outputs": "{\"workflow\":\"image_processing\",\"steps\":[...]}",
  "assigned_to": "user123",
  "priority": "high",
  "execution_plan": "1. Check repository...",
  "tools_used": ["google_drive_mcp", "image_processor"],
  "notes": "Images processed successfully",
  "timestamp": "2024-11-10T21:00:00.000Z",
  "repository_reference": "src/services/master-agent.ts, module:abc123",
  "linked_modules": ["module-blog-post-1234567891"]
}
```

## Task Categories

### SEO Modules
**Keywords**: seo, meta, keyword, title, description, h1, h2, alt text, schema, json-ld

**Outputs**:
- Keyword clusters
- Meta titles and descriptions
- H1/H2 suggestions
- JSON-LD structured data
- Content architecture mapping
- Repository integration

### Content Modules
**Keywords**: blog, article, post, content, write, draft, outline, copy

**Outputs**:
- Content outlines
- Keyword clusters
- Voice and tone guidelines
- Internal linking suggestions
- Repository references

### Image/Media Modules
**Keywords**: image, photo, picture, exif, gps, metadata, camera, lens, iso, alt text, caption, fujifilm

**Outputs**:
- EXIF extraction workflow
- GPS removal instructions
- SEO-friendly filenames
- Alt text and captions
- JSON-LD for images
- Module linking

### Merchandising Modules
**Keywords**: merch, product, shop, t-shirt, hoodie, fanny pack, accessory, seasonal, inventory, coloring book, journal

**Outputs**:
- Product recommendations
- Product naming
- SEO strategies
- Cross-linking plans

### Payments Modules
**Keywords**: payment, payout, paypal, strike, deposit, share, revenue, split

**Outputs**:
- Payment type identification
- Amount calculations
- Payout workflows
- Payment logging
- Dashboard updates

### Automation Modules
**Keywords**: automate, schedule, recurring, workflow, pipeline, batch

**Outputs**:
- Automation plans
- Workflow designs
- Testing checklists
- Recurring pattern identification

## Complete Workflow Example

```typescript
// Step 1: Process images
const imageModule = await agent.processTask(
  "Process Fujifilm X-S20 photos from Google Drive",
  { assigned_to: 'user123', priority: 'high' }
);

// Step 2: Test
await agent.updateModuleStatus(imageModule.module.module_id, 'Testing');

// Step 3: Create blog post
const blogModule = await agent.processTask(
  "Create blog post about photography workflow",
  { assigned_to: 'user123', priority: 'medium' }
);

// Step 4: Link modules
await agent.linkModules(imageModule.module.module_id, blogModule.module.module_id);

// Step 5: Complete
await agent.updateModuleStatus(imageModule.module.module_id, 'Completed');

// Step 6: View analytics
const analytics = agent.getAnalytics();
```

## Files

- `src/services/master-agent.ts` - Main implementation (v1.1)
- `src/services/master-agent.example.ts` - Usage examples
- `Resources/module_logs/modules.jsonl` - Module logs (JSON Lines)
- `Resources/module_logs/analytics.json` - Dashboard analytics

## Integration

### With Orchestrator Agent

```typescript
import { getOrchestratorAgent } from './services/orchestrator-agent';
import { getMasterAgent } from './services/master-agent';

// Route through orchestrator first
const orchestrator = getOrchestratorAgent();
const orchestrationResult = await orchestrator.processPrompt(prompt);

// Then process as module
const masterAgent = getMasterAgent();
const moduleResult = await masterAgent.processTask(prompt, {
  priority: orchestrationResult.should_use_mcp ? 'high' : 'medium',
});
```

### With MCP Registry

The master agent automatically:
1. Checks MCP registry for available tools
2. Searches for tools matching task keywords
3. Recommends MCP tools when applicable
4. Includes MCP tools in module dependencies

## Configuration

Default configuration matches v1.1 specification. Customize as needed:

```typescript
import { initializeMasterAgent } from './services/master-agent';

const agent = initializeMasterAgent({
  // Override defaults as needed
});
```

## Next Steps

1. **Integrate dashboard**: Connect to your Kanban board UI
2. **Set up payments**: Configure PayPal and Strike integrations
3. **Review modules**: Check `/Resources/module_logs/modules.jsonl`
4. **Monitor analytics**: Review `/Resources/module_logs/analytics.json`
5. **Link workflows**: Connect related modules for better tracking

## Voice & Tone

- **Style**: Grounded, imaginative, human-centered
- **Mood**: Playful but practical, encourages experimentation
- **Philosophy**: Combine multiple systems to create new possibilities

## Output Formats

- **Primary**: Markdown for content, JSON for logs and metadata
- **Fallback**: Plaintext
- **Structured Fields**: title, summary, keywords, content_outline, recommended_links
