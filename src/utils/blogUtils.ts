/**
 * Blog Utilities - Shared logic for formatting and processing blog content
 */

/**
 * Normalizes a title for fuzzy matching (case, punctuation, variations)
 */
export const normalizeTitle = (title: string): string => {
    return title
        .toLowerCase()
        .trim()
        // Normalize apostrophes and quotes
        .replace(/[''’`]/g, "'")
        // Normalize hyphens and dashes
        .replace(/[—–-]/g, '-')
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        // Normalize commas and spacing
        .replace(/,\s*/g, ', ');
};

/**
 * Strips HTML tags from a string
 */
export const stripHtml = (html: string): string => {
    if (!html) return '';
    // Handle escaped characters often found in DB
    const unescaped = html.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    return unescaped.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
};

/**
 * Unescapes double-escaped strings (e.g. \\\" -> ")
 */
export const unescapeContent = (content: string): string => {
    if (!content) return '';
    return content
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/[⸻—–]/g, ' '); // Remove long dashes and em/en dashes
};

/**
 * Finds a title match using fuzzy matching strategy
 */
export const findTitleMatch = (text: string, titles: string[]): string | null => {
    if (!text || !titles || titles.length === 0) return null;

    const normalizedText = normalizeTitle(text);

    // Strategy 1: Exact normalized match
    for (const title of titles) {
        if (normalizeTitle(title) === normalizedText) {
            return title;
        }
    }

    // Strategy 2: Remove apostrophes and compare
    const removeApostrophes = (t: string) => normalizeTitle(t).replace(/'/g, '');
    const textNoApostrophe = removeApostrophes(text);
    for (const title of titles) {
        if (removeApostrophes(title) === textNoApostrophe) {
            return title;
        }
    }

    // Strategy 3: Word-by-word matching
    const getWords = (t: string) => {
        return normalizeTitle(t)
            .replace(/[.,!?;:()\[\]{}'"]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 0);
    };

    const textWords = getWords(text);
    for (const title of titles) {
        const titleWords = getWords(title);
        const significantTitleWords = titleWords.filter(w => w.length > 2);
        const significantTextWords = textWords.filter(w => w.length > 2);

        if (significantTitleWords.length === 0 || significantTextWords.length === 0) continue;

        const matchingWords = significantTitleWords.filter(tw =>
            significantTextWords.some(txt => txt === tw || txt.includes(tw) || tw.includes(txt))
        );

        const reverseMatch = significantTextWords.filter(txt =>
            significantTitleWords.some(tw => txt === tw || txt.includes(tw) || tw.includes(txt))
        );

        const matchRatio = Math.max(
            matchingWords.length / significantTitleWords.length,
            reverseMatch.length / significantTextWords.length
        );

        if (matchRatio >= 0.7) {
            return title;
        }
    }

    return null;
};

/**
 * Formats disclosure text with bold uppercase author name
 */
export const formatDisclosure = (text: string, authorName?: string): string => {
    if (!text) return '';
    if (!authorName) return text;

    const upperAuthor = authorName.toUpperCase().trim();
    const regex = new RegExp(authorName, 'gi');

    return text.replace(regex, `<strong>${upperAuthor}</strong>`);
};
