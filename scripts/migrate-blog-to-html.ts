
import fs from 'fs';
import path from 'path';

interface AffiliateLink {
    book_title?: string;
    product_title?: string;
    item_title?: string;
    link: string;
}

// Helper: Normalize book title for matching
const normalizeBookTitle = (title: string): string => {
    return title
        .toLowerCase()
        .trim()
        .replace(/[''`]/g, "'")
        .replace(/[—–-]/g, '-')
        .replace(/,\s*/g, ', ')
        .replace(/\s+/g, ' ')
        .trim();
};

// Helper: Get link title
const getLinkTitle = (link: AffiliateLink): string => {
    return link.book_title || link.product_title || link.item_title || '';
};

// Helper: Find book title match
const findBookTitleMatch = (text: string, bookTitles: string[]): string | null => {
    if (!text || !bookTitles || bookTitles.length === 0) return null;
    const normalizedText = normalizeBookTitle(text);
    const sortedTitles = [...bookTitles].sort((a, b) => b.length - a.length);

    for (const title of sortedTitles) {
        if (normalizeBookTitle(title) === normalizedText) return title;
    }

    const removeApostrophes = (t: string) => normalizeBookTitle(t).replace(/[''`]/g, '');
    const textNoApostrophe = removeApostrophes(text);
    for (const title of sortedTitles) {
        if (removeApostrophes(title) === textNoApostrophe) return title;
    }

    const textWordsCheck = normalizedText.split(/\s+/);
    if (textWordsCheck.some(w => w.includes('ender')) && textWordsCheck.some(w => w.includes('game'))) {
        for (const title of sortedTitles) {
            if (title.toLowerCase().includes('ender') && title.toLowerCase().includes('game')) return title;
        }
    }

    const compress = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
    const textCompressed = compress(text);
    if (textCompressed.length > 3) {
        for (const title of sortedTitles) {
            if (compress(title) === textCompressed) return title;
        }
    }

    return null;
};

// Helper: formatTextWithEmphasis (HTML version)
const formatTextWithEmphasisHTML = (
    text: string,
    post: any,
    bookLinkCounts: Record<string, number>,
    allowLinks: boolean = false
): string => {
    if (!text || typeof text !== 'string') return text || '';

    const bookLinks: Record<string, string> = {};
    if (post.amazon_affiliate_links && Array.isArray(post.amazon_affiliate_links)) {
        post.amazon_affiliate_links.forEach((link: AffiliateLink) => {
            const title = getLinkTitle(link);
            if (title && link.link) {
                bookLinks[title] = link.link;
                if (title.toLowerCase().includes('ender') && title.toLowerCase().includes('game')) {
                    bookLinks["Ender's Game"] = link.link;
                    bookLinks["Ender’s Game"] = link.link;
                    bookLinks["Enders Game"] = link.link;
                }
            }
        });
    }

    const emphasisTerms = [
        'THE LOST+UNFOUNDS', 'THE LOST ARCHIVES BOOK CLUB', 'BOOK CLUB',
        'The Hundreds', 'Personal Legend', 'Bitcoin', 'Maktub'
    ];
    const bookTitles = Object.keys(bookLinks).sort((a, b) => b.length - a.length);
    emphasisTerms.push(...bookTitles);

    const escapedTerms = emphasisTerms
        .filter(term => term && term.length > 0)
        .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "[''`]?").replace(/-/g, '[—–-]?').replace(/,/g, ',?\\s*'));

    if (escapedTerms.length === 0) return text;

    const combinedRegex = new RegExp(`(?:^|\\s|[.,!?;:()\\(\\)\\[\\]"])(${escapedTerms.join('|')})(?=\\s|$|[.,!?;:()\\(\\)\\[\\]"])`, 'gi');

    let matches: any[] = [];
    let match;
    while ((match = combinedRegex.exec(text)) !== null) {
        const actualText = match[1];
        const matchStart = match.index + (match[0].length - actualText.length);
        matches.push({ index: matchStart, length: actualText.length, text: actualText });
    }

    // Simple sort and unique (mimicking BlogPost.tsx logic but simplified for the script)
    matches.sort((a, b) => a.index - b.index);

    let result = '';
    let lastIndex = 0;

    const processedIndices = new Set<number>();

    matches.forEach(m => {
        if (m.index < lastIndex || processedIndices.has(m.index)) return; // Skip overlapping
        result += text.substring(lastIndex, m.index);

        const matchedText = m.text;
        const sortedTitles = Object.keys(bookLinks).sort((a, b) => b.length - a.length);
        const bookKey = findBookTitleMatch(matchedText, sortedTitles);
        const affiliateLink = bookKey ? bookLinks[bookKey] : undefined;

        const normalizedMatch = matchedText.toLowerCase();
        let displayText = matchedText;
        if (normalizedMatch.includes('hobbit')) displayText = 'The Hobbit';
        else if (normalizedMatch.includes('hunger') && normalizedMatch.includes('game')) displayText = 'The Hunger Games';

        const isEmphasisTerm = emphasisTerms.some(term => normalizeBookTitle(term) === normalizeBookTitle(matchedText));

        if (affiliateLink && allowLinks) {
            const maxLinks = post.blog_column === 'bookclub' ? 2 : 1;
            const currentCount = bookLinkCounts[bookKey!] || 0;
            if (currentCount < maxLinks) {
                bookLinkCounts[bookKey!] = currentCount + 1;
                result += `<a href="${affiliateLink}" target="_blank" rel="noopener noreferrer" class="font-bold text-white underline hover:text-white/80 transition">${displayText}</a>`;
            } else {
                result += displayText;
            }
        } else if (bookKey || isEmphasisTerm) {
            result += `<strong class="font-bold text-white">${displayText}</strong>`;
        } else {
            result += displayText;
        }

        lastIndex = m.index + m.length;
        processedIndices.add(m.index);
    });

    result += text.substring(lastIndex);
    return result;
};

// Helper: formatDisclosure (HTML version)
const formatDisclosureHTML = (authorName: string): string => {
    const authorNameUpper = authorName.toUpperCase();
    return `Amazon Affiliate Disclosure: As an Amazon Associate, <strong class="font-bold text-white">${authorNameUpper}</strong> earns from qualifying purchases. Some links in this post are affiliate links, which means a commission may be earned if you click through and make a purchase. This helps support the author and allows us to continue creating content. Thank you for your support!`;
};

async function migrateToHtml() {
    const inputFile = process.argv[2];
    if (!inputFile) {
        console.error('Usage: npx tsx scripts/migrate-blog-to-html.ts <input_file.json>');
        process.exit(1);
    }

    const posts = JSON.parse(fs.readFileSync(path.resolve(inputFile), 'utf-8'));
    const sqlUpdates: string[] = [];

    for (const post of posts) {
        const content = post.content || '';
        const isHtml = content.trim().startsWith('<') && (content.includes('</p>') || content.includes('</a>') || content.includes('</div>'));

        if (isHtml) continue;

        let paragraphs = content.split(/\n\n+/);
        const bookLinkCounts: Record<string, number> = {};
        if (post.amazon_affiliate_links && Array.isArray(post.amazon_affiliate_links)) {
            post.amazon_affiliate_links.forEach((l: any) => { if (l.book_title) bookLinkCounts[l.book_title] = 0; });
        }

        const introEndIndex = Math.min(3, paragraphs.length);
        let disclosureAdded = false;
        if (post.amazon_affiliate_links && post.amazon_affiliate_links.length > 0) {
            if (!content.toLowerCase().includes('amazon affiliate disclosure')) {
                disclosureAdded = true;
            }
        }

        let htmlContent = '';
        paragraphs.forEach((para: string, index: number) => {
            const trimmed = para.trim();
            if (!trimmed) return;

            if (trimmed === '⸻' || trimmed.match(/^⸻\s*$/)) {
                htmlContent += '<hr class="my-8 border-white" />';
                if (disclosureAdded && index === introEndIndex - 1) {
                    htmlContent += `<div class="mb-6 mx-auto max-w-2xl mt-8"><p class="text-white/60 text-xs italic leading-relaxed text-justify border border-white p-4 bg-white/5">${formatDisclosureHTML(post.author_name || 'THE LOST+UNFOUNDS')}</p></div>`;
                    disclosureAdded = false;
                }
                return;
            }

            const startsWithHeadingWord = trimmed.match(/^(Conclusion|Early|The E-Myth|Contagious|This Is Not|The Alchemist|Bitcoin|A Creative Brand|Building|Leaders|How|What|When|Where|Why)/i);
            const isTitleCase = trimmed.split(' ').every((word: string) => word.length === 0 || word[0] === word[0].toUpperCase());
            const isShortTitle = trimmed.length < 100 && trimmed.split(' ').length < 12;
            const isLikelyHeading = (startsWithHeadingWord && trimmed.length < 100 && !trimmed.match(/[.!?]$/)) || (isTitleCase && isShortTitle && !trimmed.match(/[.!?]$/));

            if (isLikelyHeading) {
                htmlContent += `<h2 class="text-2xl font-bold text-white mt-12 mb-8 text-left first:mt-0">${formatTextWithEmphasisHTML(trimmed, post, bookLinkCounts, true)}</h2>`;
            } else if (trimmed.startsWith('Amazon Affiliate Disclosure:')) {
                htmlContent += `<div class="mb-6 mx-auto max-w-2xl"><p class="text-white/60 text-xs italic leading-relaxed text-justify border border-white p-4 bg-white/5">${formatDisclosureHTML(post.author_name || 'THE LOST+UNFOUNDS')}</p></div>`;
            } else {
                htmlContent += `<p class="mb-6 text-white/90 text-lg leading-relaxed text-left">${formatTextWithEmphasisHTML(trimmed, post, bookLinkCounts, true)}</p>`;
            }

            if (disclosureAdded && index === introEndIndex - 1) {
                htmlContent += `<div class="mb-6 mx-auto max-w-2xl mt-8"><p class="text-white/60 text-xs italic leading-relaxed text-justify border border-white p-4 bg-white/5">${formatDisclosureHTML(post.author_name || 'THE LOST+UNFOUNDS')}</p></div>`;
                disclosureAdded = false;
            }
        });

        // Escape single quotes for SQL
        const escapedHtml = htmlContent.replace(/'/g, "''");
        sqlUpdates.push(`UPDATE blog_posts SET content = '${escapedHtml}' WHERE id = '${post.id}';`);
    }

    process.stdout.write(sqlUpdates.join('\n'));
}

migrateToHtml();
