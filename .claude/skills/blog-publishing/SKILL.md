---
name: blog-publishing
description: Handles the end-to-end workflow for publishing blog posts on THE LOST+UNFOUNDS. Use this when creating new posts or updating existing ones.
---

# Blog Publishing & Styling Skill

This skill ensures that every blog post is published correctly and adheres to the strict "Noir" aesthetic and styling rules.

## Part 1: The Publishing Workflow

Publishing a post is a **database write, executed directly via the Supabase MCP server**. Read the
`supabase-mcp` skill: it governs this. Do not write SQL files.

1. **Write the post content** to the styling rules in Part 2.
2. **Apply it via MCP**: use `apply_migration` (name it `snake_case`, e.g.
   `publish_blog_post_[slug]`) with the idempotent check-and-update template below.
    - **Pattern**: `DECLARE existing_post_id UUID;` then a check-and-insert/update block.
    - **Critical**: Never use `ON CONFLICT (slug)`; `slug` is not guaranteed UNIQUE.
    - Set `published=true` and `status='published'`, plus title, slug, content, excerpt, SEO fields.
3. **Verify the write**: query the row back with `execute_sql` and confirm `published`/`status`.
4. **Verify the rendered post** at `https://www.thelostandunfounds.com/thelostarchives/[slug]`;
   check the live page, never the SQL you sent.

> **Retired:** this workflow used to write `sql/` + `public/sql/` files, register them in
> `src/pages/SQL.tsx` and an `SQL_FILES` array, and have a human copy the SQL off a `/sql` page.
> That page and both code paths no longer exist. Do not recreate them.

## Part 2: Content Styling & Formatting

### 1. Text Alignment (Critical)
- **NEVER** use `text-center` or `text-justify` for body content.
- **ALWAYS** use `text-left`. Applies to paragraphs, analysis components, and headers.

### 2. Book Title Formatting
- **Bolding**: All book titles must be **bold**.
- **Case Preservation**: Titles must preserve the author's original case.
- **Linking**: Max 2 links per book. Linked titles must be **underlined**.

### 3. Disclosure & Special Characters
- **Disclosure**: Author names must be **UPPERCASE BOLD**. Disclosure text can be justified.
- **Remove "⸻"**: Do not use the long dash character. Use proper paragraph spacing.

## Migration Template Pattern

Pass this as the `query` to `apply_migration`; it is not saved as a file anywhere.

```sql
DO $$
DECLARE
    existing_post_id UUID;
BEGIN
    SELECT id INTO existing_post_id FROM blog_posts WHERE slug = '[slug]' LIMIT 1;
    IF existing_post_id IS NOT NULL THEN
        UPDATE blog_posts SET ... WHERE id = existing_post_id;
    ELSE
        INSERT INTO blog_posts (...) VALUES (...);
    END IF;
END $$;
```
