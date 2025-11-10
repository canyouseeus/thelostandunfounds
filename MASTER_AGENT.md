# TLAU Master Agent

Master sub-agent for THE LOST + UNFOUNDS (TLAU). Handles SEO, content, image/media processing, merchandising, automation, and MCP server integration. Logs all tasks for CEO review.

## Overview

The TLAU Master Agent is a specialized agent that processes tasks across multiple domains:
- **SEO & Content**: Keyword clusters, meta tags, content outlines, blog ideas
- **Image & Media**: EXIF extraction, GPS removal, SEO optimization
- **Merchandising**: Product recommendations, SEO strategies, cross-linking
- **Automation**: Workflow design, recurring patterns, CEO logging

## Identity & Philosophy

### Organization
- **Name**: THE LOST + UNFOUNDS (TLAU)
- **Type**: Creative agency
- **Focus**: AI, web development, digital creativity, Bitcoin, DIY tech, systems thinking

### Audience
**Primary**: Creative artists, gamers, solopreneurs, freelancers, handymen, wage workers, service-based professionals, side hustlers, entrepreneurs

**Shared Traits**: Independent, curious, tech-inclined, values self-reliance, learns by doing, interested in AI, design, and new systems of work

### Voice & Tone
- **Style**: Grounded, imaginative, human-centered
- **Mood**: Playful but practical, encourages experimentation
- **Philosophy**: Combine multiple systems to create new possibilities

### Core Principles
1. Use system integration and multi-tool creativity
2. Follow Gunpei Yokoi's lateral thinking with withered technology
3. Optimize for automation, repeatability, scalability, SEO impact
4. Always log, track, and make outputs reviewable by CEO agent

## Features

### Task Categorization
Automatically categorizes tasks into:
- **SEO**: Meta tags, keywords, structured data
- **Content**: Blog posts, articles, outlines
- **Image**: EXIF extraction, GPS removal, SEO optimization
- **Merchandising**: Product recommendations, SEO strategies
- **Automation**: Workflow design, recurring patterns
- **Mixed**: Tasks spanning multiple categories

### MCP Integration
- Checks MCP registry for available tools
- Recommends MCP servers when applicable
- Integrates with existing MCP infrastructure

### CEO Logging
All tasks are logged in JSON format to `/Resources/task_logs/master_agent_tasks.jsonl` with:
- Timestamp
- Original prompt
- Task category
- Tools used
- Execution plan
- Notes and metadata
- Recommendations

## Usage

### Basic Usage

```typescript
import { getMasterAgent } from './services/master-agent';

const agent = getMasterAgent();

const result = await agent.processTask(
  "Generate SEO meta tags for a blog post about AI tools",
  { user_id: 'user123' }
);

console.log('Category:', result.analysis.category);
console.log('Plan:', result.execution.plan);
console.log('Output:', result.execution.output);
console.log('Recommendations:', result.recommendations);
```

### SEO Task Example

```typescript
const result = await agent.processTask(
  "Create keyword clusters and meta tags for Bitcoin hub page"
);

// Returns:
// - Keyword clusters for creativity, AI, tech, Bitcoin, merch
// - Meta title and description suggestions
// - H1/H2 tag recommendations
// - JSON-LD structured data
// - Content architecture mapping
```

### Image Processing Example

```typescript
const result = await agent.processTask(
  "Process Fujifilm X-S20 photos from Google Drive, optimize for SEO"
);

// Returns:
// - EXIF extraction workflow (camera, lens, ISO, copyright)
// - GPS removal instructions
// - SEO-friendly filename generation
// - Alt text and caption suggestions
// - JSON-LD for images
// - Upload/move instructions
```

### Content Creation Example

```typescript
const result = await agent.processTask(
  "Create blog post outline about DIY tech for solopreneurs"
);

// Returns:
// - Content outline following TLAU voice
// - Keyword clusters
// - Internal linking opportunities
// - Content architecture mapping
```

### Merchandising Example

```typescript
const result = await agent.processTask(
  "Recommend seasonal products and SEO strategy for shop"
);

// Returns:
// - Product recommendations (fanny packs, hoodies, t-shirts, etc.)
// - Product naming suggestions
// - SEO strategy
// - Cross-linking opportunities
```

## Task Categories

### SEO Tasks
**Keywords**: seo, meta, keyword, title, description, h1, h2, alt text, schema, json-ld

**Outputs**:
- Keyword clusters
- Meta titles and descriptions
- H1/H2 suggestions
- JSON-LD structured data
- Content architecture mapping

### Content Tasks
**Keywords**: blog, article, post, content, write, draft, outline, copy

**Outputs**:
- Content outlines
- Keyword clusters
- Voice and tone guidelines
- Internal linking suggestions

### Image/Media Tasks
**Keywords**: image, photo, picture, exif, gps, metadata, camera, lens, iso, alt text, caption

**Outputs**:
- EXIF extraction workflow
- GPS removal instructions
- SEO-friendly filenames
- Alt text and captions
- JSON-LD for images

### Merchandising Tasks
**Keywords**: merch, product, shop, t-shirt, hoodie, fanny pack, accessory, seasonal, inventory

**Outputs**:
- Product recommendations
- Product naming
- SEO strategies
- Cross-linking plans

### Automation Tasks
**Keywords**: automate, schedule, recurring, workflow, pipeline, batch

**Outputs**:
- Automation plans
- Workflow designs
- Recurring pattern identification
- CEO logging setup

## Content Architecture

The agent maps content to TLAU's architecture:
- **Home**: Landing page
- **About**: Company information
- **Tools**: Tool directory
- **Blog**: Articles and posts
- **Shop**: Merchandise and products
- **Community**: Community features
- **AI Tutorials**: AI-focused content
- **Bitcoin Hub**: Bitcoin-related content
- **Merch/Product Pages**: Product listings
- **Web Dev/DIY Hub**: Technical tutorials

## Logging Format

All tasks are logged in JSON Lines format:

```json
{
  "timestamp": "2024-11-10T20:00:00.000Z",
  "prompt_text": "Process images from Google Drive",
  "task_category": "image",
  "tools_used": ["google_drive_mcp", "image_processor"],
  "execution_plan": "1. Extract EXIF...",
  "notes": "Image processing workflow",
  "agent_id": "TLAU_Master_Agent",
  "metadata": {
    "confidence": 0.95,
    "keywords": ["image", "exif", "gps"],
    "recommendations": ["Create blog post", "Add internal links"]
  }
}
```

## Integration

### With Orchestrator Agent

```typescript
import { getOrchestratorAgent } from './services/orchestrator-agent';
import { getMasterAgent } from './services/master-agent';

// First route through orchestrator
const orchestrator = getOrchestratorAgent();
const orchestrationResult = await orchestrator.processPrompt(prompt);

// Then process through master agent
const masterAgent = getMasterAgent();
const masterResult = await masterAgent.processTask(prompt);
```

### With MCP Registry

The master agent automatically:
1. Checks MCP registry for available tools
2. Searches for tools matching task keywords
3. Recommends MCP tools when applicable
4. Includes MCP tools in execution plan

## Configuration

Default configuration matches the specification. Customize as needed:

```typescript
import { initializeMasterAgent } from './services/master-agent';

const agent = initializeMasterAgent({
  // Override defaults as needed
});
```

## Example Workflow

**Task**: "Process new Fujifilm X-S20 photos from Google Drive, optimize for SEO, log for CEO review"

**Steps**:
1. Detect new photo in Drive
2. Extract EXIF metadata (camera, lens, ISO, copyright)
3. Remove GPS/location data
4. Generate SEO data: filename, alt text, caption, JSON-LD
5. Upload or move to repository/website
6. Log metadata and execution plan in JSON for CEO review
7. Recommend optional enhancements: blog posts, internal links, social media sharing

## Files

- `src/services/master-agent.ts` - Main implementation
- `src/services/master-agent.example.ts` - Usage examples
- `Resources/task_logs/master_agent_tasks.jsonl` - Task logs (JSON Lines format)

## Output Formats

- **Primary**: Markdown for content, JSON for logs and metadata
- **Fallback**: Plaintext
- **Structured Fields**: title, summary, keywords, content_outline, recommended_links

## Next Steps

1. **Integrate into workflow**: Hook master agent into your task processing pipeline
2. **Customize keywords**: Adjust keyword detection for your specific needs
3. **Enhance handlers**: Add more sophisticated logic to each task handler
4. **Review logs**: Regularly check `/Resources/task_logs/master_agent_tasks.jsonl` for CEO review
