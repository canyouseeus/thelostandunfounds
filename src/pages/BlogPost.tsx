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
      // Get subdomain from URL params, then fallback to hostname
      let subdomain = urlSubdomain;
      if (!subdomain) {
        const hostname = window.location.hostname;
        subdomain = hostname.split('.')[0] !== 'www' && hostname.split('.')[0] !== 'thelostandunfounds' 
          ? hostname.split('.')[0] 
          : null;
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
      // Get subdomain from URL params, then fallback to hostname
      let subdomain = urlSubdomain;
      if (!subdomain) {
        const hostname = window.location.hostname;
        subdomain = hostname.split('.')[0] !== 'www' && hostname.split('.')[0] !== 'thelostandunfounds' 
          ? hostname.split('.')[0] 
          : null;
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

    // Create a single regex that matches all terms
    // Escape special regex characters and create pattern that prevents partial matches
    const escapedTerms = emphasisTerms.map(term => 
      term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    // Match terms with word boundaries, but handle multi-word phrases properly
    const combinedRegex = new RegExp(`(?:^|\\s)(${escapedTerms.join('|')})(?=\\s|$|[.,!?;:])`, 'gi');

    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;
    let keyCounter = 0;
    const processedIndices = new Set<number>(); // Track processed positions to avoid duplicates

    // Reset regex lastIndex
    combinedRegex.lastIndex = 0;

    // Collect all matches first to avoid overlapping
    const matches: Array<{index: number, length: number, text: string}> = [];
    while ((match = combinedRegex.exec(text)) !== null) {
      // The regex includes leading space/start, so adjust the index
      const fullMatch = match[0];
      const actualText = match[1]; // The captured group (the term itself)
      const leadingSpace = fullMatch.length - actualText.length;
      const matchStart = match.index + leadingSpace; // Actual start of the term
      const matchEnd = matchStart + actualText.length;
      
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

    // Sort matches by index
    matches.sort((a, b) => a.index - b.index);

    // Process matches
    matches.forEach((matchInfo) => {
      // Add text before the match
      if (matchInfo.index > lastIndex) {
        const beforeText = text.substring(lastIndex, matchInfo.index);
        if (beforeText) {
          parts.push(beforeText);
        }
      }
      
      const matchedText = matchInfo.text;
      // Find the affiliate link (case-insensitive lookup)
      const bookKey = Object.keys(bookLinks).find(
        key => key.toLowerCase() === matchedText.toLowerCase()
      );
      const affiliateLink = bookKey ? bookLinks[bookKey] : undefined;
      
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
              {matchedText}
            </a>
          );
        } else {
          // Otherwise, just make it bold (no link)
          parts.push(
            <strong key={`bold-${keyCounter++}`} className="font-bold text-white">
              {matchedText}
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
            {matchedText}
          </a>
        );
      } else {
        // Otherwise, just make it bold
        parts.push(
          <strong key={`bold-${keyCounter++}`} className="font-bold text-white">
            {matchedText}
          </strong>
        );
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
  };

  const formatContent = (content: string) => {
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
    const bookLinkCounts: Record<string, number> = {
      'The E-Myth Revisited': 0,
      'This Is Not a T-Shirt': 0,
      'The Alchemist': 0,
      'Contagious': 0
    };
    
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
          <hr key={`separator-${index}`} className="my-8 border-white/10" />
        );
        
        // Track if this is the last intro element and add disclosure if needed
        if (index < introEndIndex) {
          lastIntroElementIndex = elements.length - 1;
        }
        if (disclosureAdded && index === introEndIndex - 1) {
          const authorName = post.author_name || 'THE LOST+UNFOUNDS';
          const disclosureText = `Amazon Affiliate Disclosure: As an Amazon Associate, ${authorName} earns from qualifying purchases. Some links in this post are affiliate links, which means ${authorName} may earn a commission if you click through and make a purchase. This helps support ${authorName} and allows us to continue creating content. Thank you for your support!`;
          
          elements.push(
            <div key="affiliate-disclosure" className="mb-6 mx-auto max-w-2xl mt-8">
              <p className="text-white/60 text-xs italic leading-relaxed text-justify border border-white/20 p-4 bg-white/5">
                {disclosureText}
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
      const startsWithHeadingWord = trimmed.match(/^(Conclusion|Early|The E-Myth|Contagious|This Is Not|The Alchemist|Bitcoin|A Creative Brand)/i);
      
      // Also check if it looks like a section title (title case, short, no ending punctuation)
      const isTitleCase = trimmed.split(' ').every(word => 
        word.length === 0 || word[0] === word[0].toUpperCase()
      );
      const isShortTitle = trimmed.length < 100 && trimmed.split(' ').length < 12;
      
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
          (isTitleCase && isShortTitle && isAfterEmptyLine)
        )
      );
      
      if (isLikelyHeading) {
        // Check if this is a book's dedicated section
        const isBookSection = Object.keys(bookLinkCounts).some(bookTitle => 
          trimmed.includes(bookTitle) && trimmed.includes(':')
        );
        
        // Format with emphasis, allowing links in section headings
        const headingContent = formatTextWithEmphasis(trimmed, bookLinkCounts, isBookSection);
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
          const disclosureText = `Amazon Affiliate Disclosure: As an Amazon Associate, ${authorName} earns from qualifying purchases. Some links in this post are affiliate links, which means ${authorName} may earn a commission if you click through and make a purchase. This helps support ${authorName} and allows us to continue creating content. Thank you for your support!`;
          
          elements.push(
            <div key="affiliate-disclosure" className="mb-6 mx-auto max-w-2xl mt-8">
              <p className="text-white/60 text-xs italic leading-relaxed text-justify border border-white/20 p-4 bg-white/5">
                {disclosureText}
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
        const content = formatTextWithEmphasis(numberedMatch[2], bookLinkCounts, isInIntro);
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
          const disclosureText = `Amazon Affiliate Disclosure: As an Amazon Associate, ${authorName} earns from qualifying purchases. Some links in this post are affiliate links, which means ${authorName} may earn a commission if you click through and make a purchase. This helps support ${authorName} and allows us to continue creating content. Thank you for your support!`;
          
          elements.push(
            <div key="affiliate-disclosure" className="mb-6 mx-auto max-w-2xl mt-8">
              <p className="text-white/60 text-xs italic leading-relaxed text-justify border border-white/20 p-4 bg-white/5">
                {disclosureText}
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
        const content = formatTextWithEmphasis(bulletText, bookLinkCounts, isInIntro);
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
          const disclosureText = `Amazon Affiliate Disclosure: As an Amazon Associate, ${authorName} earns from qualifying purchases. Some links in this post are affiliate links, which means ${authorName} may earn a commission if you click through and make a purchase. This helps support ${authorName} and allows us to continue creating content. Thank you for your support!`;
          
          elements.push(
            <div key="affiliate-disclosure" className="mb-6 mx-auto max-w-2xl mt-8">
              <p className="text-white/60 text-xs italic leading-relaxed text-justify border border-white/20 p-4 bg-white/5">
                {disclosureText}
              </p>
            </div>
          );
          disclosureAdded = false;
        }
        return;
      }
      
      // Check if this is the Amazon Affiliate Disclosure
      const isAffiliateDisclosure = trimmed.startsWith('Amazon Affiliate Disclosure:');
      
      // Regular paragraph with emphasis formatting
      // Only allow links in intro (first 3 paragraphs) or in book sections
      const isInIntro = index < introEndIndex;
      const content = formatTextWithEmphasis(trimmed, bookLinkCounts, isInIntro);
      
      if (isAffiliateDisclosure) {
        // Style the disclosure differently: smaller, italic, in a box, center-justified
        elements.push(
          <div key={index} className="mb-6 mx-auto max-w-2xl">
            <p className="text-white/60 text-xs italic leading-relaxed text-justify border border-white/20 p-4 bg-white/5">
              {Array.isArray(content) ? content : content}
            </p>
          </div>
        );
      } else {
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
          const disclosureText = `Amazon Affiliate Disclosure: As an Amazon Associate, ${authorName} earns from qualifying purchases. Some links in this post are affiliate links, which means ${authorName} may earn a commission if you click through and make a purchase. This helps support ${authorName} and allows us to continue creating content. Thank you for your support!`;
          
          elements.push(
            <div key="affiliate-disclosure" className="mb-6 mx-auto max-w-2xl mt-8">
              <p className="text-white/60 text-xs italic leading-relaxed text-justify border border-white/20 p-4 bg-white/5">
                {disclosureText}
              </p>
            </div>
          );
          disclosureAdded = false;
        }
      }
    });
    
    return elements;
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
        <div className="bg-red-900/20 border border-red-500/50 rounded-none p-6">
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
            View more posts from {blogTitle || post.subdomain}
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
