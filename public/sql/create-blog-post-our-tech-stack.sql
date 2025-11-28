-- Create blog post: "Our Tech Stack: Building with Creativity and Autonomy"
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
        'Our Tech Stack: Building with Creativity and Autonomy',
        'our-tech-stack-building-with-creativity-and-autonomy',
        'At THE LOST+UNFOUNDS, the way we build reflects creativity, autonomy, and flexibility. Every tool we use has a purpose: keeping us organized, helping us experiment, and letting us stay in flow. Over time, our stack has become a core part of how we bring our ideas to life.

⸻

Front-End Tools

The front-end is everything a user sees and interacts with on a website or app - essentially, the "face" of your platform. It includes layouts, buttons, forms, images, text, animations, and other interactive elements. Front-end tools determine how the website looks, how users navigate it, and how they interact with it.

Front-end development uses languages and frameworks like HTML, CSS, and JavaScript, which instruct the browser on how to display and respond to content.

For example, on our website:
	•	The marketplace grid showing products is part of the front-end.
	•	The buttons to buy or subscribe are front-end.
	•	Even the way a blog post scrolls smoothly or how a popup appears is considered front-end.

Vercel: Deploying and Testing the Website
Vercel makes it easy to deploy websites and preview changes in real time. When we update code, it automatically builds a live version so we can test features immediately and share them for feedback. If we adjust the layout of the marketplace or a blog page, Vercel lets us see the changes instantly. It handles performance, caching, and scaling behind the scenes, letting us focus on design and experimentation.

⸻

Back-End Tools

The back-end is everything happening behind the scenes to make a website or app function. While the front-end is what users see, the back-end is like the engine under the hood that processes data, runs logic, and ensures everything works correctly.

Back-end responsibilities include servers, databases, APIs, and application logic. These components manage the flow of data between systems, handle requests from the front-end, and enforce rules for how the platform operates. Back-end development uses languages and frameworks like Python, Node.js, Supabase, and server frameworks to run these processes efficiently.

For example, on our website:
	•	When a user submits a form, the back-end verifies the information, stores it in a database, and triggers necessary actions.
	•	When someone purchases a subscription, the back-end calculates the payment, communicates with Stripe or PayPal, and updates the user''s account.
	•	When AI tools like ChatGPT or Claude are used to generate content, the back-end ensures the AI can access the correct data and store the results safely.

GitHub: Tracking and Organizing Code
GitHub stores all our code and tracks every change we make. It allows us to experiment safely using branches and revert changes if something doesn''t work. For instance, if we want to try a new marketplace feature or a blog layout adjustment, we can create a branch, test it, and merge it once it works. GitHub also helps document the project, keeping the code organized and easier to maintain.

MCP Servers: Connecting AI to Tools and Data
MCP (Model Context Protocol) servers let AI tools safely access external services and data. They act as bridges that allow AI to read and write data, trigger actions, and interact with APIs while following rules and permissions. For example, AI could pull data from Supabase, update front-end components in Vercel, or interact with payment services like Stripe. MCP servers make AI-assisted workflows scalable and allow automation without building custom integrations for every tool individually.

Railway: Running Servers Without Hassle
Railway simplifies server deployment and management by handling networking, scaling, and infrastructure automatically. We can spin up new backend services for experiments or user requests quickly without configuring servers manually.

Supabase: Managing Data and Authentication
Supabase provides database management, user authentication, and storage. It lets us track user accounts, store marketplace content, and manage subscriptions efficiently. Its integration with our stack ensures reliability while allowing experimentation and iteration.

⸻

Development & Supporting Tools

These tools help us build, prototype, and integrate systems smoothly, from coding environments to AI assistants to payment infrastructure.

Cursor: Writing, Refining, and Prototyping Code
Cursor helps us structure code, prototype new features, and experiment efficiently. It keeps our code organized and lets us iterate quickly. We can test a new layout for the marketplace, refine subscription workflows, or experiment with AI-assisted content generation. Cursor keeps the process flowing and helps maintain clarity while building.

AI Tools — Google AI Studio, ChatGPT, and Claude
AI tools assist with reasoning, content generation, and organization. Google AI Studio allows us to test ideas rapidly. ChatGPT helps structure outputs and solve problems efficiently. Claude clarifies concepts and organizes ideas so they can be implemented effectively. Together, these tools make experimentation faster and smarter, allowing us to explore possibilities we couldn''t do alone.

Stripe and PayPal: Managing Traditional Payments
Stripe and PayPal provide secure, reliable infrastructure for payments. They handle subscriptions, purchases, and tips for users who aren''t yet using digital assets. For example, when a user subscribes to a content plan, Stripe manages the payment safely and updates the account automatically.

Bitcoin: Digital Money with Long-Term Potential
Bitcoin is a decentralized digital currency. We''ve already planned how it will work within our platform to allow users to receive assets that can appreciate over time instead of traditional currency. We''re actively building the logic and experimenting with how it can integrate into payments and compensation. Bitcoin aligns with our philosophy of autonomy and financial flexibility, and we''re excited to see it become a practical part of the platform.

⸻

How It All Fits Together

Each tool plays a clear role:
	•	Front-End: Vercel
	•	Back-End: GitHub, MCP servers, Railway, Supabase
	•	Development & Supporting Tools: Cursor, AI tools, Stripe/PayPal, Bitcoin

Together, these tools give us structure without slowing creativity. They let us experiment, refine, and build THE LOST+UNFOUNDS platform exactly how we envisioned it - deliberate, flexible, and aligned with our philosophy.',
        'An overview of the technology stack powering THE LOST+UNFOUNDS platform. From front-end deployment with Vercel to back-end infrastructure with Supabase and Railway, discover how we build with creativity, autonomy, and flexibility.',
        admin_user_id,
        true,
        'published',
        NOW(),
        'Our Tech Stack: Building with Creativity and Autonomy | THE LOST ARCHIVES | THE LOST+UNFOUNDS',
        'An overview of the technology stack powering THE LOST+UNFOUNDS platform. From front-end deployment with Vercel to back-end infrastructure with Supabase and Railway, discover how we build with creativity, autonomy, and flexibility.',
        'tech stack, technology, web development, Vercel, Supabase, GitHub, MCP servers, Railway, Cursor, AI tools, Stripe, PayPal, Bitcoin, front-end, back-end, development tools'
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
        'Our Tech Stack: Building with Creativity and Autonomy',
        'our-tech-stack-building-with-creativity-and-autonomy',
        'At THE LOST+UNFOUNDS, the way we build reflects creativity, autonomy, and flexibility. Every tool we use has a purpose: keeping us organized, helping us experiment, and letting us stay in flow. Over time, our stack has become a core part of how we bring our ideas to life.

⸻

Front-End Tools

The front-end is everything a user sees and interacts with on a website or app - essentially, the "face" of your platform. It includes layouts, buttons, forms, images, text, animations, and other interactive elements. Front-end tools determine how the website looks, how users navigate it, and how they interact with it.

Front-end development uses languages and frameworks like HTML, CSS, and JavaScript, which instruct the browser on how to display and respond to content.

For example, on our website:
	•	The marketplace grid showing products is part of the front-end.
	•	The buttons to buy or subscribe are front-end.
	•	Even the way a blog post scrolls smoothly or how a popup appears is considered front-end.

Vercel: Deploying and Testing the Website
Vercel makes it easy to deploy websites and preview changes in real time. When we update code, it automatically builds a live version so we can test features immediately and share them for feedback. If we adjust the layout of the marketplace or a blog page, Vercel lets us see the changes instantly. It handles performance, caching, and scaling behind the scenes, letting us focus on design and experimentation.

⸻

Back-End Tools

The back-end is everything happening behind the scenes to make a website or app function. While the front-end is what users see, the back-end is like the engine under the hood that processes data, runs logic, and ensures everything works correctly.

Back-end responsibilities include servers, databases, APIs, and application logic. These components manage the flow of data between systems, handle requests from the front-end, and enforce rules for how the platform operates. Back-end development uses languages and frameworks like Python, Node.js, Supabase, and server frameworks to run these processes efficiently.

For example, on our website:
	•	When a user submits a form, the back-end verifies the information, stores it in a database, and triggers necessary actions.
	•	When someone purchases a subscription, the back-end calculates the payment, communicates with Stripe or PayPal, and updates the user''s account.
	•	When AI tools like ChatGPT or Claude are used to generate content, the back-end ensures the AI can access the correct data and store the results safely.

GitHub: Tracking and Organizing Code
GitHub stores all our code and tracks every change we make. It allows us to experiment safely using branches and revert changes if something doesn''t work. For instance, if we want to try a new marketplace feature or a blog layout adjustment, we can create a branch, test it, and merge it once it works. GitHub also helps document the project, keeping the code organized and easier to maintain.

MCP Servers: Connecting AI to Tools and Data
MCP (Model Context Protocol) servers let AI tools safely access external services and data. They act as bridges that allow AI to read and write data, trigger actions, and interact with APIs while following rules and permissions. For example, AI could pull data from Supabase, update front-end components in Vercel, or interact with payment services like Stripe. MCP servers make AI-assisted workflows scalable and allow automation without building custom integrations for every tool individually.

Railway: Running Servers Without Hassle
Railway simplifies server deployment and management by handling networking, scaling, and infrastructure automatically. We can spin up new backend services for experiments or user requests quickly without configuring servers manually.

Supabase: Managing Data and Authentication
Supabase provides database management, user authentication, and storage. It lets us track user accounts, store marketplace content, and manage subscriptions efficiently. Its integration with our stack ensures reliability while allowing experimentation and iteration.

⸻

Development & Supporting Tools

These tools help us build, prototype, and integrate systems smoothly, from coding environments to AI assistants to payment infrastructure.

Cursor: Writing, Refining, and Prototyping Code
Cursor helps us structure code, prototype new features, and experiment efficiently. It keeps our code organized and lets us iterate quickly. We can test a new layout for the marketplace, refine subscription workflows, or experiment with AI-assisted content generation. Cursor keeps the process flowing and helps maintain clarity while building.

AI Tools — Google AI Studio, ChatGPT, and Claude
AI tools assist with reasoning, content generation, and organization. Google AI Studio allows us to test ideas rapidly. ChatGPT helps structure outputs and solve problems efficiently. Claude clarifies concepts and organizes ideas so they can be implemented effectively. Together, these tools make experimentation faster and smarter, allowing us to explore possibilities we couldn''t do alone.

Stripe and PayPal: Managing Traditional Payments
Stripe and PayPal provide secure, reliable infrastructure for payments. They handle subscriptions, purchases, and tips for users who aren''t yet using digital assets. For example, when a user subscribes to a content plan, Stripe manages the payment safely and updates the account automatically.

Bitcoin: Digital Money with Long-Term Potential
Bitcoin is a decentralized digital currency. We''ve already planned how it will work within our platform to allow users to receive assets that can appreciate over time instead of traditional currency. We''re actively building the logic and experimenting with how it can integrate into payments and compensation. Bitcoin aligns with our philosophy of autonomy and financial flexibility, and we''re excited to see it become a practical part of the platform.

⸻

How It All Fits Together

Each tool plays a clear role:
	•	Front-End: Vercel
	•	Back-End: GitHub, MCP servers, Railway, Supabase
	•	Development & Supporting Tools: Cursor, AI tools, Stripe/PayPal, Bitcoin

Together, these tools give us structure without slowing creativity. They let us experiment, refine, and build THE LOST+UNFOUNDS platform exactly how we envisioned it - deliberate, flexible, and aligned with our philosophy.',
        'An overview of the technology stack powering THE LOST+UNFOUNDS platform. From front-end deployment with Vercel to back-end infrastructure with Supabase and Railway, discover how we build with creativity, autonomy, and flexibility.',
        admin_user_id,
        true,
        'published',
        NOW(),
        'Our Tech Stack: Building with Creativity and Autonomy | THE LOST ARCHIVES | THE LOST+UNFOUNDS',
        'An overview of the technology stack powering THE LOST+UNFOUNDS platform. From front-end deployment with Vercel to back-end infrastructure with Supabase and Railway, discover how we build with creativity, autonomy, and flexibility.',
        'tech stack, technology, web development, Vercel, Supabase, GitHub, MCP servers, Railway, Cursor, AI tools, Stripe, PayPal, Bitcoin, front-end, back-end, development tools'
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
        'Our Tech Stack: Building with Creativity and Autonomy',
        'our-tech-stack-building-with-creativity-and-autonomy',
        'At THE LOST+UNFOUNDS, the way we build reflects creativity, autonomy, and flexibility. Every tool we use has a purpose: keeping us organized, helping us experiment, and letting us stay in flow. Over time, our stack has become a core part of how we bring our ideas to life.

⸻

Front-End Tools

The front-end is everything a user sees and interacts with on a website or app - essentially, the "face" of your platform. It includes layouts, buttons, forms, images, text, animations, and other interactive elements. Front-end tools determine how the website looks, how users navigate it, and how they interact with it.

Front-end development uses languages and frameworks like HTML, CSS, and JavaScript, which instruct the browser on how to display and respond to content.

For example, on our website:
	•	The marketplace grid showing products is part of the front-end.
	•	The buttons to buy or subscribe are front-end.
	•	Even the way a blog post scrolls smoothly or how a popup appears is considered front-end.

Vercel: Deploying and Testing the Website
Vercel makes it easy to deploy websites and preview changes in real time. When we update code, it automatically builds a live version so we can test features immediately and share them for feedback. If we adjust the layout of the marketplace or a blog page, Vercel lets us see the changes instantly. It handles performance, caching, and scaling behind the scenes, letting us focus on design and experimentation.

⸻

Back-End Tools

The back-end is everything happening behind the scenes to make a website or app function. While the front-end is what users see, the back-end is like the engine under the hood that processes data, runs logic, and ensures everything works correctly.

Back-end responsibilities include servers, databases, APIs, and application logic. These components manage the flow of data between systems, handle requests from the front-end, and enforce rules for how the platform operates. Back-end development uses languages and frameworks like Python, Node.js, Supabase, and server frameworks to run these processes efficiently.

For example, on our website:
	•	When a user submits a form, the back-end verifies the information, stores it in a database, and triggers necessary actions.
	•	When someone purchases a subscription, the back-end calculates the payment, communicates with Stripe or PayPal, and updates the user''s account.
	•	When AI tools like ChatGPT or Claude are used to generate content, the back-end ensures the AI can access the correct data and store the results safely.

GitHub: Tracking and Organizing Code
GitHub stores all our code and tracks every change we make. It allows us to experiment safely using branches and revert changes if something doesn''t work. For instance, if we want to try a new marketplace feature or a blog layout adjustment, we can create a branch, test it, and merge it once it works. GitHub also helps document the project, keeping the code organized and easier to maintain.

MCP Servers: Connecting AI to Tools and Data
MCP (Model Context Protocol) servers let AI tools safely access external services and data. They act as bridges that allow AI to read and write data, trigger actions, and interact with APIs while following rules and permissions. For example, AI could pull data from Supabase, update front-end components in Vercel, or interact with payment services like Stripe. MCP servers make AI-assisted workflows scalable and allow automation without building custom integrations for every tool individually.

Railway: Running Servers Without Hassle
Railway simplifies server deployment and management by handling networking, scaling, and infrastructure automatically. We can spin up new backend services for experiments or user requests quickly without configuring servers manually.

Supabase: Managing Data and Authentication
Supabase provides database management, user authentication, and storage. It lets us track user accounts, store marketplace content, and manage subscriptions efficiently. Its integration with our stack ensures reliability while allowing experimentation and iteration.

⸻

Development & Supporting Tools

These tools help us build, prototype, and integrate systems smoothly, from coding environments to AI assistants to payment infrastructure.

Cursor: Writing, Refining, and Prototyping Code
Cursor helps us structure code, prototype new features, and experiment efficiently. It keeps our code organized and lets us iterate quickly. We can test a new layout for the marketplace, refine subscription workflows, or experiment with AI-assisted content generation. Cursor keeps the process flowing and helps maintain clarity while building.

AI Tools — Google AI Studio, ChatGPT, and Claude
AI tools assist with reasoning, content generation, and organization. Google AI Studio allows us to test ideas rapidly. ChatGPT helps structure outputs and solve problems efficiently. Claude clarifies concepts and organizes ideas so they can be implemented effectively. Together, these tools make experimentation faster and smarter, allowing us to explore possibilities we couldn''t do alone.

Stripe and PayPal: Managing Traditional Payments
Stripe and PayPal provide secure, reliable infrastructure for payments. They handle subscriptions, purchases, and tips for users who aren''t yet using digital assets. For example, when a user subscribes to a content plan, Stripe manages the payment safely and updates the account automatically.

Bitcoin: Digital Money with Long-Term Potential
Bitcoin is a decentralized digital currency. We''ve already planned how it will work within our platform to allow users to receive assets that can appreciate over time instead of traditional currency. We''re actively building the logic and experimenting with how it can integrate into payments and compensation. Bitcoin aligns with our philosophy of autonomy and financial flexibility, and we''re excited to see it become a practical part of the platform.

⸻

How It All Fits Together

Each tool plays a clear role:
	•	Front-End: Vercel
	•	Back-End: GitHub, MCP servers, Railway, Supabase
	•	Development & Supporting Tools: Cursor, AI tools, Stripe/PayPal, Bitcoin

Together, these tools give us structure without slowing creativity. They let us experiment, refine, and build THE LOST+UNFOUNDS platform exactly how we envisioned it - deliberate, flexible, and aligned with our philosophy.',
        'An overview of the technology stack powering THE LOST+UNFOUNDS platform. From front-end deployment with Vercel to back-end infrastructure with Supabase and Railway, discover how we build with creativity, autonomy, and flexibility.',
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
        'Our Tech Stack: Building with Creativity and Autonomy',
        'our-tech-stack-building-with-creativity-and-autonomy',
        'At THE LOST+UNFOUNDS, the way we build reflects creativity, autonomy, and flexibility. Every tool we use has a purpose: keeping us organized, helping us experiment, and letting us stay in flow. Over time, our stack has become a core part of how we bring our ideas to life.

⸻

Front-End Tools

The front-end is everything a user sees and interacts with on a website or app - essentially, the "face" of your platform. It includes layouts, buttons, forms, images, text, animations, and other interactive elements. Front-end tools determine how the website looks, how users navigate it, and how they interact with it.

Front-end development uses languages and frameworks like HTML, CSS, and JavaScript, which instruct the browser on how to display and respond to content.

For example, on our website:
	•	The marketplace grid showing products is part of the front-end.
	•	The buttons to buy or subscribe are front-end.
	•	Even the way a blog post scrolls smoothly or how a popup appears is considered front-end.

Vercel: Deploying and Testing the Website
Vercel makes it easy to deploy websites and preview changes in real time. When we update code, it automatically builds a live version so we can test features immediately and share them for feedback. If we adjust the layout of the marketplace or a blog page, Vercel lets us see the changes instantly. It handles performance, caching, and scaling behind the scenes, letting us focus on design and experimentation.

⸻

Back-End Tools

The back-end is everything happening behind the scenes to make a website or app function. While the front-end is what users see, the back-end is like the engine under the hood that processes data, runs logic, and ensures everything works correctly.

Back-end responsibilities include servers, databases, APIs, and application logic. These components manage the flow of data between systems, handle requests from the front-end, and enforce rules for how the platform operates. Back-end development uses languages and frameworks like Python, Node.js, Supabase, and server frameworks to run these processes efficiently.

For example, on our website:
	•	When a user submits a form, the back-end verifies the information, stores it in a database, and triggers necessary actions.
	•	When someone purchases a subscription, the back-end calculates the payment, communicates with Stripe or PayPal, and updates the user''s account.
	•	When AI tools like ChatGPT or Claude are used to generate content, the back-end ensures the AI can access the correct data and store the results safely.

GitHub: Tracking and Organizing Code
GitHub stores all our code and tracks every change we make. It allows us to experiment safely using branches and revert changes if something doesn''t work. For instance, if we want to try a new marketplace feature or a blog layout adjustment, we can create a branch, test it, and merge it once it works. GitHub also helps document the project, keeping the code organized and easier to maintain.

MCP Servers: Connecting AI to Tools and Data
MCP (Model Context Protocol) servers let AI tools safely access external services and data. They act as bridges that allow AI to read and write data, trigger actions, and interact with APIs while following rules and permissions. For example, AI could pull data from Supabase, update front-end components in Vercel, or interact with payment services like Stripe. MCP servers make AI-assisted workflows scalable and allow automation without building custom integrations for every tool individually.

Railway: Running Servers Without Hassle
Railway simplifies server deployment and management by handling networking, scaling, and infrastructure automatically. We can spin up new backend services for experiments or user requests quickly without configuring servers manually.

Supabase: Managing Data and Authentication
Supabase provides database management, user authentication, and storage. It lets us track user accounts, store marketplace content, and manage subscriptions efficiently. Its integration with our stack ensures reliability while allowing experimentation and iteration.

⸻

Development & Supporting Tools

These tools help us build, prototype, and integrate systems smoothly, from coding environments to AI assistants to payment infrastructure.

Cursor: Writing, Refining, and Prototyping Code
Cursor helps us structure code, prototype new features, and experiment efficiently. It keeps our code organized and lets us iterate quickly. We can test a new layout for the marketplace, refine subscription workflows, or experiment with AI-assisted content generation. Cursor keeps the process flowing and helps maintain clarity while building.

AI Tools — Google AI Studio, ChatGPT, and Claude
AI tools assist with reasoning, content generation, and organization. Google AI Studio allows us to test ideas rapidly. ChatGPT helps structure outputs and solve problems efficiently. Claude clarifies concepts and organizes ideas so they can be implemented effectively. Together, these tools make experimentation faster and smarter, allowing us to explore possibilities we couldn''t do alone.

Stripe and PayPal: Managing Traditional Payments
Stripe and PayPal provide secure, reliable infrastructure for payments. They handle subscriptions, purchases, and tips for users who aren''t yet using digital assets. For example, when a user subscribes to a content plan, Stripe manages the payment safely and updates the account automatically.

Bitcoin: Digital Money with Long-Term Potential
Bitcoin is a decentralized digital currency. We''ve already planned how it will work within our platform to allow users to receive assets that can appreciate over time instead of traditional currency. We''re actively building the logic and experimenting with how it can integrate into payments and compensation. Bitcoin aligns with our philosophy of autonomy and financial flexibility, and we''re excited to see it become a practical part of the platform.

⸻

How It All Fits Together

Each tool plays a clear role:
	•	Front-End: Vercel
	•	Back-End: GitHub, MCP servers, Railway, Supabase
	•	Development & Supporting Tools: Cursor, AI tools, Stripe/PayPal, Bitcoin

Together, these tools give us structure without slowing creativity. They let us experiment, refine, and build THE LOST+UNFOUNDS platform exactly how we envisioned it - deliberate, flexible, and aligned with our philosophy.',
        'An overview of the technology stack powering THE LOST+UNFOUNDS platform. From front-end deployment with Vercel to back-end infrastructure with Supabase and Railway, discover how we build with creativity, autonomy, and flexibility.',
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
      'Our Tech Stack: Building with Creativity and Autonomy',
      'our-tech-stack-building-with-creativity-and-autonomy',
      'At THE LOST+UNFOUNDS, the way we build reflects creativity, autonomy, and flexibility. Every tool we use has a purpose: keeping us organized, helping us experiment, and letting us stay in flow. Over time, our stack has become a core part of how we bring our ideas to life.

⸻

Front-End Tools

The front-end is everything a user sees and interacts with on a website or app - essentially, the "face" of your platform. It includes layouts, buttons, forms, images, text, animations, and other interactive elements. Front-end tools determine how the website looks, how users navigate it, and how they interact with it.

Front-end development uses languages and frameworks like HTML, CSS, and JavaScript, which instruct the browser on how to display and respond to content.

For example, on our website:
	•	The marketplace grid showing products is part of the front-end.
	•	The buttons to buy or subscribe are front-end.
	•	Even the way a blog post scrolls smoothly or how a popup appears is considered front-end.

Vercel: Deploying and Testing the Website
Vercel makes it easy to deploy websites and preview changes in real time. When we update code, it automatically builds a live version so we can test features immediately and share them for feedback. If we adjust the layout of the marketplace or a blog page, Vercel lets us see the changes instantly. It handles performance, caching, and scaling behind the scenes, letting us focus on design and experimentation.

⸻

Back-End Tools

The back-end is everything happening behind the scenes to make a website or app function. While the front-end is what users see, the back-end is like the engine under the hood that processes data, runs logic, and ensures everything works correctly.

Back-end responsibilities include servers, databases, APIs, and application logic. These components manage the flow of data between systems, handle requests from the front-end, and enforce rules for how the platform operates. Back-end development uses languages and frameworks like Python, Node.js, Supabase, and server frameworks to run these processes efficiently.

For example, on our website:
	•	When a user submits a form, the back-end verifies the information, stores it in a database, and triggers necessary actions.
	•	When someone purchases a subscription, the back-end calculates the payment, communicates with Stripe or PayPal, and updates the user''s account.
	•	When AI tools like ChatGPT or Claude are used to generate content, the back-end ensures the AI can access the correct data and store the results safely.

GitHub: Tracking and Organizing Code
GitHub stores all our code and tracks every change we make. It allows us to experiment safely using branches and revert changes if something doesn''t work. For instance, if we want to try a new marketplace feature or a blog layout adjustment, we can create a branch, test it, and merge it once it works. GitHub also helps document the project, keeping the code organized and easier to maintain.

MCP Servers: Connecting AI to Tools and Data
MCP (Model Context Protocol) servers let AI tools safely access external services and data. They act as bridges that allow AI to read and write data, trigger actions, and interact with APIs while following rules and permissions. For example, AI could pull data from Supabase, update front-end components in Vercel, or interact with payment services like Stripe. MCP servers make AI-assisted workflows scalable and allow automation without building custom integrations for every tool individually.

Railway: Running Servers Without Hassle
Railway simplifies server deployment and management by handling networking, scaling, and infrastructure automatically. We can spin up new backend services for experiments or user requests quickly without configuring servers manually.

Supabase: Managing Data and Authentication
Supabase provides database management, user authentication, and storage. It lets us track user accounts, store marketplace content, and manage subscriptions efficiently. Its integration with our stack ensures reliability while allowing experimentation and iteration.

⸻

Development & Supporting Tools

These tools help us build, prototype, and integrate systems smoothly, from coding environments to AI assistants to payment infrastructure.

Cursor: Writing, Refining, and Prototyping Code
Cursor helps us structure code, prototype new features, and experiment efficiently. It keeps our code organized and lets us iterate quickly. We can test a new layout for the marketplace, refine subscription workflows, or experiment with AI-assisted content generation. Cursor keeps the process flowing and helps maintain clarity while building.

AI Tools — Google AI Studio, ChatGPT, and Claude
AI tools assist with reasoning, content generation, and organization. Google AI Studio allows us to test ideas rapidly. ChatGPT helps structure outputs and solve problems efficiently. Claude clarifies concepts and organizes ideas so they can be implemented effectively. Together, these tools make experimentation faster and smarter, allowing us to explore possibilities we couldn''t do alone.

Stripe and PayPal: Managing Traditional Payments
Stripe and PayPal provide secure, reliable infrastructure for payments. They handle subscriptions, purchases, and tips for users who aren''t yet using digital assets. For example, when a user subscribes to a content plan, Stripe manages the payment safely and updates the account automatically.

Bitcoin: Digital Money with Long-Term Potential
Bitcoin is a decentralized digital currency. We''ve already planned how it will work within our platform to allow users to receive assets that can appreciate over time instead of traditional currency. We''re actively building the logic and experimenting with how it can integrate into payments and compensation. Bitcoin aligns with our philosophy of autonomy and financial flexibility, and we''re excited to see it become a practical part of the platform.

⸻

How It All Fits Together

Each tool plays a clear role:
	•	Front-End: Vercel
	•	Back-End: GitHub, MCP servers, Railway, Supabase
	•	Development & Supporting Tools: Cursor, AI tools, Stripe/PayPal, Bitcoin

Together, these tools give us structure without slowing creativity. They let us experiment, refine, and build THE LOST+UNFOUNDS platform exactly how we envisioned it - deliberate, flexible, and aligned with our philosophy.',
      'An overview of the technology stack powering THE LOST+UNFOUNDS platform. From front-end deployment with Vercel to back-end infrastructure with Supabase and Railway, discover how we build with creativity, autonomy, and flexibility.',
      'published',
      NOW()
    )
    ON CONFLICT (slug) DO NOTHING;
  END IF;

  RAISE NOTICE 'Blog post created successfully!';
END $$;
