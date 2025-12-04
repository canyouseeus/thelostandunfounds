/**
 * Blog Post Detail Page
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/Loading';
import BlogAnalysis from '../components/BlogAnalysis';
import ShareButtons from '../components/ShareButtons';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface AffiliateLink {
  book_title: string;
  link: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  published_at: string | null;
  created_at: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  og_image_url: string | null;
  featured_image?: string | null; // Support existing field
  amazon_affiliate_links?: AffiliateLink[] | null; // Amazon links from submission
  subdomain?: string | null; // User subdomain
  author_id?: string | null; // Author ID
  author_name?: string | null; // Author name for disclosure
  blog_title?: string | null; // Blog title from user_subdomains (normalized)
  blog_title_display?: string | null; // Styled blog title for display
}

interface BlogPostListItem {
  slug: string;
  title: string;
  published_at: string | null;
  created_at: string;
}

export default function BlogPost() {
  const { slug, subdomain } = useParams<{ slug: string; subdomain?: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [nextPost, setNextPost] = useState<BlogPostListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blogTitle, setBlogTitle] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadPost(slug, subdomain || null);
      loadNextPost(slug, subdomain || null);
    }
  }, [slug, subdomain]);

  // Meta tags are now handled by Helmet component below

  const loadPost = async (postSlug: string, urlSubdomain: string | null = null) => {
    try {
      setLoading(true);
      // Get subdomain from URL params, then fallback to pathname
      let subdomain = urlSubdomain;
      if (!subdomain) {
        // Extract subdomain from URL path (e.g., /thelostarchives/... or /blog/subdomain/...)
        const pathname = window.location.pathname;
        const pathParts = pathname.split('/').filter(Boolean);
        
        // IMPORTANT: /thelostarchives/ is the main blog route, NOT a subdomain
        // Posts in THE LOST ARCHIVES have subdomain IS NULL
        if (pathParts[0] === 'thelostarchives') {
          // This is a main blog post, subdomain should be NULL
          subdomain = null;
        } else if (pathParts[0] === 'blog' && pathParts[1]) {
          // /blog/:subdomain/:slug format
          subdomain = pathParts[1];
        } else if (pathParts[0] === 'book-club' || 
                   pathParts[0] === 'gearheads' || 
                   pathParts[0] === 'borderlands' || 
                   pathParts[0] === 'science' || 
                   pathParts[0] === 'newtheory') {
          // These are actual subdomains
          subdomain = pathParts[0];
        } else {
          // Try hostname as fallback (but exclude localhost, www, and main domain)
          const hostname = window.location.hostname;
          const hostnameParts = hostname.split('.');
          if (hostnameParts.length > 1 && hostnameParts[0] !== 'www' && hostnameParts[0] !== 'thelostandunfounds') {
            subdomain = hostnameParts[0];
          } else {
            subdomain = null; // Main blog posts have NULL subdomain
          }
        }
      }
      
      let query = supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', postSlug);
      
      // Filter by subdomain if present
      if (subdomain) {
        query = query.eq('subdomain', subdomain);
      } else {
        query = query.is('subdomain', null); // Main blog posts have NULL subdomain
      }
      
      const { data, error: fetchError } = await query.single();

      if (fetchError) {
        console.error('Error loading blog post:', fetchError);
        setError('Post not found');
        return;
      }

      if (!data) {
        setError('Post not found');
        return;
      }

      // Check if post is published - handle both published boolean and status field
      const isPublished = data.published === true || (data.published === undefined && data.status === 'published');
      
      if (!isPublished) {
        setError('Post not found');
        return;
      }

      setPost(data);

      // Load blog title if post has a subdomain
      if (data.subdomain) {
        const { data: subdomainData } = await supabase
          .from('user_subdomains')
          .select('blog_title, blog_title_display')
          .eq('subdomain', data.subdomain)
          .maybeSingle();
        
        // Use display version for UI, normalized version as fallback
        if (subdomainData?.blog_title_display) {
          setBlogTitle(subdomainData.blog_title_display);
        } else if (subdomainData?.blog_title) {
          setBlogTitle(subdomainData.blog_title);
        }
      }
    } catch (err) {
      console.error('Error loading blog post:', err);
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const loadNextPost = async (currentSlug: string, urlSubdomain: string | null = null) => {
    try {
      // Get subdomain from URL params, then fallback to pathname
      let subdomain = urlSubdomain;
      if (!subdomain) {
        // Extract subdomain from URL path (e.g., /thelostarchives/... or /blog/subdomain/...)
        const pathname = window.location.pathname;
        const pathParts = pathname.split('/').filter(Boolean);
        
        // IMPORTANT: /thelostarchives/ is the main blog route, NOT a subdomain
        // Posts in THE LOST ARCHIVES have subdomain IS NULL
        if (pathParts[0] === 'thelostarchives') {
          // This is a main blog post, subdomain should be NULL
          subdomain = null;
        } else if (pathParts[0] === 'blog' && pathParts[1]) {
          // /blog/:subdomain/:slug format
          subdomain = pathParts[1];
        } else if (pathParts[0] === 'book-club' || 
                   pathParts[0] === 'gearheads' || 
                   pathParts[0] === 'borderlands' || 
                   pathParts[0] === 'science' || 
                   pathParts[0] === 'newtheory') {
          // These are actual subdomains
          subdomain = pathParts[0];
        } else {
          // Try hostname as fallback (but exclude localhost, www, and main domain)
          const hostname = window.location.hostname;
          const hostnameParts = hostname.split('.');
          if (hostnameParts.length > 1 && hostnameParts[0] !== 'www' && hostnameParts[0] !== 'thelostandunfounds') {
            subdomain = hostnameParts[0];
          } else {
            subdomain = null; // Main blog posts have NULL subdomain
          }
        }
      }
      
      // Get all published posts ordered by published_at (oldest first for reading order)
      let query = supabase
        .from('blog_posts')
        .select('slug, title, published_at, created_at, published, status')
        .order('published_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });
      
      // Filter by subdomain if present
      if (subdomain) {
        query = query.eq('subdomain', subdomain);
      } else {
        query = query.is('subdomain', null);
      }

      // Try to filter by published field if it exists
      try {
        query = query.eq('published', true);
      } catch (e) {
        // Column might not exist, will filter client-side
      }

      const { data: allPosts, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error loading posts for next button:', fetchError);
        return;
      }

      // Filter to only published posts
      const publishedPosts = allPosts?.filter((p: any) => {
        // Check if published field exists and is true, or if status is 'published'
        return p.published === true || (p.published === undefined && p.status === 'published');
      }) || [];

      // Find current post index
      const currentIndex = publishedPosts.findIndex((p: BlogPostListItem) => p.slug === currentSlug);
      
      // Get next post (next in chronological order - oldest to newest)
      if (currentIndex >= 0 && currentIndex < publishedPosts.length - 1) {
        setNextPost(publishedPosts[currentIndex + 1]);
      } else {
        setNextPost(null);
      }
    } catch (err) {
      console.error('Error finding next post:', err);
      setNextPost(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Function to convert URLs to clickable links in text
  const convertUrlsToLinks = (parts: (string | JSX.Element)[]): (string | JSX.Element)[] => {
    const urlRegex = /(https?:\/\/[^\s\)]+)/g;
    const result: (string | JSX.Element)[] = [];
    let keyCounter = 0;

    parts.forEach((part) => {
      if (typeof part === 'string') {
        let lastIndex = 0;
        let match;
        const matches: RegExpExecArray[] = [];
        
        // Collect all matches first
        while ((match = urlRegex.exec(part)) !== null) {
          matches.push(match);
        }

        // Process matches
        matches.forEach((match) => {
          // Add text before the URL
          if (match.index > lastIndex) {
            const beforeText = part.substring(lastIndex, match.index);
            if (beforeText) {
              result.push(beforeText);
            }
          }
          // Add the link element
          result.push(
            <a
              key={`link-${keyCounter++}`}
              href={match[1]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white underline hover:text-white/80 transition"
            >
              {match[1]}
            </a>
          );
          lastIndex = match.index + match[0].length;
        });

        // Add remaining text
        if (lastIndex < part.length) {
          const afterText = part.substring(lastIndex);
          if (afterText) {
            result.push(afterText);
          }
        }

        // If no URLs found, add the original string
        if (matches.length === 0) {
          result.push(part);
        }
      } else {
        // If it's already a JSX element, keep it as is
        result.push(part);
      }
    });

    return result.length > 0 ? result : parts;
  };

  // Normalize book title for matching - handles case, punctuation, and common variations
  const normalizeBookTitle = (title: string): string => {
    return title
      .toLowerCase()
      .trim()
      // Normalize apostrophes and quotes
      .replace(/[''`]/g, "'")
      // Normalize hyphens and dashes
      .replace(/[—–-]/g, '-')
      // Normalize commas and spacing (handle both with and without spaces)
      .replace(/,\s*/g, ', ')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Find book title match using intelligent fuzzy matching
  // Handles: case variations, apostrophes, punctuation, word order
  // IMPORTANT: Prefers full title matches (e.g., "The Hobbit" over "Hobbit")
  const findBookTitleMatch = (text: string, bookTitles: string[]): string | null => {
    if (!text || !bookTitles || bookTitles.length === 0) return null;
    
    const normalizedText = normalizeBookTitle(text);
    
    // Strategy 1: Exact normalized match (prefer longer/fuller titles first)
    // Sort by length descending to prefer "The Hobbit" over "Hobbit"
    const sortedTitles = [...bookTitles].sort((a, b) => b.length - a.length);
    for (const title of sortedTitles) {
      if (normalizeBookTitle(title) === normalizedText) {
        return title;
      }
    }
    
    // Strategy 2: Remove apostrophes and compare (Ender's Game = Enders Game)
    // Prefer longer titles first
    const removeApostrophes = (t: string) => normalizeBookTitle(t).replace(/[''`]/g, '');
    const textNoApostrophe = removeApostrophes(text);
    for (const title of sortedTitles) {
      if (removeApostrophes(title) === textNoApostrophe) {
        return title;
      }
    }
    
    // Strategy 2a: For "Ender's Game" specifically - handle case where text might have different apostrophe
    // Check if we're looking for a title with "ender" and "game"
    const textWordsCheck = normalizedText.split(/\s+/);
    const hasEnder = textWordsCheck.some(w => w.includes('ender'));
    const hasGame = textWordsCheck.some(w => w.includes('game'));
    
    if (hasEnder && hasGame) {
      // Look for titles containing both "ender" and "game"
      for (const title of sortedTitles) {
        const titleLower = normalizeBookTitle(title);
        if (titleLower.includes('ender') && titleLower.includes('game')) {
          // This is likely "Ender's Game" - return it
          return title;
        }
      }
    }
    
    // Strategy 2b: Remove commas and compare (The Lion, the Witch = The Lion the Witch)
    const removeCommas = (t: string) => normalizeBookTitle(t).replace(/,/g, '');
    const textNoComma = removeCommas(text);
    for (const title of sortedTitles) {
      if (removeCommas(title) === textNoComma) {
        return title;
      }
    }
    
    // Strategy 2c: Remove both apostrophes and commas
    const removeBoth = (t: string) => normalizeBookTitle(t).replace(/[',]/g, '');
    const textNoBoth = removeBoth(text);
    for (const title of sortedTitles) {
      if (removeBoth(title) === textNoBoth) {
        return title;
      }
    }
    
    // Strategy 3: Word-by-word matching (handle punctuation differences)
    // Split into words, normalize each word, compare
    const getWords = (t: string) => {
      return normalizeBookTitle(t)
        .replace(/[.,!?;:()\[\]{}'"]/g, ' ') // Remove punctuation
        .split(/\s+/)
        .filter(w => w.length > 0);
    };
    
    const textWords = getWords(text);
    for (const title of sortedTitles) {
      const titleWords = getWords(title);
      
      // Check if all significant words from title appear in text (or vice versa)
      // Allow for some flexibility - at least 80% of words must match
      const significantTitleWords = titleWords.filter(w => w.length > 2);
      const significantTextWords = textWords.filter(w => w.length > 2);
      
      if (significantTitleWords.length === 0 || significantTextWords.length === 0) continue;
      
      // Count how many title words appear in text
      const matchingWords = significantTitleWords.filter(tw => 
        significantTextWords.some(txt => txt === tw || txt.includes(tw) || tw.includes(txt))
      );
      
      // Also check reverse - text words in title (for partial matches)
      const reverseMatch = significantTextWords.filter(txt =>
        significantTitleWords.some(tw => txt === tw || txt.includes(tw) || tw.includes(txt))
      );
      
      // If most words match in either direction, it's a match
      const matchRatio = Math.max(
        matchingWords.length / significantTitleWords.length,
        reverseMatch.length / significantTextWords.length
      );
      
      if (matchRatio >= 0.7) { // 70% word match threshold
        return title;
      }
    }
    
    // Strategy 4: Core title matching (remove "the", "a", "an")
    const getCoreTitle = (t: string) => {
      return normalizeBookTitle(t)
        .replace(/^(the|a|an)\s+/i, '')
        .replace(/\s+(the|a|an)$/i, '')
        .replace(/'/g, ''); // Also remove apostrophes for core matching
    };
    
    const coreText = getCoreTitle(text);
    for (const title of sortedTitles) {
      const coreTitle = getCoreTitle(title);
      if (coreTitle === coreText || 
          (coreTitle.length > 5 && coreText.includes(coreTitle)) ||
          (coreText.length > 5 && coreTitle.includes(coreText))) {
        return title;
      }
    }
    
    return null;
  };

  // Function to format text with bold emphasis for book titles and brand names
  // bookLinkCounts: tracks how many times each book has been linked
  // allowLinks: whether to allow creating new links (true for intro and book sections)
  const formatTextWithEmphasis = (text: string, bookLinkCounts?: Record<string, number>, allowLinks: boolean = false) => {
    // Safety check - return original text if invalid input
    if (!text || typeof text !== 'string') {
      return text || '';
    }
    
    try {
    // Build book links from post data or use defaults
    const defaultBookLinks: Record<string, string> = {
      'The E-Myth Revisited': 'https://amzn.to/49LFRbv',
      'This Is Not a T-Shirt': 'https://amzn.to/4rJCNn1',
      'The Alchemist': 'https://amzn.to/49HqnFx',
      'Contagious': 'https://amzn.to/3XoOv8A'
    };

    // Use Amazon links from post data if available, otherwise use defaults
    const bookLinks: Record<string, string> = {};
    
    if (post?.amazon_affiliate_links && Array.isArray(post.amazon_affiliate_links)) {
      // Build map from submitted affiliate links
      post.amazon_affiliate_links.forEach((link: AffiliateLink) => {
        if (link.book_title && link.link) {
          bookLinks[link.book_title] = link.link;
        }
      });
    }
    
    // Merge with defaults (submitted links take precedence)
    Object.assign(bookLinks, defaultBookLinks);

    // Build emphasis terms list - include all book titles from links, plus defaults
    const emphasisTerms: string[] = [
      'THE LOST+UNFOUNDS',
      'THE LOST ARCHIVES BOOK CLUB',
      'BOOK CLUB',
      'The Hundreds',
      'Personal Legend',
      'Bitcoin',
      'Maktub'
    ];
    
    // Add all book titles from links (longer titles first to avoid partial matches)
    const bookTitles = Object.keys(bookLinks).sort((a, b) => b.length - a.length);
    emphasisTerms.push(...bookTitles);
    
    // Add default terms that might not be in links
    const defaultTerms = ['The E-Myth Revisited', 'This Is Not a T-Shirt', 'The Alchemist', 'Contagious'];
    defaultTerms.forEach(term => {
      if (!emphasisTerms.includes(term)) {
        emphasisTerms.push(term);
      }
    });

    // Create improved regex that handles punctuation and apostrophes better
    // Build patterns that match book titles with flexible punctuation handling
    const escapedTerms = emphasisTerms
      .filter(term => term && term.length > 0) // Filter out empty terms
      .map(term => {
        try {
          // Escape special regex characters
          let escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          // Handle apostrophes - allow both straight and curly quotes (optional for flexibility)
          // This matches "Ender's Game" whether written with or without apostrophe
          escaped = escaped.replace(/'/g, "[''`]?");
          // Handle hyphens - allow various dash types (make optional)
          escaped = escaped.replace(/-/g, '[—–-]?');
          // Handle commas - make them optional with flexible spacing
          escaped = escaped.replace(/,/g, ',?\\s*');
          return escaped;
        } catch (e) {
          console.warn('Error escaping term:', term, e);
          return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Fallback to basic escaping
        }
      })
      .filter(term => term && term.length > 0); // Filter out any empty results
    
    // Only create regex if we have terms to match
    if (escapedTerms.length === 0) {
      return text; // Return original text if no terms to match
    }
    
    // Improved regex: more flexible word boundaries, handles punctuation better
    // Allows for apostrophes, commas, and various punctuation
    // Use word boundaries more flexibly - allow punctuation before/after
    let combinedRegex: RegExp;
    try {
      combinedRegex = new RegExp(
        `(?:^|\\s|[.,!?;:()\\[\\]"])(${escapedTerms.join('|')})(?=\\s|$|[.,!?;:()\\[\\]"])`,
        'gi'
      );
    } catch (e) {
      console.error('Error creating regex:', e, 'Terms:', escapedTerms);
      return text; // Return original text if regex creation fails
    }

    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;
    let keyCounter = 0;
    const processedIndices = new Set<number>(); // Track processed positions to avoid duplicates

    // Reset regex lastIndex
    combinedRegex.lastIndex = 0;

    // Collect all matches first to avoid overlapping
    let matches: Array<{index: number, length: number, text: string}> = [];
    try {
      // Reset regex lastIndex to avoid issues
      combinedRegex.lastIndex = 0;
      
      while ((match = combinedRegex.exec(text)) !== null) {
        // Safety check - prevent infinite loops
        if (matches.length > 1000) {
          console.warn('Too many matches, stopping to prevent infinite loop');
          break;
        }
        
        // The regex includes leading space/start, so adjust the index
        const fullMatch = match[0];
        const actualText = match[1]; // The captured group (the term itself)
        
        if (!actualText || match.index === undefined) {
          continue;
        }
        
        const leadingSpace = fullMatch.length - actualText.length;
        const matchStart = match.index + leadingSpace; // Actual start of the term
        const matchEnd = matchStart + actualText.length;
        
        // Validate indices
        if (matchStart < 0 || matchStart >= text.length || matchEnd > text.length) {
          continue;
        }
        
        // Check if this match overlaps with a previous one
        const isOverlapping = matches.some(m => 
          (matchStart >= m.index && matchStart < m.index + m.length) ||
          (matchEnd > m.index && matchEnd <= m.index + m.length) ||
          (matchStart <= m.index && matchEnd >= m.index + m.length)
        );
        
        if (!isOverlapping && !processedIndices.has(matchStart)) {
          matches.push({
            index: matchStart,
            length: actualText.length,
            text: actualText
          });
          processedIndices.add(matchStart);
        }
      }
    } catch (regexError: any) {
      console.error('Error in regex matching:', regexError);
      // Return original text if regex matching fails
      return text;
    }

    // ALWAYS try intelligent fallback matching for ALL book titles from database
    // This ensures we catch all books, especially those with punctuation variations like "Ender's Game"
    if (Object.keys(bookLinks).length > 0) {
      // For each book title in the database, search the text intelligently
      // Sort by length (longest first) to prefer full titles
      const sortedBookTitles = Object.keys(bookLinks).sort((a, b) => b.length - a.length);
      
      for (const bookTitle of sortedBookTitles) {
        // Check if we already found this book title in regex matches
        // But don't skip - we want to find ALL instances, not just the first one
        // The link count limit will handle preventing too many links
        const alreadyFoundInRegex = matches.some(m => {
          const matchResult = findBookTitleMatch(m.text, [bookTitle]);
          return matchResult === bookTitle;
        });
        
        // For "Ender's Game" specifically, be extra aggressive
        const isEndersGame = bookTitle.toLowerCase().includes("ender") && bookTitle.toLowerCase().includes("game");
        
        // Even if found in regex, try intelligent matching to catch variations
        // This ensures we find "Ender's Game" even if content has "Enders Game" or vice versa
        
        // Use intelligent word-based search that handles apostrophes, punctuation, case
        const normalizedTitle = normalizeBookTitle(bookTitle);
        const titleWords = normalizedTitle
          .replace(/'/g, ' ') // Replace apostrophes with space for word splitting
          .split(/\s+/)
          .filter(w => w.length > 2); // Only significant words
        
        // Intelligent search: look for the book title in text using multiple strategies
        if (titleWords.length > 0) {
          // Strategy 1: Search for the book title as a phrase (handles apostrophes, case, punctuation)
          // Build flexible patterns that match the title with variations
          const searchPatterns: string[] = [];
          
          // Pattern 1: Exact title with apostrophes (prefer this for titles like "Ender's Game")
          // First try with apostrophe variations (required or optional)
          if (bookTitle.includes("'")) {
            const withApostrophe = bookTitle
              .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex chars
              .replace(/'/g, "[''`]") // Apostrophe variations (required - must have some form of apostrophe)
              .replace(/,/g, ',?\\s*'); // Commas optional with flexible spacing
            searchPatterns.push(withApostrophe);
            
            // Also try with optional apostrophe for flexibility
            const optionalApostrophe = bookTitle
              .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              .replace(/'/g, "[''`]?") // Apostrophe variations (optional)
              .replace(/,/g, ',?\\s*');
            searchPatterns.push(optionalApostrophe);
          } else {
            // No apostrophe in title, use standard pattern
            const exactPattern = bookTitle
              .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              .replace(/,/g, ',?\\s*');
            searchPatterns.push(exactPattern);
          }
          
          // Pattern 2: Title without apostrophes (Ender's Game = Enders Game)
          // This is important for matching text that might have lost the apostrophe
          const noApostrophe = bookTitle.replace(/'/g, '');
          if (noApostrophe !== bookTitle) {
            const noApostropheEscaped = noApostrophe
              .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              .replace(/,/g, ',?\\s*'); // Also handle commas
            searchPatterns.push(noApostropheEscaped);
          }
          
          // Pattern 3: Word sequence (handles punctuation differences)
          // For "Ender's Game", this becomes "enders" + "game"
          const wordPattern = titleWords
            .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('\\s+[,\\s]*'); // Allow commas/spaces between words
          searchPatterns.push(wordPattern);
          
          // Pattern 3a: Word sequence with explicit apostrophe handling for "Ender's Game"
          // This ensures "Ender's Game" matches "Ender's Game" even if apostrophe is different type
          if (bookTitle.includes("'")) {
            const wordsWithApostrophe = bookTitle
              .replace(/'/g, "[''`]?") // Optional apostrophe between words
              .split(/\s+/)
              .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
              .join('\\s+');
            searchPatterns.push(wordsWithApostrophe);
          }
          
          // Pattern 3b: Word sequence with commas handled explicitly
          const wordPatternWithCommas = titleWords
            .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('(?:,?\\s+|\\s+)'); // Explicit comma handling
          searchPatterns.push(wordPatternWithCommas);
          
          // Pattern 4: Core words only (skip "the", "a", "an")
          const coreWords = titleWords.filter(w => !['the', 'a', 'an'].includes(w.toLowerCase()));
          if (coreWords.length > 0 && coreWords.length < titleWords.length) {
            searchPatterns.push(coreWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+[,\\s]*'));
          }
          
          // Pattern 5: For "The Lion, the Witch and the Wardrobe" - handle "and" variations
          if (bookTitle.toLowerCase().includes(' and ')) {
            const withAnd = bookTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/,/g, ',?\\s*').replace(/\s+and\s+/gi, '\\s+(?:and|&)\\s+');
            searchPatterns.push(withAnd);
          }
          
          // Pattern 6: Very permissive - just match significant words in order (for complex titles)
          if (titleWords.length >= 3) {
            const permissivePattern = titleWords
              .slice(0, Math.min(4, titleWords.length)) // Take first 4 words max
              .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
              .join('\\s+[,\\s]*(?:and\\s+)?'); // Allow commas and "and" between words
            searchPatterns.push(permissivePattern);
          }
          
          // Try each pattern to find the book title in text
          for (const pattern of searchPatterns) {
            if (!pattern) continue;
            
            try {
              // Try multiple regex approaches
              const regexVariants = [
                `\\b(${pattern})\\b`, // Word boundaries
                `(?:^|\\s|[.,!?;:()\\[\\]"])(${pattern})(?=\\s|$|[.,!?;:()\\[\\]"])`, // With punctuation
                `(${pattern})` // Most permissive
              ];
              
              for (const regexPattern of regexVariants) {
                const searchRegex = new RegExp(regexPattern, 'gi');
                searchRegex.lastIndex = 0;
                let match;
                let attempts = 0;
                
                while ((match = searchRegex.exec(text)) !== null && attempts < 20) {
                  attempts++;
                  if (match && match[1] && match.index !== undefined) {
                    const matchStart = match.index + (match[0].length - match[1].length);
                    if (matchStart >= 0 && matchStart < text.length) {
                      // Verify this actually matches the book title using intelligent matching
                      const matchedText = match[1];
                      const verifiedMatch = findBookTitleMatch(matchedText, [bookTitle]);
                      
                      if (verifiedMatch === bookTitle) {
                        // Check for overlaps
                        const isOverlapping = matches.some(m => 
                          (matchStart >= m.index && matchStart < m.index + m.length) ||
                          (matchStart + matchedText.length > m.index && matchStart + matchedText.length <= m.index + m.length) ||
                          (matchStart <= m.index && matchStart + matchedText.length >= m.index + m.length)
                        );
                        
                        if (!isOverlapping) {
                          matches.push({
                            index: matchStart,
                            length: matchedText.length,
                            text: matchedText
                          });
                          // Don't break here - continue to find all instances
                        }
                      }
                    }
                  }
                }
                
                // Continue to next pattern even if we found a match
                // This allows us to find all variations and instances
              }
            } catch (e) {
              console.warn('Error in intelligent book title search:', e, 'Book:', bookTitle);
            }
          }
          
          // Final fallback: Simple case-insensitive text search with word boundaries
          // This catches books that might have been missed by regex
          const normalizedBookTitle = normalizeBookTitle(bookTitle);
          const bookTitleWords = normalizedBookTitle.split(/\s+/).filter(w => w.length > 0);
          
          if (bookTitleWords.length > 0) {
            // Build a pattern that matches the book title as whole words
            // Handle apostrophes specially for "Ender's Game"
            const wordBoundaryPattern = bookTitleWords
              .map(w => {
                // If word contains apostrophe (like "ender's"), handle it specially
                if (w.includes("'")) {
                  // Allow apostrophe variations - make it optional for flexibility
                  return w.replace(/'/g, "[''`]?").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                }
                return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              })
              .join('\\s+[,\\s]*(?:and\\s+)?'); // Allow spaces, commas, and "and" between words
            
            // Try multiple regex patterns for better matching
            const fallbackPatterns = [
              `\\b(${wordBoundaryPattern})\\b`, // Word boundaries
              `(${wordBoundaryPattern})`, // Without word boundaries (more permissive)
            ];
            
            for (const pattern of fallbackPatterns) {
              try {
                const fallbackRegex = new RegExp(pattern, 'gi');
                fallbackRegex.lastIndex = 0;
                let fallbackMatch;
                
                while ((fallbackMatch = fallbackRegex.exec(text)) !== null) {
                  if (fallbackMatch[1] && fallbackMatch.index !== undefined) {
                    const matchStart = fallbackMatch.index;
                    const matchedText = fallbackMatch[1];
                    
                    // Verify it's a real match using our matching function
                    const verifiedMatch = findBookTitleMatch(matchedText, [bookTitle]);
                    if (verifiedMatch === bookTitle) {
                      // Check if this overlaps with existing matches
                      const isOverlapping = matches.some(m => 
                        (matchStart >= m.index && matchStart < m.index + m.length) ||
                        (matchStart + matchedText.length > m.index && matchStart + matchedText.length <= m.index + m.length) ||
                        (matchStart <= m.index && matchStart + matchedText.length >= m.index + m.length)
                      );
                      
                      if (!isOverlapping) {
                        matches.push({
                          index: matchStart,
                          length: matchedText.length,
                          text: matchedText
                        });
                        // Found a match, can break from pattern loop
                        break;
                      }
                    }
                  }
                }
              } catch (e) {
                // Silently fail - regex might be invalid, but that's okay
                // Continue to next pattern
              }
            }
          }
          
          // EXTRA FALLBACK for "Ender's Game" - direct substring search
          // This is a last resort to catch any instance we might have missed
          if (isEndersGame || bookTitle.toLowerCase().includes("ender")) {
            const textLower = text.toLowerCase();
            const searchTerms = [
              "ender's game",
              "enders game",
              "ender game"
            ];
            
            for (const searchTerm of searchTerms) {
              let searchIndex = 0;
              while ((searchIndex = textLower.indexOf(searchTerm, searchIndex)) !== -1) {
                // Extract the actual text at this position
                const actualMatch = text.substring(searchIndex, searchIndex + searchTerm.length);
                
                // Verify it matches the book title
                const verifiedMatch = findBookTitleMatch(actualMatch, [bookTitle]);
                if (verifiedMatch === bookTitle) {
                  // Check if this overlaps with existing matches
                  const isOverlapping = matches.some(m => 
                    (searchIndex >= m.index && searchIndex < m.index + m.length) ||
                    (searchIndex + actualMatch.length > m.index && searchIndex + actualMatch.length <= m.index + m.length) ||
                    (searchIndex <= m.index && searchIndex + actualMatch.length >= m.index + m.length)
                  );
                  
                  if (!isOverlapping) {
                    matches.push({
                      index: searchIndex,
                      length: actualMatch.length,
                      text: actualMatch
                    });
                  }
                }
                searchIndex += 1;
              }
            }
          }
        }
      }
      
      // Remove duplicates and sort
      const uniqueMatches: Array<{index: number, length: number, text: string}> = [];
      matches.forEach(m => {
        if (!uniqueMatches.some(um => 
          (m.index >= um.index && m.index < um.index + um.length) ||
          (um.index >= m.index && um.index < m.index + m.length)
        )) {
          uniqueMatches.push(m);
        }
      });
      matches = uniqueMatches.sort((a, b) => a.index - b.index);
    }

    // Sort matches by index
    matches.sort((a, b) => a.index - b.index);

    // Process matches
    matches.forEach((matchInfo) => {
      // Validate match info
      if (!matchInfo || matchInfo.index === undefined || !matchInfo.text) {
        return;
      }
      
      // Add text before the match
      if (matchInfo.index > lastIndex) {
        const beforeText = text.substring(lastIndex, matchInfo.index);
        if (beforeText) {
          parts.push(beforeText);
        }
      }
      
      const matchedText = matchInfo.text;
      if (!matchedText) {
        return;
      }
      
      // Find the affiliate link using improved fuzzy matching
      // IMPORTANT: Prefer full title matches (e.g., "The Hobbit" over "Hobbit")
      // Sort book titles by length (longest first) to prefer full titles
      const sortedBookTitles = Object.keys(bookLinks).sort((a, b) => b.length - a.length);
      let bookKey = findBookTitleMatch(matchedText, sortedBookTitles);
      
      // If no match found, try more aggressive matching for "Ender's Game"
      if (!bookKey && (matchedText.toLowerCase().includes('ender') && matchedText.toLowerCase().includes('game'))) {
        // Look for any book title containing "ender" and "game"
        for (const title of sortedBookTitles) {
          const titleLower = title.toLowerCase();
          if (titleLower.includes('ender') && titleLower.includes('game')) {
            bookKey = title;
            break;
          }
        }
      }
      
      const affiliateLink = bookKey ? bookLinks[bookKey] : undefined;
      
      // Preserve original case from article content - don't change the author's formatting
      // If we found a match, use the original matched text (preserves author's case)
      // Fallback to matchedText if bookKey exists but we want to preserve original formatting
      const displayText = matchedText || '';
      
      // Check if it's an emphasis term (THE LOST+UNFOUNDS, etc.) - these should always be bold
      const isEmphasisTerm = emphasisTerms.some(term => 
        normalizeBookTitle(term) === normalizeBookTitle(matchedText)
      );
      
      // If it's a book title with an affiliate link
      if (affiliateLink && bookLinkCounts) {
        const currentCount = bookLinkCounts[bookKey!] || 0;
        // Only create link if: we're allowed to link AND we haven't exceeded 2 links for this book
        if (allowLinks && currentCount < 2) {
          bookLinkCounts[bookKey!] = currentCount + 1;
          parts.push(
            <a
              key={`link-${keyCounter++}`}
              href={affiliateLink}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-white underline hover:text-white/80 transition"
            >
              {displayText}
            </a>
          );
        } else {
          // Exceeded link limit or not allowed - make it bold (no link)
          parts.push(
            <strong key={`bold-${keyCounter++}`} className="font-bold text-white">
              {displayText}
            </strong>
          );
        }
      } else if (affiliateLink && !bookLinkCounts) {
        // Fallback: if bookLinkCounts not provided, allow link (for backwards compatibility)
        parts.push(
          <a
            key={`link-${keyCounter++}`}
            href={affiliateLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-white underline hover:text-white/80 transition"
          >
            {displayText}
          </a>
        );
      } else if (bookKey || isEmphasisTerm) {
        // It's a book title (with or without link) OR an emphasis term - make it bold
        parts.push(
          <strong key={`bold-${keyCounter++}`} className="font-bold text-white">
            {displayText}
          </strong>
        );
      } else {
        // Regular text - return as-is
        parts.push(displayText);
      }
      
      lastIndex = matchInfo.index + matchInfo.length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      const afterText = text.substring(lastIndex);
      if (afterText) {
        parts.push(afterText);
      }
    }

    // If no matches were found, return original text as string
    if (parts.length === 0) {
      return text;
    }

    // If only one part and it's a string matching the original, return as string
    if (parts.length === 1 && typeof parts[0] === 'string' && parts[0] === text) {
      return text;
    }

    return parts;
    } catch (error: any) {
      console.error('Error in formatTextWithEmphasis:', error, 'Text:', text?.substring(0, 100));
      // Return original text if formatting fails
      return text;
    }
  };

  // Helper function to format Amazon Affiliate Disclosure with bold, uppercase author name (mentioned once)
  const formatDisclosure = (authorName: string) => {
    const authorNameUpper = authorName.toUpperCase();
    return (
      <>
        Amazon Affiliate Disclosure: As an Amazon Associate, <strong className="font-bold text-white">{authorNameUpper}</strong> earns from qualifying purchases. Some links in this post are affiliate links, which means a commission may be earned if you click through and make a purchase. This helps support the author and allows us to continue creating content. Thank you for your support!
      </>
    );
  };

  const formatContent = (content: string) => {
    try {
      // Split by double newlines to create paragraphs
      let paragraphs = content.split(/\n\n+/);
    
    // Also split paragraphs that contain a heading followed by body text on separate lines
    // This handles cases where heading and body are separated by single newline
    const expandedParagraphs: string[] = [];
    paragraphs.forEach(para => {
      const lines = para.split('\n').map(l => l.trim()).filter(l => l !== '');
      if (lines.length >= 2) {
        const firstLine = lines[0];
        // Check if first line looks like a heading
        // Match common heading patterns or title case short phrases
        const matchesHeadingPattern = firstLine.match(/^(Conclusion|Early|The E-Myth|Contagious|This Is Not|The Alchemist|Bitcoin|A Creative Brand)/i);
        const isTitleCaseShort = (
          firstLine.split(' ').every(word => word.length === 0 || word[0] === word[0].toUpperCase()) && 
          firstLine.length < 100 && 
          firstLine.split(' ').length < 12
        );
        
        // More aggressive: if it matches heading pattern, definitely split it
        const looksLikeHeading = matchesHeadingPattern !== null || (
          firstLine.length < 100 &&
          !firstLine.match(/[.!?]$/) &&
          firstLine.split(' ').length < 15 &&
          isTitleCaseShort
        );
        
        if (looksLikeHeading) {
          // Split: heading is first line, body is the rest
          expandedParagraphs.push(firstLine);
          expandedParagraphs.push(lines.slice(1).join(' '));
        } else {
          expandedParagraphs.push(para);
        }
      } else {
        expandedParagraphs.push(para);
      }
    });
    
    paragraphs = expandedParagraphs;
    const elements: JSX.Element[] = [];
    
    // Track book link counts (max 2 per book: once in intro, once in section)
    // Initialize with books from post's amazon_affiliate_links
    const bookLinkCounts: Record<string, number> = {};
    if (post?.amazon_affiliate_links && Array.isArray(post.amazon_affiliate_links)) {
      post.amazon_affiliate_links.forEach((link: AffiliateLink) => {
        if (link.book_title) {
          bookLinkCounts[link.book_title] = 0;
        }
      });
    }
    // Also add defaults if not already present
    const defaultBooks = ['The E-Myth Revisited', 'This Is Not a T-Shirt', 'The Alchemist', 'Contagious'];
    defaultBooks.forEach(book => {
      if (!bookLinkCounts[book]) {
        bookLinkCounts[book] = 0;
      }
    });
    
    // Determine intro section (first 3 paragraphs)
    const introEndIndex = Math.min(3, paragraphs.length);
    
    // Add Amazon Affiliate Disclosure after introduction if post has affiliate links
    let disclosureAdded = false;
    let lastIntroElementIndex = -1;
    if (post?.amazon_affiliate_links && post.amazon_affiliate_links.length > 0) {
      // Check if disclosure already exists in content
      const hasDisclosure = post.content.toLowerCase().includes('amazon affiliate disclosure');
      if (!hasDisclosure) {
        // We'll add it after the intro section
        disclosureAdded = true;
      }
    }
    
    paragraphs.forEach((para, index) => {
      const trimmed = para.trim();
      if (trimmed === '') return;
      
      // Handle section separator (⸻)
      if (trimmed === '⸻' || trimmed.match(/^⸻\s*$/)) {
        elements.push(
          <hr key={`separator-${index}`} className="my-8 border-white" />
        );
        
        // Track if this is the last intro element and add disclosure if needed
        if (index < introEndIndex) {
          lastIntroElementIndex = elements.length - 1;
        }
        if (disclosureAdded && index === introEndIndex - 1) {
          const authorName = post.author_name || 'THE LOST+UNFOUNDS';
          
          elements.push(
            <div key="affiliate-disclosure" className="mb-6 mx-auto max-w-2xl mt-8">
              <p className="text-white/60 text-xs italic leading-relaxed text-justify border border-white p-4 bg-white/5">
                {formatDisclosure(authorName)}
              </p>
            </div>
          );
          disclosureAdded = false;
        }
        return;
      }
      
      // Check if it's a section heading
      // Headings are usually:
      // - Short lines (under 100 chars)
      // - Don't end with period/question/exclamation (but can have colon)
      // - Have fewer than 15 words
      // - Appear after empty lines or at the start
      // - Or start with common heading words like "Conclusion", "Introduction", "Early", etc.
      const prevPara = paragraphs[index - 1]?.trim() || '';
      const isAfterEmptyLine = prevPara === '' || prevPara === '⸻';
      const startsWithHeadingWord = trimmed.match(/^(Conclusion|Early|The E-Myth|Contagious|This Is Not|The Alchemist|Bitcoin|A Creative Brand|Building|Leaders|How|What|When|Where|Why)/i);
      
      // Also check if it looks like a section title (title case, short, no ending punctuation)
      const isTitleCase = trimmed.split(' ').every(word => 
        word.length === 0 || word[0] === word[0].toUpperCase()
      );
      const isShortTitle = trimmed.length < 100 && trimmed.split(' ').length < 12;
      
      // Check if it contains a colon (common for book section headings like "Book Title: Subtitle")
      const hasColon = trimmed.includes(':');
      
      // More lenient heading detection - if it matches a heading pattern, it's likely a heading
      // If it starts with a known heading word, it's definitely a heading
      const isDefiniteHeading = startsWithHeadingWord !== null && 
                                trimmed.length < 100 && 
                                !trimmed.match(/[.!?]$/) &&
                                trimmed.split(' ').length < 15;
      
      const isLikelyHeading = isDefiniteHeading || (
        trimmed.length < 100 && 
        !trimmed.match(/[.!?]$/) && 
        trimmed.split(' ').length < 15 &&
        (
          index === 0 || 
          isAfterEmptyLine ||
          (isTitleCase && isShortTitle && isAfterEmptyLine) ||
          (hasColon && isShortTitle) // Headings with colons are likely section headers
        )
      );
      
      if (isLikelyHeading) {
        // Check if this heading contains any book titles using intelligent fuzzy matching
        // Allow links in headings that contain book titles
        // For headings with colons, try matching both the full heading and the part before the colon
        const headingToMatch = trimmed.includes(':') ? trimmed.split(':')[0].trim() : trimmed;
        const containsBookTitle = Object.keys(bookLinkCounts).some(bookTitle => {
          // Try matching the full heading first
          const fullMatch = findBookTitleMatch(trimmed, [bookTitle]) === bookTitle;
          if (fullMatch) return true;
          // If heading has a colon, try matching just the part before the colon
          if (trimmed.includes(':')) {
            return findBookTitleMatch(headingToMatch, [bookTitle]) === bookTitle;
          }
          return false;
        });
        
        // Format with emphasis, allowing links in headings that contain book titles
        const headingContent = formatTextWithEmphasis(trimmed, bookLinkCounts, containsBookTitle);
        elements.push(
          <h2 key={`heading-${index}`} className="text-2xl font-bold text-white mt-12 mb-8 text-left first:mt-0">
            {Array.isArray(headingContent) ? headingContent : headingContent}
          </h2>
        );
        
        // Track if this is the last intro element
        if (index < introEndIndex) {
          lastIntroElementIndex = elements.length - 1;
        }
        
        // Add disclosure after intro if needed
        if (disclosureAdded && index === introEndIndex - 1) {
          const authorName = post.author_name || 'THE LOST+UNFOUNDS';
          
          elements.push(
            <div key="affiliate-disclosure" className="mb-6 mx-auto max-w-2xl mt-8">
              <p className="text-white/60 text-xs italic leading-relaxed text-justify border border-white p-4 bg-white/5">
                {formatDisclosure(authorName)}
              </p>
            </div>
          );
          disclosureAdded = false;
        }
        
        return;
      }
      
      // Check if paragraph starts with a number followed by a period (numbered list)
      const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        const isInIntro = index < introEndIndex;
        // Check if this is in a book section
        let isInBookSection = false;
        let lastHeadingIndex = -1;
        
        // Find the most recent heading
        for (let i = index - 1; i >= 0; i--) {
          const prevPara = paragraphs[i]?.trim() || '';
          if (prevPara === '' || prevPara === '⸻') continue;
          
          const isHeading = prevPara.length < 100 && 
                           !prevPara.match(/[.!?]$/) && 
                           prevPara.split(' ').length < 15;
          
          if (isHeading) {
            lastHeadingIndex = i;
            break;
          }
        }
        
        // Check if we're in a book section
        if (lastHeadingIndex >= 0 && lastHeadingIndex < index) {
          const headingPara = paragraphs[lastHeadingIndex]?.trim() || '';
          const headingToMatch = headingPara.includes(':') ? headingPara.split(':')[0].trim() : headingPara;
          const containsBookTitle = Object.keys(bookLinkCounts).some(bookTitle => {
            const fullMatch = findBookTitleMatch(headingPara, [bookTitle]) === bookTitle;
            if (fullMatch) return true;
            if (headingPara.includes(':')) {
              return findBookTitleMatch(headingToMatch, [bookTitle]) === bookTitle;
            }
            return false;
          });
          
          if (containsBookTitle) {
            isInBookSection = true;
          } else if (headingPara.includes(':')) {
            // Character-based section - check if content mentions a book
            const contentMentionsBook = Object.keys(bookLinkCounts).some(bookTitle => {
              return findBookTitleMatch(numberedMatch[2], [bookTitle]) === bookTitle;
            });
            if (contentMentionsBook) {
              isInBookSection = true;
            }
          }
        }
        
        // Also check if content itself mentions a book
        if (!isInBookSection && !isInIntro) {
          const contentMentionsBook = Object.keys(bookLinkCounts).some(bookTitle => {
            return findBookTitleMatch(numberedMatch[2], [bookTitle]) === bookTitle;
          });
          if (contentMentionsBook) {
            isInBookSection = true;
          }
        }
        
        const allowLinks = isInIntro || isInBookSection;
        const content = formatTextWithEmphasis(numberedMatch[2], bookLinkCounts, allowLinks);
        elements.push(
          <p key={index} className="mb-6 text-white/90 text-lg leading-relaxed text-left">
            <span className="font-bold">{numberedMatch[1]}.</span>{' '}
            {Array.isArray(content) ? content : content}
          </p>
        );
        
        // Track if this is the last intro element and add disclosure if needed
        if (isInIntro) {
          lastIntroElementIndex = elements.length - 1;
        }
        if (disclosureAdded && index === introEndIndex - 1) {
          const authorName = post.author_name || 'THE LOST+UNFOUNDS';
          
          elements.push(
            <div key="affiliate-disclosure" className="mb-6 mx-auto max-w-2xl mt-8">
              <p className="text-white/60 text-xs italic leading-relaxed text-justify border border-white p-4 bg-white/5">
                {formatDisclosure(authorName)}
              </p>
            </div>
          );
          disclosureAdded = false;
        }
        return;
      }
      
      // Check for bullet points (lines starting with • or -)
      if (trimmed.match(/^[•\-\*]\s+/)) {
        const bulletText = trimmed.replace(/^[•\-\*]\s+/, '');
        const isInIntro = index < introEndIndex;
        // Check if this is in a book section
        let isInBookSection = false;
        let lastHeadingIndex = -1;
        
        // Find the most recent heading
        for (let i = index - 1; i >= 0; i--) {
          const prevPara = paragraphs[i]?.trim() || '';
          if (prevPara === '' || prevPara === '⸻') continue;
          
          const isHeading = prevPara.length < 100 && 
                           !prevPara.match(/[.!?]$/) && 
                           prevPara.split(' ').length < 15;
          
          if (isHeading) {
            lastHeadingIndex = i;
            break;
          }
        }
        
        // Check if we're in a book section
        if (lastHeadingIndex >= 0 && lastHeadingIndex < index) {
          const headingPara = paragraphs[lastHeadingIndex]?.trim() || '';
          const headingToMatch = headingPara.includes(':') ? headingPara.split(':')[0].trim() : headingPara;
          const containsBookTitle = Object.keys(bookLinkCounts).some(bookTitle => {
            const fullMatch = findBookTitleMatch(headingPara, [bookTitle]) === bookTitle;
            if (fullMatch) return true;
            if (headingPara.includes(':')) {
              return findBookTitleMatch(headingToMatch, [bookTitle]) === bookTitle;
            }
            return false;
          });
          
          if (containsBookTitle) {
            isInBookSection = true;
          } else if (headingPara.includes(':')) {
            // Character-based section - check if content mentions a book
            const contentMentionsBook = Object.keys(bookLinkCounts).some(bookTitle => {
              return findBookTitleMatch(bulletText, [bookTitle]) === bookTitle;
            });
            if (contentMentionsBook) {
              isInBookSection = true;
            }
          }
        }
        
        // Also check if content itself mentions a book
        if (!isInBookSection && !isInIntro) {
          const contentMentionsBook = Object.keys(bookLinkCounts).some(bookTitle => {
            return findBookTitleMatch(bulletText, [bookTitle]) === bookTitle;
          });
          if (contentMentionsBook) {
            isInBookSection = true;
          }
        }
        
        const allowLinks = isInIntro || isInBookSection;
        const content = formatTextWithEmphasis(bulletText, bookLinkCounts, allowLinks);
        elements.push(
          <p key={index} className="mb-4 text-white/90 text-lg leading-relaxed text-left pl-4">
            <span className="text-white/60 mr-2">•</span>
            {Array.isArray(content) ? content : content}
          </p>
        );
        
        // Track if this is the last intro element and add disclosure if needed
        if (isInIntro) {
          lastIntroElementIndex = elements.length - 1;
        }
        if (disclosureAdded && index === introEndIndex - 1) {
          const authorName = post.author_name || 'THE LOST+UNFOUNDS';
          
          elements.push(
            <div key="affiliate-disclosure" className="mb-6 mx-auto max-w-2xl mt-8">
              <p className="text-white/60 text-xs italic leading-relaxed text-justify border border-white p-4 bg-white/5">
                {formatDisclosure(authorName)}
              </p>
            </div>
          );
          disclosureAdded = false;
        }
        return;
      }
      
      // Check if this is the Amazon Affiliate Disclosure
      const isAffiliateDisclosure = trimmed.startsWith('Amazon Affiliate Disclosure:');
      
      // If it's a disclosure in the content, format it with bold uppercase author name
      if (isAffiliateDisclosure) {
        const authorName = post.author_name || 'THE LOST+UNFOUNDS';
        elements.push(
          <div key={index} className="mb-6 mx-auto max-w-2xl">
            <p className="text-white/60 text-xs italic leading-relaxed text-justify border border-white p-4 bg-white/5">
              {formatDisclosure(authorName)}
            </p>
          </div>
        );
        return;
      }
      
      // Regular paragraph with emphasis formatting
      // Allow links in intro (first 3 paragraphs) or in book sections
      const isInIntro = index < introEndIndex;
      // Check if this paragraph is in a book section
      // A book section is defined as: paragraphs after a heading (character name or book title)
      // OR any paragraph that mentions a book title (for character-based sections)
      let isInBookSection = false;
      let lastHeadingIndex = -1;
      
      // First, find the most recent heading
      for (let i = index - 1; i >= 0; i--) {
        const prevPara = paragraphs[i]?.trim() || '';
        if (prevPara === '' || prevPara === '⸻') continue;
        
        const isHeading = prevPara.length < 100 && 
                         !prevPara.match(/[.!?]$/) && 
                         prevPara.split(' ').length < 15;
        
        if (isHeading) {
          lastHeadingIndex = i;
          break;
        }
      }
      
      // If we found a heading, check if we're in a book section
      // A book section is any section after the intro that has a heading
      // (Headings with colons are typically character/book sections)
      if (lastHeadingIndex >= 0 && lastHeadingIndex < index) {
        const headingPara = paragraphs[lastHeadingIndex]?.trim() || '';
        
        // Check if heading contains a book title
        const headingToMatch = headingPara.includes(':') ? headingPara.split(':')[0].trim() : headingPara;
        const containsBookTitle = Object.keys(bookLinkCounts).some(bookTitle => {
          const fullMatch = findBookTitleMatch(headingPara, [bookTitle]) === bookTitle;
          if (fullMatch) return true;
          if (headingPara.includes(':')) {
            return findBookTitleMatch(headingToMatch, [bookTitle]) === bookTitle;
          }
          return false;
        });
        
        // If heading contains book title, we're definitely in a book section
        if (containsBookTitle) {
          isInBookSection = true;
        } else if (headingPara.includes(':')) {
          // Headings with colons are typically character/book sections
          // Check if this paragraph mentions any book title - if so, we're in that book's section
          const paragraphMentionsBook = Object.keys(bookLinkCounts).some(bookTitle => {
            return findBookTitleMatch(trimmed, [bookTitle]) === bookTitle;
          });
          if (paragraphMentionsBook) {
            isInBookSection = true;
          }
        }
      }
      
      // Also check if this paragraph itself mentions a book title (for sections without clear headings)
      if (!isInBookSection && !isInIntro) {
        const paragraphMentionsBook = Object.keys(bookLinkCounts).some(bookTitle => {
          return findBookTitleMatch(trimmed, [bookTitle]) === bookTitle;
        });
        if (paragraphMentionsBook) {
          isInBookSection = true;
        }
      }
      
      const allowLinks = isInIntro || isInBookSection;
      const content = formatTextWithEmphasis(trimmed, bookLinkCounts, allowLinks);
      
      elements.push(
        <p key={index} className="mb-6 text-white/90 text-lg leading-relaxed text-left">
          {Array.isArray(content) ? content : content}
        </p>
      );
      
      // Track if this is the last intro element and add disclosure if needed
      if (isInIntro) {
        lastIntroElementIndex = elements.length - 1;
      }
      if (disclosureAdded && index === introEndIndex - 1) {
        const authorName = post.author_name || 'THE LOST+UNFOUNDS';
        
        elements.push(
          <div key="affiliate-disclosure" className="mb-6 mx-auto max-w-2xl mt-8">
            <p className="text-white/60 text-xs italic leading-relaxed text-justify border border-white p-4 bg-white/5">
              {formatDisclosure(authorName)}
            </p>
          </div>
        );
        disclosureAdded = false;
      }
    });
    
    return elements;
    } catch (error: any) {
      console.error('Error formatting content:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        contentLength: content?.length,
        postId: post?.id
      });
      // Return a simple error message wrapped in a paragraph, plus the raw content
      return [
        <p key="error" className="mb-6 text-red-400 text-lg leading-relaxed text-left">
          Error formatting content. Please refresh the page.
        </p>,
        <div key="raw-content" className="prose prose-invert max-w-none text-left">
          {content.split('\n\n').map((para, idx) => (
            <p key={idx} className="mb-6 text-white/90 text-lg leading-relaxed text-left">
              {para}
            </p>
          ))}
        </div>
      ];
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-900/20 border border-white rounded-none p-6">
          <h1 className="text-2xl font-bold text-white mb-4">Post Not Found</h1>
          <p className="text-red-400 mb-4">{error || 'The post you are looking for does not exist.'}</p>
          <Link
            to="/thelostarchives"
            className="text-white hover:text-white/80 transition"
          >
            ← Back to THE LOST ARCHIVES
          </Link>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  const title = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt || 
    post.content.substring(0, 160).replace(/\n/g, ' ').trim();
  const ogImage = post.og_image_url || post.featured_image;
  const publishedDate = post.published_at || post.created_at;

  return (
    <>
      <Helmet>
        <title>{title} | THE LOST ARCHIVES | THE LOST+UNFOUNDS</title>
        <link rel="canonical" href={`https://www.thelostandunfounds.com/thelostarchives/${post.slug}`} />
        <meta name="description" content={description} />
        {post.seo_keywords && <meta name="keywords" content={post.seo_keywords} />}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`https://www.thelostandunfounds.com/thelostarchives/${post.slug}`} />
        <meta property="og:type" content="article" />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        <script type="application/ld+json">
          {JSON.stringify((() => {
            const structuredData: any = {
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              "headline": title,
              "description": description,
              "url": `https://www.thelostandunfounds.com/thelostarchives/${post.slug}`,
              "datePublished": publishedDate,
              "dateModified": post.created_at,
              "author": {
                "@type": "Organization",
                "name": "THE LOST+UNFOUNDS"
              },
              "publisher": {
                "@type": "Organization",
                "name": "THE LOST+UNFOUNDS",
                "url": "https://www.thelostandunfounds.com"
              },
              "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": `https://www.thelostandunfounds.com/thelostarchives/${post.slug}`
              }
            };
            if (ogImage) {
              structuredData.image = ogImage;
            }
            return structuredData;
          })())}
        </script>
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/thelostarchives"
          className="text-white/60 hover:text-white text-sm inline-flex items-center gap-2 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to THE LOST ARCHIVES
        </Link>
        {nextPost && (
          <Link
            to={post.subdomain ? `/blog/${post.subdomain}/${nextPost.slug}` : `/thelostarchives/${nextPost.slug}`}
            className="text-white/60 hover:text-white text-sm inline-flex items-center gap-2 transition"
          >
            <span className="hidden sm:inline">Next: {nextPost.title}</span>
            <span className="sm:hidden">Next Post</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
      
      {/* View More Posts from Author */}
      {post.subdomain && (
        <div className="mb-6">
          <Link
            to={`/blog/${post.subdomain}`}
            className="text-white/70 hover:text-white text-sm inline-flex items-center gap-2 transition underline"
          >
            View more posts from {blogTitle || post.subdomain.toUpperCase()}
          </Link>
        </div>
      )}

      <article>
        <header className="mb-8 text-left">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-4 tracking-wide text-left">
            {post.title}
          </h1>
          
          {post.published_at && (
            <time className="text-white/50 text-sm text-left">
              {formatDate(post.published_at)}
            </time>
          )}
          
          {/* Excerpt/Preview Text */}
          {(post.excerpt || (post.content && post.content.length > 0)) && (
            <p className="text-white/80 text-lg leading-relaxed mt-4 text-left">
              {post.excerpt || (() => {
                // Generate excerpt from first paragraph if no excerpt exists
                const firstParagraph = post.content.split(/\n\n+/)[0]?.trim() || '';
                if (firstParagraph.length > 0) {
                  // Take first 200 characters, cut at word boundary
                  const excerpt = firstParagraph.length > 200 
                    ? firstParagraph.substring(0, 200).replace(/\s+\S*$/, '') + '...'
                    : firstParagraph;
                  return excerpt;
                }
                return '';
              })()}
            </p>
          )}
        </header>

        <div className="prose prose-invert max-w-none text-left">
          {formatContent(post.content)}
        </div>

        {/* Share Buttons */}
        <ShareButtons
          title={post.title}
          url={`/thelostarchives/${post.slug}`}
          description={post.excerpt || post.seo_description || undefined}
        />

        {/* AI Breakdown Section */}
        <BlogAnalysis
          title={post.title}
          content={post.content}
          excerpt={post.excerpt}
        />
      </article>
    </div>
    </>
  );
}
