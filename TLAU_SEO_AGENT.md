# TLAU SEO Agent

Intelligent SEO system for THE LOST + UNFOUNDS — designed for creative builders and independent thinkers.

## Overview

The TLAU SEO Agent is a comprehensive SEO tool that generates keyword clusters, analyzes content, creates content outlines, and builds SEO strategies aligned with TLAU's creative agency identity and audience.

## Features

### 1. Keyword Cluster Generator
Generate semantic keyword clusters around primary keywords. Discovers related keywords, semantic variations, and content opportunities.

**Use Cases:**
- Research keywords for new content
- Discover content opportunities
- Understand keyword relationships
- Plan content around topic clusters

### 2. Content SEO Analysis
Analyze existing content for SEO performance. Get actionable recommendations to improve search visibility.

**Metrics Analyzed:**
- Title and meta description optimization
- Heading structure
- Keyword density
- Internal/external linking
- Image optimization
- Readability scores
- Mobile-friendliness

### 3. Content Outline Generator
Generate SEO-optimized content outlines with structured sections, keyword targeting, and internal linking recommendations.

**Output Includes:**
- Title and summary
- Structured sections with word counts
- Keyword targeting per section
- Recommended internal/external links
- Complete metadata (title, description, keywords)

### 4. Topic Clusters Generator
Build comprehensive topic clusters with pillar content and supporting articles. Perfect for content strategy planning.

**Features:**
- Identifies pillar content opportunities
- Maps supporting content
- Suggests internal linking strategies
- Groups related keywords

### 5. SEO Strategy Generator
Generate comprehensive SEO strategies with:
- Focus keyword mapping
- Topic clusters
- 3-month content calendar
- Internal linking map

### 6. AI Content Generator
Generate SEO-optimized content in TLAU's creative voice. Includes:
- Full markdown content
- SEO score analysis
- Content outline
- Metadata
- Actionable recommendations

## Usage

### Access the SEO Dashboard

Navigate to `/seo` in your application to access the SEO Agent dashboard.

### Example: Generate Keyword Cluster

```typescript
import { seoAgent } from './services/seo';

const cluster = await seoAgent.generateKeywordCluster('ai art tools', 'ai');
console.log(cluster.primaryKeyword);
console.log(cluster.relatedKeywords);
console.log(cluster.contentOpportunities);
```

### Example: Analyze Content

```typescript
const analysis = await seoAgent.analyzeContent(
  markdownContent,
  'https://example.com/page',
  ['keyword1', 'keyword2']
);

console.log(`SEO Score: ${analysis.score}/100`);
console.log(analysis.recommendations);
```

### Example: Generate Content Outline

```typescript
const outline = await seoAgent.generateContentOutline(
  'Building AI Tools',
  ['ai tools', 'creative coding', 'indie maker'],
  'guide'
);

console.log(outline.title);
console.log(outline.sections);
```

## Architecture

### Core Components

- **`src/types/seo.ts`** - TypeScript types and interfaces
- **`src/services/seo.ts`** - Core SEO agent service (TLAUSEOAgent class)
- **`src/servers/seo/index.ts`** - Server-side SEO tools for MCP integration
- **`src/pages/SEODashboard.tsx`** - Main dashboard UI
- **`src/components/seo/`** - Individual component views

### Service Methods

The `TLAUSEOAgent` class provides:

- `generateKeywordCluster()` - Create keyword clusters
- `analyzeContent()` - Analyze content SEO performance
- `scoreContent()` - Score content quality
- `generateContentOutline()` - Create content outlines
- `generateTopicClusters()` - Build topic clusters
- `generateSEOStrategy()` - Generate comprehensive strategies

## TLAU Identity Integration

The SEO Agent is designed with TLAU's identity in mind:

### Focus Areas
- AI
- Web Development
- Creativity
- Bitcoin
- DIY Tech
- Systems Thinking

### Target Audience
- Creative artists
- Gamers
- Solopreneurs
- Freelancers
- Handymen
- Wage workers
- Service-based professionals
- Side hustlers
- Entrepreneurs

### Voice & Tone
- Grounded, imaginative, and human
- Optimistic, insightful, creative
- Avoids corporate jargon
- Embraces curiosity and craft
- Written for builders, not algorithms

## Philosophy

Inspired by Gunpei Yokoi's principle of "lateral thinking with withered technology" — using proven SEO techniques but bending them toward new creative purposes.

## Integration

The SEO Agent integrates with:
- MCP Registry (for server-side tools)
- React Router (for navigation)
- TypeScript (for type safety)
- Tailwind CSS (for styling)

## Future Enhancements

Potential integrations:
- ChatGPT API (for enhanced content generation)
- Perplexity API (for keyword research)
- Zapier/Make (for automation workflows)
- SERP analysis APIs
- Backlink analysis tools

## License

MIT
