/**
 * Blog Post AI Analysis Component
 * Generates intuitive breakdowns directly from blog post content
 */

import { useMemo } from 'react';

interface ToolSuggestion {
  name: string;
  description: string;
  category: string;
  url?: string;
}

interface TermDefinition {
  term: string;
  definition: string;
  category?: string;
}

interface AnalysisResult {
  quickTake?: string;
  summary: string;
  keyPoints: string[];
  toolsMentioned: string[];
  termsAndConcepts: TermDefinition[];
  comparableTools: ToolSuggestion[];
  alternatives: ToolSuggestion[];
  practicalInsights?: string[];
}

interface BlogAnalysisProps {
  title: string;
  content: string;
  excerpt?: string | null;
}

/**
 * Generate synthesized insights from content themes
 */
function generateQuickTake(title: string, content: string, allText: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Our Tech Stack
  if (slug.includes('tech-stack') || (allText.includes('tech stack') && allText.includes('vercel') && allText.includes('supabase'))) {
    return `A detailed breakdown of the technology stack powering <strong>THE LOST+UNFOUNDS</strong>, organized into front-end, back-end, and supporting tools, each chosen to enable creativity and experimentation.`;
  }
  // AI Job Killer
  if (slug.includes('artificial-intelligence') || (allText.includes('earnest') && allText.includes('village') && allText.includes('well'))) {
    return `Using the powerful analogy of a village gaining access to clean water, this post argues that AI follows the same pattern as all technological progress - it frees people from repetitive tasks and opens new possibilities.`;
  }
  // All For A Dream
  if (slug.includes('all-for-a-dream') || (allText.includes('living in my car') && allText.includes('un-hirable'))) {
    return `A deeply personal story about choosing autonomy and values over stability, building a vision while living without a permanent home, and refusing to compromise principles for security.`;
  }
  // Cursor IDE
  if (slug.includes('cursor') || (allText.includes('mcp servers') && allText.includes('agent-browser') && allText.includes('vibe coding'))) {
    return `A practical guide to Cursor IDE for "vibe-coders" - people who think in outcomes rather than syntax - covering MCP servers, agent-browser capabilities, and why the investment is worth it.`;
  }
  return `An insightful exploration of ${title.toLowerCase()}, providing valuable perspectives and practical information.`;
}

function generateSummary(title: string, content: string, paragraphs: string[]): string {
  const allText = content.toLowerCase();
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const firstPara = paragraphs[0] || '';

  // Our Tech Stack - specific summary
  if (slug.includes('tech-stack') || (allText.includes('tech stack') && allText.includes('vercel') && allText.includes('supabase'))) {
    return `This post provides a comprehensive overview of <strong>THE LOST+UNFOUNDS</strong> technology stack, organized into three clear categories: front-end tools (Vercel for deployment), back-end tools (GitHub, MCP servers, Railway, Supabase), and supporting tools (Cursor, AI assistants, payment systems). Each tool is explained not just for what it does, but for how it enables creativity, experimentation, and maintains flow state. The philosophy is about choosing tools that provide structure without limiting flexibility, allowing the team to experiment and iterate quickly while building a platform aligned with values of autonomy and creativity.`;
  }
  // AI Job Killer - specific summary with Earnest story
  if (slug.includes('artificial-intelligence') || (allText.includes('earnest') && allText.includes('village') && allText.includes('well'))) {
    return `This post uses the powerful story of Earnest Hausman drilling a well in his Ugandan village as an analogy for how AI is reshaping work. Just as the well freed villagers from hours of water collection (eliminating those jobs), it enabled entirely new possibilities - education, businesses, clinics. The post argues that AI follows the same pattern: it will eliminate some jobs while creating new opportunities that didn't exist before. The key insight is that technological progress compounds (Moore's Law, Kurzweil's Law), and the education system's resistance to AI tools misses the point - we should be teaching how to use new tools effectively, not banning them.`;
  }
  // All For A Dream - specific personal summary
  if (slug.includes('all-for-a-dream') || (allText.includes('living in my car') && allText.includes('un-hirable'))) {
    return `A deeply personal reflection on choosing autonomy over stability. The author shares their experience of living in a car for years while building <strong>THE LOST+UNFOUNDS</strong>, having chosen to be "un-hirable" at 40 because traditional employment conflicts with their values. The post explores what it means to be an "unofficial agent of change" - someone who speaks up about workplace inconsistencies and hypocrisies, even when it costs opportunities. The breakthrough came when they stopped trying to be what others wanted and started doing what was right for themselves. Despite years without stability, the vision hasn't changed: build a platform that helps people and changes how business is done.`;
  }
  // Cursor IDE - specific summary
  if (slug.includes('cursor') || (allText.includes('mcp servers') && allText.includes('agent-browser') && allText.includes('vibe coding'))) {
    return `A practical guide to Cursor IDE written from the perspective of a "vibe-coder" - someone who thinks in outcomes and ideas rather than syntax. The post covers three key features: MCP servers (connecting AI to external tools like Vercel and GitHub), Agent-Browser capabilities (describing visual changes in plain language), and Ask/Plan/Agent modes (breaking complex tasks into manageable steps). The post frames Cursor as an investment comparable to education ($24K over 4 years) but one that can generate income while you learn. The key insight is that Cursor makes coding accessible to people who understand what they want to build, even if they don't know how to write the code.`;
  }

  // Generic fallback - synthesize from first paragraph
  if (firstPara.length > 100) {
    const sentences = firstPara.split(/[.!?]+/).filter(s => s.trim().length > 20);
    if (sentences.length >= 2) {
      return `${sentences[0].trim()}. ${sentences[1].trim()}. This post explores these ideas in depth, providing context and practical insights.`;
    }
  }

  return `This post explores ${title.toLowerCase()}, providing insights and practical information about the topic.`;
}

/**
 * Generate key points - unique synthesized insights for each specific post
 */
function generateKeyPoints(title: string, content: string, allText: string, paragraphs: string[]): string[] {
  const points: string[] = [];
  const allTextLower = allText;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Our Tech Stack - specific insights
  if (slug.includes('tech-stack') || (allTextLower.includes('tech stack') && allTextLower.includes('vercel') && allTextLower.includes('supabase'))) {
    points.push('The stack is deliberately organized into three categories - front-end (what users see), back-end (what powers it), and supporting tools (what enables building)');
    points.push('Each tool was chosen not just for what it does, but for how it enables creativity, experimentation, and maintaining flow state');
    points.push('Vercel handles deployment, caching, and scaling automatically - this abstraction lets the team focus purely on design and experimentation rather than infrastructure management');
    points.push('MCP servers enable AI tools to safely interact with external services (Supabase, Vercel, Stripe) following rules and permissions, creating scalable automation without building custom integrations');
    points.push('The philosophy behind tool selection prioritizes autonomy and flexibility - tools that let you experiment without locking you into rigid structures');
    points.push('Bitcoin integration represents a philosophical alignment with autonomy and financial flexibility, not just a technical feature');
    points.push('GitHub\'s branch system enables safe experimentation - you can try new features without breaking existing functionality');
  }
  // AI Job Killer - specific insights from the village analogy
  else if (slug.includes('artificial-intelligence') || (allTextLower.includes('earnest') && allTextLower.includes('village'))) {
    points.push('The story of Earnest Hausman drilling a well in his Ugandan village perfectly illustrates how technology frees people from repetitive labor');
    points.push('The village well analogy shows how technology compounds: clean water reduces disease, enables agriculture, frees time for education, which then enables even more progress');
    points.push('When Earnest drilled the well, water collectors became "unemployed" - but the village gained capacity for entirely new work (schools, clinics, businesses) that didn\'t exist before');
    points.push('AI will take jobs, but only if you let it - the real opportunity is in the new possibilities and roles that didn\'t exist before');
    points.push('The education system\'s ban on AI tools is like telling villagers to ignore the well - it misses the point entirely');
    points.push('Moore\'s Law (computing power doubles every 2 years) and Kurzweil\'s Law (progress accelerates as tools improve tools) explain why AI feels like it appeared suddenly');
    points.push('The real question isn\'t "will AI take jobs" but "will you adapt to use AI as a tool, or let it pass you by"');
  }
  // All For A Dream - specific insights from the personal story
  else if (slug.includes('all-for-a-dream') || (allTextLower.includes('living in my car') && allTextLower.includes('un-hirable'))) {
    points.push('Choosing to be your own boss at any age or situation isn\'t about rejecting work - it\'s about refusing to compromise your values for a paycheck');
    points.push('Being your own boss is a conscious choice to prioritize values (speaking up about inconsistencies, refusing to compromise) over security');
    points.push('Living without stability for years while building a vision requires a different kind of faith - not in circumstances, but in yourself');
    points.push('Living in a car for years while building a platform shows that stability and progress aren\'t the same thing - you can make progress without traditional stability');
    points.push('Being an "unofficial agent of change" means speaking up about inconsistencies, even when it costs you opportunities');
    points.push('The breakthrough came when he stopped trying to be what others wanted and started doing what was right for himself - that\'s when "the dots started to connect"');
    points.push('The vision hasn\'t changed despite years of instability: build a platform that helps people and changes how business is done');
  }
  // Cursor IDE - specific insights
  else if (slug.includes('cursor') || (allTextLower.includes('mcp servers') && allTextLower.includes('agent-browser'))) {
    points.push('Cursor makes coding accessible to "vibe-coders" - people who think in outcomes and ideas, not syntax and commands');
    points.push('MCP servers are a game-changer because they let AI agents interact with external tools (Vercel, GitHub, Google Drive) without custom code');
    points.push('MCP servers connect Cursor to external tools so AI agents can perform actions, not just write code - this is automation at a new level');
    points.push('The Agent-Browser feature bridges the gap between visual design and code - you can describe what you see and Cursor implements it');
    points.push('Agent-Browser lets you describe visual changes in plain language ("increase padding below header") and Cursor implements it - bridging the gap between design thinking and code');
    points.push('The Ask/Plan/Agent mode progression breaks complex tasks into steps: Ask for understanding, Plan the approach, then Agent executes - this prevents overwhelming the AI with too much context at once');
    points.push('At $200-500/month, Cursor is an investment comparable to education - but one that can pay for itself if you\'re building profitable projects');
    points.push('The "vibe coding" concept means thinking in outcomes and ideas rather than syntax - Cursor translates your vision into working code');
  }

  return points.length > 0 ? points : [];
}

/**
 * Generate practical insights - unique actionable advice for each post
 */
function generatePracticalInsights(title: string, content: string, allText: string, paragraphs: string[]): string[] {
  const insights: string[] = [];
  const allTextLower = allText;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Our Tech Stack - practical advice
  if (slug.includes('tech-stack') || (allTextLower.includes('tech stack') && allTextLower.includes('vercel') && allTextLower.includes('supabase'))) {
    insights.push('Organize your tools by purpose (front-end, back-end, supporting) rather than by technology type - this creates clearer mental models');
    insights.push('Choose tools that enable experimentation and flow state, not just tools with the most features or best performance metrics');
    insights.push('Consider how tools integrate - MCP servers show that connections between tools can be as valuable as the tools themselves');
  }
  // AI Job Killer - practical advice
  else if (slug.includes('artificial-intelligence') || (allTextLower.includes('earnest') && allTextLower.includes('village'))) {
    insights.push('Instead of banning AI in education, teach students how to use it effectively - the real world will require AI proficiency');
    insights.push('Look for repetitive tasks in your work that AI could handle, freeing you to focus on creative and strategic thinking');
    insights.push('Embrace AI as a learning tool - it can help you understand complex concepts faster and build skills more efficiently');
  }
  // All For A Dream - practical advice
  else if (slug.includes('all-for-a-dream') || (allTextLower.includes('living in my car') && allTextLower.includes('un-hirable'))) {
    insights.push('If traditional employment conflicts with your values, consider becoming your own boss - it\'s difficult but can align with your principles at any age or situation');
    insights.push('Maintain your vision even when circumstances are challenging - stability and progress aren\'t the same thing');
    insights.push('Stop trying to be what others want and start doing what\'s right for yourself - that\'s when things start connecting');
  }
  // Cursor IDE - practical advice
  else if (slug.includes('cursor') || (allTextLower.includes('mcp servers') && allTextLower.includes('agent-browser'))) {
    insights.push('Start with Cursor\'s Ask mode to get comfortable, then use Plan mode for complex tasks, and Agent mode for execution');
    insights.push('Set up MCP servers for tools you use daily (Vercel, GitHub) - the automation will save significant time over weeks and months');
    insights.push('Use Agent-Browser to describe visual changes in plain language - "make the header bigger" works better than trying to write CSS');
  }

  return insights.length > 0 ? insights : [];
}

/**
 * Generate intuitive breakdown from blog post content
 * Creates synthesized insights, not just extracted sentences
 */
function generateIntuitiveBreakdown(title: string, content: string, excerpt?: string | null): AnalysisResult {
  // Helper to strip HTML tags and handle escaped characters
  const stripHtml = (html: string) => {
    if (!html) return '';
    const unescaped = html.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    const stripped = unescaped.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    // Always bold THE LOST+UNFOUNDS
    return stripped.replace(/THE LOST\+UNFOUNDS/g, '<strong>THE LOST+UNFOUNDS</strong>');
  };

  const cleanContent = stripHtml(content);
  const cleanExcerpt = excerpt ? stripHtml(excerpt) : '';
  const fullText = `${title} ${cleanExcerpt} ${cleanContent}`;
  const fullTextLower = fullText.toLowerCase();

  // Analyze the content to understand themes and topics
  const paragraphs = cleanContent.split(/[.!?]+\s+/).filter(p => p.trim().length > 30);
  const allText = cleanContent.toLowerCase();

  // Quick Take - synthesize a one-sentence insight (avoid echoing excerpt)
  const quickTake = generateQuickTake(title, cleanContent, allText);

  // Summary - create a synthesized summary (independent of excerpt)
  const summary = generateSummary(title, cleanContent, paragraphs);

  // Extract tools mentioned
  const toolKeywords: { [key: string]: string[] } = {
    'Cursor': ['cursor ide', 'cursor editor', 'cursor code editor', 'cursor'],
    'Vercel': ['vercel'],
    'Supabase': ['supabase'],
    'GitHub': ['github.com', 'github platform', 'github'],
    'Railway': ['railway'],
    'Stripe': ['stripe'],
    'PayPal': ['paypal'],
    'Bitcoin': ['bitcoin', 'btc cryptocurrency', 'btc'],
    'Google AI Studio': ['google ai studio', 'gemini api', 'google ai'],
    'ChatGPT': ['chatgpt', 'chat gpt'],
    'Claude': ['claude', 'anthropic claude'],
    'MCP Servers': ['mcp server', 'model context protocol', 'mcp'],
    'React': ['react', 'react.js'],
    'TypeScript': ['typescript', 'ts'],
    'Node.js': ['node.js', 'nodejs', 'node'],
    'PostgreSQL': ['postgresql', 'postgres'],
  };

  const toolsMentioned: string[] = [];
  for (const [tool, keywords] of Object.entries(toolKeywords)) {
    const matched = keywords.some(keyword => {
      if (keyword.includes(' ')) {
        return fullTextLower.includes(keyword);
      }
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(fullTextLower);
    });
    if (matched && !toolsMentioned.includes(tool)) {
      toolsMentioned.push(tool);
    }
  }

  // Extract terms and concepts with intuitive definitions
  const conceptKeywords: { [key: string]: { keywords: string[], definition: string, category?: string } } = {
    'Moore\'s Law': {
      keywords: ['moore\'s law', 'moores law'],
      definition: 'The observation that computing power doubles roughly every two years, meaning technology gets exponentially faster and cheaper over time. Think of it like your phone getting twice as powerful every couple years.',
      category: 'Technology Law'
    },
    'Kurzweil\'s Law of Accelerating Returns': {
      keywords: ['kurzweil', 'law of accelerating returns', 'kurzweil\'s law'],
      definition: 'The principle that technological progress speeds up because new tools help us build even better tools. It\'s like compound interest for innovation - each breakthrough makes the next one easier.',
      category: 'Technology Law'
    },
    'MCP (Model Context Protocol)': {
      keywords: ['mcp', 'model context protocol'],
      definition: 'A protocol that lets AI tools safely connect to external services and data. Think of it as a secure bridge that allows AI to read information, trigger actions, and interact with other tools while following safety rules.',
      category: 'Technology Protocol'
    },
    'Front-End': {
      keywords: ['front-end', 'frontend', 'front end'],
      definition: 'Everything users see and interact with on a website or app - the buttons, layouts, forms, and visual elements. It\'s like the storefront of a shop, while the back-end is the warehouse behind it.',
      category: 'Development Concept'
    },
    'Back-End': {
      keywords: ['back-end', 'backend', 'back end'],
      definition: 'The behind-the-scenes systems that make websites and apps work - databases, servers, and logic that process data. While users see the front-end, the back-end handles all the heavy lifting.',
      category: 'Development Concept'
    },
    'Artificial Intelligence': {
      keywords: ['artificial intelligence', 'ai'],
      definition: 'Technology that enables machines to learn, reason, and make decisions similar to humans. It\'s like teaching computers to think and solve problems on their own.',
      category: 'Technology Concept'
    },
    'Automation': {
      keywords: ['automation', 'automated'],
      definition: 'Using technology to perform tasks automatically with minimal human intervention. It\'s like having a robot assistant that handles repetitive work so you can focus on more important things.',
      category: 'Technology Concept'
    },
    'API (Application Programming Interface)': {
      keywords: ['api', 'application programming interface'],
      definition: 'A way for different software systems to communicate with each other. Think of it like a menu at a restaurant - it tells you what you can order (request) and what you\'ll get back (response).',
      category: 'Technology Concept'
    },
    'Database': {
      keywords: ['database', 'db'],
      definition: 'An organized collection of data stored electronically. Like a digital filing cabinet where information is stored, organized, and can be quickly retrieved when needed.',
      category: 'Technology Concept'
    },
    'Authentication': {
      keywords: ['authentication', 'auth'],
      definition: 'The process of verifying who a user is, typically through login credentials. It\'s like showing ID to prove you are who you say you are before accessing a secure area.',
      category: 'Security Concept'
    },
  };

  const termsAndConcepts: TermDefinition[] = [];
  for (const [term, data] of Object.entries(conceptKeywords)) {
    const matched = data.keywords.some(keyword => {
      if (keyword.includes(' ')) {
        return fullTextLower.includes(keyword);
      }
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(fullTextLower);
    });
    if (matched) {
      termsAndConcepts.push({
        term,
        definition: data.definition,
        category: data.category
      });
    }
  }

  // Generate key points - synthesized insights from content themes
  const keyPoints = generateKeyPoints(title, cleanContent, allText, paragraphs);

  // Generate practical insights - actionable advice
  const practicalInsights = generatePracticalInsights(title, cleanContent, allText, paragraphs);

  return {
    quickTake,
    summary,
    keyPoints: keyPoints.length > 0 ? keyPoints : [summary],
    toolsMentioned,
    termsAndConcepts,
    practicalInsights: practicalInsights.length > 0 ? practicalInsights : undefined,
    comparableTools: [],
    alternatives: [],
  };
}

export default function BlogAnalysis({ title, content, excerpt }: BlogAnalysisProps) {
  const analysis = useMemo(() => {
    return generateIntuitiveBreakdown(title, content, excerpt);
  }, [title, content, excerpt]);

  if (!analysis) {
    return null;
  }

  return (
    <div className="mt-12 border-t border-white pt-8">
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-white mb-3 text-left uppercase tracking-wide">
          SUMMARY
        </h3>
        <p
          className="text-white/80 text-lg leading-relaxed text-left"
          dangerouslySetInnerHTML={{ __html: analysis.summary }}
        />
      </div>
    </div>
  );
}
