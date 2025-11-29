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

interface TermDefinition {
  term: string;
  definition: string;
  category?: string;
}

interface AnalysisResult {
  summary: string;
  keyPoints: string[];
  toolsMentioned: string[];
  termsAndConcepts: TermDefinition[];
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
  
  // Extract terms, concepts, and laws mentioned
  const termsAndConcepts: TermDefinition[] = [];
  
  const conceptKeywords: { [key: string]: { keywords: string[], definition: string, category?: string } } = {
    'Moore\'s Law': {
      keywords: ['moore\'s law', 'moores law'],
      definition: 'The observation that the number of transistors on a computer chip doubles roughly every two years, leading to exponential growth in computing power.',
      category: 'Technology Law'
    },
    'Kurzweil\'s Law of Accelerating Returns': {
      keywords: ['kurzweil', 'law of accelerating returns', 'kurzweil\'s law'],
      definition: 'The principle that technological progress speeds up as new tools amplify our ability to create better tools, leading to exponential growth in innovation.',
      category: 'Technology Law'
    },
    'Artificial Intelligence': {
      keywords: ['artificial intelligence', 'ai', 'machine learning'],
      definition: 'The simulation of human intelligence in machines that are programmed to think and learn like humans.',
      category: 'Technology Concept'
    },
    'Automation': {
      keywords: ['automation', 'automated'],
      definition: 'The use of technology to perform tasks with minimal human intervention.',
      category: 'Technology Concept'
    },
  };
  
  for (const [term, data] of Object.entries(conceptKeywords)) {
    const matched = data.keywords.some(keyword => {
      if (keyword.includes(' ')) {
        return fullText.includes(keyword);
      }
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(fullText);
    });
    
    if (matched) {
      termsAndConcepts.push({
        term,
        definition: data.definition,
        category: data.category
      });
    }
  }

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
  // Only add these if the post explicitly asks for comparisons or alternatives
  // Don't add them for posts that just describe a tech stack or tools being used
  const comparableTools: ToolSuggestion[] = [];
  const alternatives: ToolSuggestion[] = [];
  
  // Only suggest comparable/alternative tools if the post explicitly asks for them
  // Look for phrases like "compare", "alternative to", "similar to", "instead of", etc.
  const comparisonKeywords = [
    'compare', 'comparison', 'alternative to', 'alternatives to', 
    'similar to', 'instead of', 'vs', 'versus', 'better than',
    'recommend', 'suggest', 'what tool', 'which tool'
  ];
  
  const hasComparisonIntent = comparisonKeywords.some(keyword => 
    fullText.includes(keyword)
  );
  
  // Don't add tool suggestions for posts that just describe a tech stack
  // Only add if there's explicit comparison intent
  if (!hasComparisonIntent) {
    // Return empty arrays - don't suggest tools for descriptive posts
    return {
      summary,
      keyPoints: finalKeyPoints,
      toolsMentioned,
      termsAndConcepts,
      comparableTools: [],
      alternatives: [],
    };
  }
  
  // Only add suggestions if post explicitly asks for comparisons
  // (Keeping the logic below but it won't run for descriptive posts)

  return {
    summary,
    keyPoints: finalKeyPoints,
    toolsMentioned,
    termsAndConcepts,
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
