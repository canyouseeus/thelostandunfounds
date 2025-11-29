/**
 * Blog Post AI Analysis API
 * Uses AI to analyze blog posts with senior programmer-level insights
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

/**
 * Analyze blog post using AI with senior programmer perspective
 */
async function analyzeBlogPostWithAI(title: string, content: string, excerpt?: string): Promise<AnalysisResult> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  
  if (!apiKey) {
    // Fallback to basic analysis if no API key
    return analyzeBlogPostBasic(title, content, excerpt);
  }

  const prompt = `You are a senior-level software engineer and technical writer analyzing a blog post. Provide deep, insightful analysis that would be valuable to other developers and technical readers.

Blog Post Title: ${title}
${excerpt ? `Excerpt: ${excerpt}\n` : ''}
Content:
${content}

Analyze this blog post and provide:

1. **Summary** (2-3 sentences): A concise, insightful summary that captures the core message and technical context. Think about what a senior engineer would want to know.

2. **Key Points** (3-5 points): Extract the most important technical insights, architectural decisions, or philosophical points. These should be:
   - Actionable insights, not just random sentences
   - Technical depth where relevant
   - Clear value propositions
   - Patterns or principles being demonstrated
   Format each as a complete, meaningful insight (not just a sentence fragment).

3. **Tools Mentioned**: List only tools/platforms/services explicitly named in the post (e.g., Vercel, Supabase, GitHub, Cursor, etc.). Be precise - don't infer tools that aren't mentioned.

4. **Terms & Concepts**: Define technical terms, concepts, laws, or principles mentioned (e.g., "Moore's Law", "MCP servers", "RLS policies"). Include:
   - The term name
   - A clear, technical definition
   - Category (e.g., "Technology Law", "Architecture Pattern", "Development Concept")

5. **Comparable Tools**: Only include if the post explicitly asks for comparisons or alternatives. Otherwise, leave empty.

6. **Alternatives**: Only include if the post explicitly asks for alternatives. Otherwise, leave empty.

Return your response as a JSON object with this exact structure:
{
  "summary": "string",
  "keyPoints": ["insight 1", "insight 2", ...],
  "toolsMentioned": ["Tool1", "Tool2", ...],
  "termsAndConcepts": [
    {
      "term": "Term Name",
      "definition": "Clear technical definition",
      "category": "Category Name"
    }
  ],
  "comparableTools": [],
  "alternatives": []
}

Focus on technical depth, architectural insights, and practical value. Think like a senior engineer reviewing this for their team.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      console.error('Gemini API error:', response.status, response.statusText);
      return analyzeBlogPostBasic(title, content, excerpt);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      return analyzeBlogPostBasic(title, content, excerpt);
    }

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonText = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonText);
      
      // Validate and return
      return {
        summary: parsed.summary || excerpt || `Analysis of ${title}`,
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        toolsMentioned: Array.isArray(parsed.toolsMentioned) ? parsed.toolsMentioned : [],
        termsAndConcepts: Array.isArray(parsed.termsAndConcepts) ? parsed.termsAndConcepts : [],
        comparableTools: [],
        alternatives: [],
      };
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
  }

  // Fallback to basic analysis
  return analyzeBlogPostBasic(title, content, excerpt);
}

/**
 * Basic keyword-based analysis (fallback when AI is not available)
 */
function analyzeBlogPostBasic(title: string, content: string, excerpt?: string): AnalysisResult {
  const fullText = `${title} ${excerpt || ''} ${content}`.toLowerCase();
  
  // Extract tools mentioned - be more specific to avoid false positives
  const toolKeywords: { [key: string]: string[] } = {
    'Cursor': ['cursor ide', 'cursor editor', 'cursor code editor'],
    'Vercel': ['vercel'],
    'Supabase': ['supabase'],
    'GitHub': ['github.com', 'github platform'],
    'Railway': ['railway'],
    'Stripe': ['stripe'],
    'PayPal': ['paypal'],
    'Bitcoin': ['bitcoin', 'btc cryptocurrency'],
    'Google AI Studio': ['google ai studio', 'gemini api'],
    'ChatGPT': ['chatgpt'],
    'Claude': ['claude'],
    'MCP Servers': ['mcp server', 'model context protocol'],
  };

  const toolsMentioned: string[] = [];
  for (const [tool, keywords] of Object.entries(toolKeywords)) {
    const matched = keywords.some(keyword => {
      if (keyword.includes(' ')) {
        return fullText.includes(keyword);
      }
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(fullText);
    });
    
    if (matched) {
      toolsMentioned.push(tool);
    }
  }
  
  // Extract terms and concepts
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
    'MCP (Model Context Protocol)': {
      keywords: ['mcp', 'model context protocol'],
      definition: 'A protocol that allows AI tools to safely access external services and data, acting as bridges for AI to read/write data and interact with APIs while following rules and permissions.',
      category: 'Technology Protocol'
    },
    'Artificial Intelligence': {
      keywords: ['artificial intelligence', 'ai'],
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

  // Generate summary
  const summary = excerpt || `An analysis of ${title}, exploring key technical concepts and insights.`;

  // Extract meaningful key points (better than before, but still basic)
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const keyPoints: string[] = [];
  
  // Look for sentences with technical depth indicators
  const technicalIndicators = [
    'architecture', 'design', 'pattern', 'principle', 'decision', 'strategy',
    'enables', 'allows', 'provides', 'ensures', 'implements', 'leverages'
  ];
  
  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    const lower = trimmed.toLowerCase();
    if (trimmed.length >= 40 && trimmed.length <= 200 && 
        technicalIndicators.some(indicator => lower.includes(indicator))) {
      if (keyPoints.length < 4) {
        keyPoints.push(trimmed);
      }
    }
  });

  return {
    summary,
    keyPoints: keyPoints.length > 0 ? keyPoints : [summary],
    toolsMentioned,
    termsAndConcepts,
    comparableTools: [],
    alternatives: [],
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

    const analysis = await analyzeBlogPostWithAI(title, content, excerpt);

    return res.status(200).json(analysis);
  } catch (error: any) {
    console.error('Error analyzing blog post:', error);
    return res.status(500).json({ error: 'Failed to analyze blog post' });
  }
}
