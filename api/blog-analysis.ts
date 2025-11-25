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
  
  // Extract tools mentioned - be more specific to avoid false positives
  const toolKeywords: { [key: string]: string[] } = {
    'Cursor IDE': ['cursor ide', 'cursor editor', 'cursor code editor'],
    'Figma': ['figma'],
    'Make': ['make.com', 'make automation platform'],
    'Google AI Studio': ['google ai studio', 'gemini api'],
    'Co-Pilot': ['github copilot', 'github co-pilot'],
    'Anti-Gravity': ['anti-gravity', 'google anti-gravity'],
    'Serato': ['serato'],
    'Vercel': ['vercel'],
    'GitHub': ['github.com', 'github platform'],
    'Bitcoin': ['bitcoin', 'btc cryptocurrency'],
    'Moore\'s Law': ['moore\'s law', 'moores law'],
    'Kurzweil': ['kurzweil', 'law of accelerating returns'],
  };

  const toolsMentioned: string[] = [];
  for (const [tool, keywords] of Object.entries(toolKeywords)) {
    // Use word boundaries to avoid false matches (e.g., "make" in "make better")
    const matched = keywords.some(keyword => {
      // For multi-word keywords, check if they appear as phrases
      if (keyword.includes(' ')) {
        return fullText.includes(keyword);
      }
      // For single words, use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(fullText);
    });
    
    if (matched) {
      toolsMentioned.push(tool);
    }
  }
  
  // Don't add "Artificial Intelligence" as a tool - it's a concept, not a tool
  // Only add specific AI tools if they're actually mentioned

  // Generate summary based on actual content
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const firstFewSentences = sentences.slice(0, 3).join('. ').trim();
  const summary = excerpt || firstFewSentences || `This post explores ${title}, discussing key insights and perspectives on the topic.`;

  // Extract key points from content - get complete, meaningful sentences
  const keyPoints: string[] = [];
  const seenPoints = new Set<string>();
  
  // Helper to add a complete sentence as a key point
  const addKeyPoint = (sentence: string) => {
    const trimmed = sentence.trim();
    const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');
    
    // Check if it's a complete sentence (ends with punctuation or is substantial)
    if (trimmed.length >= 30 && trimmed.length <= 250 && !seenPoints.has(normalized)) {
      // Make sure it's a complete thought (not cut off mid-sentence)
      if (trimmed.match(/^[A-Z]/) && (trimmed.endsWith('.') || trimmed.endsWith('!') || trimmed.endsWith('?') || trimmed.length > 100)) {
        keyPoints.push(trimmed);
        seenPoints.add(normalized);
      }
    }
  };
  
  // Split content into complete sentences (preserve punctuation)
  // Match sentences that start with capital letter and end with punctuation
  const completeSentences = content.match(/[A-Z][^.!?]*[.!?]+/g) || [];
  
  // Look for sentences with key phrases that indicate important points
  // Make sure we get complete sentences, not fragments
  const importantPhrases = [
    'Will A.I.',
    'I say,',
    'I believe',
    'Throughout history',
    'The power of',
    'This is why',
    'The purpose of',
    'When you',
    'Stop sending',
    'Think about',
    'Do you not see',
  ];
  
  completeSentences.forEach(sentence => {
    const trimmed = sentence.trim();
    const hasImportantPhrase = importantPhrases.some(phrase => 
      trimmed.includes(phrase) || trimmed.toLowerCase().includes(phrase.toLowerCase())
    );
    
    if (hasImportantPhrase) {
      addKeyPoint(trimmed);
    }
  });
  
  // Also look for questions (complete questions that start with capital)
  const questions = content.match(/[A-Z][^.!?]*\?/g);
  if (questions && questions.length > 0) {
    questions.slice(0, 2).forEach(q => {
      const trimmed = q.trim();
      if (trimmed.length >= 30 && trimmed.length <= 200) {
        addKeyPoint(trimmed);
      }
    });
  }
  
  // If we don't have enough key points, find sentences with important keywords
  if (keyPoints.length < 4) {
    const importantKeywords = ['technology', 'ai', 'artificial intelligence', 'will', 'can', 'should', 'think', 'believe', 'purpose', 'power'];
    
    completeSentences.forEach(sentence => {
      if (keyPoints.length >= 4) return;
      
      const lower = sentence.toLowerCase();
      const hasImportantKeyword = importantKeywords.some(keyword => lower.includes(keyword));
      
      if (hasImportantKeyword) {
        addKeyPoint(sentence);
      }
    });
  }
  
  // Remove duplicates and limit to 4 key points max
  const finalKeyPoints = Array.from(new Set(keyPoints)).slice(0, 4);

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
    keyPoints: finalKeyPoints,
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
