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

/**
 * Analyze blog post using AI with senior programmer perspective
 */
async function analyzeBlogPostWithAI(title: string, content: string, excerpt?: string): Promise<AnalysisResult> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  
  if (!apiKey) {
    // Fallback to basic analysis if no API key
    return analyzeBlogPostBasic(title, content, excerpt);
  }

  const prompt = `You are an expert technical communicator analyzing a blog post. Your goal is to make complex technical content accessible and intuitive for readers of all technical levels, while maintaining depth for experienced developers.

Blog Post Title: ${title}
${excerpt ? `Excerpt: ${excerpt}\n` : ''}
Content:
${content}

Analyze this blog post and provide an intuitive breakdown:

1. **Quick Take** (1 sentence): A super-concise, plain-language summary that anyone can understand. What's the one thing readers should know? Make it conversational and clear.

2. **Summary** (2-3 sentences): A more detailed but still accessible summary that captures the core message. Use clear language, avoid unnecessary jargon, and focus on what matters most.

3. **Main Takeaways** (3-4 points): The most important insights in simple, actionable language. Each should:
   - Be easy to understand without technical background
   - Highlight practical value or key insight
   - Use everyday language when possible
   - Be complete thoughts, not fragments
   Format: "What it means" or "Why it matters" style insights.

4. **Key Points** (3-5 points): More detailed technical insights for readers who want depth. These can include:
   - Technical details and architectural decisions
   - Patterns or principles being demonstrated
   - Implementation considerations
   - Deeper context for technical readers

5. **Tools Mentioned**: List only tools/platforms/services explicitly named in the post (e.g., Vercel, Supabase, GitHub, Cursor, etc.). Be precise - don't infer tools that aren't mentioned.

6. **Terms & Concepts**: Define technical terms in an intuitive, accessible way. For each term:
   - Use analogies or real-world examples when helpful
   - Start with simple explanation, then add technical detail
   - Make it clear why the concept matters
   - Category (e.g., "Technology Law", "Architecture Pattern", "Development Concept")

7. **Practical Insights** (2-3 points, optional): Real-world applications, use cases, or actionable advice readers can apply. Focus on "how this helps you" or "when to use this."

8. **Comparable Tools**: Only include if the post explicitly asks for comparisons or alternatives. Otherwise, leave empty.

9. **Alternatives**: Only include if the post explicitly asks for alternatives. Otherwise, leave empty.

Return your response as a JSON object with this exact structure:
{
  "quickTake": "One sentence summary in plain language",
  "summary": "2-3 sentence accessible summary",
  "mainTakeaways": ["Simple insight 1", "Simple insight 2", ...],
  "keyPoints": ["Detailed technical insight 1", "Detailed technical insight 2", ...],
  "toolsMentioned": ["Tool1", "Tool2", ...],
  "termsAndConcepts": [
    {
      "term": "Term Name",
      "definition": "Intuitive definition with examples/analogies when helpful",
      "category": "Category Name"
    }
  ],
  "practicalInsights": ["Actionable insight 1", "Actionable insight 2", ...],
  "comparableTools": [],
  "alternatives": []
}

Remember: Make it intuitive first, technical second. Use analogies, real examples, and clear language. Help readers understand not just what, but why it matters.`;

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
        quickTake: parsed.quickTake || undefined,
        summary: parsed.summary || excerpt || `Analysis of ${title}`,
        mainTakeaways: Array.isArray(parsed.mainTakeaways) ? parsed.mainTakeaways : undefined,
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        toolsMentioned: Array.isArray(parsed.toolsMentioned) ? parsed.toolsMentioned : [],
        termsAndConcepts: Array.isArray(parsed.termsAndConcepts) ? parsed.termsAndConcepts : [],
        practicalInsights: Array.isArray(parsed.practicalInsights) ? parsed.practicalInsights : undefined,
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
    quickTake: excerpt ? excerpt.split('.')[0] + '.' : `An overview of ${title}`,
    summary,
    mainTakeaways: keyPoints.length > 0 ? keyPoints.slice(0, 3) : undefined,
    keyPoints: keyPoints.length > 0 ? keyPoints : [summary],
    toolsMentioned,
    termsAndConcepts,
    practicalInsights: undefined,
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
