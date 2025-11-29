-- Create blog post: "ALL FOR A DREAM"
-- Run this in Supabase SQL Editor (works with or without migration)

-- First, get the admin user ID (replace with actual admin email if different)
DO $$
DECLARE
  admin_user_id UUID;
  has_published_field BOOLEAN;
  has_author_id_field BOOLEAN;
  has_user_id_field BOOLEAN;
  user_column_name TEXT;
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

  -- Insert the blog post (handle both schema versions)
  IF has_published_field AND user_column_name IS NOT NULL THEN
    -- New schema with published boolean and user_id/author_id
    IF user_column_name = 'user_id' THEN
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
        'ALL FOR A DREAM',
        'all-for-a-dream',
        'In this life, I have experienced a whole lot of change. In change, I have learned of the impermanence of the world and my resolve to keep going, regardless of the circumstances. What is it that keeps me from giving up my light and surrendering to doubt?

One of the hardest things for me to hide in my lifetime is my heart dwelling on my sleeve. I''ve always been someone to stand up or speak up for myself, the people I care about, and even strangers. More often than not, it has lead to some significant moments in my life where, change had to occur. 

I haven''t lived at one address for more  than three years, since I was in high school. For more than half my life, stability has been an issue. I haven''t had a place to call home in over three years, and after losing my apartment in April of 2022, "home", has become an abstract thought to me. 

I have mostly lived in my car during this time, occasionally staying with friends or family, but I have been unable to find the stability I need to get back within my own four walls. I am blessed to at least be able to have a car and a semi-safe place to sleep, but I will never accept that this is all there is for me. I will have the home I imagine in my head someday. 

This is the faith that I hold on to.

Now, before you ask if I have worked anywhere during this span (the answer is yes), please understand that I have decided that I am un-hirable. Don''t get me wrong, I love to work and I have had some jobs I loved that I had to leave for one reason or another, but at 40 years old, being under someone''s employ is a deal-breaker for me.

Why? Because I am an  unofficial agent of change. I recognize inconsistencies in the management of these companies, blatant hypocrisies, and I almost never hesitate to speak up about it. It''s like leaving a toddler in a room with a plate of cookies. 

Though the saying "work smarter not harder" is commonplace, sadly that doesn''t always connect with some people, and that frustrates me. People cut dangerous corners in the workplace, and I''m a Wendy''s kind of guy. I love those square burgers! 

Funny enough, I know and accept that perhaps I was the one that hasn''t been working smarter this whole time, but I was lead to keep making the same mistakes because I caved to the societal pressures I always believed did not apply to me. I had to stop being what everyone else wanted me to be and do what was right for myself.

As soon as I started doing that, the dots started to connect. The inner work started inner working and the outer experience started to improve. I still have trouble reaching an understanding with people, but I am comfortable enough with myself to not let it shake my confidence.

I am resilient and resourceful, and I have a vision that has not changed throughout this time. To run this website, help people, and build a brand that changes the way people do business. Today, we''re building features that make content more accessible - like automatic AI breakdowns that help readers understand complex topics through intuitive summaries and definitions. In short, I want to build the best "job" on the planet. We''ll see how that goes.',
        'A personal reflection on resilience, change, and the pursuit of a dream. From living in a car to building a vision, this is a story about refusing to give up and staying true to yourself.',
        admin_user_id,
        true,
        'published',
        NOW(),
        'ALL FOR A DREAM | THE LOST ARCHIVES | THE LOST+UNFOUNDS',
        'A personal reflection on resilience, change, and the pursuit of a dream. From living in a car to building a vision, this is a story about refusing to give up and staying true to yourself.',
        'resilience, personal growth, entrepreneurship, change, faith, determination, self-employment, building a dream'
      )
      ON CONFLICT (slug) DO NOTHING;
    ELSE
      -- Using author_id
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
        'ALL FOR A DREAM',
        'all-for-a-dream',
        'In this life, I have experienced a whole lot of change. In change, I have learned of the impermanence of the world and my resolve to keep going, regardless of the circumstances. What is it that keeps me from giving up my light and surrendering to doubt?

One of the hardest things for me to hide in my lifetime is my heart dwelling on my sleeve. I''ve always been someone to stand up or speak up for myself, the people I care about, and even strangers. More often than not, it has lead to some significant moments in my life where, change had to occur. 

I haven''t lived at one address for more  than three years, since I was in high school. For more than half my life, stability has been an issue. I haven''t had a place to call home in over three years, and after losing my apartment in April of 2022, "home", has become an abstract thought to me. 

I have mostly lived in my car during this time, occasionally staying with friends or family, but I have been unable to find the stability I need to get back within my own four walls. I am blessed to at least be able to have a car and a semi-safe place to sleep, but I will never accept that this is all there is for me. I will have the home I imagine in my head someday. 

This is the faith that I hold on to.

Now, before you ask if I have worked anywhere during this span (the answer is yes), please understand that I have decided that I am un-hirable. Don''t get me wrong, I love to work and I have had some jobs I loved that I had to leave for one reason or another, but at 40 years old, being under someone''s employ is a deal-breaker for me.

Why? Because I am an  unofficial agent of change. I recognize inconsistencies in the management of these companies, blatant hypocrisies, and I almost never hesitate to speak up about it. It''s like leaving a toddler in a room with a plate of cookies. 

Though the saying "work smarter not harder" is commonplace, sadly that doesn''t always connect with some people, and that frustrates me. People cut dangerous corners in the workplace, and I''m a Wendy''s kind of guy. I love those square burgers! 

Funny enough, I know and accept that perhaps I was the one that hasn''t been working smarter this whole time, but I was lead to keep making the same mistakes because I caved to the societal pressures I always believed did not apply to me. I had to stop being what everyone else wanted me to be and do what was right for myself.

As soon as I started doing that, the dots started to connect. The inner work started inner working and the outer experience started to improve. I still have trouble reaching an understanding with people, but I am comfortable enough with myself to not let it shake my confidence.

I am resilient and resourceful, and I have a vision that has not changed throughout this time. To run this website, help people, and build a brand that changes the way people do business. Today, we''re building features that make content more accessible - like automatic AI breakdowns that help readers understand complex topics through intuitive summaries and definitions. In short, I want to build the best "job" on the planet. We''ll see how that goes.',
        'A personal reflection on resilience, change, and the pursuit of a dream. From living in a car to building a vision, this is a story about refusing to give up and staying true to yourself.',
        admin_user_id,
        true,
        'published',
        NOW(),
        'ALL FOR A DREAM | THE LOST ARCHIVES | THE LOST+UNFOUNDS',
        'A personal reflection on resilience, change, and the pursuit of a dream. From living in a car to building a vision, this is a story about refusing to give up and staying true to yourself.',
        'resilience, personal growth, entrepreneurship, change, faith, determination, self-employment, building a dream'
      )
      ON CONFLICT (slug) DO NOTHING;
    END IF;
  ELSIF user_column_name IS NOT NULL THEN
    -- Schema with user_id/author_id but no published field (use status)
    IF user_column_name = 'user_id' THEN
      INSERT INTO blog_posts (
        title,
        slug,
        content,
        excerpt,
        user_id,
        status,
        published_at
      ) VALUES (
        'ALL FOR A DREAM',
        'all-for-a-dream',
        'In this life, I have experienced a whole lot of change. In change, I have learned of the impermanence of the world and my resolve to keep going, regardless of the circumstances. What is it that keeps me from giving up my light and surrendering to doubt?

One of the hardest things for me to hide in my lifetime is my heart dwelling on my sleeve. I''ve always been someone to stand up or speak up for myself, the people I care about, and even strangers. More often than not, it has lead to some significant moments in my life where, change had to occur. 

I haven''t lived at one address for more  than three years, since I was in high school. For more than half my life, stability has been an issue. I haven''t had a place to call home in over three years, and after losing my apartment in April of 2022, "home", has become an abstract thought to me. 

I have mostly lived in my car during this time, occasionally staying with friends or family, but I have been unable to find the stability I need to get back within my own four walls. I am blessed to at least be able to have a car and a semi-safe place to sleep, but I will never accept that this is all there is for me. I will have the home I imagine in my head someday. 

This is the faith that I hold on to.

Now, before you ask if I have worked anywhere during this span (the answer is yes), please understand that I have decided that I am un-hirable. Don''t get me wrong, I love to work and I have had some jobs I loved that I had to leave for one reason or another, but at 40 years old, being under someone''s employ is a deal-breaker for me.

Why? Because I am an  unofficial agent of change. I recognize inconsistencies in the management of these companies, blatant hypocrisies, and I almost never hesitate to speak up about it. It''s like leaving a toddler in a room with a plate of cookies. 

Though the saying "work smarter not harder" is commonplace, sadly that doesn''t always connect with some people, and that frustrates me. People cut dangerous corners in the workplace, and I''m a Wendy''s kind of guy. I love those square burgers! 

Funny enough, I know and accept that perhaps I was the one that hasn''t been working smarter this whole time, but I was lead to keep making the same mistakes because I caved to the societal pressures I always believed did not apply to me. I had to stop being what everyone else wanted me to be and do what was right for myself.

As soon as I started doing that, the dots started to connect. The inner work started inner working and the outer experience started to improve. I still have trouble reaching an understanding with people, but I am comfortable enough with myself to not let it shake my confidence.

I am resilient and resourceful, and I have a vision that has not changed throughout this time. To run this website, help people, and build a brand that changes the way people do business. Today, we''re building features that make content more accessible - like automatic AI breakdowns that help readers understand complex topics through intuitive summaries and definitions. In short, I want to build the best "job" on the planet. We''ll see how that goes.',
        'A personal reflection on resilience, change, and the pursuit of a dream. From living in a car to building a vision, this is a story about refusing to give up and staying true to yourself.',
        admin_user_id,
        'published',
        NOW()
      )
      ON CONFLICT (slug) DO NOTHING;
    ELSE
      -- Using author_id
      INSERT INTO blog_posts (
        title,
        slug,
        content,
        excerpt,
        author_id,
        status,
        published_at
      ) VALUES (
        'ALL FOR A DREAM',
        'all-for-a-dream',
        'In this life, I have experienced a whole lot of change. In change, I have learned of the impermanence of the world and my resolve to keep going, regardless of the circumstances. What is it that keeps me from giving up my light and surrendering to doubt?

One of the hardest things for me to hide in my lifetime is my heart dwelling on my sleeve. I''ve always been someone to stand up or speak up for myself, the people I care about, and even strangers. More often than not, it has lead to some significant moments in my life where, change had to occur. 

I haven''t lived at one address for more  than three years, since I was in high school. For more than half my life, stability has been an issue. I haven''t had a place to call home in over three years, and after losing my apartment in April of 2022, "home", has become an abstract thought to me. 

I have mostly lived in my car during this time, occasionally staying with friends or family, but I have been unable to find the stability I need to get back within my own four walls. I am blessed to at least be able to have a car and a semi-safe place to sleep, but I will never accept that this is all there is for me. I will have the home I imagine in my head someday. 

This is the faith that I hold on to.

Now, before you ask if I have worked anywhere during this span (the answer is yes), please understand that I have decided that I am un-hirable. Don''t get me wrong, I love to work and I have had some jobs I loved that I had to leave for one reason or another, but at 40 years old, being under someone''s employ is a deal-breaker for me.

Why? Because I am an  unofficial agent of change. I recognize inconsistencies in the management of these companies, blatant hypocrisies, and I almost never hesitate to speak up about it. It''s like leaving a toddler in a room with a plate of cookies. 

Though the saying "work smarter not harder" is commonplace, sadly that doesn''t always connect with some people, and that frustrates me. People cut dangerous corners in the workplace, and I''m a Wendy''s kind of guy. I love those square burgers! 

Funny enough, I know and accept that perhaps I was the one that hasn''t been working smarter this whole time, but I was lead to keep making the same mistakes because I caved to the societal pressures I always believed did not apply to me. I had to stop being what everyone else wanted me to be and do what was right for myself.

As soon as I started doing that, the dots started to connect. The inner work started inner working and the outer experience started to improve. I still have trouble reaching an understanding with people, but I am comfortable enough with myself to not let it shake my confidence.

I am resilient and resourceful, and I have a vision that has not changed throughout this time. To run this website, help people, and build a brand that changes the way people do business. Today, we''re building features that make content more accessible - like automatic AI breakdowns that help readers understand complex topics through intuitive summaries and definitions. In short, I want to build the best "job" on the planet. We''ll see how that goes.',
        'A personal reflection on resilience, change, and the pursuit of a dream. From living in a car to building a vision, this is a story about refusing to give up and staying true to yourself.',
        admin_user_id,
        'published',
        NOW()
      )
      ON CONFLICT (slug) DO NOTHING;
    END IF;
  ELSE
    -- Oldest schema - no author_id, no published field (use status only)
    INSERT INTO blog_posts (
      title,
      slug,
      content,
      excerpt,
      status,
      published_at
    ) VALUES (
      'ALL FOR A DREAM',
      'all-for-a-dream',
      'In this life, I have experienced a whole lot of change. In change, I have learned of the impermanence of the world and my resolve to keep going, regardless of the circumstances. What is it that keeps me from giving up my light and surrendering to doubt?

One of the hardest things for me to hide in my lifetime is my heart dwelling on my sleeve. I''ve always been someone to stand up or speak up for myself, the people I care about, and even strangers. More often than not, it has lead to some significant moments in my life where, change had to occur. 

I haven''t lived at one address for more  than three years, since I was in high school. For more than half my life, stability has been an issue. I haven''t had a place to call home in over three years, and after losing my apartment in April of 2022, "home", has become an abstract thought to me. 

I have mostly lived in my car during this time, occasionally staying with friends or family, but I have been unable to find the stability I need to get back within my own four walls. I am blessed to at least be able to have a car and a semi-safe place to sleep, but I will never accept that this is all there is for me. I will have the home I imagine in my head someday. 

This is the faith that I hold on to.

Now, before you ask if I have worked anywhere during this span (the answer is yes), please understand that I have decided that I am un-hirable. Don''t get me wrong, I love to work and I have had some jobs I loved that I had to leave for one reason or another, but at 40 years old, being under someone''s employ is a deal-breaker for me.

Why? Because I am an  unofficial agent of change. I recognize inconsistencies in the management of these companies, blatant hypocrisies, and I almost never hesitate to speak up about it. It''s like leaving a toddler in a room with a plate of cookies. 

Though the saying "work smarter not harder" is commonplace, sadly that doesn''t always connect with some people, and that frustrates me. People cut dangerous corners in the workplace, and I''m a Wendy''s kind of guy. I love those square burgers! 

Funny enough, I know and accept that perhaps I was the one that hasn''t been working smarter this whole time, but I was lead to keep making the same mistakes because I caved to the societal pressures I always believed did not apply to me. I had to stop being what everyone else wanted me to be and do what was right for myself.

As soon as I started doing that, the dots started to connect. The inner work started inner working and the outer experience started to improve. I still have trouble reaching an understanding with people, but I am comfortable enough with myself to not let it shake my confidence.

I am resilient and resourceful, and I have a vision that has not changed throughout this time. To run this website, help people, and build a brand that changes the way people do business. Today, we''re building features that make content more accessible - like automatic AI breakdowns that help readers understand complex topics through intuitive summaries and definitions. In short, I want to build the best "job" on the planet. We''ll see how that goes.',
      'A personal reflection on resilience, change, and the pursuit of a dream. From living in a car to building a vision, this is a story about refusing to give up and staying true to yourself.',
      'published',
      NOW()
    )
    ON CONFLICT (slug) DO NOTHING;
  END IF;

  RAISE NOTICE 'Blog post created successfully!';
END $$;
