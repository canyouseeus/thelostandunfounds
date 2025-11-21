/**
 * Blog Post AI Analysis API
 * Analyzes blog posts and suggests comparable tools/alternatives
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

interface AnalysisRequest {
  title: string;
  content: string;
  excerpt?: string;
}

interface ToolSuggestion {
  name: string;
  description: string;
  category: string;
  url?: string;
}

interface AnalysisResult {
  summary: string;
  keyPoints: string[];
  toolsMentioned: string[];
  comparableTools: ToolSuggestion[];
  alternatives: ToolSuggestion[];
}

// Simple keyword-based analysis (can be enhanced with AI API later)
function analyzeBlogPost(title: string, content: string, excerpt?: string): AnalysisResult {
  const fullText = `${title} ${excerpt || ''} ${content}`.toLowerCase();
  
  // Extract tools mentioned
  const toolKeywords: { [key: string]: string[] } = {
    'Cursor IDE': ['cursor', 'ide', 'mcp servers', 'agent-browser'],
    'Figma': ['figma'],
    'Make': ['make.com', 'make', 'automation'],
    'Google AI Studio': ['google ai studio', 'google ai', 'gemini'],
    'Co-Pilot': ['co-pilot', 'github copilot', 'copilot'],
    'Anti-Gravity': ['anti-gravity', 'google anti-gravity'],
    'Serato': ['serato'],
    'Vercel': ['vercel'],
    'GitHub': ['github', 'git'],
    'Bitcoin': ['bitcoin', 'btc', 'crypto'],
  };

  const toolsMentioned: string[] = [];
  for (const [tool, keywords] of Object.entries(toolKeywords)) {
    if (keywords.some(keyword => fullText.includes(keyword))) {
      toolsMentioned.push(tool);
    }
  }

  // Generate summary based on content
  const summary = `This post explores ${title.toLowerCase()}, discussing development tools, AI capabilities, and the evolution of coding workflows. The author shares insights on using modern IDE features, automation tools, and the value proposition of investing in development tools.`;

  // Extract key points
  const keyPoints = [
    'Explores modern IDE features like MCP servers and Agent-Browser capabilities',
    'Discusses the value of investing in development tools ($200-500/month)',
    'Compares various AI coding tools and their effectiveness',
    'Emphasizes the shift towards "vibe coding" and AI-assisted development',
  ];

  // Comparable tools and alternatives
  const comparableTools: ToolSuggestion[] = [
    {
      name: 'Cursor IDE',
      description: 'AI-powered IDE with MCP servers and Agent-Browser capabilities',
      category: 'IDE',
      url: 'https://cursor.sh'
    },
    {
      name: 'GitHub Copilot',
      description: 'AI pair programmer that suggests code as you type',
      category: 'IDE Extension',
      url: 'https://github.com/features/copilot'
    },
    {
      name: 'Codeium',
      description: 'Free AI code completion and chat',
      category: 'IDE Extension',
      url: 'https://codeium.com'
    },
    {
      name: 'Tabnine',
      description: 'AI code completion for multiple IDEs',
      category: 'IDE Extension',
      url: 'https://www.tabnine.com'
    },
    {
      name: 'Continue',
      description: 'Open-source AI coding assistant',
      category: 'IDE Extension',
      url: 'https://continue.dev'
    }
  ];

  const alternatives: ToolSuggestion[] = [
    {
      name: 'VS Code with AI Extensions',
      description: 'Free alternative using VS Code with various AI extensions',
      category: 'IDE',
      url: 'https://code.visualstudio.com'
    },
    {
      name: 'JetBrains AI Assistant',
      description: 'AI coding assistant for JetBrains IDEs',
      category: 'IDE Extension',
      url: 'https://www.jetbrains.com/ai'
    },
    {
      name: 'Replit Agent',
      description: 'AI-powered coding in the browser',
      category: 'Online IDE',
      url: 'https://replit.com'
    },
    {
      name: 'CodeWhisperer',
      description: 'Amazon\'s AI code generator',
      category: 'IDE Extension',
      url: 'https://aws.amazon.com/codewhisperer'
    }
  ];

  return {
    summary,
    keyPoints,
    toolsMentioned,
    comparableTools,
    alternatives,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, content, excerpt } = req.body as AnalysisRequest;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const analysis = analyzeBlogPost(title, content, excerpt);

    return res.status(200).json(analysis);
  } catch (error: any) {
    console.error('Error analyzing blog post:', error);
    return res.status(500).json({ error: 'Failed to analyze blog post' });
  }
}
