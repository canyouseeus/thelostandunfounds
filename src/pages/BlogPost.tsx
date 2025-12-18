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
import { BLOG_CONTENT_CLASS } from '../utils/blogStyles';

interface AffiliateLink {
  book_title?: string;
  product_title?: string;
  item_title?: string;
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

  // Function to format text with bold emphasis for book titles and brand names
  // bookLinkCounts: tracks how many times each book has been linked
  // allowLinks: whether to allow creating new links (true for intro and book sections)
  const formatTextWithEmphasis = (text: string, bookLinkCounts?: Record<string, number>, allowLinks: boolean = false) => {
    // Safety check - return original text if invalid input
    if (!text || typeof text !== 'string') {
      return text || '';
    }

    try {
      // Build book links from post data ONLY - no defaults to prevent cross-contamination
      const bookLinks: Record<string, string> = {};


      if (post?.amazon_affiliate_links && Array.isArray(post.amazon_affiliate_links)) {
        // Build map from submitted affiliate links
        post.amazon_affiliate_links.forEach((link: AffiliateLink) => {
          const title = getLinkTitle(link);
          if (title && link.link) {
            bookLinks[title] = link.link;

            // Handle apostrophe variations (e.g. "Enders Game" -> "Ender's Game", "Ender’s Game")
            // Also handle specific case for "Ender's Game"
            if (title.toLowerCase().includes('ender') && title.toLowerCase().includes('game')) {
              bookLinks["Ender's Game"] = link.link;
              bookLinks["Ender’s Game"] = link.link;
              bookLinks["Enders Game"] = link.link;
            }

            if (!title.includes("'") && !title.includes("’")) {
              // Try adding apostrophe before 's'
              if (title.endsWith("s Game")) {
                const withApostrophe = title.replace("s Game", "'s Game");
                const withSmartApostrophe = title.replace("s Game", "’s Game");
                bookLinks[withApostrophe] = link.link;
                bookLinks[withSmartApostrophe] = link.link;
              }
            }

            // Handle "The Hobbit" - ensure proper capitalization
            if (title.toLowerCase().includes('hobbit')) {
              bookLinks['The Hobbit'] = link.link;
              bookLinks['the hobbit'] = link.link;
              bookLinks['The hobbit'] = link.link;
              bookLinks['hobbit'] = link.link;
            }

            // Handle "The Hunger Games" - ensure plural form is used
            if (title.toLowerCase().includes('hunger') && title.toLowerCase().includes('game')) {
              bookLinks['The Hunger Games'] = link.link;
              bookLinks['Hunger Games'] = link.link;
              bookLinks['The Hunger Game'] = link.link; // Also map singular for matching
              bookLinks['Hunger Game'] = link.link;
            }

            // Handle "The Lion, the Witch and the Wardrobe" specific variations
            // The DB often has "Lion the witch and the wardrobe" but text has "The Lion, the Witch and the Wardrobe"
            if (title.toLowerCase().includes('lion') &&
              title.toLowerCase().includes('witch') &&
              title.toLowerCase().includes('wardrobe')) {
              bookLinks['The Lion, the Witch and the Wardrobe'] = link.link;
              bookLinks['Lion, the Witch and the Wardrobe'] = link.link;
              bookLinks['The Lion, The Witch And The Wardrobe'] = link.link;
              bookLinks['the lion, the witch and the wardrobe'] = link.link;
            }

            // General "The" prefix handling
            if (!title.toLowerCase().startsWith('the ')) {
              const withThe = `The ${title}`;
              bookLinks[withThe] = link.link;
              // Also try with title casing if the original wasn't
              const withTheTitleCase = `The ${title.charAt(0).toUpperCase() + title.slice(1)}`;
              bookLinks[withTheTitleCase] = link.link;
            }

            // Handle apostrophe variations for existing titles
            if (title.includes("'") || title.includes("'")) {
              // Add version without apostrophe
              const withoutApostrophe = title.replace(/['']/g, '');
              bookLinks[withoutApostrophe] = link.link;
            }
          }
        });
      }

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

      // Create improved regex that handles punctuation and apostrophes better
      // Build patterns that match book titles with flexible punctuation handling
      const escapedTerms: string[] = [];
      emphasisTerms
        .filter(term => term && term.length > 0) // Filter out empty terms
        .forEach(term => {
          try {
            // Escape special regex characters
            let escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Handle apostrophes - allow both straight and curly quotes (optional for flexibility)
            // This matches "Ender's Game" whether written with or without apostrophe
            escaped = escaped.replace(/'/g, "[''`]?");
            // Handle hyphens - allow various dash types (make optional)
            escaped = escaped.replace(/-/g, '[—–-]?');
            escapedTerms.push(escaped);

            // CRITICAL FIX: If term doesn't have apostrophe but could be possessive, add version with apostrophe
            // This handles "Enders Game" matching "Ender's Game"
            if (!term.includes("'") && !term.includes("'") && !term.includes("`")) {
              // Check if term has words ending in 's' that could be possessive
              const possessiveMatch = term.match(/\b(\w{3,})(s)\b/gi);
              if (possessiveMatch) {
                // Create version with apostrophe: "Enders Game" -> "Ender's Game"
                const withApostrophe = term.replace(/\b(\w{3,})(s)\b/gi, "$1's");
                let escapedWithApostrophe = withApostrophe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                escapedWithApostrophe = escapedWithApostrophe.replace(/'/g, "[''`]?");
                escapedWithApostrophe = escapedWithApostrophe.replace(/-/g, '[—–-]?');
                // Only add if different
                if (escapedWithApostrophe !== escaped && !escapedTerms.includes(escapedWithApostrophe)) {
                  escapedTerms.push(escapedWithApostrophe);
                }
              }
            }
            // Handle commas - make them optional with flexible spacing
            escaped = escaped.replace(/,/g, ',?\\s*');
            return escaped;
          } catch (e) {
            console.warn('Error escaping term:', term, e);
            const fallback = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (fallback && !escapedTerms.includes(fallback)) {
              escapedTerms.push(fallback);
            }
          }
        });

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
      let matches: Array<{ index: number, length: number, text: string }> = [];
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
              .join('[\\s\\-]*[,\\s]*'); // Allow spaces, hyphens matching no space (Flash Light matches Flashlight)
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
              .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
              .join('(?:,?\\s+|\\s+|\\s*(?:\\+|and|&|with)\\s*)'); // Explicit comma and conjunction handling
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

            // Pattern 7: First significant word (for "Surefire Flash Light" -> "Surefire")
            if (titleWords[0] && titleWords[0].length > 4 && !['the', 'this', 'that', 'with', 'from'].includes(titleWords[0].toLowerCase())) {
              const firstWord = titleWords[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              searchPatterns.push(`(?:^|\\s)${firstWord}(?:\\s|$)`); // Requires boundaries
              searchPatterns.push(firstWord); // More permissive
            }

            // Pattern 8: Split by '+' or '&' and match segments (for "Note Book + Pen" -> "Note Book" and "Pen")
            if (bookTitle.includes('+') || bookTitle.includes('&') || bookTitle.toLowerCase().includes(' and ')) {
              const parts = bookTitle.split(/[+&]| and /i).map(p => p.trim());
              parts.forEach(p => {
                if (p.length > 2) {
                  // Normalize the part and create a pattern
                  const pWords = normalizeBookTitle(p).split(/\s+/).filter(w => w.length > 0);
                  if (pWords.length > 0) {
                    const segmentPattern = pWords
                      .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                      .join('[\\s\\-]*[,\\s]*'); // Flexible matching for the segment
                    searchPatterns.push(segmentPattern);
                  }
                }
              });
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

        // Remove duplicates and prioritize longer matches
        // CRITICAL: Sort by length (longest first) to prioritize full titles over partial matches
        const sortedByLength = matches.sort((a, b) => b.length - a.length);
        const uniqueMatches: Array<{ index: number, length: number, text: string, bookTitle?: string }> = [];

        sortedByLength.forEach(m => {
          // Check if this match overlaps with any existing match
          const overlaps = uniqueMatches.some(um => {
            const mStart = m.index;
            const mEnd = m.index + m.length;
            const umStart = um.index;
            const umEnd = um.index + um.length;

            // Check for any overlap
            return (mStart >= umStart && mStart < umEnd) ||
              (mEnd > umStart && mEnd <= umEnd) ||
              (mStart <= umStart && mEnd >= umEnd);
          });

          // Only add if it doesn't overlap (longer matches were processed first)
          if (!overlaps) {
            // Try to find the full book title for this match
            const bookTitle = findBookTitleMatch(m.text, Object.keys(bookLinks));
            uniqueMatches.push({
              ...m,
              bookTitle: bookTitle || undefined
            });
          }
        });

        // Now sort by index for processing order
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

        // CRITICAL FIX: Use the FULL book title from database for display
        // This ensures "Hunger Game" displays as "The Hunger Games" and "Lion, the Witch..." displays as "The Lion, the Witch and the Wardrobe"
        let displayText = matchedText || '';
        let actualMatchLength = matchInfo.length;

        // Special handling: Always use proper capitalization and full titles
        // Check matchedText first to catch all variations, regardless of bookKey or affiliateLink
        const normalizedMatch = (matchedText || '').toLowerCase();

        // ALWAYS fix capitalization for known books, regardless of whether there's an affiliate link
        if (normalizedMatch.includes('hobbit')) {
          displayText = 'The Hobbit';
        } else if (normalizedMatch.includes('hunger') && normalizedMatch.includes('game')) {
          displayText = 'The Hunger Games';
        } else if (bookKey) {
          // Use the database title if available
          const normalizedKey = bookKey.toLowerCase();
          if (normalizedKey.includes('hobbit')) {
            displayText = 'The Hobbit';
          } else if (normalizedKey.includes('hunger') && normalizedKey.includes('game')) {
            displayText = 'The Hunger Games';
          }
          // REMOVED: Do not force database title as it strips user punctuation (e.g. commas)
          // display text defaults to matchedText, which preserves user's writing
        }

        // Check if it's an emphasis term (THE LOST+UNFOUNDS, etc.) - these should always be bold
        const isEmphasisTerm = emphasisTerms.some(term =>
          normalizeBookTitle(term) === normalizeBookTitle(matchedText)
        );

        // If it's a book title with an affiliate link
        if (affiliateLink && bookLinkCounts) {
          // Check link limit based on column
          const maxLinks = post?.blog_column === 'bookclub' ? 2 : 1;
          const currentCount = bookLinkCounts[bookKey!] || 0;

          if (allowLinks && currentCount < maxLinks) {
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
            // Not allowed to link (limit reached) - return plain text
            parts.push(displayText);
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

        // Use actual match length (which may have been updated for full titles)
        lastIndex = matchInfo.index + actualMatchLength;
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

  const formatContent = (content: string | undefined | null) => {
    if (!content) return null;

    try {
      // DOMPurify is already available in the project
      const DOMPurify = (window as any).DOMPurify;
      let safeHtml = content;

      if (DOMPurify) {
        safeHtml = DOMPurify.sanitize(content, {
          ALLOWED_TAGS: ['p', 'a', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'br', 'hr', 'blockquote', 'code', 'pre', 'div', 'span', 'img'],
          ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'data-product-title', 'src', 'alt'],
        });
      }

      return (
        <div
          dangerouslySetInnerHTML={{ __html: safeHtml }}
          className={BLOG_CONTENT_CLASS}
        />
      );
    } catch (error: any) {
      console.error('Error formatting content:', error);
      // Fallback: strip tags and show plain text if something really goes wrong
      const stripped = content.replace(/<[^>]*>?/gm, ' ');
      return (
        <div className={BLOG_CONTENT_CLASS}>
          {stripped.split(/\n\n+/).map((para: string, idx: number) => (
            <p key={idx} className="mb-6">{para}</p>
          ))}
        </div>
      );
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

          <div className={BLOG_CONTENT_CLASS}>
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
