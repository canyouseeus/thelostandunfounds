-- Create blog post: "Join THE LOST ARCHIVES BOOK CLUB and Share Your Love of Books"
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

  -- Get admin user ID - MUST exist if user_id column is NOT NULL
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@thelostandunfounds.com'
  LIMIT 1;

  -- If admin user doesn't exist and column requires it, we can use NULL if column allows it
  -- Otherwise, we'll need a user ID - but don't query user_roles to avoid recursion
  IF admin_user_id IS NULL AND (has_user_id_field OR has_author_id_field) THEN
    -- Check if the column allows NULL
    -- If it does, we can proceed with NULL
    -- If it doesn't, we need to find any user or raise an error
    -- For now, we'll allow NULL if the column permits it
    RAISE NOTICE 'Admin user not found. Will use NULL for author_id/user_id if column allows it.';
  END IF;

  -- Check if post already exists
  SELECT id INTO existing_post_id
  FROM blog_posts
  WHERE slug = 'join-the-lost-archives-book-club-and-share-your-love-of-books'
  LIMIT 1;

  -- Insert or update the blog post (handle both schema versions)
  IF has_published_field AND user_column_name IS NOT NULL THEN
    -- New schema with published boolean and user_id/author_id
    IF user_column_name = 'user_id' THEN
      IF existing_post_id IS NOT NULL THEN
        -- Update existing post
        UPDATE blog_posts SET
          title = 'Join THE LOST ARCHIVES BOOK CLUB and Share Your Love of Books',
          content = 'Books shape the way we see the world, spark new ideas, and connect us to perspectives we might never encounter otherwise. THE LOST ARCHIVES BOOK CLUB exists to give readers and writers a space to explore, reflect, and share these experiences with an engaged community.

Whether you''re an avid reader or someone who enjoys thoughtful reflection, the Book Club provides a platform for you to express your insights, connect with like-minded readers, and even earn as an Amazon affiliate by sharing your favorite reads. Each contribution becomes part of a growing knowledge base that others can learn from and engage with.

To get started, we''ve created a comprehensive Contributor Getting Started Guide. It walks you through setting up your account, writing high-quality articles, using AI responsibly with Human-In-The-Loop principles, and adhering to Google''s E‑E‑A‑T standards. The guide is your go-to resource to make sure your contributions are impactful, authentic, and set up to succeed.

If you''ve ever wanted to combine your love of reading with sharing your knowledge and personal insights, THE LOST ARCHIVES BOOK CLUB is your opportunity. Check out the getting started guide and begin your journey with us today.',
          excerpt = 'Join THE LOST ARCHIVES BOOK CLUB and share your love of books. Explore, reflect, and connect with an engaged community of readers and writers. Earn as an Amazon affiliate while sharing your favorite reads.',
          user_id = admin_user_id,
          published = true,
          status = 'published',
          published_at = COALESCE(published_at, NOW()),
          seo_title = 'Join THE LOST ARCHIVES BOOK CLUB and Share Your Love of Books | THE LOST ARCHIVES | THE LOST+UNFOUNDS',
          seo_description = 'Join THE LOST ARCHIVES BOOK CLUB and share your love of books. Explore, reflect, and connect with an engaged community of readers and writers. Earn as an Amazon affiliate while sharing your favorite reads.',
          seo_keywords = 'book club, reading community, book reviews, Amazon affiliate, book recommendations, reading, writing, THE LOST ARCHIVES, book lovers, literary community'
        WHERE id = existing_post_id;
      ELSE
        -- Insert new post
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
          'Join THE LOST ARCHIVES BOOK CLUB and Share Your Love of Books',
          'join-the-lost-archives-book-club-and-share-your-love-of-books',
          'Books shape the way we see the world, spark new ideas, and connect us to perspectives we might never encounter otherwise. THE LOST ARCHIVES BOOK CLUB exists to give readers and writers a space to explore, reflect, and share these experiences with an engaged community.

Whether you''re an avid reader or someone who enjoys thoughtful reflection, the Book Club provides a platform for you to express your insights, connect with like-minded readers, and even earn as an Amazon affiliate by sharing your favorite reads. Each contribution becomes part of a growing knowledge base that others can learn from and engage with.

To get started, we''ve created a comprehensive Contributor Getting Started Guide. It walks you through setting up your account, writing high-quality articles, using AI responsibly with Human-In-The-Loop principles, and adhering to Google''s E‑E‑A‑T standards. The guide is your go-to resource to make sure your contributions are impactful, authentic, and set up to succeed.

If you''ve ever wanted to combine your love of reading with sharing your knowledge and personal insights, THE LOST ARCHIVES BOOK CLUB is your opportunity. Check out the getting started guide and begin your journey with us today.',
          'Join THE LOST ARCHIVES BOOK CLUB and share your love of books. Explore, reflect, and connect with an engaged community of readers and writers. Earn as an Amazon affiliate while sharing your favorite reads.',
          admin_user_id,
          true,
          'published',
          NOW(),
          'Join THE LOST ARCHIVES BOOK CLUB and Share Your Love of Books | THE LOST ARCHIVES | THE LOST+UNFOUNDS',
          'Join THE LOST ARCHIVES BOOK CLUB and share your love of books. Explore, reflect, and connect with an engaged community of readers and writers. Earn as an Amazon affiliate while sharing your favorite reads.',
          'book club, reading community, book reviews, Amazon affiliate, book recommendations, reading, writing, THE LOST ARCHIVES, book lovers, literary community'
        );
      END IF;
    ELSE
      -- Using author_id
      IF existing_post_id IS NOT NULL THEN
        -- Update existing post
        UPDATE blog_posts SET
          title = 'Join THE LOST ARCHIVES BOOK CLUB and Share Your Love of Books',
          content = 'Books shape the way we see the world, spark new ideas, and connect us to perspectives we might never encounter otherwise. THE LOST ARCHIVES BOOK CLUB exists to give readers and writers a space to explore, reflect, and share these experiences with an engaged community.

Whether you''re an avid reader or someone who enjoys thoughtful reflection, the Book Club provides a platform for you to express your insights, connect with like-minded readers, and even earn as an Amazon affiliate by sharing your favorite reads. Each contribution becomes part of a growing knowledge base that others can learn from and engage with.

To get started, we''ve created a comprehensive Contributor Getting Started Guide. It walks you through setting up your account, writing high-quality articles, using AI responsibly with Human-In-The-Loop principles, and adhering to Google''s E‑E‑A‑T standards. The guide is your go-to resource to make sure your contributions are impactful, authentic, and set up to succeed.

If you''ve ever wanted to combine your love of reading with sharing your knowledge and personal insights, THE LOST ARCHIVES BOOK CLUB is your opportunity. Check out the getting started guide and begin your journey with us today.',
          excerpt = 'Join THE LOST ARCHIVES BOOK CLUB and share your love of books. Explore, reflect, and connect with an engaged community of readers and writers. Earn as an Amazon affiliate while sharing your favorite reads.',
          author_id = admin_user_id,
          published = true,
          status = 'published',
          published_at = COALESCE(published_at, NOW()),
          seo_title = 'Join THE LOST ARCHIVES BOOK CLUB and Share Your Love of Books | THE LOST ARCHIVES | THE LOST+UNFOUNDS',
          seo_description = 'Join THE LOST ARCHIVES BOOK CLUB and share your love of books. Explore, reflect, and connect with an engaged community of readers and writers. Earn as an Amazon affiliate while sharing your favorite reads.',
          seo_keywords = 'book club, reading community, book reviews, Amazon affiliate, book recommendations, reading, writing, THE LOST ARCHIVES, book lovers, literary community'
        WHERE id = existing_post_id;
      ELSE
        -- Insert new post
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
          'Join THE LOST ARCHIVES BOOK CLUB and Share Your Love of Books',
          'join-the-lost-archives-book-club-and-share-your-love-of-books',
          'Books shape the way we see the world, spark new ideas, and connect us to perspectives we might never encounter otherwise. THE LOST ARCHIVES BOOK CLUB exists to give readers and writers a space to explore, reflect, and share these experiences with an engaged community.

Whether you''re an avid reader or someone who enjoys thoughtful reflection, the Book Club provides a platform for you to express your insights, connect with like-minded readers, and even earn as an Amazon affiliate by sharing your favorite reads. Each contribution becomes part of a growing knowledge base that others can learn from and engage with.

To get started, we''ve created a comprehensive Contributor Getting Started Guide. It walks you through setting up your account, writing high-quality articles, using AI responsibly with Human-In-The-Loop principles, and adhering to Google''s E‑E‑A‑T standards. The guide is your go-to resource to make sure your contributions are impactful, authentic, and set up to succeed.

If you''ve ever wanted to combine your love of reading with sharing your knowledge and personal insights, THE LOST ARCHIVES BOOK CLUB is your opportunity. Check out the getting started guide and begin your journey with us today.',
          'Join THE LOST ARCHIVES BOOK CLUB and share your love of books. Explore, reflect, and connect with an engaged community of readers and writers. Earn as an Amazon affiliate while sharing your favorite reads.',
          admin_user_id,
          true,
          'published',
          NOW(),
          'Join THE LOST ARCHIVES BOOK CLUB and Share Your Love of Books | THE LOST ARCHIVES | THE LOST+UNFOUNDS',
          'Join THE LOST ARCHIVES BOOK CLUB and share your love of books. Explore, reflect, and connect with an engaged community of readers and writers. Earn as an Amazon affiliate while sharing your favorite reads.',
          'book club, reading community, book reviews, Amazon affiliate, book recommendations, reading, writing, THE LOST ARCHIVES, book lovers, literary community'
        );
      END IF;
    END IF;
  ELSIF user_column_name IS NOT NULL THEN
    -- Schema with user_id/author_id but no published field (use status)
    IF user_column_name = 'user_id' THEN
      IF existing_post_id IS NOT NULL THEN
        -- Update existing post
        UPDATE blog_posts SET
          title = 'Join THE LOST ARCHIVES BOOK CLUB and Share Your Love of Books',
          content = 'Books shape the way we see the world, spark new ideas, and connect us to perspectives we might never encounter otherwise. THE LOST ARCHIVES BOOK CLUB exists to give readers and writers a space to explore, reflect, and share these experiences with an engaged community.

Whether you''re an avid reader or someone who enjoys thoughtful reflection, the Book Club provides a platform for you to express your insights, connect with like-minded readers, and even earn as an Amazon affiliate by sharing your favorite reads. Each contribution becomes part of a growing knowledge base that others can learn from and engage with.

To get started, we''ve created a comprehensive Contributor Getting Started Guide. It walks you through setting up your account, writing high-quality articles, using AI responsibly with Human-In-The-Loop principles, and adhering to Google''s E‑E‑A‑T standards. The guide is your go-to resource to make sure your contributions are impactful, authentic, and set up to succeed.

If you''ve ever wanted to combine your love of reading with sharing your knowledge and personal insights, THE LOST ARCHIVES BOOK CLUB is your opportunity. Check out the getting started guide and begin your journey with us today.',
          excerpt = 'Join THE LOST ARCHIVES BOOK CLUB and share your love of books. Explore, reflect, and connect with an engaged community of readers and writers. Earn as an Amazon affiliate while sharing your favorite reads.',
          user_id = admin_user_id,
          status = 'published',
          published_at = COALESCE(published_at, NOW())
        WHERE id = existing_post_id;
      ELSE
        -- Insert new post
        INSERT INTO blog_posts (
          title,
          slug,
          content,
          excerpt,
          user_id,
          status,
          published_at
        ) VALUES (
          'Join THE LOST ARCHIVES BOOK CLUB and Share Your Love of Books',
          'join-the-lost-archives-book-club-and-share-your-love-of-books',
          'Books shape the way we see the world, spark new ideas, and connect us to perspectives we might never encounter otherwise. THE LOST ARCHIVES BOOK CLUB exists to give readers and writers a space to explore, reflect, and share these experiences with an engaged community.

Whether you''re an avid reader or someone who enjoys thoughtful reflection, the Book Club provides a platform for you to express your insights, connect with like-minded readers, and even earn as an Amazon affiliate by sharing your favorite reads. Each contribution becomes part of a growing knowledge base that others can learn from and engage with.

To get started, we''ve created a comprehensive Contributor Getting Started Guide. It walks you through setting up your account, writing high-quality articles, using AI responsibly with Human-In-The-Loop principles, and adhering to Google''s E‑E‑A‑T standards. The guide is your go-to resource to make sure your contributions are impactful, authentic, and set up to succeed.

If you''ve ever wanted to combine your love of reading with sharing your knowledge and personal insights, THE LOST ARCHIVES BOOK CLUB is your opportunity. Check out the getting started guide and begin your journey with us today.',
          'Join THE LOST ARCHIVES BOOK CLUB and share your love of books. Explore, reflect, and connect with an engaged community of readers and writers. Earn as an Amazon affiliate while sharing your favorite reads.',
          admin_user_id,
          'published',
          NOW()
        );
      END IF;
    ELSE
      -- Using author_id
      IF existing_post_id IS NOT NULL THEN
        -- Update existing post
        UPDATE blog_posts SET
          title = 'Join THE LOST ARCHIVES BOOK CLUB and Share Your Love of Books',
          content = 'Books shape the way we see the world, spark new ideas, and connect us to perspectives we might never encounter otherwise. THE LOST ARCHIVES BOOK CLUB exists to give readers and writers a space to explore, reflect, and share these experiences with an engaged community.

Whether you''re an avid reader or someone who enjoys thoughtful reflection, the Book Club provides a platform for you to express your insights, connect with like-minded readers, and even earn as an Amazon affiliate by sharing your favorite reads. Each contribution becomes part of a growing knowledge base that others can learn from and engage with.

To get started, we''ve created a comprehensive Contributor Getting Started Guide. It walks you through setting up your account, writing high-quality articles, using AI responsibly with Human-In-The-Loop principles, and adhering to Google''s E‑E‑A‑T standards. The guide is your go-to resource to make sure your contributions are impactful, authentic, and set up to succeed.

If you''ve ever wanted to combine your love of reading with sharing your knowledge and personal insights, THE LOST ARCHIVES BOOK CLUB is your opportunity. Check out the getting started guide and begin your journey with us today.',
          excerpt = 'Join THE LOST ARCHIVES BOOK CLUB and share your love of books. Explore, reflect, and connect with an engaged community of readers and writers. Earn as an Amazon affiliate while sharing your favorite reads.',
          author_id = admin_user_id,
          status = 'published',
          published_at = COALESCE(published_at, NOW())
        WHERE id = existing_post_id;
      ELSE
        -- Insert new post
        INSERT INTO blog_posts (
          title,
          slug,
          content,
          excerpt,
          author_id,
          status,
          published_at
        ) VALUES (
          'Join THE LOST ARCHIVES BOOK CLUB and Share Your Love of Books',
          'join-the-lost-archives-book-club-and-share-your-love-of-books',
          'Books shape the way we see the world, spark new ideas, and connect us to perspectives we might never encounter otherwise. THE LOST ARCHIVES BOOK CLUB exists to give readers and writers a space to explore, reflect, and share these experiences with an engaged community.

Whether you''re an avid reader or someone who enjoys thoughtful reflection, the Book Club provides a platform for you to express your insights, connect with like-minded readers, and even earn as an Amazon affiliate by sharing your favorite reads. Each contribution becomes part of a growing knowledge base that others can learn from and engage with.

To get started, we''ve created a comprehensive Contributor Getting Started Guide. It walks you through setting up your account, writing high-quality articles, using AI responsibly with Human-In-The-Loop principles, and adhering to Google''s E‑E‑A‑T standards. The guide is your go-to resource to make sure your contributions are impactful, authentic, and set up to succeed.

If you''ve ever wanted to combine your love of reading with sharing your knowledge and personal insights, THE LOST ARCHIVES BOOK CLUB is your opportunity. Check out the getting started guide and begin your journey with us today.',
          'Join THE LOST ARCHIVES BOOK CLUB and share your love of books. Explore, reflect, and connect with an engaged community of readers and writers. Earn as an Amazon affiliate while sharing your favorite reads.',
          admin_user_id,
          'published',
          NOW()
        );
      END IF;
    END IF;
  ELSE
    -- Oldest schema - no author_id, no published field (use status only)
    IF existing_post_id IS NOT NULL THEN
      -- Update existing post
      UPDATE blog_posts SET
        title = 'Join THE LOST ARCHIVES BOOK CLUB and Share Your Love of Books',
        content = 'Books shape the way we see the world, spark new ideas, and connect us to perspectives we might never encounter otherwise. THE LOST ARCHIVES BOOK CLUB exists to give readers and writers a space to explore, reflect, and share these experiences with an engaged community.

Whether you''re an avid reader or someone who enjoys thoughtful reflection, the Book Club provides a platform for you to express your insights, connect with like-minded readers, and even earn as an Amazon affiliate by sharing your favorite reads. Each contribution becomes part of a growing knowledge base that others can learn from and engage with.

To get started, we''ve created a comprehensive Contributor Getting Started Guide. It walks you through setting up your account, writing high-quality articles, using AI responsibly with Human-In-The-Loop principles, and adhering to Google''s E‑E‑A‑T standards. The guide is your go-to resource to make sure your contributions are impactful, authentic, and set up to succeed.

If you''ve ever wanted to combine your love of reading with sharing your knowledge and personal insights, THE LOST ARCHIVES BOOK CLUB is your opportunity. Check out the getting started guide and begin your journey with us today.',
        excerpt = 'Join THE LOST ARCHIVES BOOK CLUB and share your love of books. Explore, reflect, and connect with an engaged community of readers and writers. Earn as an Amazon affiliate while sharing your favorite reads.',
        status = 'published',
        published_at = COALESCE(published_at, NOW())
      WHERE id = existing_post_id;
    ELSE
      -- Insert new post
      INSERT INTO blog_posts (
        title,
        slug,
        content,
        excerpt,
        status,
        published_at
      ) VALUES (
        'Join THE LOST ARCHIVES BOOK CLUB and Share Your Love of Books',
        'join-the-lost-archives-book-club-and-share-your-love-of-books',
        'Books shape the way we see the world, spark new ideas, and connect us to perspectives we might never encounter otherwise. THE LOST ARCHIVES BOOK CLUB exists to give readers and writers a space to explore, reflect, and share these experiences with an engaged community.

Whether you''re an avid reader or someone who enjoys thoughtful reflection, the Book Club provides a platform for you to express your insights, connect with like-minded readers, and even earn as an Amazon affiliate by sharing your favorite reads. Each contribution becomes part of a growing knowledge base that others can learn from and engage with.

To get started, we''ve created a comprehensive Contributor Getting Started Guide. It walks you through setting up your account, writing high-quality articles, using AI responsibly with Human-In-The-Loop principles, and adhering to Google''s E‑E‑A‑T standards. The guide is your go-to resource to make sure your contributions are impactful, authentic, and set up to succeed.

If you''ve ever wanted to combine your love of reading with sharing your knowledge and personal insights, THE LOST ARCHIVES BOOK CLUB is your opportunity. Check out the getting started guide and begin your journey with us today.',
        'Join THE LOST ARCHIVES BOOK CLUB and share your love of books. Explore, reflect, and connect with an engaged community of readers and writers. Earn as an Amazon affiliate while sharing your favorite reads.',
        'published',
        NOW()
      );
    END IF;
  END IF;

  RAISE NOTICE 'Blog post created successfully!';
END $$;
