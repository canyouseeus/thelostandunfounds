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
    'Artificial Intelligence': ['artificial intelligence', 'ai', 'machine learning'],
    'Moore\'s Law': ['moore\'s law', 'moores law'],
    'Kurzweil': ['kurzweil', 'law of accelerating returns'],
  };

  const toolsMentioned: string[] = [];
  for (const [tool, keywords] of Object.entries(toolKeywords)) {
    if (keywords.some(keyword => fullText.includes(keyword))) {
      toolsMentioned.push(tool);
    }
  }

  // Generate summary based on actual content
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const firstFewSentences = sentences.slice(0, 3).join('. ').trim();
  const summary = excerpt || firstFewSentences || `This post explores ${title}, discussing key insights and perspectives on the topic.`;

  // Extract key points from content - look for important statements
  const keyPoints: string[] = [];
  
  // Look for questions (often indicate key themes)
  const questions = content.match(/[^.!?]*\?[^.!?]*/g);
  if (questions && questions.length > 0) {
    questions.slice(0, 2).forEach(q => {
      const trimmed = q.trim();
      if (trimmed.length > 20 && trimmed.length < 150) {
        keyPoints.push(trimmed);
      }
    });
  }
  
  // Look for statements with key phrases
  const keyPhrases = [
    /throughout history[^.!?]*/gi,
    /the power of[^.!?]*/gi,
    /i believe[^.!?]*/gi,
    /i say[^.!?]*/gi,
    /this is why[^.!?]*/gi,
    /the purpose of[^.!?]*/gi,
  ];
  
  keyPhrases.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.slice(0, 2).forEach(match => {
        const trimmed = match.trim();
        if (trimmed.length > 20 && trimmed.length < 200 && !keyPoints.includes(trimmed)) {
          keyPoints.push(trimmed);
        }
      });
    }
  });
  
  // If we don't have enough key points, extract from sentences
  if (keyPoints.length < 3) {
    const importantSentences = sentences.filter(s => {
      const lower = s.toLowerCase();
      return lower.length > 50 && lower.length < 200 && 
             (lower.includes('technology') || lower.includes('ai') || lower.includes('will') || 
              lower.includes('can') || lower.includes('should') || lower.includes('think'));
    });
    importantSentences.slice(0, 4 - keyPoints.length).forEach(s => {
      const trimmed = s.trim();
      if (trimmed.length > 20 && trimmed.length < 200) {
        keyPoints.push(trimmed);
      }
    });
  }
  
  // Limit to 4 key points max
  const finalKeyPoints = keyPoints.slice(0, 4);

  // Generate comparable tools and alternatives based on content themes
  const comparableTools: ToolSuggestion[] = [];
  const alternatives: ToolSuggestion[] = [];
  
  // AI/Technology focused posts
  if (fullText.includes('artificial intelligence') || fullText.includes('ai') || fullText.includes('technology')) {
    comparableTools.push(
      {
        name: 'ChatGPT',
        description: 'AI language model for conversation and assistance',
        category: 'AI Tool',
        url: 'https://chat.openai.com'
      },
      {
        name: 'Claude',
        description: 'AI assistant by Anthropic',
        category: 'AI Tool',
        url: 'https://claude.ai'
      },
      {
        name: 'Perplexity',
        description: 'AI-powered search and research tool',
        category: 'AI Tool',
        url: 'https://www.perplexity.ai'
      }
    );
    
    alternatives.push(
      {
        name: 'Google Bard',
        description: 'Google\'s AI chatbot',
        category: 'AI Tool',
        url: 'https://bard.google.com'
      },
      {
        name: 'Microsoft Copilot',
        description: 'AI assistant integrated into Microsoft products',
        category: 'AI Tool',
        url: 'https://copilot.microsoft.com'
      }
    );
  }
  
  // Development/IDE focused posts
  if (fullText.includes('cursor') || fullText.includes('ide') || fullText.includes('development') || fullText.includes('coding')) {
    comparableTools.push(
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
      }
    );
    
    alternatives.push(
      {
        name: 'VS Code with AI Extensions',
        description: 'Free alternative using VS Code with various AI extensions',
        category: 'IDE',
        url: 'https://code.visualstudio.com'
      },
      {
        name: 'Continue',
        description: 'Open-source AI coding assistant',
        category: 'IDE Extension',
        url: 'https://continue.dev'
      }
    );
  }
  
  // Education/Learning focused posts
  if (fullText.includes('education') || fullText.includes('learning') || fullText.includes('student')) {
    comparableTools.push(
      {
        name: 'Khan Academy',
        description: 'Free online educational platform',
        category: 'Education',
        url: 'https://www.khanacademy.org'
      },
      {
        name: 'Coursera',
        description: 'Online courses from top universities',
        category: 'Education',
        url: 'https://www.coursera.org'
      }
    );
  }
  
  // If no specific tools found, provide general alternatives
  if (comparableTools.length === 0) {
    comparableTools.push(
      {
        name: 'Notion AI',
        description: 'AI-powered workspace and note-taking',
        category: 'Productivity',
        url: 'https://www.notion.so'
      },
      {
        name: 'Grammarly',
        description: 'AI writing assistant',
        category: 'Writing',
        url: 'https://www.grammarly.com'
      }
    );
  }

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
