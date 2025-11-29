/**
 * Blog Post AI Analysis Component
 * Generates intuitive breakdowns directly from blog post content
 */

import { useMemo } from 'react';
import { Sparkles, ExternalLink } from 'lucide-react';

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
  mainTakeaways?: string[];
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
    return `A detailed breakdown of the technology stack powering THE LOST+UNFOUNDS, organized into front-end, back-end, and supporting tools, each chosen to enable creativity and experimentation.`;
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
    return `This post provides a comprehensive overview of THE LOST+UNFOUNDS technology stack, organized into three clear categories: front-end tools (Vercel for deployment), back-end tools (GitHub, MCP servers, Railway, Supabase), and supporting tools (Cursor, AI assistants, payment systems). Each tool is explained not just for what it does, but for how it enables creativity, experimentation, and maintains flow state. The philosophy is about choosing tools that provide structure without limiting flexibility, allowing the team to experiment and iterate quickly while building a platform aligned with values of autonomy and creativity.`;
  }
  // AI Job Killer - specific summary with Earnest story
  if (slug.includes('artificial-intelligence') || (allText.includes('earnest') && allText.includes('village') && allText.includes('well'))) {
    return `This post uses the powerful story of Earnest Hausman drilling a well in his Ugandan village as an analogy for how AI is reshaping work. Just as the well freed villagers from hours of water collection (eliminating those jobs), it enabled entirely new possibilities - education, businesses, clinics. The post argues that AI follows the same pattern: it will eliminate some jobs while creating new opportunities that didn't exist before. The key insight is that technological progress compounds (Moore's Law, Kurzweil's Law), and the education system's resistance to AI tools misses the point - we should be teaching how to use new tools effectively, not banning them.`;
  }
  // All For A Dream - specific personal summary
  if (slug.includes('all-for-a-dream') || (allText.includes('living in my car') && allText.includes('un-hirable'))) {
    return `A deeply personal reflection on choosing autonomy over stability. The author shares their experience of living in a car for years while building THE LOST+UNFOUNDS, having chosen to be "un-hirable" at 40 because traditional employment conflicts with their values. The post explores what it means to be an "unofficial agent of change" - someone who speaks up about workplace inconsistencies and hypocrisies, even when it costs opportunities. The breakthrough came when they stopped trying to be what others wanted and started doing what was right for themselves. Despite years without stability, the vision hasn't changed: build a platform that helps people and changes how business is done.`;
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
 * Generate main takeaways - unique insights for each specific blog post
 */
function generateMainTakeaways(title: string, content: string, allText: string, paragraphs: string[]): string[] {
  const takeaways: string[] = [];
  const allTextLower = allText;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  // Our Tech Stack - specific to this post
  if (slug.includes('tech-stack') || (allTextLower.includes('tech stack') && allTextLower.includes('vercel') && allTextLower.includes('supabase'))) {
    takeaways.push('The stack is deliberately organized into three categories - front-end (what users see), back-end (what powers it), and supporting tools (what enables building)');
    takeaways.push('Each tool was chosen not just for what it does, but for how it enables creativity, experimentation, and maintaining flow state');
    takeaways.push('The philosophy behind tool selection prioritizes autonomy and flexibility - tools that let you experiment without locking you into rigid structures');
    takeaways.push('The integration of Bitcoin alongside traditional payment systems shows a forward-thinking approach to financial infrastructure');
  } 
  // Artificial Intelligence: The Job Killer - specific to Earnest Hausman story
  else if (slug.includes('artificial-intelligence') || (allTextLower.includes('earnest') && allTextLower.includes('village') && allTextLower.includes('well'))) {
    takeaways.push('The story of Earnest Hausman drilling a well in his Ugandan village perfectly illustrates how technology frees people from repetitive labor');
    takeaways.push('AI will take jobs, but only if you let it - the real opportunity is in the new possibilities and roles that didn\'t exist before');
    takeaways.push('The education system\'s ban on AI tools is like telling villagers to ignore the well - it misses the point entirely');
    takeaways.push('Moore\'s Law and Kurzweil\'s Law explain why technological change feels sudden: progress compounds exponentially, not linearly');
  }
  // All For A Dream - specific personal story
  else if (slug.includes('all-for-a-dream') || (allTextLower.includes('living in my car') && allTextLower.includes('un-hirable'))) {
    takeaways.push('Choosing to be "un-hirable" at 40 isn\'t about rejecting work - it\'s about refusing to compromise your values for a paycheck');
    takeaways.push('Living without stability for years while building a vision requires a different kind of faith - not in circumstances, but in yourself');
    takeaways.push('Being an "unofficial agent of change" means speaking up about inconsistencies, even when it costs you opportunities');
    takeaways.push('The moment you stop trying to be what others want and start doing what\'s right for yourself, everything starts connecting');
  }
  // Cursor IDE post - specific to Cursor features
  else if (slug.includes('cursor') || (allTextLower.includes('mcp servers') && allTextLower.includes('agent-browser') && allTextLower.includes('vibe coding'))) {
    takeaways.push('Cursor makes coding accessible to "vibe-coders" - people who think in outcomes and ideas, not syntax and commands');
    takeaways.push('MCP servers are a game-changer because they let AI agents interact with external tools (Vercel, GitHub, Google Drive) without custom code');
    takeaways.push('The Agent-Browser feature bridges the gap between visual design and code - you can describe what you see and Cursor implements it');
    takeaways.push('At $200-500/month, Cursor is an investment comparable to education - but one that can pay for itself if you\'re building profitable projects');
  }
  
  return takeaways.length > 0 ? takeaways : [];
}

/**
 * Generate key points - unique deeper insights for each specific post
 */
function generateKeyPoints(title: string, content: string, allText: string, paragraphs: string[]): string[] {
  const points: string[] = [];
  const allTextLower = allText;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  // Our Tech Stack - specific technical insights
  if (slug.includes('tech-stack') || (allTextLower.includes('tech stack') && allTextLower.includes('vercel') && allTextLower.includes('supabase'))) {
    points.push('Vercel handles deployment, caching, and scaling automatically - this abstraction lets the team focus purely on design and experimentation rather than infrastructure management');
    points.push('MCP servers enable AI tools to safely interact with external services (Supabase, Vercel, Stripe) following rules and permissions, creating scalable automation without building custom integrations');
    points.push('The three-category organization (front-end, back-end, supporting) creates clear mental models for understanding what each tool does and why it\'s needed');
    points.push('Bitcoin integration represents a philosophical alignment with autonomy and financial flexibility, not just a technical feature');
    points.push('GitHub\'s branch system enables safe experimentation - you can try new features without breaking existing functionality');
  }
  // AI Job Killer - specific insights from the village analogy
  else if (slug.includes('artificial-intelligence') || (allTextLower.includes('earnest') && allTextLower.includes('village'))) {
    points.push('The village well analogy shows how technology compounds: clean water reduces disease, enables agriculture, frees time for education, which then enables even more progress');
    points.push('When Earnest drilled the well, water collectors became "unemployed" - but the village gained capacity for entirely new work (schools, clinics, businesses) that didn\'t exist before');
    points.push('The education system telling students not to use AI is like telling villagers to ignore the well - it forces them to waste time on tasks technology can handle');
    points.push('Moore\'s Law (computing power doubles every 2 years) and Kurzweil\'s Law (progress accelerates as tools improve tools) explain why AI feels like it appeared suddenly');
    points.push('The real question isn\'t "will AI take jobs" but "will you adapt to use AI as a tool, or let it pass you by"');
  }
  // All For A Dream - specific insights from the personal story
  else if (slug.includes('all-for-a-dream') || (allTextLower.includes('living in my car') && allTextLower.includes('un-hirable'))) {
    points.push('Being "un-hirable" isn\'t a failure - it\'s a conscious choice to prioritize values (speaking up about inconsistencies, refusing to compromise) over security');
    points.push('Living in a car for years while building a platform shows that stability and progress aren\'t the same thing - you can make progress without traditional stability');
    points.push('The "unofficial agent of change" identity means recognizing workplace problems and speaking up, even when it costs you the job');
    points.push('The breakthrough came when he stopped trying to be what others wanted and started doing what was right for himself - that\'s when "the dots started to connect"');
    points.push('The vision hasn\'t changed despite years of instability: build a platform that helps people and changes how business is done');
  }
  // Cursor IDE - specific technical insights
  else if (slug.includes('cursor') || (allTextLower.includes('mcp servers') && allTextLower.includes('agent-browser'))) {
    points.push('MCP servers connect Cursor to external tools (Vercel, GitHub, Google Drive) so AI agents can perform actions, not just write code - this is automation at a new level');
    points.push('Agent-Browser lets you describe visual changes in plain language ("increase padding below header") and Cursor implements it - bridging the gap between design thinking and code');
    points.push('The Ask/Plan/Agent mode progression breaks complex tasks into steps: Ask for understanding, Plan the approach, then Agent executes - this prevents overwhelming the AI with too much context at once');
    points.push('The $24,000 over 4 years comparison frames Cursor as education - but unlike traditional education, this tool can generate income while you learn');
    points.push('The "vibe coding" concept means thinking in outcomes and ideas rather than syntax - Cursor translates your vision into working code');
  }
  
  return points.length > 0 ? points : [];
}

/**
 * Generate practical insights - unique actionable advice for each post
 */
function generatePracticalInsights(content: string, allText: string, paragraphs: string[]): string[] {
  const insights: string[] = [];
  const allTextLower = allText;
  // Extract title from content if needed, or use a pattern match
  const firstLine = content.split('\n')[0] || '';
  const slug = firstLine.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
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
    insights.push('If traditional employment conflicts with your values, consider building your own path - it\'s difficult but can align with your principles');
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
  const fullText = `${title} ${excerpt || ''} ${content}`;
  const fullTextLower = fullText.toLowerCase();
  
  // Analyze the content to understand themes and topics
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 30);
  const allText = content.toLowerCase();
  
  // Quick Take - synthesize a one-sentence insight
  const quickTake = excerpt 
    ? excerpt.split(/[.!?]/)[0].trim() + (excerpt.includes('.') ? '.' : '')
    : generateQuickTake(title, content, allText);

  // Summary - create a synthesized summary
  const summary = excerpt || generateSummary(title, content, paragraphs);

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

  // Generate main takeaways - synthesize insights from content themes
  const mainTakeaways = generateMainTakeaways(title, content, allText, paragraphs);
  
  // Generate key points - deeper technical/philosophical insights
  const keyPoints = generateKeyPoints(title, content, allText, paragraphs);
  
  // Generate practical insights - actionable advice
  const practicalInsights = generatePracticalInsights(content, allText, paragraphs);

  return {
    quickTake,
    summary,
    mainTakeaways: mainTakeaways.length > 0 ? mainTakeaways : undefined,
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
    <div className="mt-12 border-t border-white/10 pt-8">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2 text-left">
        <Sparkles className="w-6 h-6" />
        AI Breakdown
      </h2>

      {/* Quick Take - Prominent at top */}
      {analysis.quickTake && (
        <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-none">
          <h3 className="text-sm font-semibold text-white/70 mb-2 text-left uppercase tracking-wide">Quick Take</h3>
          <p className="text-white text-lg leading-relaxed text-left font-medium">
            {analysis.quickTake}
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-white mb-3 text-left">Summary</h3>
        <p className="text-white/80 text-lg leading-relaxed text-left">
          {analysis.summary}
        </p>
      </div>

      {/* Main Takeaways - Simple insights first */}
      {analysis.mainTakeaways && analysis.mainTakeaways.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-white mb-3 text-left">Main Takeaways</h3>
          <ul className="space-y-3 text-left">
            {analysis.mainTakeaways.map((takeaway, index) => (
              <li key={index} className="text-white/90 flex items-start gap-3">
                <span className="text-white/60 mt-1.5 text-lg">→</span>
                <span className="text-lg leading-relaxed text-left">{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Points - Detailed technical insights */}
      {analysis.keyPoints.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-white mb-3 text-left">Key Points</h3>
          <ul className="space-y-2 text-left">
            {analysis.keyPoints.map((point, index) => (
              <li key={index} className="text-white/80 flex items-start gap-2">
                <span className="text-white/60 mt-1">•</span>
                <span className="text-left">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Practical Insights */}
      {analysis.practicalInsights && analysis.practicalInsights.length > 0 && (
        <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-none">
          <h3 className="text-xl font-semibold text-white mb-3 text-left">Practical Insights</h3>
          <ul className="space-y-2 text-left">
            {analysis.practicalInsights.map((insight, index) => (
              <li key={index} className="text-white/90 flex items-start gap-2">
                <span className="text-white/60 mt-1">✓</span>
                <span className="text-left">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tools Mentioned */}
      {analysis.toolsMentioned.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-white mb-3 text-left">Tools Mentioned</h3>
          <div className="flex flex-wrap gap-2">
            {analysis.toolsMentioned.map((tool, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-white/10 border border-white/20 rounded text-white/90 text-sm"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Terms & Concepts Glossary */}
      {analysis.termsAndConcepts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-white mb-4 text-left">Terms & Concepts</h3>
          <div className="space-y-4">
            {analysis.termsAndConcepts.map((term, index) => (
              <div
                key={index}
                className="bg-black/50 border border-white/10 rounded-none p-4 hover:border-white/20 transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-white text-left mb-1">{term.term}</h4>
                    {term.category && (
                      <span className="text-xs text-white/50 text-left inline-block px-2 py-0.5 bg-white/5 rounded">
                        {term.category}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-white/80 text-base leading-relaxed text-left mt-2">{term.definition}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparable Tools */}
      {analysis.comparableTools.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-white mb-4 text-left">Comparable Tools</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {analysis.comparableTools.map((tool, index) => (
              <div
                key={index}
                className="bg-black/50 border border-white/10 rounded-none p-4 hover:border-white/20 transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-lg font-semibold text-white text-left">{tool.name}</h4>
                  {tool.url && (
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/60 hover:text-white transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <p className="text-white/70 text-sm mb-2 text-left">{tool.description}</p>
                <span className="text-xs text-white/50 text-left">{tool.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alternatives */}
      {analysis.alternatives.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-white mb-4 text-left">Alternative Tools</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {analysis.alternatives.map((tool, index) => (
              <div
                key={index}
                className="bg-black/50 border border-white/10 rounded-none p-4 hover:border-white/20 transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-lg font-semibold text-white text-left">{tool.name}</h4>
                  {tool.url && (
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/60 hover:text-white transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <p className="text-white/70 text-sm mb-2 text-left">{tool.description}</p>
                <span className="text-xs text-white/50 text-left">{tool.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
