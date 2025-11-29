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
 * Generate intuitive breakdown from blog post content
 */
function generateIntuitiveBreakdown(title: string, content: string, excerpt?: string | null): AnalysisResult {
  const fullText = `${title} ${excerpt || ''} ${content}`;
  const fullTextLower = fullText.toLowerCase();
  
  // Quick Take - from excerpt or first meaningful sentence
  const quickTake = excerpt 
    ? excerpt.split(/[.!?]/)[0].trim() + (excerpt.includes('.') ? '.' : '')
    : content.split(/[.!?]/).find(s => s.trim().length > 30)?.trim() + '.' || 
      `An overview of ${title}`;

  // Summary - from excerpt or first paragraph
  const summary = excerpt || 
    content.split(/\n\n+/)[0]?.substring(0, 200).trim() + '...' ||
    `This post explores ${title.toLowerCase()}, providing insights and practical information.`;

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

  // Extract main takeaways - look for key patterns
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 50);
  const mainTakeaways: string[] = [];
  
  // Look for paragraphs that start with key phrases or contain important insights
  const takeawayPatterns = [
    /^[A-Z][^.!?]*?(?:enables|allows|provides|helps|makes|ensures|means|means that)[^.!?]*?[.!?]/i,
    /^[A-Z][^.!?]*?(?:key|important|essential|crucial|vital|main|primary)[^.!?]*?[.!?]/i,
    /^[A-Z][^.!?]*?(?:philosophy|approach|strategy|principle|concept)[^.!?]*?[.!?]/i,
  ];

  paragraphs.forEach(para => {
    const sentences = para.split(/[.!?]+/).filter(s => s.trim().length > 30);
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length >= 40 && trimmed.length <= 200) {
        if (takeawayPatterns.some(pattern => pattern.test(trimmed)) && mainTakeaways.length < 4) {
          if (!mainTakeaways.some(existing => existing.includes(trimmed.substring(0, 30)))) {
            mainTakeaways.push(trimmed);
          }
        }
      }
    });
  });

  // Extract key points - technical insights
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const keyPoints: string[] = [];
  
  const technicalIndicators = [
    'architecture', 'design', 'pattern', 'principle', 'decision', 'strategy',
    'enables', 'allows', 'provides', 'ensures', 'implements', 'leverages',
    'integration', 'workflow', 'process', 'system', 'infrastructure'
  ];
  
  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    const lower = trimmed.toLowerCase();
    if (trimmed.length >= 40 && trimmed.length <= 250 && 
        technicalIndicators.some(indicator => lower.includes(indicator))) {
      if (keyPoints.length < 5 && !mainTakeaways.includes(trimmed)) {
        if (!keyPoints.some(existing => existing.includes(trimmed.substring(0, 30)))) {
          keyPoints.push(trimmed);
        }
      }
    }
  });

  // Generate practical insights
  const practicalInsights: string[] = [];
  const practicalPatterns = [
    /(?:you can|you could|this lets|this allows|this enables|this helps|this makes it|this means you)/i,
    /(?:use|using|when|for|to|with|by)/i,
  ];

  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    const lower = trimmed.toLowerCase();
    if (trimmed.length >= 30 && trimmed.length <= 200) {
      if (practicalPatterns[0].test(lower) && practicalInsights.length < 3) {
        if (!practicalInsights.some(existing => existing.includes(trimmed.substring(0, 30)))) {
          // Make it more actionable
          let insight = trimmed;
          if (!insight.toLowerCase().startsWith('this')) {
            insight = 'You can ' + insight.toLowerCase();
          }
          practicalInsights.push(insight);
        }
      }
    }
  });

  // If we don't have enough takeaways, use first meaningful sentences
  if (mainTakeaways.length < 2) {
    const firstSentences = paragraphs[0]?.split(/[.!?]+/)
      .filter(s => s.trim().length > 40 && s.trim().length < 200)
      .slice(0, 3 - mainTakeaways.length)
      .map(s => s.trim());
    if (firstSentences) {
      mainTakeaways.push(...firstSentences);
    }
  }

  // If we don't have enough key points, use important sentences
  if (keyPoints.length < 3) {
    const importantSentences = sentences
      .filter(s => {
        const trimmed = s.trim();
        return trimmed.length >= 50 && trimmed.length <= 200 &&
               !mainTakeaways.includes(trimmed);
      })
      .slice(0, 5 - keyPoints.length);
    keyPoints.push(...importantSentences);
  }

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
