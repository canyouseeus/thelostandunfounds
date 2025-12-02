-- Create blog post: "Contributor Getting Started Guide"
-- Run this in Supabase SQL Editor (works with or without migration)

-- First, get the admin user ID (replace with actual admin email if different)
DO $$
DECLARE
  admin_user_id UUID;
  has_published_field BOOLEAN;
  has_author_id_field BOOLEAN;
  has_user_id_field BOOLEAN;
  user_column_name TEXT;
  existing_post_id UUID;
BEGIN
  -- Check if published field exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_posts' AND column_name = 'published'
  ) INTO has_published_field;

  -- Check if author_id field exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_posts' AND column_name = 'author_id'
  ) INTO has_author_id_field;

  -- Check if user_id field exists (some schemas use user_id instead of author_id)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_posts' AND column_name = 'user_id'
  ) INTO has_user_id_field;

  -- Determine which column name to use
  IF has_user_id_field THEN
    user_column_name := 'user_id';
  ELSIF has_author_id_field THEN
    user_column_name := 'author_id';
  ELSE
    user_column_name := NULL;
  END IF;

  -- Get admin user ID
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@thelostandunfounds.com'
  LIMIT 1;

  IF admin_user_id IS NULL AND (has_user_id_field OR has_author_id_field) THEN
    RAISE NOTICE 'Admin user not found. Will use NULL for author_id/user_id if column allows it.';
  END IF;

  -- Check if post already exists
  SELECT id INTO existing_post_id
  FROM blog_posts
  WHERE slug = 'contributor-getting-started-guide'
  LIMIT 1;

  -- Insert or update the blog post (handle both schema versions)
  IF has_published_field AND user_column_name IS NOT NULL THEN
    -- New schema with published boolean and user_id/author_id
    IF user_column_name = 'user_id' THEN
      IF existing_post_id IS NOT NULL THEN
        UPDATE blog_posts SET
          title = 'Contributor Getting Started Guide',
          content = 'Welcome to THE LOST ARCHIVES BOOK CLUB, a platform designed to help contributors share thoughtful reflections on books, engage readers, and earn as Amazon affiliates. This guide walks you through getting set up, writing high-quality articles, and using AI effectively while maintaining your unique voice by implementing Human-In-The-Loop principles and meeting Google''s standards for human expertise, experience, authority, and trust (E‑E‑A‑T).

THE LOST ARCHIVES BOOK CLUB exists to give contributors the opportunity to share knowledge, express personal insights, and connect with an audience they may not have reached through traditional channels. By contributing, you not only help educate and inspire others but also create a pathway to earn online by leveraging your expertise and experiences in meaningful ways.

## Why Contribute?

**Centralized Reach & Community Impact**

Your reviews become part of a trusted, curated platform that attracts readers interested in thoughtful book reflections. Unlike personal blogs or social media, THE LOST ARCHIVES BOOK CLUB drives traffic to all contributor content, giving you more visibility and increasing the potential for affiliate revenue.

**Collaborative Credibility**

Multiple contributors reviewing the same books create a rich ecosystem of perspectives. Readers can compare opinions, see how different people are impacted by the same book, and gain deeper insights. Your work gains authority by association with other thoughtful reviews.

**Affiliate Opportunities**

Every article includes Amazon affiliate links. By publishing on this platform, your links benefit from more readers, search visibility, and engagement, increasing the chance of purchases and commissions.

**Searchable Knowledge Base**

Readers can search by book title or author, surfacing multiple articles about the same book. This allows them to explore different perspectives and click affiliate links to purchase books. Contributors benefit from increased engagement and potential affiliate revenue.

## 1. Getting Set Up: Registration & Amazon Affiliate Integration

**Steps:**

1. Create your contributor account on THE LOST ARCHIVES BOOK CLUB.
2. Choose a username; this generates your custom contributor URL.
3. Sign up for the Amazon Affiliate program if you haven''t already at https://affiliate-program.amazon.com/
4. During setup, paste your custom contributor URL to tie your affiliate links to your account.
5. Obtain your Amazon Store ID from your Amazon account.
6. Return to our platform and paste your Store ID to finalize setup.

**Why this matters:** Correct setup ensures all affiliate links are tracked, so you earn commissions when readers purchase through your articles.

**Amazon Affiliate Impact: Make Your Story Compelling**

Amazon will only give you credit when readers click your Amazon link to make a purchase. To maximize earnings:
- Share your personal perspective and experiences.
- Reference specific passages or quotes from the books.
- Tell a story: why the book mattered and how it influenced your thinking.
- Connect themes across the four books in your article.
- Include natural, integrated calls-to-action with your affiliate links.
- Select books that are listed on Amazon. If you want to discuss a book not available on Amazon, you may include it in the discussion, but your article must have four books with Amazon links.

## 2. Submission Requirements

Each article should feature four books with unique SiteStripe links.

**Why four books?**
- Validates your insights across multiple perspectives.
- Encourages cross-genre and interdisciplinary thinking.
- Helps synthesize deeper understanding and actionable lessons.
- Builds credibility with Google''s E‑E‑A‑T standards by demonstrating thoughtful analysis.

Articles should include direct quotes or passages from the books to illustrate key points.

## 3. Writing Standards: Google E‑E‑A‑T

**Experience:** Share personal connection and lessons learned.
**Expertise:** Provide accurate analysis and thoughtful commentary.
**Authoritativeness:** Contribute consistently and maintain high-quality work.
**Trustworthiness:** Be clear, honest, and transparent in your writing.

**Why this matters:** Meeting E‑E‑A‑T standards improves search rankings, builds reader trust, and increases engagement and affiliate conversions.

## 4. Human-in-the-Loop (HITL) Review

AI can draft content, but human review is essential:
- Fact-check AI-generated text.
- Refine tone, style, and voice to reflect your perspective.
- Add personal anecdotes, reflections, and direct quotes.
- Verify affiliate links and ensure they are accurate and functional.

**Why this matters:** HITL ensures authenticity, originality, and credibility, helping your article outperform generic AI content and meet E‑E‑A‑T standards.

## 5. AI-Assisted Writing Workflow

**Step 1: Research & Planning (Human)**
- Gather background info and key themes of your four books.
- Identify direct quotes or passages for use in your article.
- Decide on personal experiences or insights to include.

**Step 2: Define Tone, Perspective, & Audience**
- Decide how your voice should come across: reflective, conversational, analytical, etc.
- Use the pre-crafted AI prompt as a starting point.
- Iteratively refine instructions, working with AI to rewrite sections to match your style.

**Step 3: Generate Outline & Draft (AI-Assisted)**
- Use AI to create structure, headings, and first draft paragraphs.
- Focus on flow, clarity, and organization.

**Step 4: Human Editing & Personalization**
- Revise AI text to reflect exactly how you would say it, word-for-word.
- Integrate personal stories, reflections, and quotes.
- Challenge AI to improve phrasing, expand insights, or deepen analysis.

**Step 5: SEO & Readability Optimization**
- Add clear headings and subheadings.
- Use short, focused paragraphs.
- Include natural keywords and internal links.

**Step 6: Final HITL Review**
- Ensure tone, flow, and engagement are polished.
- Confirm formatting, headings, and affiliate link accuracy.
- Verify E‑E‑A‑T and originality standards.

## 6. Best Practices for AI-Assisted Original Content

- Cross-reference all four books to show how themes relate.
- Inject personal voice: anecdotes, lessons, reflections.
- Use direct quotes/passages for credibility and depth.
- Iterate: revise drafts repeatedly until they express your ideas precisely.
- Challenge AI outputs: ask it to improve phrasing, clarify ideas, or add depth.
- Add actionable insights: show readers how to apply lessons.
- Sometimes, traditional research or reading methods are necessary—don''t skip foundational work in favor of AI shortcuts.

**Why this matters:** Original, human-refined content ranks better, attracts more readers, and increases affiliate revenue. Thoughtful posts build credibility and trust.

## 7. Final Submission Checklist

- Four books with unique SiteStripe links included
- Article reviewed, fact-checked, and personalized
- Direct quotes/passages integrated
- Affiliate links verified
- Headings, SEO, and readability optimized
- Tone and voice consistent with personal style
- E‑E‑A‑T and HITL standards satisfied

## 8. FAQ

**Do I have to read the entire book?**

No. You can reference key passages, chapters, or ideas that resonate with you. Sometimes a single passage provides enough insight for reflection. Yes, deeper reading helps. Reading a book fully—or multiple times—allows stronger analysis and greater authority. Audiobooks are fine. How you consume the material—print, digital, or audio—is up to you.

**How can I improve affiliate clicks?**

- Make your story compelling and relatable.
- Use personal anecdotes and reflections to engage readers.
- Reference direct quotes or passages for credibility.
- Include clear and naturally placed affiliate links.

**Can I submit articles about books I''ve only partially read?**

Yes, as long as you provide meaningful insights and references. Focus on depth and originality rather than completion.

**Do articles need to be PG or kid-friendly?**

Content should be thoughtful and positive, free from profanity or hateful language. Original ideas are encouraged, but all submissions should promote reflection and constructive discussion.

---

THE LOST ARCHIVES BOOK CLUB is designed to empower contributors to share their knowledge, talents, and insights in ways that reach an engaged audience beyond traditional avenues. By creating thoughtful, reflective, and well-crafted content, you have the opportunity to educate, inspire, and earn online while using your skills in unique and meaningful ways.',
          excerpt = 'A comprehensive guide for contributors to share thoughtful reflections, engage readers, and earn as Amazon affiliates on THE LOST ARCHIVES BOOK CLUB. Learn about setup, writing standards, AI-assisted workflows, and best practices.',
          user_id = admin_user_id,
          published = true,
          status = 'published',
          published_at = COALESCE(published_at, NOW()),
          seo_title = 'Contributor Getting Started Guide | THE LOST ARCHIVES BOOK CLUB | THE LOST+UNFOUNDS',
          seo_description = 'A comprehensive guide for contributors to share thoughtful reflections, engage readers, and earn as Amazon affiliates on THE LOST ARCHIVES BOOK CLUB.',
          seo_keywords = 'book club guide, contributor guide, Amazon affiliate, writing guide, book reviews, THE LOST ARCHIVES, getting started'
        WHERE id = existing_post_id;
      ELSE
        INSERT INTO blog_posts (
          title,
          slug,
          content,
          excerpt,
          user_id,
          published,
          status,
          published_at,
          seo_title,
          seo_description,
          seo_keywords
        ) VALUES (
          'Contributor Getting Started Guide',
          'contributor-getting-started-guide',
          'Welcome to THE LOST ARCHIVES BOOK CLUB, a platform designed to help contributors share thoughtful reflections on books, engage readers, and earn as Amazon affiliates. This guide walks you through getting set up, writing high-quality articles, and using AI effectively while maintaining your unique voice by implementing Human-In-The-Loop principles and meeting Google''s standards for human expertise, experience, authority, and trust (E‑E‑A‑T).

THE LOST ARCHIVES BOOK CLUB exists to give contributors the opportunity to share knowledge, express personal insights, and connect with an audience they may not have reached through traditional channels. By contributing, you not only help educate and inspire others but also create a pathway to earn online by leveraging your expertise and experiences in meaningful ways.

## Why Contribute?

**Centralized Reach & Community Impact**

Your reviews become part of a trusted, curated platform that attracts readers interested in thoughtful book reflections. Unlike personal blogs or social media, THE LOST ARCHIVES BOOK CLUB drives traffic to all contributor content, giving you more visibility and increasing the potential for affiliate revenue.

**Collaborative Credibility**

Multiple contributors reviewing the same books create a rich ecosystem of perspectives. Readers can compare opinions, see how different people are impacted by the same book, and gain deeper insights. Your work gains authority by association with other thoughtful reviews.

**Affiliate Opportunities**

Every article includes Amazon affiliate links. By publishing on this platform, your links benefit from more readers, search visibility, and engagement, increasing the chance of purchases and commissions.

**Searchable Knowledge Base**

Readers can search by book title or author, surfacing multiple articles about the same book. This allows them to explore different perspectives and click affiliate links to purchase books. Contributors benefit from increased engagement and potential affiliate revenue.

## 1. Getting Set Up: Registration & Amazon Affiliate Integration

**Steps:**

1. Create your contributor account on THE LOST ARCHIVES BOOK CLUB.
2. Choose a username; this generates your custom contributor URL.
3. Sign up for the Amazon Affiliate program if you haven''t already at https://affiliate-program.amazon.com/
4. During setup, paste your custom contributor URL to tie your affiliate links to your account.
5. Obtain your Amazon Store ID from your Amazon account.
6. Return to our platform and paste your Store ID to finalize setup.

**Why this matters:** Correct setup ensures all affiliate links are tracked, so you earn commissions when readers purchase through your articles.

**Amazon Affiliate Impact: Make Your Story Compelling**

Amazon will only give you credit when readers click your Amazon link to make a purchase. To maximize earnings:
- Share your personal perspective and experiences.
- Reference specific passages or quotes from the books.
- Tell a story: why the book mattered and how it influenced your thinking.
- Connect themes across the four books in your article.
- Include natural, integrated calls-to-action with your affiliate links.
- Select books that are listed on Amazon. If you want to discuss a book not available on Amazon, you may include it in the discussion, but your article must have four books with Amazon links.

## 2. Submission Requirements

Each article should feature four books with unique SiteStripe links.

**Why four books?**
- Validates your insights across multiple perspectives.
- Encourages cross-genre and interdisciplinary thinking.
- Helps synthesize deeper understanding and actionable lessons.
- Builds credibility with Google''s E‑E‑A‑T standards by demonstrating thoughtful analysis.

Articles should include direct quotes or passages from the books to illustrate key points.

## 3. Writing Standards: Google E‑E‑A‑T

**Experience:** Share personal connection and lessons learned.
**Expertise:** Provide accurate analysis and thoughtful commentary.
**Authoritativeness:** Contribute consistently and maintain high-quality work.
**Trustworthiness:** Be clear, honest, and transparent in your writing.

**Why this matters:** Meeting E‑E‑A‑T standards improves search rankings, builds reader trust, and increases engagement and affiliate conversions.

## 4. Human-in-the-Loop (HITL) Review

AI can draft content, but human review is essential:
- Fact-check AI-generated text.
- Refine tone, style, and voice to reflect your perspective.
- Add personal anecdotes, reflections, and direct quotes.
- Verify affiliate links and ensure they are accurate and functional.

**Why this matters:** HITL ensures authenticity, originality, and credibility, helping your article outperform generic AI content and meet E‑E‑A‑T standards.

## 5. AI-Assisted Writing Workflow

**Step 1: Research & Planning (Human)**
- Gather background info and key themes of your four books.
- Identify direct quotes or passages for use in your article.
- Decide on personal experiences or insights to include.

**Step 2: Define Tone, Perspective, & Audience**
- Decide how your voice should come across: reflective, conversational, analytical, etc.
- Use the pre-crafted AI prompt as a starting point.
- Iteratively refine instructions, working with AI to rewrite sections to match your style.

**Step 3: Generate Outline & Draft (AI-Assisted)**
- Use AI to create structure, headings, and first draft paragraphs.
- Focus on flow, clarity, and organization.

**Step 4: Human Editing & Personalization**
- Revise AI text to reflect exactly how you would say it, word-for-word.
- Integrate personal stories, reflections, and quotes.
- Challenge AI to improve phrasing, expand insights, or deepen analysis.

**Step 5: SEO & Readability Optimization**
- Add clear headings and subheadings.
- Use short, focused paragraphs.
- Include natural keywords and internal links.

**Step 6: Final HITL Review**
- Ensure tone, flow, and engagement are polished.
- Confirm formatting, headings, and affiliate link accuracy.
- Verify E‑E‑A‑T and originality standards.

## 6. Best Practices for AI-Assisted Original Content

- Cross-reference all four books to show how themes relate.
- Inject personal voice: anecdotes, lessons, reflections.
- Use direct quotes/passages for credibility and depth.
- Iterate: revise drafts repeatedly until they express your ideas precisely.
- Challenge AI outputs: ask it to improve phrasing, clarify ideas, or add depth.
- Add actionable insights: show readers how to apply lessons.
- Sometimes, traditional research or reading methods are necessary—don''t skip foundational work in favor of AI shortcuts.

**Why this matters:** Original, human-refined content ranks better, attracts more readers, and increases affiliate revenue. Thoughtful posts build credibility and trust.

## 7. Final Submission Checklist

- Four books with unique SiteStripe links included
- Article reviewed, fact-checked, and personalized
- Direct quotes/passages integrated
- Affiliate links verified
- Headings, SEO, and readability optimized
- Tone and voice consistent with personal style
- E‑E‑A‑T and HITL standards satisfied

## 8. FAQ

**Do I have to read the entire book?**

No. You can reference key passages, chapters, or ideas that resonate with you. Sometimes a single passage provides enough insight for reflection. Yes, deeper reading helps. Reading a book fully—or multiple times—allows stronger analysis and greater authority. Audiobooks are fine. How you consume the material—print, digital, or audio—is up to you.

**How can I improve affiliate clicks?**

- Make your story compelling and relatable.
- Use personal anecdotes and reflections to engage readers.
- Reference direct quotes or passages for credibility.
- Include clear and naturally placed affiliate links.

**Can I submit articles about books I''ve only partially read?**

Yes, as long as you provide meaningful insights and references. Focus on depth and originality rather than completion.

**Do articles need to be PG or kid-friendly?**

Content should be thoughtful and positive, free from profanity or hateful language. Original ideas are encouraged, but all submissions should promote reflection and constructive discussion.

---

THE LOST ARCHIVES BOOK CLUB is designed to empower contributors to share their knowledge, talents, and insights in ways that reach an engaged audience beyond traditional avenues. By creating thoughtful, reflective, and well-crafted content, you have the opportunity to educate, inspire, and earn online while using your skills in unique and meaningful ways.',
          'A comprehensive guide for contributors to share thoughtful reflections, engage readers, and earn as Amazon affiliates on THE LOST ARCHIVES BOOK CLUB. Learn about setup, writing standards, AI-assisted workflows, and best practices.',
          admin_user_id,
          true,
          'published',
          NOW(),
          'Contributor Getting Started Guide | THE LOST ARCHIVES BOOK CLUB | THE LOST+UNFOUNDS',
          'A comprehensive guide for contributors to share thoughtful reflections, engage readers, and earn as Amazon affiliates on THE LOST ARCHIVES BOOK CLUB.',
          'book club guide, contributor guide, Amazon affiliate, writing guide, book reviews, THE LOST ARCHIVES, getting started'
        );
      END IF;
    ELSE
      -- Using author_id
      IF existing_post_id IS NOT NULL THEN
        UPDATE blog_posts SET
          title = 'Contributor Getting Started Guide',
          content = 'Welcome to THE LOST ARCHIVES BOOK CLUB, a platform designed to help contributors share thoughtful reflections on books, engage readers, and earn as Amazon affiliates. This guide walks you through getting set up, writing high-quality articles, and using AI effectively while maintaining your unique voice by implementing Human-In-The-Loop principles and meeting Google''s standards for human expertise, experience, authority, and trust (E‑E‑A‑T).

THE LOST ARCHIVES BOOK CLUB exists to give contributors the opportunity to share knowledge, express personal insights, and connect with an audience they may not have reached through traditional channels. By contributing, you not only help educate and inspire others but also create a pathway to earn online by leveraging your expertise and experiences in meaningful ways.

## Why Contribute?

**Centralized Reach & Community Impact**

Your reviews become part of a trusted, curated platform that attracts readers interested in thoughtful book reflections. Unlike personal blogs or social media, THE LOST ARCHIVES BOOK CLUB drives traffic to all contributor content, giving you more visibility and increasing the potential for affiliate revenue.

**Collaborative Credibility**

Multiple contributors reviewing the same books create a rich ecosystem of perspectives. Readers can compare opinions, see how different people are impacted by the same book, and gain deeper insights. Your work gains authority by association with other thoughtful reviews.

**Affiliate Opportunities**

Every article includes Amazon affiliate links. By publishing on this platform, your links benefit from more readers, search visibility, and engagement, increasing the chance of purchases and commissions.

**Searchable Knowledge Base**

Readers can search by book title or author, surfacing multiple articles about the same book. This allows them to explore different perspectives and click affiliate links to purchase books. Contributors benefit from increased engagement and potential affiliate revenue.

## 1. Getting Set Up: Registration & Amazon Affiliate Integration

**Steps:**

1. Create your contributor account on THE LOST ARCHIVES BOOK CLUB.
2. Choose a username; this generates your custom contributor URL.
3. Sign up for the Amazon Affiliate program if you haven''t already at https://affiliate-program.amazon.com/
4. During setup, paste your custom contributor URL to tie your affiliate links to your account.
5. Obtain your Amazon Store ID from your Amazon account.
6. Return to our platform and paste your Store ID to finalize setup.

**Why this matters:** Correct setup ensures all affiliate links are tracked, so you earn commissions when readers purchase through your articles.

**Amazon Affiliate Impact: Make Your Story Compelling**

Amazon will only give you credit when readers click your Amazon link to make a purchase. To maximize earnings:
- Share your personal perspective and experiences.
- Reference specific passages or quotes from the books.
- Tell a story: why the book mattered and how it influenced your thinking.
- Connect themes across the four books in your article.
- Include natural, integrated calls-to-action with your affiliate links.
- Select books that are listed on Amazon. If you want to discuss a book not available on Amazon, you may include it in the discussion, but your article must have four books with Amazon links.

## 2. Submission Requirements

Each article should feature four books with unique SiteStripe links.

**Why four books?**
- Validates your insights across multiple perspectives.
- Encourages cross-genre and interdisciplinary thinking.
- Helps synthesize deeper understanding and actionable lessons.
- Builds credibility with Google''s E‑E‑A‑T standards by demonstrating thoughtful analysis.

Articles should include direct quotes or passages from the books to illustrate key points.

## 3. Writing Standards: Google E‑E‑A‑T

**Experience:** Share personal connection and lessons learned.
**Expertise:** Provide accurate analysis and thoughtful commentary.
**Authoritativeness:** Contribute consistently and maintain high-quality work.
**Trustworthiness:** Be clear, honest, and transparent in your writing.

**Why this matters:** Meeting E‑E‑A‑T standards improves search rankings, builds reader trust, and increases engagement and affiliate conversions.

## 4. Human-in-the-Loop (HITL) Review

AI can draft content, but human review is essential:
- Fact-check AI-generated text.
- Refine tone, style, and voice to reflect your perspective.
- Add personal anecdotes, reflections, and direct quotes.
- Verify affiliate links and ensure they are accurate and functional.

**Why this matters:** HITL ensures authenticity, originality, and credibility, helping your article outperform generic AI content and meet E‑E‑A‑T standards.

## 5. AI-Assisted Writing Workflow

**Step 1: Research & Planning (Human)**
- Gather background info and key themes of your four books.
- Identify direct quotes or passages for use in your article.
- Decide on personal experiences or insights to include.

**Step 2: Define Tone, Perspective, & Audience**
- Decide how your voice should come across: reflective, conversational, analytical, etc.
- Use the pre-crafted AI prompt as a starting point.
- Iteratively refine instructions, working with AI to rewrite sections to match your style.

**Step 3: Generate Outline & Draft (AI-Assisted)**
- Use AI to create structure, headings, and first draft paragraphs.
- Focus on flow, clarity, and organization.

**Step 4: Human Editing & Personalization**
- Revise AI text to reflect exactly how you would say it, word-for-word.
- Integrate personal stories, reflections, and quotes.
- Challenge AI to improve phrasing, expand insights, or deepen analysis.

**Step 5: SEO & Readability Optimization**
- Add clear headings and subheadings.
- Use short, focused paragraphs.
- Include natural keywords and internal links.

**Step 6: Final HITL Review**
- Ensure tone, flow, and engagement are polished.
- Confirm formatting, headings, and affiliate link accuracy.
- Verify E‑E‑A‑T and originality standards.

## 6. Best Practices for AI-Assisted Original Content

- Cross-reference all four books to show how themes relate.
- Inject personal voice: anecdotes, lessons, reflections.
- Use direct quotes/passages for credibility and depth.
- Iterate: revise drafts repeatedly until they express your ideas precisely.
- Challenge AI outputs: ask it to improve phrasing, clarify ideas, or add depth.
- Add actionable insights: show readers how to apply lessons.
- Sometimes, traditional research or reading methods are necessary—don''t skip foundational work in favor of AI shortcuts.

**Why this matters:** Original, human-refined content ranks better, attracts more readers, and increases affiliate revenue. Thoughtful posts build credibility and trust.

## 7. Final Submission Checklist

- Four books with unique SiteStripe links included
- Article reviewed, fact-checked, and personalized
- Direct quotes/passages integrated
- Affiliate links verified
- Headings, SEO, and readability optimized
- Tone and voice consistent with personal style
- E‑E‑A‑T and HITL standards satisfied

## 8. FAQ

**Do I have to read the entire book?**

No. You can reference key passages, chapters, or ideas that resonate with you. Sometimes a single passage provides enough insight for reflection. Yes, deeper reading helps. Reading a book fully—or multiple times—allows stronger analysis and greater authority. Audiobooks are fine. How you consume the material—print, digital, or audio—is up to you.

**How can I improve affiliate clicks?**

- Make your story compelling and relatable.
- Use personal anecdotes and reflections to engage readers.
- Reference direct quotes or passages for credibility.
- Include clear and naturally placed affiliate links.

**Can I submit articles about books I''ve only partially read?**

Yes, as long as you provide meaningful insights and references. Focus on depth and originality rather than completion.

**Do articles need to be PG or kid-friendly?**

Content should be thoughtful and positive, free from profanity or hateful language. Original ideas are encouraged, but all submissions should promote reflection and constructive discussion.

---

THE LOST ARCHIVES BOOK CLUB is designed to empower contributors to share their knowledge, talents, and insights in ways that reach an engaged audience beyond traditional avenues. By creating thoughtful, reflective, and well-crafted content, you have the opportunity to educate, inspire, and earn online while using your skills in unique and meaningful ways.',
          excerpt = 'A comprehensive guide for contributors to share thoughtful reflections, engage readers, and earn as Amazon affiliates on THE LOST ARCHIVES BOOK CLUB. Learn about setup, writing standards, AI-assisted workflows, and best practices.',
          author_id = admin_user_id,
          published = true,
          status = 'published',
          published_at = COALESCE(published_at, NOW()),
          seo_title = 'Contributor Getting Started Guide | THE LOST ARCHIVES BOOK CLUB | THE LOST+UNFOUNDS',
          seo_description = 'A comprehensive guide for contributors to share thoughtful reflections, engage readers, and earn as Amazon affiliates on THE LOST ARCHIVES BOOK CLUB.',
          seo_keywords = 'book club guide, contributor guide, Amazon affiliate, writing guide, book reviews, THE LOST ARCHIVES, getting started'
        WHERE id = existing_post_id;
      ELSE
        INSERT INTO blog_posts (
          title,
          slug,
          content,
          excerpt,
          author_id,
          published,
          status,
          published_at,
          seo_title,
          seo_description,
          seo_keywords
        ) VALUES (
          'Contributor Getting Started Guide',
          'contributor-getting-started-guide',
          'Welcome to THE LOST ARCHIVES BOOK CLUB, a platform designed to help contributors share thoughtful reflections on books, engage readers, and earn as Amazon affiliates. This guide walks you through getting set up, writing high-quality articles, and using AI effectively while maintaining your unique voice by implementing Human-In-The-Loop principles and meeting Google''s standards for human expertise, experience, authority, and trust (E‑E‑A‑T).

THE LOST ARCHIVES BOOK CLUB exists to give contributors the opportunity to share knowledge, express personal insights, and connect with an audience they may not have reached through traditional channels. By contributing, you not only help educate and inspire others but also create a pathway to earn online by leveraging your expertise and experiences in meaningful ways.

## Why Contribute?

**Centralized Reach & Community Impact**

Your reviews become part of a trusted, curated platform that attracts readers interested in thoughtful book reflections. Unlike personal blogs or social media, THE LOST ARCHIVES BOOK CLUB drives traffic to all contributor content, giving you more visibility and increasing the potential for affiliate revenue.

**Collaborative Credibility**

Multiple contributors reviewing the same books create a rich ecosystem of perspectives. Readers can compare opinions, see how different people are impacted by the same book, and gain deeper insights. Your work gains authority by association with other thoughtful reviews.

**Affiliate Opportunities**

Every article includes Amazon affiliate links. By publishing on this platform, your links benefit from more readers, search visibility, and engagement, increasing the chance of purchases and commissions.

**Searchable Knowledge Base**

Readers can search by book title or author, surfacing multiple articles about the same book. This allows them to explore different perspectives and click affiliate links to purchase books. Contributors benefit from increased engagement and potential affiliate revenue.

## 1. Getting Set Up: Registration & Amazon Affiliate Integration

**Steps:**

1. Create your contributor account on THE LOST ARCHIVES BOOK CLUB.
2. Choose a username; this generates your custom contributor URL.
3. Sign up for the Amazon Affiliate program if you haven''t already at https://affiliate-program.amazon.com/
4. During setup, paste your custom contributor URL to tie your affiliate links to your account.
5. Obtain your Amazon Store ID from your Amazon account.
6. Return to our platform and paste your Store ID to finalize setup.

**Why this matters:** Correct setup ensures all affiliate links are tracked, so you earn commissions when readers purchase through your articles.

**Amazon Affiliate Impact: Make Your Story Compelling**

Amazon will only give you credit when readers click your Amazon link to make a purchase. To maximize earnings:
- Share your personal perspective and experiences.
- Reference specific passages or quotes from the books.
- Tell a story: why the book mattered and how it influenced your thinking.
- Connect themes across the four books in your article.
- Include natural, integrated calls-to-action with your affiliate links.
- Select books that are listed on Amazon. If you want to discuss a book not available on Amazon, you may include it in the discussion, but your article must have four books with Amazon links.

## 2. Submission Requirements

Each article should feature four books with unique SiteStripe links.

**Why four books?**
- Validates your insights across multiple perspectives.
- Encourages cross-genre and interdisciplinary thinking.
- Helps synthesize deeper understanding and actionable lessons.
- Builds credibility with Google''s E‑E‑A‑T standards by demonstrating thoughtful analysis.

Articles should include direct quotes or passages from the books to illustrate key points.

## 3. Writing Standards: Google E‑E‑A‑T

**Experience:** Share personal connection and lessons learned.
**Expertise:** Provide accurate analysis and thoughtful commentary.
**Authoritativeness:** Contribute consistently and maintain high-quality work.
**Trustworthiness:** Be clear, honest, and transparent in your writing.

**Why this matters:** Meeting E‑E‑A‑T standards improves search rankings, builds reader trust, and increases engagement and affiliate conversions.

## 4. Human-in-the-Loop (HITL) Review

AI can draft content, but human review is essential:
- Fact-check AI-generated text.
- Refine tone, style, and voice to reflect your perspective.
- Add personal anecdotes, reflections, and direct quotes.
- Verify affiliate links and ensure they are accurate and functional.

**Why this matters:** HITL ensures authenticity, originality, and credibility, helping your article outperform generic AI content and meet E‑E‑A‑T standards.

## 5. AI-Assisted Writing Workflow

**Step 1: Research & Planning (Human)**
- Gather background info and key themes of your four books.
- Identify direct quotes or passages for use in your article.
- Decide on personal experiences or insights to include.

**Step 2: Define Tone, Perspective, & Audience**
- Decide how your voice should come across: reflective, conversational, analytical, etc.
- Use the pre-crafted AI prompt as a starting point.
- Iteratively refine instructions, working with AI to rewrite sections to match your style.

**Step 3: Generate Outline & Draft (AI-Assisted)**
- Use AI to create structure, headings, and first draft paragraphs.
- Focus on flow, clarity, and organization.

**Step 4: Human Editing & Personalization**
- Revise AI text to reflect exactly how you would say it, word-for-word.
- Integrate personal stories, reflections, and quotes.
- Challenge AI to improve phrasing, expand insights, or deepen analysis.

**Step 5: SEO & Readability Optimization**
- Add clear headings and subheadings.
- Use short, focused paragraphs.
- Include natural keywords and internal links.

**Step 6: Final HITL Review**
- Ensure tone, flow, and engagement are polished.
- Confirm formatting, headings, and affiliate link accuracy.
- Verify E‑E‑A‑T and originality standards.

## 6. Best Practices for AI-Assisted Original Content

- Cross-reference all four books to show how themes relate.
- Inject personal voice: anecdotes, lessons, reflections.
- Use direct quotes/passages for credibility and depth.
- Iterate: revise drafts repeatedly until they express your ideas precisely.
- Challenge AI outputs: ask it to improve phrasing, clarify ideas, or add depth.
- Add actionable insights: show readers how to apply lessons.
- Sometimes, traditional research or reading methods are necessary—don''t skip foundational work in favor of AI shortcuts.

**Why this matters:** Original, human-refined content ranks better, attracts more readers, and increases affiliate revenue. Thoughtful posts build credibility and trust.

## 7. Final Submission Checklist

- Four books with unique SiteStripe links included
- Article reviewed, fact-checked, and personalized
- Direct quotes/passages integrated
- Affiliate links verified
- Headings, SEO, and readability optimized
- Tone and voice consistent with personal style
- E‑E‑A‑T and HITL standards satisfied

## 8. FAQ

**Do I have to read the entire book?**

No. You can reference key passages, chapters, or ideas that resonate with you. Sometimes a single passage provides enough insight for reflection. Yes, deeper reading helps. Reading a book fully—or multiple times—allows stronger analysis and greater authority. Audiobooks are fine. How you consume the material—print, digital, or audio—is up to you.

**How can I improve affiliate clicks?**

- Make your story compelling and relatable.
- Use personal anecdotes and reflections to engage readers.
- Reference direct quotes or passages for credibility.
- Include clear and naturally placed affiliate links.

**Can I submit articles about books I''ve only partially read?**

Yes, as long as you provide meaningful insights and references. Focus on depth and originality rather than completion.

**Do articles need to be PG or kid-friendly?**

Content should be thoughtful and positive, free from profanity or hateful language. Original ideas are encouraged, but all submissions should promote reflection and constructive discussion.

---

THE LOST ARCHIVES BOOK CLUB is designed to empower contributors to share their knowledge, talents, and insights in ways that reach an engaged audience beyond traditional avenues. By creating thoughtful, reflective, and well-crafted content, you have the opportunity to educate, inspire, and earn online while using your skills in unique and meaningful ways.',
          'A comprehensive guide for contributors to share thoughtful reflections, engage readers, and earn as Amazon affiliates on THE LOST ARCHIVES BOOK CLUB. Learn about setup, writing standards, AI-assisted workflows, and best practices.',
          admin_user_id,
          true,
          'published',
          NOW(),
          'Contributor Getting Started Guide | THE LOST ARCHIVES BOOK CLUB | THE LOST+UNFOUNDS',
          'A comprehensive guide for contributors to share thoughtful reflections, engage readers, and earn as Amazon affiliates on THE LOST ARCHIVES BOOK CLUB.',
          'book club guide, contributor guide, Amazon affiliate, writing guide, book reviews, THE LOST ARCHIVES, getting started'
        );
      END IF;
    END IF;
  ELSIF user_column_name IS NOT NULL THEN
    -- Schema with user_id/author_id but no published field (use status)
    IF user_column_name = 'user_id' THEN
      IF existing_post_id IS NOT NULL THEN
        UPDATE blog_posts SET
          title = 'Contributor Getting Started Guide',
          content = 'Welcome to THE LOST ARCHIVES BOOK CLUB, a platform designed to help contributors share thoughtful reflections on books, engage readers, and earn as Amazon affiliates. This guide walks you through getting set up, writing high-quality articles, and using AI effectively while maintaining your unique voice by implementing Human-In-The-Loop principles and meeting Google''s standards for human expertise, experience, authority, and trust (E‑E‑A‑T).

THE LOST ARCHIVES BOOK CLUB exists to give contributors the opportunity to share knowledge, express personal insights, and connect with an audience they may not have reached through traditional channels. By contributing, you not only help educate and inspire others but also create a pathway to earn online by leveraging your expertise and experiences in meaningful ways.

## Why Contribute?

**Centralized Reach & Community Impact**

Your reviews become part of a trusted, curated platform that attracts readers interested in thoughtful book reflections. Unlike personal blogs or social media, THE LOST ARCHIVES BOOK CLUB drives traffic to all contributor content, giving you more visibility and increasing the potential for affiliate revenue.

**Collaborative Credibility**

Multiple contributors reviewing the same books create a rich ecosystem of perspectives. Readers can compare opinions, see how different people are impacted by the same book, and gain deeper insights. Your work gains authority by association with other thoughtful reviews.

**Affiliate Opportunities**

Every article includes Amazon affiliate links. By publishing on this platform, your links benefit from more readers, search visibility, and engagement, increasing the chance of purchases and commissions.

**Searchable Knowledge Base**

Readers can search by book title or author, surfacing multiple articles about the same book. This allows them to explore different perspectives and click affiliate links to purchase books. Contributors benefit from increased engagement and potential affiliate revenue.

## 1. Getting Set Up: Registration & Amazon Affiliate Integration

**Steps:**

1. Create your contributor account on THE LOST ARCHIVES BOOK CLUB.
2. Choose a username; this generates your custom contributor URL.
3. Sign up for the Amazon Affiliate program if you haven''t already at https://affiliate-program.amazon.com/
4. During setup, paste your custom contributor URL to tie your affiliate links to your account.
5. Obtain your Amazon Store ID from your Amazon account.
6. Return to our platform and paste your Store ID to finalize setup.

**Why this matters:** Correct setup ensures all affiliate links are tracked, so you earn commissions when readers purchase through your articles.

**Amazon Affiliate Impact: Make Your Story Compelling**

Amazon will only give you credit when readers click your Amazon link to make a purchase. To maximize earnings:
- Share your personal perspective and experiences.
- Reference specific passages or quotes from the books.
- Tell a story: why the book mattered and how it influenced your thinking.
- Connect themes across the four books in your article.
- Include natural, integrated calls-to-action with your affiliate links.
- Select books that are listed on Amazon. If you want to discuss a book not available on Amazon, you may include it in the discussion, but your article must have four books with Amazon links.

## 2. Submission Requirements

Each article should feature four books with unique SiteStripe links.

**Why four books?**
- Validates your insights across multiple perspectives.
- Encourages cross-genre and interdisciplinary thinking.
- Helps synthesize deeper understanding and actionable lessons.
- Builds credibility with Google''s E‑E‑A‑T standards by demonstrating thoughtful analysis.

Articles should include direct quotes or passages from the books to illustrate key points.

## 3. Writing Standards: Google E‑E‑A‑T

**Experience:** Share personal connection and lessons learned.
**Expertise:** Provide accurate analysis and thoughtful commentary.
**Authoritativeness:** Contribute consistently and maintain high-quality work.
**Trustworthiness:** Be clear, honest, and transparent in your writing.

**Why this matters:** Meeting E‑E‑A‑T standards improves search rankings, builds reader trust, and increases engagement and affiliate conversions.

## 4. Human-in-the-Loop (HITL) Review

AI can draft content, but human review is essential:
- Fact-check AI-generated text.
- Refine tone, style, and voice to reflect your perspective.
- Add personal anecdotes, reflections, and direct quotes.
- Verify affiliate links and ensure they are accurate and functional.

**Why this matters:** HITL ensures authenticity, originality, and credibility, helping your article outperform generic AI content and meet E‑E‑A‑T standards.

## 5. AI-Assisted Writing Workflow

**Step 1: Research & Planning (Human)**
- Gather background info and key themes of your four books.
- Identify direct quotes or passages for use in your article.
- Decide on personal experiences or insights to include.

**Step 2: Define Tone, Perspective, & Audience**
- Decide how your voice should come across: reflective, conversational, analytical, etc.
- Use the pre-crafted AI prompt as a starting point.
- Iteratively refine instructions, working with AI to rewrite sections to match your style.

**Step 3: Generate Outline & Draft (AI-Assisted)**
- Use AI to create structure, headings, and first draft paragraphs.
- Focus on flow, clarity, and organization.

**Step 4: Human Editing & Personalization**
- Revise AI text to reflect exactly how you would say it, word-for-word.
- Integrate personal stories, reflections, and quotes.
- Challenge AI to improve phrasing, expand insights, or deepen analysis.

**Step 5: SEO & Readability Optimization**
- Add clear headings and subheadings.
- Use short, focused paragraphs.
- Include natural keywords and internal links.

**Step 6: Final HITL Review**
- Ensure tone, flow, and engagement are polished.
- Confirm formatting, headings, and affiliate link accuracy.
- Verify E‑E‑A‑T and originality standards.

## 6. Best Practices for AI-Assisted Original Content

- Cross-reference all four books to show how themes relate.
- Inject personal voice: anecdotes, lessons, reflections.
- Use direct quotes/passages for credibility and depth.
- Iterate: revise drafts repeatedly until they express your ideas precisely.
- Challenge AI outputs: ask it to improve phrasing, clarify ideas, or add depth.
- Add actionable insights: show readers how to apply lessons.
- Sometimes, traditional research or reading methods are necessary—don''t skip foundational work in favor of AI shortcuts.

**Why this matters:** Original, human-refined content ranks better, attracts more readers, and increases affiliate revenue. Thoughtful posts build credibility and trust.

## 7. Final Submission Checklist

- Four books with unique SiteStripe links included
- Article reviewed, fact-checked, and personalized
- Direct quotes/passages integrated
- Affiliate links verified
- Headings, SEO, and readability optimized
- Tone and voice consistent with personal style
- E‑E‑A‑T and HITL standards satisfied

## 8. FAQ

**Do I have to read the entire book?**

No. You can reference key passages, chapters, or ideas that resonate with you. Sometimes a single passage provides enough insight for reflection. Yes, deeper reading helps. Reading a book fully—or multiple times—allows stronger analysis and greater authority. Audiobooks are fine. How you consume the material—print, digital, or audio—is up to you.

**How can I improve affiliate clicks?**

- Make your story compelling and relatable.
- Use personal anecdotes and reflections to engage readers.
- Reference direct quotes or passages for credibility.
- Include clear and naturally placed affiliate links.

**Can I submit articles about books I''ve only partially read?**

Yes, as long as you provide meaningful insights and references. Focus on depth and originality rather than completion.

**Do articles need to be PG or kid-friendly?**

Content should be thoughtful and positive, free from profanity or hateful language. Original ideas are encouraged, but all submissions should promote reflection and constructive discussion.

---

THE LOST ARCHIVES BOOK CLUB is designed to empower contributors to share their knowledge, talents, and insights in ways that reach an engaged audience beyond traditional avenues. By creating thoughtful, reflective, and well-crafted content, you have the opportunity to educate, inspire, and earn online while using your skills in unique and meaningful ways.',
          excerpt = 'A comprehensive guide for contributors to share thoughtful reflections, engage readers, and earn as Amazon affiliates on THE LOST ARCHIVES BOOK CLUB. Learn about setup, writing standards, AI-assisted workflows, and best practices.',
          user_id = admin_user_id,
          status = 'published',
          published_at = COALESCE(published_at, NOW())
        WHERE id = existing_post_id;
      ELSE
        INSERT INTO blog_posts (
          title,
          slug,
          content,
          excerpt,
          user_id,
          status,
          published_at
        ) VALUES (
          'Contributor Getting Started Guide',
          'contributor-getting-started-guide',
          'Welcome to THE LOST ARCHIVES BOOK CLUB, a platform designed to help contributors share thoughtful reflections on books, engage readers, and earn as Amazon affiliates. This guide walks you through getting set up, writing high-quality articles, and using AI effectively while maintaining your unique voice by implementing Human-In-The-Loop principles and meeting Google''s standards for human expertise, experience, authority, and trust (E‑E‑A‑T).

THE LOST ARCHIVES BOOK CLUB exists to give contributors the opportunity to share knowledge, express personal insights, and connect with an audience they may not have reached through traditional channels. By contributing, you not only help educate and inspire others but also create a pathway to earn online by leveraging your expertise and experiences in meaningful ways.

## Why Contribute?

**Centralized Reach & Community Impact**

Your reviews become part of a trusted, curated platform that attracts readers interested in thoughtful book reflections. Unlike personal blogs or social media, THE LOST ARCHIVES BOOK CLUB drives traffic to all contributor content, giving you more visibility and increasing the potential for affiliate revenue.

**Collaborative Credibility**

Multiple contributors reviewing the same books create a rich ecosystem of perspectives. Readers can compare opinions, see how different people are impacted by the same book, and gain deeper insights. Your work gains authority by association with other thoughtful reviews.

**Affiliate Opportunities**

Every article includes Amazon affiliate links. By publishing on this platform, your links benefit from more readers, search visibility, and engagement, increasing the chance of purchases and commissions.

**Searchable Knowledge Base**

Readers can search by book title or author, surfacing multiple articles about the same book. This allows them to explore different perspectives and click affiliate links to purchase books. Contributors benefit from increased engagement and potential affiliate revenue.

## 1. Getting Set Up: Registration & Amazon Affiliate Integration

**Steps:**

1. Create your contributor account on THE LOST ARCHIVES BOOK CLUB.
2. Choose a username; this generates your custom contributor URL.
3. Sign up for the Amazon Affiliate program if you haven''t already at https://affiliate-program.amazon.com/
4. During setup, paste your custom contributor URL to tie your affiliate links to your account.
5. Obtain your Amazon Store ID from your Amazon account.
6. Return to our platform and paste your Store ID to finalize setup.

**Why this matters:** Correct setup ensures all affiliate links are tracked, so you earn commissions when readers purchase through your articles.

**Amazon Affiliate Impact: Make Your Story Compelling**

Amazon will only give you credit when readers click your Amazon link to make a purchase. To maximize earnings:
- Share your personal perspective and experiences.
- Reference specific passages or quotes from the books.
- Tell a story: why the book mattered and how it influenced your thinking.
- Connect themes across the four books in your article.
- Include natural, integrated calls-to-action with your affiliate links.
- Select books that are listed on Amazon. If you want to discuss a book not available on Amazon, you may include it in the discussion, but your article must have four books with Amazon links.

## 2. Submission Requirements

Each article should feature four books with unique SiteStripe links.

**Why four books?**
- Validates your insights across multiple perspectives.
- Encourages cross-genre and interdisciplinary thinking.
- Helps synthesize deeper understanding and actionable lessons.
- Builds credibility with Google''s E‑E‑A‑T standards by demonstrating thoughtful analysis.

Articles should include direct quotes or passages from the books to illustrate key points.

## 3. Writing Standards: Google E‑E‑A‑T

**Experience:** Share personal connection and lessons learned.
**Expertise:** Provide accurate analysis and thoughtful commentary.
**Authoritativeness:** Contribute consistently and maintain high-quality work.
**Trustworthiness:** Be clear, honest, and transparent in your writing.

**Why this matters:** Meeting E‑E‑A‑T standards improves search rankings, builds reader trust, and increases engagement and affiliate conversions.

## 4. Human-in-the-Loop (HITL) Review

AI can draft content, but human review is essential:
- Fact-check AI-generated text.
- Refine tone, style, and voice to reflect your perspective.
- Add personal anecdotes, reflections, and direct quotes.
- Verify affiliate links and ensure they are accurate and functional.

**Why this matters:** HITL ensures authenticity, originality, and credibility, helping your article outperform generic AI content and meet E‑E‑A‑T standards.

## 5. AI-Assisted Writing Workflow

**Step 1: Research & Planning (Human)**
- Gather background info and key themes of your four books.
- Identify direct quotes or passages for use in your article.
- Decide on personal experiences or insights to include.

**Step 2: Define Tone, Perspective, & Audience**
- Decide how your voice should come across: reflective, conversational, analytical, etc.
- Use the pre-crafted AI prompt as a starting point.
- Iteratively refine instructions, working with AI to rewrite sections to match your style.

**Step 3: Generate Outline & Draft (AI-Assisted)**
- Use AI to create structure, headings, and first draft paragraphs.
- Focus on flow, clarity, and organization.

**Step 4: Human Editing & Personalization**
- Revise AI text to reflect exactly how you would say it, word-for-word.
- Integrate personal stories, reflections, and quotes.
- Challenge AI to improve phrasing, expand insights, or deepen analysis.

**Step 5: SEO & Readability Optimization**
- Add clear headings and subheadings.
- Use short, focused paragraphs.
- Include natural keywords and internal links.

**Step 6: Final HITL Review**
- Ensure tone, flow, and engagement are polished.
- Confirm formatting, headings, and affiliate link accuracy.
- Verify E‑E‑A‑T and originality standards.

## 6. Best Practices for AI-Assisted Original Content

- Cross-reference all four books to show how themes relate.
- Inject personal voice: anecdotes, lessons, reflections.
- Use direct quotes/passages for credibility and depth.
- Iterate: revise drafts repeatedly until they express your ideas precisely.
- Challenge AI outputs: ask it to improve phrasing, clarify ideas, or add depth.
- Add actionable insights: show readers how to apply lessons.
- Sometimes, traditional research or reading methods are necessary—don''t skip foundational work in favor of AI shortcuts.

**Why this matters:** Original, human-refined content ranks better, attracts more readers, and increases affiliate revenue. Thoughtful posts build credibility and trust.

## 7. Final Submission Checklist

- Four books with unique SiteStripe links included
- Article reviewed, fact-checked, and personalized
- Direct quotes/passages integrated
- Affiliate links verified
- Headings, SEO, and readability optimized
- Tone and voice consistent with personal style
- E‑E‑A‑T and HITL standards satisfied

## 8. FAQ

**Do I have to read the entire book?**

No. You can reference key passages, chapters, or ideas that resonate with you. Sometimes a single passage provides enough insight for reflection. Yes, deeper reading helps. Reading a book fully—or multiple times—allows stronger analysis and greater authority. Audiobooks are fine. How you consume the material—print, digital, or audio—is up to you.

**How can I improve affiliate clicks?**

- Make your story compelling and relatable.
- Use personal anecdotes and reflections to engage readers.
- Reference direct quotes or passages for credibility.
- Include clear and naturally placed affiliate links.

**Can I submit articles about books I''ve only partially read?**

Yes, as long as you provide meaningful insights and references. Focus on depth and originality rather than completion.

**Do articles need to be PG or kid-friendly?**

Content should be thoughtful and positive, free from profanity or hateful language. Original ideas are encouraged, but all submissions should promote reflection and constructive discussion.

---

THE LOST ARCHIVES BOOK CLUB is designed to empower contributors to share their knowledge, talents, and insights in ways that reach an engaged audience beyond traditional avenues. By creating thoughtful, reflective, and well-crafted content, you have the opportunity to educate, inspire, and earn online while using your skills in unique and meaningful ways.',
          'A comprehensive guide for contributors to share thoughtful reflections, engage readers, and earn as Amazon affiliates on THE LOST ARCHIVES BOOK CLUB. Learn about setup, writing standards, AI-assisted workflows, and best practices.',
          admin_user_id,
          'published',
          NOW()
        );
      END IF;
    ELSE
      -- Using author_id
      IF existing_post_id IS NOT NULL THEN
        UPDATE blog_posts SET
          title = 'Contributor Getting Started Guide',
          content = 'Welcome to THE LOST ARCHIVES BOOK CLUB, a platform designed to help contributors share thoughtful reflections on books, engage readers, and earn as Amazon affiliates. This guide walks you through getting set up, writing high-quality articles, and using AI effectively while maintaining your unique voice by implementing Human-In-The-Loop principles and meeting Google''s standards for human expertise, experience, authority, and trust (E‑E‑A‑T).

THE LOST ARCHIVES BOOK CLUB exists to give contributors the opportunity to share knowledge, express personal insights, and connect with an audience they may not have reached through traditional channels. By contributing, you not only help educate and inspire others but also create a pathway to earn online by leveraging your expertise and experiences in meaningful ways.

## Why Contribute?

**Centralized Reach & Community Impact**

Your reviews become part of a trusted, curated platform that attracts readers interested in thoughtful book reflections. Unlike personal blogs or social media, THE LOST ARCHIVES BOOK CLUB drives traffic to all contributor content, giving you more visibility and increasing the potential for affiliate revenue.

**Collaborative Credibility**

Multiple contributors reviewing the same books create a rich ecosystem of perspectives. Readers can compare opinions, see how different people are impacted by the same book, and gain deeper insights. Your work gains authority by association with other thoughtful reviews.

**Affiliate Opportunities**

Every article includes Amazon affiliate links. By publishing on this platform, your links benefit from more readers, search visibility, and engagement, increasing the chance of purchases and commissions.

**Searchable Knowledge Base**

Readers can search by book title or author, surfacing multiple articles about the same book. This allows them to explore different perspectives and click affiliate links to purchase books. Contributors benefit from increased engagement and potential affiliate revenue.

## 1. Getting Set Up: Registration & Amazon Affiliate Integration

**Steps:**

1. Create your contributor account on THE LOST ARCHIVES BOOK CLUB.
2. Choose a username; this generates your custom contributor URL.
3. Sign up for the Amazon Affiliate program if you haven''t already at https://affiliate-program.amazon.com/
4. During setup, paste your custom contributor URL to tie your affiliate links to your account.
5. Obtain your Amazon Store ID from your Amazon account.
6. Return to our platform and paste your Store ID to finalize setup.

**Why this matters:** Correct setup ensures all affiliate links are tracked, so you earn commissions when readers purchase through your articles.

**Amazon Affiliate Impact: Make Your Story Compelling**

Amazon will only give you credit when readers click your Amazon link to make a purchase. To maximize earnings:
- Share your personal perspective and experiences.
- Reference specific passages or quotes from the books.
- Tell a story: why the book mattered and how it influenced your thinking.
- Connect themes across the four books in your article.
- Include natural, integrated calls-to-action with your affiliate links.
- Select books that are listed on Amazon. If you want to discuss a book not available on Amazon, you may include it in the discussion, but your article must have four books with Amazon links.

## 2. Submission Requirements

Each article should feature four books with unique SiteStripe links.

**Why four books?**
- Validates your insights across multiple perspectives.
- Encourages cross-genre and interdisciplinary thinking.
- Helps synthesize deeper understanding and actionable lessons.
- Builds credibility with Google''s E‑E‑A‑T standards by demonstrating thoughtful analysis.

Articles should include direct quotes or passages from the books to illustrate key points.

## 3. Writing Standards: Google E‑E‑A‑T

**Experience:** Share personal connection and lessons learned.
**Expertise:** Provide accurate analysis and thoughtful commentary.
**Authoritativeness:** Contribute consistently and maintain high-quality work.
**Trustworthiness:** Be clear, honest, and transparent in your writing.

**Why this matters:** Meeting E‑E‑A‑T standards improves search rankings, builds reader trust, and increases engagement and affiliate conversions.

## 4. Human-in-the-Loop (HITL) Review

AI can draft content, but human review is essential:
- Fact-check AI-generated text.
- Refine tone, style, and voice to reflect your perspective.
- Add personal anecdotes, reflections, and direct quotes.
- Verify affiliate links and ensure they are accurate and functional.

**Why this matters:** HITL ensures authenticity, originality, and credibility, helping your article outperform generic AI content and meet E‑E‑A‑T standards.

## 5. AI-Assisted Writing Workflow

**Step 1: Research & Planning (Human)**
- Gather background info and key themes of your four books.
- Identify direct quotes or passages for use in your article.
- Decide on personal experiences or insights to include.

**Step 2: Define Tone, Perspective, & Audience**
- Decide how your voice should come across: reflective, conversational, analytical, etc.
- Use the pre-crafted AI prompt as a starting point.
- Iteratively refine instructions, working with AI to rewrite sections to match your style.

**Step 3: Generate Outline & Draft (AI-Assisted)**
- Use AI to create structure, headings, and first draft paragraphs.
- Focus on flow, clarity, and organization.

**Step 4: Human Editing & Personalization**
- Revise AI text to reflect exactly how you would say it, word-for-word.
- Integrate personal stories, reflections, and quotes.
- Challenge AI to improve phrasing, expand insights, or deepen analysis.

**Step 5: SEO & Readability Optimization**
- Add clear headings and subheadings.
- Use short, focused paragraphs.
- Include natural keywords and internal links.

**Step 6: Final HITL Review**
- Ensure tone, flow, and engagement are polished.
- Confirm formatting, headings, and affiliate link accuracy.
- Verify E‑E‑A‑T and originality standards.

## 6. Best Practices for AI-Assisted Original Content

- Cross-reference all four books to show how themes relate.
- Inject personal voice: anecdotes, lessons, reflections.
- Use direct quotes/passages for credibility and depth.
- Iterate: revise drafts repeatedly until they express your ideas precisely.
- Challenge AI outputs: ask it to improve phrasing, clarify ideas, or add depth.
- Add actionable insights: show readers how to apply lessons.
- Sometimes, traditional research or reading methods are necessary—don''t skip foundational work in favor of AI shortcuts.

**Why this matters:** Original, human-refined content ranks better, attracts more readers, and increases affiliate revenue. Thoughtful posts build credibility and trust.

## 7. Final Submission Checklist

- Four books with unique SiteStripe links included
- Article reviewed, fact-checked, and personalized
- Direct quotes/passages integrated
- Affiliate links verified
- Headings, SEO, and readability optimized
- Tone and voice consistent with personal style
- E‑E‑A‑T and HITL standards satisfied

## 8. FAQ

**Do I have to read the entire book?**

No. You can reference key passages, chapters, or ideas that resonate with you. Sometimes a single passage provides enough insight for reflection. Yes, deeper reading helps. Reading a book fully—or multiple times—allows stronger analysis and greater authority. Audiobooks are fine. How you consume the material—print, digital, or audio—is up to you.

**How can I improve affiliate clicks?**

- Make your story compelling and relatable.
- Use personal anecdotes and reflections to engage readers.
- Reference direct quotes or passages for credibility.
- Include clear and naturally placed affiliate links.

**Can I submit articles about books I''ve only partially read?**

Yes, as long as you provide meaningful insights and references. Focus on depth and originality rather than completion.

**Do articles need to be PG or kid-friendly?**

Content should be thoughtful and positive, free from profanity or hateful language. Original ideas are encouraged, but all submissions should promote reflection and constructive discussion.

---

THE LOST ARCHIVES BOOK CLUB is designed to empower contributors to share their knowledge, talents, and insights in ways that reach an engaged audience beyond traditional avenues. By creating thoughtful, reflective, and well-crafted content, you have the opportunity to educate, inspire, and earn online while using your skills in unique and meaningful ways.',
          excerpt = 'A comprehensive guide for contributors to share thoughtful reflections, engage readers, and earn as Amazon affiliates on THE LOST ARCHIVES BOOK CLUB. Learn about setup, writing standards, AI-assisted workflows, and best practices.',
          author_id = admin_user_id,
          status = 'published',
          published_at = COALESCE(published_at, NOW())
        WHERE id = existing_post_id;
      ELSE
        INSERT INTO blog_posts (
          title,
          slug,
          content,
          excerpt,
          author_id,
          status,
          published_at
        ) VALUES (
          'Contributor Getting Started Guide',
          'contributor-getting-started-guide',
          'Welcome to THE LOST ARCHIVES BOOK CLUB, a platform designed to help contributors share thoughtful reflections on books, engage readers, and earn as Amazon affiliates. This guide walks you through getting set up, writing high-quality articles, and using AI effectively while maintaining your unique voice by implementing Human-In-The-Loop principles and meeting Google''s standards for human expertise, experience, authority, and trust (E‑E‑A‑T).

THE LOST ARCHIVES BOOK CLUB exists to give contributors the opportunity to share knowledge, express personal insights, and connect with an audience they may not have reached through traditional channels. By contributing, you not only help educate and inspire others but also create a pathway to earn online by leveraging your expertise and experiences in meaningful ways.

## Why Contribute?

**Centralized Reach & Community Impact**

Your reviews become part of a trusted, curated platform that attracts readers interested in thoughtful book reflections. Unlike personal blogs or social media, THE LOST ARCHIVES BOOK CLUB drives traffic to all contributor content, giving you more visibility and increasing the potential for affiliate revenue.

**Collaborative Credibility**

Multiple contributors reviewing the same books create a rich ecosystem of perspectives. Readers can compare opinions, see how different people are impacted by the same book, and gain deeper insights. Your work gains authority by association with other thoughtful reviews.

**Affiliate Opportunities**

Every article includes Amazon affiliate links. By publishing on this platform, your links benefit from more readers, search visibility, and engagement, increasing the chance of purchases and commissions.

**Searchable Knowledge Base**

Readers can search by book title or author, surfacing multiple articles about the same book. This allows them to explore different perspectives and click affiliate links to purchase books. Contributors benefit from increased engagement and potential affiliate revenue.

## 1. Getting Set Up: Registration & Amazon Affiliate Integration

**Steps:**

1. Create your contributor account on THE LOST ARCHIVES BOOK CLUB.
2. Choose a username; this generates your custom contributor URL.
3. Sign up for the Amazon Affiliate program if you haven''t already at https://affiliate-program.amazon.com/
4. During setup, paste your custom contributor URL to tie your affiliate links to your account.
5. Obtain your Amazon Store ID from your Amazon account.
6. Return to our platform and paste your Store ID to finalize setup.

**Why this matters:** Correct setup ensures all affiliate links are tracked, so you earn commissions when readers purchase through your articles.

**Amazon Affiliate Impact: Make Your Story Compelling**

Amazon will only give you credit when readers click your Amazon link to make a purchase. To maximize earnings:
- Share your personal perspective and experiences.
- Reference specific passages or quotes from the books.
- Tell a story: why the book mattered and how it influenced your thinking.
- Connect themes across the four books in your article.
- Include natural, integrated calls-to-action with your affiliate links.
- Select books that are listed on Amazon. If you want to discuss a book not available on Amazon, you may include it in the discussion, but your article must have four books with Amazon links.

## 2. Submission Requirements

Each article should feature four books with unique SiteStripe links.

**Why four books?**
- Validates your insights across multiple perspectives.
- Encourages cross-genre and interdisciplinary thinking.
- Helps synthesize deeper understanding and actionable lessons.
- Builds credibility with Google''s E‑E‑A‑T standards by demonstrating thoughtful analysis.

Articles should include direct quotes or passages from the books to illustrate key points.

## 3. Writing Standards: Google E‑E‑A‑T

**Experience:** Share personal connection and lessons learned.
**Expertise:** Provide accurate analysis and thoughtful commentary.
**Authoritativeness:** Contribute consistently and maintain high-quality work.
**Trustworthiness:** Be clear, honest, and transparent in your writing.

**Why this matters:** Meeting E‑E‑A‑T standards improves search rankings, builds reader trust, and increases engagement and affiliate conversions.

## 4. Human-in-the-Loop (HITL) Review

AI can draft content, but human review is essential:
- Fact-check AI-generated text.
- Refine tone, style, and voice to reflect your perspective.
- Add personal anecdotes, reflections, and direct quotes.
- Verify affiliate links and ensure they are accurate and functional.

**Why this matters:** HITL ensures authenticity, originality, and credibility, helping your article outperform generic AI content and meet E‑E‑A‑T standards.

## 5. AI-Assisted Writing Workflow

**Step 1: Research & Planning (Human)**
- Gather background info and key themes of your four books.
- Identify direct quotes or passages for use in your article.
- Decide on personal experiences or insights to include.

**Step 2: Define Tone, Perspective, & Audience**
- Decide how your voice should come across: reflective, conversational, analytical, etc.
- Use the pre-crafted AI prompt as a starting point.
- Iteratively refine instructions, working with AI to rewrite sections to match your style.

**Step 3: Generate Outline & Draft (AI-Assisted)**
- Use AI to create structure, headings, and first draft paragraphs.
- Focus on flow, clarity, and organization.

**Step 4: Human Editing & Personalization**
- Revise AI text to reflect exactly how you would say it, word-for-word.
- Integrate personal stories, reflections, and quotes.
- Challenge AI to improve phrasing, expand insights, or deepen analysis.

**Step 5: SEO & Readability Optimization**
- Add clear headings and subheadings.
- Use short, focused paragraphs.
- Include natural keywords and internal links.

**Step 6: Final HITL Review**
- Ensure tone, flow, and engagement are polished.
- Confirm formatting, headings, and affiliate link accuracy.
- Verify E‑E‑A‑T and originality standards.

## 6. Best Practices for AI-Assisted Original Content

- Cross-reference all four books to show how themes relate.
- Inject personal voice: anecdotes, lessons, reflections.
- Use direct quotes/passages for credibility and depth.
- Iterate: revise drafts repeatedly until they express your ideas precisely.
- Challenge AI outputs: ask it to improve phrasing, clarify ideas, or add depth.
- Add actionable insights: show readers how to apply lessons.
- Sometimes, traditional research or reading methods are necessary—don''t skip foundational work in favor of AI shortcuts.

**Why this matters:** Original, human-refined content ranks better, attracts more readers, and increases affiliate revenue. Thoughtful posts build credibility and trust.

## 7. Final Submission Checklist

- Four books with unique SiteStripe links included
- Article reviewed, fact-checked, and personalized
- Direct quotes/passages integrated
- Affiliate links verified
- Headings, SEO, and readability optimized
- Tone and voice consistent with personal style
- E‑E‑A‑T and HITL standards satisfied

## 8. FAQ

**Do I have to read the entire book?**

No. You can reference key passages, chapters, or ideas that resonate with you. Sometimes a single passage provides enough insight for reflection. Yes, deeper reading helps. Reading a book fully—or multiple times—allows stronger analysis and greater authority. Audiobooks are fine. How you consume the material—print, digital, or audio—is up to you.

**How can I improve affiliate clicks?**

- Make your story compelling and relatable.
- Use personal anecdotes and reflections to engage readers.
- Reference direct quotes or passages for credibility.
- Include clear and naturally placed affiliate links.

**Can I submit articles about books I''ve only partially read?**

Yes, as long as you provide meaningful insights and references. Focus on depth and originality rather than completion.

**Do articles need to be PG or kid-friendly?**

Content should be thoughtful and positive, free from profanity or hateful language. Original ideas are encouraged, but all submissions should promote reflection and constructive discussion.

---

THE LOST ARCHIVES BOOK CLUB is designed to empower contributors to share their knowledge, talents, and insights in ways that reach an engaged audience beyond traditional avenues. By creating thoughtful, reflective, and well-crafted content, you have the opportunity to educate, inspire, and earn online while using your skills in unique and meaningful ways.',
          'A comprehensive guide for contributors to share thoughtful reflections, engage readers, and earn as Amazon affiliates on THE LOST ARCHIVES BOOK CLUB. Learn about setup, writing standards, AI-assisted workflows, and best practices.',
          admin_user_id,
          'published',
          NOW()
        );
      END IF;
    END IF;
  ELSE
    -- Oldest schema - no author_id, no published field (use status only)
    IF existing_post_id IS NOT NULL THEN
      UPDATE blog_posts SET
        title = 'Contributor Getting Started Guide',
        content = 'Welcome to THE LOST ARCHIVES BOOK CLUB, a platform designed to help contributors share thoughtful reflections on books, engage readers, and earn as Amazon affiliates. This guide walks you through getting set up, writing high-quality articles, and using AI effectively while maintaining your unique voice by implementing Human-In-The-Loop principles and meeting Google''s standards for human expertise, experience, authority, and trust (E‑E‑A‑T).

THE LOST ARCHIVES BOOK CLUB exists to give contributors the opportunity to share knowledge, express personal insights, and connect with an audience they may not have reached through traditional channels. By contributing, you not only help educate and inspire others but also create a pathway to earn online by leveraging your expertise and experiences in meaningful ways.

## Why Contribute?

**Centralized Reach & Community Impact**

Your reviews become part of a trusted, curated platform that attracts readers interested in thoughtful book reflections. Unlike personal blogs or social media, THE LOST ARCHIVES BOOK CLUB drives traffic to all contributor content, giving you more visibility and increasing the potential for affiliate revenue.

**Collaborative Credibility**

Multiple contributors reviewing the same books create a rich ecosystem of perspectives. Readers can compare opinions, see how different people are impacted by the same book, and gain deeper insights. Your work gains authority by association with other thoughtful reviews.

**Affiliate Opportunities**

Every article includes Amazon affiliate links. By publishing on this platform, your links benefit from more readers, search visibility, and engagement, increasing the chance of purchases and commissions.

**Searchable Knowledge Base**

Readers can search by book title or author, surfacing multiple articles about the same book. This allows them to explore different perspectives and click affiliate links to purchase books. Contributors benefit from increased engagement and potential affiliate revenue.

## 1. Getting Set Up: Registration & Amazon Affiliate Integration

**Steps:**

1. Create your contributor account on THE LOST ARCHIVES BOOK CLUB.
2. Choose a username; this generates your custom contributor URL.
3. Sign up for the Amazon Affiliate program if you haven''t already at https://affiliate-program.amazon.com/
4. During setup, paste your custom contributor URL to tie your affiliate links to your account.
5. Obtain your Amazon Store ID from your Amazon account.
6. Return to our platform and paste your Store ID to finalize setup.

**Why this matters:** Correct setup ensures all affiliate links are tracked, so you earn commissions when readers purchase through your articles.

**Amazon Affiliate Impact: Make Your Story Compelling**

Amazon will only give you credit when readers click your Amazon link to make a purchase. To maximize earnings:
- Share your personal perspective and experiences.
- Reference specific passages or quotes from the books.
- Tell a story: why the book mattered and how it influenced your thinking.
- Connect themes across the four books in your article.
- Include natural, integrated calls-to-action with your affiliate links.
- Select books that are listed on Amazon. If you want to discuss a book not available on Amazon, you may include it in the discussion, but your article must have four books with Amazon links.

## 2. Submission Requirements

Each article should feature four books with unique SiteStripe links.

**Why four books?**
- Validates your insights across multiple perspectives.
- Encourages cross-genre and interdisciplinary thinking.
- Helps synthesize deeper understanding and actionable lessons.
- Builds credibility with Google''s E‑E‑A‑T standards by demonstrating thoughtful analysis.

Articles should include direct quotes or passages from the books to illustrate key points.

## 3. Writing Standards: Google E‑E‑A‑T

**Experience:** Share personal connection and lessons learned.
**Expertise:** Provide accurate analysis and thoughtful commentary.
**Authoritativeness:** Contribute consistently and maintain high-quality work.
**Trustworthiness:** Be clear, honest, and transparent in your writing.

**Why this matters:** Meeting E‑E‑A‑T standards improves search rankings, builds reader trust, and increases engagement and affiliate conversions.

## 4. Human-in-the-Loop (HITL) Review

AI can draft content, but human review is essential:
- Fact-check AI-generated text.
- Refine tone, style, and voice to reflect your perspective.
- Add personal anecdotes, reflections, and direct quotes.
- Verify affiliate links and ensure they are accurate and functional.

**Why this matters:** HITL ensures authenticity, originality, and credibility, helping your article outperform generic AI content and meet E‑E‑A‑T standards.

## 5. AI-Assisted Writing Workflow

**Step 1: Research & Planning (Human)**
- Gather background info and key themes of your four books.
- Identify direct quotes or passages for use in your article.
- Decide on personal experiences or insights to include.

**Step 2: Define Tone, Perspective, & Audience**
- Decide how your voice should come across: reflective, conversational, analytical, etc.
- Use the pre-crafted AI prompt as a starting point.
- Iteratively refine instructions, working with AI to rewrite sections to match your style.

**Step 3: Generate Outline & Draft (AI-Assisted)**
- Use AI to create structure, headings, and first draft paragraphs.
- Focus on flow, clarity, and organization.

**Step 4: Human Editing & Personalization**
- Revise AI text to reflect exactly how you would say it, word-for-word.
- Integrate personal stories, reflections, and quotes.
- Challenge AI to improve phrasing, expand insights, or deepen analysis.

**Step 5: SEO & Readability Optimization**
- Add clear headings and subheadings.
- Use short, focused paragraphs.
- Include natural keywords and internal links.

**Step 6: Final HITL Review**
- Ensure tone, flow, and engagement are polished.
- Confirm formatting, headings, and affiliate link accuracy.
- Verify E‑E‑A‑T and originality standards.

## 6. Best Practices for AI-Assisted Original Content

- Cross-reference all four books to show how themes relate.
- Inject personal voice: anecdotes, lessons, reflections.
- Use direct quotes/passages for credibility and depth.
- Iterate: revise drafts repeatedly until they express your ideas precisely.
- Challenge AI outputs: ask it to improve phrasing, clarify ideas, or add depth.
- Add actionable insights: show readers how to apply lessons.
- Sometimes, traditional research or reading methods are necessary—don''t skip foundational work in favor of AI shortcuts.

**Why this matters:** Original, human-refined content ranks better, attracts more readers, and increases affiliate revenue. Thoughtful posts build credibility and trust.

## 7. Final Submission Checklist

- Four books with unique SiteStripe links included
- Article reviewed, fact-checked, and personalized
- Direct quotes/passages integrated
- Affiliate links verified
- Headings, SEO, and readability optimized
- Tone and voice consistent with personal style
- E‑E‑A‑T and HITL standards satisfied

## 8. FAQ

**Do I have to read the entire book?**

No. You can reference key passages, chapters, or ideas that resonate with you. Sometimes a single passage provides enough insight for reflection. Yes, deeper reading helps. Reading a book fully—or multiple times—allows stronger analysis and greater authority. Audiobooks are fine. How you consume the material—print, digital, or audio—is up to you.

**How can I improve affiliate clicks?**

- Make your story compelling and relatable.
- Use personal anecdotes and reflections to engage readers.
- Reference direct quotes or passages for credibility.
- Include clear and naturally placed affiliate links.

**Can I submit articles about books I''ve only partially read?**

Yes, as long as you provide meaningful insights and references. Focus on depth and originality rather than completion.

**Do articles need to be PG or kid-friendly?**

Content should be thoughtful and positive, free from profanity or hateful language. Original ideas are encouraged, but all submissions should promote reflection and constructive discussion.

---

THE LOST ARCHIVES BOOK CLUB is designed to empower contributors to share their knowledge, talents, and insights in ways that reach an engaged audience beyond traditional avenues. By creating thoughtful, reflective, and well-crafted content, you have the opportunity to educate, inspire, and earn online while using your skills in unique and meaningful ways.',
          excerpt = 'A comprehensive guide for contributors to share thoughtful reflections, engage readers, and earn as Amazon affiliates on THE LOST ARCHIVES BOOK CLUB. Learn about setup, writing standards, AI-assisted workflows, and best practices.',
          status = 'published',
          published_at = COALESCE(published_at, NOW())
        WHERE id = existing_post_id;
      ELSE
        INSERT INTO blog_posts (
          title,
          slug,
          content,
          excerpt,
          status,
          published_at
        ) VALUES (
          'Contributor Getting Started Guide',
          'contributor-getting-started-guide',
          'Welcome to THE LOST ARCHIVES BOOK CLUB, a platform designed to help contributors share thoughtful reflections on books, engage readers, and earn as Amazon affiliates. This guide walks you through getting set up, writing high-quality articles, and using AI effectively while maintaining your unique voice by implementing Human-In-The-Loop principles and meeting Google''s standards for human expertise, experience, authority, and trust (E‑E‑A‑T).

THE LOST ARCHIVES BOOK CLUB exists to give contributors the opportunity to share knowledge, express personal insights, and connect with an audience they may not have reached through traditional channels. By contributing, you not only help educate and inspire others but also create a pathway to earn online by leveraging your expertise and experiences in meaningful ways.

## Why Contribute?

**Centralized Reach & Community Impact**

Your reviews become part of a trusted, curated platform that attracts readers interested in thoughtful book reflections. Unlike personal blogs or social media, THE LOST ARCHIVES BOOK CLUB drives traffic to all contributor content, giving you more visibility and increasing the potential for affiliate revenue.

**Collaborative Credibility**

Multiple contributors reviewing the same books create a rich ecosystem of perspectives. Readers can compare opinions, see how different people are impacted by the same book, and gain deeper insights. Your work gains authority by association with other thoughtful reviews.

**Affiliate Opportunities**

Every article includes Amazon affiliate links. By publishing on this platform, your links benefit from more readers, search visibility, and engagement, increasing the chance of purchases and commissions.

**Searchable Knowledge Base**

Readers can search by book title or author, surfacing multiple articles about the same book. This allows them to explore different perspectives and click affiliate links to purchase books. Contributors benefit from increased engagement and potential affiliate revenue.

## 1. Getting Set Up: Registration & Amazon Affiliate Integration

**Steps:**

1. Create your contributor account on THE LOST ARCHIVES BOOK CLUB.
2. Choose a username; this generates your custom contributor URL.
3. Sign up for the Amazon Affiliate program if you haven''t already at https://affiliate-program.amazon.com/
4. During setup, paste your custom contributor URL to tie your affiliate links to your account.
5. Obtain your Amazon Store ID from your Amazon account.
6. Return to our platform and paste your Store ID to finalize setup.

**Why this matters:** Correct setup ensures all affiliate links are tracked, so you earn commissions when readers purchase through your articles.

**Amazon Affiliate Impact: Make Your Story Compelling**

Amazon will only give you credit when readers click your Amazon link to make a purchase. To maximize earnings:
- Share your personal perspective and experiences.
- Reference specific passages or quotes from the books.
- Tell a story: why the book mattered and how it influenced your thinking.
- Connect themes across the four books in your article.
- Include natural, integrated calls-to-action with your affiliate links.
- Select books that are listed on Amazon. If you want to discuss a book not available on Amazon, you may include it in the discussion, but your article must have four books with Amazon links.

## 2. Submission Requirements

Each article should feature four books with unique SiteStripe links.

**Why four books?**
- Validates your insights across multiple perspectives.
- Encourages cross-genre and interdisciplinary thinking.
- Helps synthesize deeper understanding and actionable lessons.
- Builds credibility with Google''s E‑E‑A‑T standards by demonstrating thoughtful analysis.

Articles should include direct quotes or passages from the books to illustrate key points.

## 3. Writing Standards: Google E‑E‑A‑T

**Experience:** Share personal connection and lessons learned.
**Expertise:** Provide accurate analysis and thoughtful commentary.
**Authoritativeness:** Contribute consistently and maintain high-quality work.
**Trustworthiness:** Be clear, honest, and transparent in your writing.

**Why this matters:** Meeting E‑E‑A‑T standards improves search rankings, builds reader trust, and increases engagement and affiliate conversions.

## 4. Human-in-the-Loop (HITL) Review

AI can draft content, but human review is essential:
- Fact-check AI-generated text.
- Refine tone, style, and voice to reflect your perspective.
- Add personal anecdotes, reflections, and direct quotes.
- Verify affiliate links and ensure they are accurate and functional.

**Why this matters:** HITL ensures authenticity, originality, and credibility, helping your article outperform generic AI content and meet E‑E‑A‑T standards.

## 5. AI-Assisted Writing Workflow

**Step 1: Research & Planning (Human)**
- Gather background info and key themes of your four books.
- Identify direct quotes or passages for use in your article.
- Decide on personal experiences or insights to include.

**Step 2: Define Tone, Perspective, & Audience**
- Decide how your voice should come across: reflective, conversational, analytical, etc.
- Use the pre-crafted AI prompt as a starting point.
- Iteratively refine instructions, working with AI to rewrite sections to match your style.

**Step 3: Generate Outline & Draft (AI-Assisted)**
- Use AI to create structure, headings, and first draft paragraphs.
- Focus on flow, clarity, and organization.

**Step 4: Human Editing & Personalization**
- Revise AI text to reflect exactly how you would say it, word-for-word.
- Integrate personal stories, reflections, and quotes.
- Challenge AI to improve phrasing, expand insights, or deepen analysis.

**Step 5: SEO & Readability Optimization**
- Add clear headings and subheadings.
- Use short, focused paragraphs.
- Include natural keywords and internal links.

**Step 6: Final HITL Review**
- Ensure tone, flow, and engagement are polished.
- Confirm formatting, headings, and affiliate link accuracy.
- Verify E‑E‑A‑T and originality standards.

## 6. Best Practices for AI-Assisted Original Content

- Cross-reference all four books to show how themes relate.
- Inject personal voice: anecdotes, lessons, reflections.
- Use direct quotes/passages for credibility and depth.
- Iterate: revise drafts repeatedly until they express your ideas precisely.
- Challenge AI outputs: ask it to improve phrasing, clarify ideas, or add depth.
- Add actionable insights: show readers how to apply lessons.
- Sometimes, traditional research or reading methods are necessary—don''t skip foundational work in favor of AI shortcuts.

**Why this matters:** Original, human-refined content ranks better, attracts more readers, and increases affiliate revenue. Thoughtful posts build credibility and trust.

## 7. Final Submission Checklist

- Four books with unique SiteStripe links included
- Article reviewed, fact-checked, and personalized
- Direct quotes/passages integrated
- Affiliate links verified
- Headings, SEO, and readability optimized
- Tone and voice consistent with personal style
- E‑E‑A‑T and HITL standards satisfied

## 8. FAQ

**Do I have to read the entire book?**

No. You can reference key passages, chapters, or ideas that resonate with you. Sometimes a single passage provides enough insight for reflection. Yes, deeper reading helps. Reading a book fully—or multiple times—allows stronger analysis and greater authority. Audiobooks are fine. How you consume the material—print, digital, or audio—is up to you.

**How can I improve affiliate clicks?**

- Make your story compelling and relatable.
- Use personal anecdotes and reflections to engage readers.
- Reference direct quotes or passages for credibility.
- Include clear and naturally placed affiliate links.

**Can I submit articles about books I''ve only partially read?**

Yes, as long as you provide meaningful insights and references. Focus on depth and originality rather than completion.

**Do articles need to be PG or kid-friendly?**

Content should be thoughtful and positive, free from profanity or hateful language. Original ideas are encouraged, but all submissions should promote reflection and constructive discussion.

---

THE LOST ARCHIVES BOOK CLUB is designed to empower contributors to share their knowledge, talents, and insights in ways that reach an engaged audience beyond traditional avenues. By creating thoughtful, reflective, and well-crafted content, you have the opportunity to educate, inspire, and earn online while using your skills in unique and meaningful ways.',
          'A comprehensive guide for contributors to share thoughtful reflections, engage readers, and earn as Amazon affiliates on THE LOST ARCHIVES BOOK CLUB. Learn about setup, writing standards, AI-assisted workflows, and best practices.',
          'published',
          NOW()
        );
      END IF;
    END IF;
  END IF;

  RAISE NOTICE 'Blog post created successfully!';
END $$;

