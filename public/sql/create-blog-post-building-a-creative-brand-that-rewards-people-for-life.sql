-- Create blog post: "Building a Creative Brand That Rewards People for Life: Lessons That Shaped THE LOST+UNFOUNDS"
-- Run this in Supabase SQL Editor

-- Get the admin user ID
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@thelostandunfounds.com'
  LIMIT 1;

  -- Insert the blog post
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
    'Building a Creative Brand That Rewards People for Life: Lessons That Shaped THE LOST+UNFOUNDS',
    'building-a-creative-brand-that-rewards-people-for-life-lessons-that-shaped-the-lost-and-unfounds',
    'Introduction
THE LOST+UNFOUNDS began as an idea to create a creative brand, a platform where contributions matter and people can grow alongside the vision. Books like The E-Myth Revisited, Contagious, This Is Not a T-Shirt, and The Alchemist offered lessons about leadership, influence, and purpose that shaped how I approached building the brand.

These insights helped clarify how to value contributors, nurture culture, and create frameworks that support long-term engagement and growth.

By integrating these ideas, THE LOST+UNFOUNDS became a creative brand that prioritizes meaningful contributions, encourages collaboration, and embraces innovation.

Amazon Affiliate Disclosure: As an Amazon Associate, we earn from qualifying purchases. Some links in this post are affiliate links, which means we may earn a commission if you click through and make a purchase. This helps support THE LOST+UNFOUNDS and allows us to continue creating content. Thank you for your support!



Early Inspiration and Learning
In the early days of imagining THE LOST+UNFOUNDS, my inspiration came from many directions—pop culture, art, music, entrepreneurship, and the people who blend these disciplines in creative ways. Stories of multifaceted innovators and boundary-pushing artists fueled my curiosity and desire to build a brand that could evolve, adapt, and explore new opportunities.

The idea for THE LOST+UNFOUNDS existed before I discovered these books, but reading The E-Myth Revisited, Contagious, This Is Not a T-Shirt, and The Alchemist helped refine my understanding of business, community, and long-term value. These works taught me about vision, influence, culture, and creating structures that recognize contribution.

Integrating these lessons allowed me to develop a clearer vision for the brand. THE LOST+UNFOUNDS became a creative platform that values effort and creativity, supports contributors, and embraces flexibility while reflecting the philosophies I absorbed through study and reflection.



The E-Myth Revisited: Systems, Roles, and Leadership
Michael Gerber''s The E-Myth Revisited tells the story of Sarah, the owner of All About Pies, who loved baking but struggled with running every aspect of her business. Gerber explains that most entrepreneurs spend time working in their business rather than on it, writing, "Most people who start small businesses are working in their business, not on their business." This insight highlighted the importance of clear roles, delegation, and building systems to support growth.

Understanding the distinction between the Entrepreneur, the Manager, and the Technician reshaped my thinking. Businesses thrive when contributors focus on what they do best, while systems coordinate and amplify their efforts. At THE LOST+UNFOUNDS, we aim to empower people to create, contribute, and collaborate without being burdened by every operational detail.

The emphasis on repeatable systems also inspired me to think about lasting value. By creating structures that allow contributions to endure, the brand can honor the effort, creativity, and influence people bring over time, ensuring that their work has lasting impact.



Contagious: Word-of-Mouth, Engagement, and Influence
Jonah Berger''s Contagious shifted how I view influence and growth. One striking insight is that the majority of word-of-mouth occurs offline, in real-world interactions, rather than online. This underscores the importance of authentic engagement and meaningful relationships in building a brand.

For THE LOST+UNFOUNDS, this confirmed that people who introduce others to the brand through genuine connections and shared experiences are driving real impact. Recognizing and valuing these contributions became central to our philosophy.

Berger also highlights the social and emotional triggers that make ideas contagious. People share what excites, inspires, or benefits them. Understanding this principle has guided us in cultivating participation that feels rewarding and meaningful, emphasizing human connection and influence above all else.



This Is Not a T-Shirt: People Over Product and Lifelong Contribution
This Is Not a T-Shirt had a profound personal impact. Listening to Bobby Hundreds'' story during a long road trip, I connected with his journey of building a brand through culture, community, and creativity. The principle of "People over Product" resonated strongly—what defines a brand are the people and relationships that bring it to life.

Bobby Hundreds also writes, "Never underestimate the power of influence in one-on-one encounters." This insight shaped my thinking about long-term recognition. Those who bring others into a brand, nurture relationships, and contribute to its culture create lasting value that should be acknowledged.

Reading about the closure of The Hundreds'' stores and how employees could no longer benefit from the culture they helped build inspired me to imagine a creative brand that honors lasting contributions. It highlighted the importance of designing systems that enable people to have enduring impact and recognition.



The Alchemist: Vision, Purpose, and Santiago''s Journey
Paulo Coelho''s The Alchemist reinforced the importance of vision, purpose, and pursuing meaningful goals. Santiago''s journey begins with a dream about treasure near the Egyptian pyramids, leading him to leave his familiar life behind. Along the way, he encounters challenges that test his courage and resolve.

Santiago meets a king who teaches him about following his Personal Legend, a crystal merchant who shows the cost of abandoning dreams, and Fatima, whose love teaches him the harmony of ambition and meaningful relationships. The desert, representing trials and lessons, and the concept of Maktub, meaning "it is written," illustrate how the universe guides those committed to their true path.

His journey underscored that achieving meaningful goals requires perseverance, adaptability, and faith. For THE LOST+UNFOUNDS, this story reinforced the importance of staying true to a vision, fostering environments that support growth, and valuing contribution and influence over time.



Bitcoin: Future-Focused Philosophy
THE LOST+UNFOUNDS is a technologically forward-thinking creative brand. Looking at the future of money, Bitcoin represents resilience, decentralization, and long-term value—principles that influence how we design opportunities and recognize contributions.

We envision a future where contributions can be valued in meaningful ways that reflect the forward-thinking philosophy of Bitcoin. This complements our use of technology and AI, emphasizing innovation, efficiency, and preparation for the evolving landscape of creative work.

By adopting a future-focused mindset, THE LOST+UNFOUNDS seeks to foster a culture where effort, creativity, and influence are recognized thoughtfully, rewarding people in ways that extend beyond the present moment.



Conclusion: A Creative Brand That Rewards People for Life
The lessons from these books and our philosophy around technology and Bitcoin inform how THE LOST+UNFOUNDS operates. By valuing contributors, nurturing culture, encouraging meaningful engagement, and pursuing a clear vision, we aim to create a platform that rewards effort and influence for the long term.

THE LOST+UNFOUNDS is a creative brand where contributions matter, relationships thrive, and people benefit from shared success. By combining insight, culture, vision, and forward-thinking principles, we are designing a brand that empowers people and encourages lasting impact.',
    'THE LOST+UNFOUNDS began as an idea to create a creative brand where contributions matter. Books like The E-Myth Revisited, Contagious, This Is Not a T-Shirt, and The Alchemist shaped how we value contributors, nurture culture, and create frameworks that support long-term engagement and growth.',
    admin_user_id,
    true,
    'published',
    NOW(),
    'Building a Creative Brand That Rewards People for Life: Lessons That Shaped THE LOST+UNFOUNDS | THE LOST ARCHIVES | THE LOST+UNFOUNDS',
    'THE LOST+UNFOUNDS began as an idea to create a creative brand where contributions matter. Books like The E-Myth Revisited, Contagious, This Is Not a T-Shirt, and The Alchemist shaped how we value contributors, nurture culture, and create frameworks that support long-term engagement and growth.',
    'creative brand, entrepreneurship, business philosophy, The E-Myth Revisited, Contagious, This Is Not a T-Shirt, The Alchemist, brand building, community, culture, long-term value, contribution, influence, Bitcoin, technology, innovation'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    excerpt = EXCLUDED.excerpt,
    published = EXCLUDED.published,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    seo_title = EXCLUDED.seo_title,
    seo_description = EXCLUDED.seo_description,
    seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  RAISE NOTICE 'Blog post created successfully!';
END $$;
