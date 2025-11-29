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
  // Analyze main theme
  if (allText.includes('tech stack') || allText.includes('technology')) {
    return `A look at the tools and technologies that power ${title.includes('Tech Stack') ? 'this platform' : 'modern development'}, showing how each piece fits into a cohesive system.`;
  }
  if (allText.includes('artificial intelligence') || allText.includes('ai')) {
    return `An exploration of how AI is reshaping work and creating new opportunities, not just replacing jobs.`;
  }
  if (allText.includes('dream') || allText.includes('vision')) {
    return `A personal journey about building something meaningful despite challenges, showing resilience and determination.`;
  }
  if (allText.includes('cursor')) {
    return `How modern AI-powered development tools are changing the way we build software, making coding more accessible.`;
  }
  return `An insightful exploration of ${title.toLowerCase()}, providing valuable perspectives and practical information.`;
}

function generateSummary(title: string, content: string, paragraphs: string[]): string {
  const allText = content.toLowerCase();
  const firstPara = paragraphs[0] || '';
  
  if (allText.includes('tech stack')) {
    return `This post breaks down the technology stack into clear categories - front-end, back-end, and supporting tools. Each tool is explained in terms of what it does and why it matters, showing how they work together to create a flexible, creative development environment. The focus is on tools that enable experimentation and maintain flow, rather than rigid structures.`;
  }
  if (allText.includes('artificial intelligence') && allText.includes('job')) {
    return `Drawing parallels between technological progress throughout history and today's AI revolution, this post argues that AI doesn't just eliminate jobs - it frees people from repetitive tasks and opens new possibilities. The key insight is that technology compounds, creating opportunities that didn't exist before.`;
  }
  if (allText.includes('dream') || allText.includes('resilience')) {
    return `A deeply personal reflection on maintaining vision and determination through difficult circumstances. The post explores what it means to build something meaningful when stability is hard to find, and how staying true to your values matters more than following conventional paths.`;
  }
  if (allText.includes('cursor')) {
    return `A practical guide to using Cursor IDE for development, covering key features like MCP servers, agent-browser capabilities, and different workflow modes. The post explains how these tools make coding more accessible, especially for those who think in terms of outcomes rather than syntax.`;
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
 * Generate main takeaways - synthesized insights, not extracted sentences
 */
function generateMainTakeaways(title: string, content: string, allText: string, paragraphs: string[]): string[] {
  const takeaways: string[] = [];
  const allTextLower = allText;
  
  // Analyze themes and generate insights
  if (allTextLower.includes('tech stack')) {
    takeaways.push('The technology stack is organized around enabling creativity and experimentation, not just functionality');
    takeaways.push('Each tool category (front-end, back-end, supporting) serves a distinct purpose in the development workflow');
    takeaways.push('The choice of tools reflects a philosophy of autonomy and flexibility over rigid structure');
    if (allTextLower.includes('bitcoin')) {
      takeaways.push('The platform is designed to support both traditional and emerging payment systems, including digital assets');
    }
  } else if (allTextLower.includes('artificial intelligence') && allTextLower.includes('job')) {
    takeaways.push('AI follows the same pattern as historical technological progress - it eliminates some jobs while creating new opportunities');
    takeaways.push('The real value of AI isn\'t in replacing human work, but in freeing people from repetitive tasks to focus on higher-value activities');
    takeaways.push('Resistance to AI in education misses the point - the goal should be teaching how to use new tools effectively, not banning them');
    takeaways.push('Technological progress compounds, meaning each innovation makes the next one easier and more powerful');
  } else if (allTextLower.includes('dream') || allTextLower.includes('resilience')) {
    takeaways.push('Building something meaningful requires maintaining vision even when circumstances are challenging');
    takeaways.push('Choosing autonomy over traditional employment can be difficult but aligns with personal values and long-term goals');
    takeaways.push('The journey matters as much as the destination - each challenge builds resilience and clarity');
  } else if (allTextLower.includes('cursor')) {
    takeaways.push('Modern AI development tools like Cursor make coding accessible to people who think in outcomes, not syntax');
    takeaways.push('Features like MCP servers and agent-browser capabilities create powerful automation workflows');
    takeaways.push('The investment in AI coding tools can pay off significantly if you\'re building profitable projects');
    takeaways.push('The future of development is about leveraging AI to handle routine work while focusing on creative problem-solving');
  }
  
  return takeaways.length > 0 ? takeaways : [];
}

/**
 * Generate key points - deeper technical/philosophical insights
 */
function generateKeyPoints(title: string, content: string, allText: string, paragraphs: string[]): string[] {
  const points: string[] = [];
  const allTextLower = allText;
  
  if (allTextLower.includes('tech stack')) {
    points.push('The front-end and back-end separation allows for independent scaling and experimentation of user-facing and data-processing components');
    points.push('MCP servers represent a paradigm shift in how AI tools interact with external services, enabling secure automation without custom integrations');
    points.push('The tool selection prioritizes developer experience and flow state over raw performance metrics');
    points.push('Payment infrastructure supports both traditional (Stripe/PayPal) and emerging (Bitcoin) systems, reflecting a forward-thinking approach');
    if (allTextLower.includes('vercel')) {
      points.push('Deployment tools like Vercel abstract away infrastructure complexity, letting developers focus on building features');
    }
  } else if (allTextLower.includes('artificial intelligence') && allTextLower.includes('job')) {
    points.push('Moore\'s Law and Kurzweil\'s Law of Accelerating Returns explain why technological change feels sudden - it compounds exponentially');
    points.push('The education system\'s resistance to AI tools mirrors historical resistance to calculators and computers, missing the opportunity to teach tool mastery');
    points.push('AI creates new job categories that didn\'t exist before, just as previous technological revolutions did');
    points.push('The key to thriving with AI is understanding it as a tool that amplifies human capability, not replaces it');
  } else if (allTextLower.includes('cursor')) {
    points.push('Cursor\'s MCP server integration allows AI agents to perform actions across multiple platforms, not just generate code');
    points.push('The agent-browser feature bridges the gap between code and visual design, making it easier to iterate on user interfaces');
    points.push('The Ask/Plan/Agent mode progression helps break down complex tasks into manageable, executable steps');
    points.push('The cost of AI coding tools should be evaluated against the value of accelerated development and learning');
  }
  
  return points.length > 0 ? points : [];
}

/**
 * Generate practical insights - actionable advice
 */
function generatePracticalInsights(content: string, allText: string, paragraphs: string[]): string[] {
  const insights: string[] = [];
  const allTextLower = allText;
  
  if (allTextLower.includes('tech stack')) {
    insights.push('When building your own stack, prioritize tools that match your workflow and enable experimentation');
    insights.push('Consider how tools integrate with each other - the connections between tools are often as important as the tools themselves');
    insights.push('Don\'t be afraid to experiment with emerging technologies, but maintain a solid foundation with proven tools');
  } else if (allTextLower.includes('artificial intelligence') && allTextLower.includes('job')) {
    insights.push('Instead of banning AI tools, focus on teaching students how to use them effectively and ethically');
    insights.push('Look for opportunities where AI can free up your time for higher-value creative and strategic work');
    insights.push('Embrace AI as a learning accelerator - it can help you understand concepts faster and build skills more efficiently');
  } else if (allTextLower.includes('cursor')) {
    insights.push('Start with Cursor\'s Ask mode to understand how it works, then progress to Plan and Agent modes as you get comfortable');
    insights.push('Set up MCP servers for tools you use regularly - the automation capabilities can save significant time');
    insights.push('Use the agent-browser feature to iterate on designs visually, then let Cursor implement the code changes');
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
