# Blog Post Style Guide

This document defines the consistent style and formatting rules for all blog posts published on THE LOST ARCHIVES BOOK CLUB.

## Table of Contents
1. [Book Title Linking Rules](#book-title-linking-rules)
2. [Book Title Formatting](#book-title-formatting)
3. [Author Name Formatting](#author-name-formatting)
4. [Header and Subheader Formatting](#header-and-subheader-formatting)
5. [Excerpt/Preview Text](#excerptpreview-text)
6. [Amazon Affiliate Disclosure](#amazon-affiliate-disclosure)
7. [Section Detection Rules](#section-detection-rules)
8. [Text Alignment](#text-alignment)

---

## Book Title Linking Rules

### Link Count Limit
- **Each book can have a maximum of 2 links per article**
- **First link**: Must appear in the introduction section (first 3 paragraphs)
- **Second link**: Must appear in the book's dedicated section (paragraphs after a heading containing the book title)
- **After 2 links**: All subsequent mentions of the book appear as **bold, uppercase text** (no link)

### Link Placement Rules
1. **Introduction Section (First 3 paragraphs)**
   - First mention of each book in the intro gets a link
   - Links are allowed in:
     - Regular paragraphs
     - Numbered lists
     - Bullet points
     - Headings (if they contain book titles)

2. **Book Sections**
   - Second link appears in the book's dedicated section
   - A "book section" is defined as:
     - Paragraphs that appear after a heading containing the book title
     - The heading detection uses fuzzy matching (doesn't require exact case match)
     - Headings don't require colons (though colons are common)
     - Section detection looks backwards through previous paragraphs to find the most recent heading

3. **After 2 Links**
   - All subsequent mentions appear as **bold, uppercase text** with no link
   - This prevents over-linking and maintains readability

---

## Book Title Formatting

### Display Style
- **Book titles preserve the author's original case** - if author wrote "THE HOBBIT" it displays as "THE HOBBIT", if "The Hobbit" it displays as "The Hobbit"
- **All book titles are bold** (`font-bold`)
- **Linked book titles**: Original case preserved, bold, underlined, white text
- **Non-linked book titles**: Original case preserved, bold, white text (no underline)

### Matching Rules
The system uses intelligent fuzzy matching to find book titles in text, handling:

1. **Case Variations**
   - "THE HOBBIT" matches "The Hobbit"
   - "The HUNGER GAMES" matches "The Hunger Games"
   - Case-insensitive matching

2. **Punctuation Variations**
   - Apostrophes: "Ender's Game" matches "Ender's Game" or "Ender's Game"
   - Hyphens: "T-Shirt" matches "T-Shirt" or "T—Shirt"
   - Commas: "The Lion, the Witch and the Wardrobe" matches with or without comma spacing

3. **Word Order**
   - "The Hobbit" matches "THE HOBBIT"
   - Core title matching (ignores "The", "A", "An" at start/end)
   - Word-by-word matching (80% word overlap required)

### Example
```
Text: "I read THE HOBBIT right after I got my deployment orders."
Database: "The Hobbit"
Result: [THE HOBBIT] (linked, preserves author's uppercase, bold, underlined)

Text: "I read The Hobbit right after I got my deployment orders."
Database: "The Hobbit"
Result: [The Hobbit] (linked, preserves author's title case, bold, underlined)
```

---

## Author Name Formatting

### In Amazon Affiliate Disclosure
- **Author names are displayed in UPPERCASE**
- **Author names are bold** (`font-bold text-white`)
- Applies to all instances of the author name in the disclosure

### Disclosure Format
```
Amazon Affiliate Disclosure: As an Amazon Associate, [AUTHOR NAME] earns from qualifying purchases. 
Some links in this post are affiliate links, which means [AUTHOR NAME] may earn a commission if you 
click through and make a purchase. This helps support [AUTHOR NAME] and allows us to continue 
creating content. Thank you for your support!
```

Where `[AUTHOR NAME]` is replaced with the author's name in **bold, uppercase**.

### Author Name Source
- Primary: `post.author_name` from database
- Fallback: `'THE LOST+UNFOUNDS'` if no author name is set

---

## Header and Subheader Formatting

### Header Detection
Headers are automatically detected based on:
- Length: Under 100 characters
- Word count: Fewer than 15 words
- No ending punctuation: Doesn't end with `.`, `!`, or `?`
- Position: Appears after empty lines or at the start
- Title case: Most words start with uppercase
- Optional colon: Headings with colons are more likely to be detected

### Header Styling
- **Class**: `text-2xl font-bold text-white mt-12 mb-8 text-left first:mt-0`
- **Size**: 2xl (24px)
- **Weight**: Bold
- **Color**: White
- **Alignment**: Left
- **Spacing**: 12 units top margin (except first), 8 units bottom margin

### Book Titles in Headers
- Book titles in headers are automatically linked if:
  - The header contains a book title (fuzzy matched)
  - The book hasn't exceeded its 2-link limit
- Headers with book titles allow links even if not in intro section

---

## Excerpt/Preview Text

### Display Location
- Appears in the article header, after the title and publication date
- Only displays if `post.excerpt` exists

### Styling
- **Class**: `text-white/80 text-lg leading-relaxed mt-4 text-left`
- **Color**: White at 80% opacity
- **Size**: Large (18px)
- **Alignment**: Left
- **Spacing**: 4 units top margin

### Purpose
- Provides a preview/summary of the article
- Helps readers understand what the article is about before reading

---

## Amazon Affiliate Disclosure

### Automatic Insertion
- Automatically added after the introduction section (first 3 paragraphs)
- Only added if:
  - Post has `amazon_affiliate_links` (at least one book)
  - Disclosure doesn't already exist in the content

### Manual Disclosure
- If disclosure already exists in content, it's formatted with bold, uppercase author name
- Manual disclosures are detected by checking if content starts with "Amazon Affiliate Disclosure:"

### Styling
- **Container**: `mb-6 mx-auto max-w-2xl mt-8`
- **Text**: `text-white/60 text-xs italic leading-relaxed text-justify`
- **Border**: `border border-white/20`
- **Background**: `bg-white/5`
- **Padding**: `p-4`
- **Author Name**: Bold, uppercase, white text

### Content Format
```
Amazon Affiliate Disclosure: As an Amazon Associate, [AUTHOR NAME] earns from qualifying purchases. 
Some links in this post are affiliate links, which means [AUTHOR NAME] may earn a commission if you 
click through and make a purchase. This helps support [AUTHOR NAME] and allows us to continue 
creating content. Thank you for your support!
```

---

## Section Detection Rules

### Book Section Detection
A paragraph is considered to be in a "book section" if:

1. **Heading Detection**
   - Looks backwards through previous paragraphs
   - Finds the most recent heading (short, title case, no ending punctuation)
   - Uses fuzzy matching to check if heading contains a book title

2. **Fuzzy Matching**
   - Normalizes both heading text and book titles (lowercase, punctuation normalized)
   - Checks if heading contains book title or vice versa
   - Doesn't require exact case match
   - Doesn't require colons (though common)

3. **Section Scope**
   - All paragraphs after a book title heading are considered part of that book's section
   - Section ends when another heading is encountered
   - Applies to:
     - Regular paragraphs
     - Numbered lists
     - Bullet points

### Example
```
Heading: "THE HOBBIT: A Journey Begins"
Paragraph 1: "I first read this book..."
Paragraph 2: "The story follows Bilbo..."
```
Both paragraphs are in "THE HOBBIT" section, so book title mentions can be linked (if under 2-link limit).

---

## Text Alignment

### Critical Rule: LEFT ALIGNMENT ONLY
- **All blog post content MUST be left-aligned**
- **Never use center or justify alignment for body text**
- **Headers and titles can be left-aligned or centered based on design, but body text is ALWAYS left-aligned**

### Alignment Classes
- **Body paragraphs**: `text-left`
- **Headers**: `text-left` (or centered for main titles)
- **Excerpt**: `text-left`
- **Disclosure**: `text-justify` (only exception - justified for disclosure box)

### What NOT to Use
- ❌ `text-center` on blog content
- ❌ `text-justify` on blog paragraphs
- ✅ `text-left` for all body content

---

## Summary Checklist

When publishing a blog post, ensure:

- [ ] All books mentioned in the article have affiliate links in `amazon_affiliate_links` array
- [ ] Each book has exactly 2 links (one in intro, one in section) - automatically added when publishing
- [ ] Book titles display with proper capitalization from database (e.g., "The Hobbit" not "The hobbit")
- [ ] Author name in disclosure is UPPERCASE and bold
- [ ] Excerpt/preview text is displayed (if available)
- [ ] Headers are properly detected and formatted
- [ ] All text is left-aligned (except disclosure which is justified)
- [ ] Disclosure is automatically added after intro (if not in content)
- [ ] Book sections are properly detected for second links

---

## CRITICAL: How to Populate Hyperlinks When Publishing Articles

### Step-by-Step Process for Adding Book Links to Blog Posts

When a blog post is submitted or published, you MUST ensure book titles are properly linked. Follow these steps:

#### 1. **Identify All Books Mentioned in the Article**
   - Read through the article content
   - Identify every book title mentioned (e.g., "The Hobbit", "Ender's Game", "The Hunger Games", "The Lion, the Witch and the Wardrobe")
   - Note: Books may appear with different capitalization or punctuation in the content (e.g., "the hobbit", "Enders Game")

#### 2. **Add Books to `amazon_affiliate_links` Array**
   - The post must have an `amazon_affiliate_links` field in the database
   - Format: `[{book_title: "The Hobbit", link: "https://amzn.to/..."}, ...]`
   - **CRITICAL**: Use the FULL, PROPERLY CAPITALIZED book title from the database
   - Examples:
     - ✅ `"The Hobbit"` (not `"the hobbit"` or `"Hobbit"`)
     - ✅ `"Ender's Game"` (not `"Enders Game"` or `"ender's game"`)
     - ✅ `"The Hunger Games"` (not `"Hunger Games"` or `"the hunger games"`)
     - ✅ `"The Lion, the Witch and the Wardrobe"` (not `"Lion, the Witch and the Wardrobe"`)

#### 3. **Get Amazon Affiliate Links**
   - For each book, create or use an existing Amazon affiliate link
   - Format: `https://amzn.to/...` or full Amazon URL
   - Ensure links are valid and working

#### 4. **Database Schema**
   ```sql
   -- Example: Adding affiliate links to a blog post
   UPDATE blog_posts
   SET amazon_affiliate_links = '[
     {"book_title": "The Hobbit", "link": "https://amzn.to/example1"},
     {"book_title": "Ender'\''s Game", "link": "https://amzn.to/example2"},
     {"book_title": "The Hunger Games", "link": "https://amzn.to/example3"},
     {"book_title": "The Lion, the Witch and the Wardrobe", "link": "https://amzn.to/example4"}
   ]'::jsonb
   WHERE slug = 'your-post-slug';
   ```

#### 5. **Automatic Link Creation**
   Once `amazon_affiliate_links` is populated:
   - ✅ The system automatically finds book titles in the content (fuzzy matching handles variations)
   - ✅ Creates first link in intro section (first 3 paragraphs)
   - ✅ Creates second link in book's dedicated section (after heading with book title)
   - ✅ Displays book titles with proper capitalization from database (not from content)

#### 6. **Verification Checklist**
   After publishing, verify:
   - [ ] All books mentioned in article are in `amazon_affiliate_links` array
   - [ ] Book titles in database use proper capitalization (e.g., "The Hobbit" not "The hobbit")
   - [ ] First link appears in intro section (first 3 paragraphs)
   - [ ] Second link appears in book's dedicated section
   - [ ] Book titles display with proper capitalization (from database, not content)
   - [ ] Links are clickable and working
   - [ ] No more than 2 links per book appear

#### 7. **Common Issues and Solutions**

   **Issue**: Book title not linking
   - **Solution**: Ensure book is in `amazon_affiliate_links` array with exact title match
   - **Solution**: Check that title in database matches expected format (e.g., "The Hobbit" not "the hobbit")

   **Issue**: Book title displays with wrong capitalization (e.g., "The hobbit" instead of "The Hobbit")
   - **Solution**: Update `amazon_affiliate_links` to use properly capitalized title from database
   - **Solution**: The system uses the database title for display, so ensure database has correct capitalization

   **Issue**: Second link not appearing in book section
   - **Solution**: Ensure section has a heading (character name or book title heading)
   - **Solution**: Verify heading detection is working (headings with colons are detected)

   **Issue**: "Ender's Game" not linking
   - **Solution**: Ensure apostrophe is included in database title: `"Ender's Game"`
   - **Solution**: System handles apostrophe variations, but database title must be correct

#### 8. **Best Practices**
   - Always use full book titles in `amazon_affiliate_links` (e.g., "The Hobbit" not "Hobbit")
   - Use proper capitalization as it appears in official book title
   - Include apostrophes and punctuation exactly as in official title
   - Test links after publishing to ensure they work
   - Verify display capitalization matches database title

---

## Technical Implementation

### Key Functions
- `normalizeBookTitle()`: Normalizes book titles for matching (case, punctuation)
- `findBookTitleMatch()`: Fuzzy matching to find book titles in text
- `formatTextWithEmphasis()`: Formats text with book title links and emphasis
- `formatDisclosure()`: Formats Amazon Affiliate Disclosure with bold author name

### Database Fields
- `post.amazon_affiliate_links`: Array of `{book_title: string, link: string}`
- `post.author_name`: Author name for disclosure
- `post.excerpt`: Preview text displayed in header
- `post.content`: Full article content

---

## Examples

### Example 1: Book Title in Intro
```
Content: "I read THE HOBBIT right after I got my deployment orders."
Result: [THE HOBBIT] (linked, preserves author's uppercase, bold, underlined)
Count: 1/2 for "The Hobbit"
```

### Example 2: Book Title in Section
```
Heading: "THE HOBBIT: A Journey Begins"
Content: "This book taught me about courage..."
Result: [THE HOBBIT] (linked, preserves author's uppercase, bold, underlined)
Count: 2/2 for "The Hobbit"
```

### Example 3: Book Title After 2 Links
```
Content: "I still think about THE HOBBIT today."
Result: **THE HOBBIT** (bold, preserves author's uppercase, no link)
Count: 2/2 (limit reached)
```

### Example 4: Disclosure
```
Author: "Plutonium"
Result: "Amazon Affiliate Disclosure: As an Amazon Associate, **PLUTONIUM** earns from qualifying purchases..."
```

---

**Last Updated**: 2024
**Version**: 1.0
