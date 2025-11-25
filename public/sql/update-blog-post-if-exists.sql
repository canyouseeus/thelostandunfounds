-- Update the blog post if it already exists (instead of doing nothing)
-- Run this if the INSERT said "success" but no rows were returned

DO $$
DECLARE
  admin_user_id UUID;
  has_published_field BOOLEAN;
  has_user_id_field BOOLEAN;
  has_author_id_field BOOLEAN;
  user_column_name TEXT;
BEGIN
  -- Check if published field exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_posts' AND column_name = 'published'
  ) INTO has_published_field;

  -- Check if user_id field exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_posts' AND column_name = 'user_id'
  ) INTO has_user_id_field;

  -- Check if author_id field exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_posts' AND column_name = 'author_id'
  ) INTO has_author_id_field;

  -- Get admin user ID
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@thelostandunfounds.com'
  LIMIT 1;

  -- Update the post if it exists
  IF has_published_field THEN
    UPDATE blog_posts
    SET
      title = 'Artificial Intelligence: The Job Killer',
      content = 'The inspiration for this post comes from watching an interview featuring Earnest Hausman, a current member of the University of Michigan Wolverines football team. Hausman was born in Uganda and adopted as a child, and just recently returned to Uganda for the first time since he left. 

Earnest visited his village for the first time since he was a child and discovered that they did not have access to clean drinking water. He came back on a second trip with a plan to drill a well for his family and village to use. As I am watching this video of this giant truck drilling in the middle of this village, a stark contrast of technological progress was evident. I don''t know how they were getting water before, but I believe a lot of resources and energy were devoted to getting water to sustain this village. 

So, I''m watching this interview unfold and they are standing at the pump and you can see the containers to gather the water as one is being filled. You see the spirits of all of these people being lifted. My immediate thought was, "Think, of all the work, they don''t have to do to get water anymore". They can literally spend their time doing other things to make their village better now. This is the power of technology.

Here, in the U.S. and around the world, artificial intelligence is in full swing. We''ve reached a point where companies looking to save money on labor are opting to use A.I. and the jobs market is headed towards peak demand. 

Will A.I. take our jobs? 

I say, "Yes, but only if you let it."

Throughout history, across the U.S., and many other countries and many other periods through the existence of man, technology has freed us from one repetitive task after another. Those technological advancements compound into more complex innovations. Advancements that would not have occurred had the root technology gone undiscovered. The whole purpose of robotics and computers is to free humanity from menial and repetitive labor. Moore''s Law states that the number of transistors on a computer chip doubles roughly every two years. Computing power grows exponentially, leading technology to accelerate faster than we expect. This also ties into Kurzweil''s Law of Accelerating Returns. The law dictates that technological progress speeds up as new tools amplify our ability to create better tools.

I want to go back to Earnest''s village for a moment. When he drilled that well, he accelerated progress in that village exponentially. A lot of things we may not think about are attributed to clean water. It immediately reduces disease, saves the village from hours spent trying to collect water, and stabilizes agriculture for reliable irrigation. Now, with the time and energy saved, the village can redirect into education, small businesses, and building stronger infrastructure like schools and clinics. As that change compounds over time, even greater tools are unlocked, and those tools create more tools and so on. 

The villagers may be unemployed as water collectors and carriers, but more work needs to be done. This brings me to the purpose of writing this article. A.I. will, and already has, taken many jobs, but it has opened up so many more possibilities for other jobs that didn''t exist before. It makes it easier for people to build better tools and frees us up for the opportunity to learn more. I''ve heard people say that A.I. making us dumber, but I strongly disagree with the logic of this argument. I believe that it''s making us smarter in different areas of life.

When you point to students using A.I. to write a paper, and say they aren''t learning, to me, that''s like telling those villagers to go get water the same way they did before. Do you not see the well in the center of the village? This is why the education system has failed us. In the real world, those students will go on to work for a living, and the only thing that will matter is the outcome. No business owner is going to ban their employees from using A.I., if it''s bringing in more money. It''s not cheating to use A.I., it''s reality. In the real world, if that village doesn''t use the well, that village would struggle with the same issues as before. Stop sending students in search of water when the information is right there. Think about how to incorporate it into learning instead of banning it and consider the infinite possibilities and jobs that artificial intelligence can create. You got this!',
      excerpt = 'A reflection on how artificial intelligence, like technological progress throughout history, frees humanity from repetitive tasks and opens new possibilities. Drawing parallels between a village gaining access to clean water and society adapting to AI.',
      published = true,
      status = 'published',
      published_at = NOW(),
      seo_title = 'Artificial Intelligence: The Job Killer | THE LOST ARCHIVES | THE LOST+UNFOUNDS',
      seo_description = 'A reflection on how artificial intelligence, like technological progress throughout history, frees humanity from repetitive tasks and opens new possibilities. Drawing parallels between a village gaining access to clean water and society adapting to AI.',
      seo_keywords = 'artificial intelligence, AI, technology, jobs, automation, Moore''s Law, Kurzweil, education, innovation, progress, future of work',
      updated_at = NOW()
    WHERE slug = 'artificial-intelligence-the-job-killer';
  ELSE
    UPDATE blog_posts
    SET
      title = 'Artificial Intelligence: The Job Killer',
      content = 'The inspiration for this post comes from watching an interview featuring Earnest Hausman, a current member of the University of Michigan Wolverines football team. Hausman was born in Uganda and adopted as a child, and just recently returned to Uganda for the first time since he left. 

Earnest visited his village for the first time since he was a child and discovered that they did not have access to clean drinking water. He came back on a second trip with a plan to drill a well for his family and village to use. As I am watching this video of this giant truck drilling in the middle of this village, a stark contrast of technological progress was evident. I don''t know how they were getting water before, but I believe a lot of resources and energy were devoted to getting water to sustain this village. 

So, I''m watching this interview unfold and they are standing at the pump and you can see the containers to gather the water as one is being filled. You see the spirits of all of these people being lifted. My immediate thought was, "Think, of all the work, they don''t have to do to get water anymore". They can literally spend their time doing other things to make their village better now. This is the power of technology.

Here, in the U.S. and around the world, artificial intelligence is in full swing. We''ve reached a point where companies looking to save money on labor are opting to use A.I. and the jobs market is headed towards peak demand. 

Will A.I. take our jobs? 

I say, "Yes, but only if you let it."

Throughout history, across the U.S., and many other countries and many other periods through the existence of man, technology has freed us from one repetitive task after another. Those technological advancements compound into more complex innovations. Advancements that would not have occurred had the root technology gone undiscovered. The whole purpose of robotics and computers is to free humanity from menial and repetitive labor. Moore''s Law states that the number of transistors on a computer chip doubles roughly every two years. Computing power grows exponentially, leading technology to accelerate faster than we expect. This also ties into Kurzweil''s Law of Accelerating Returns. The law dictates that technological progress speeds up as new tools amplify our ability to create better tools.

I want to go back to Earnest''s village for a moment. When he drilled that well, he accelerated progress in that village exponentially. A lot of things we may not think about are attributed to clean water. It immediately reduces disease, saves the village from hours spent trying to collect water, and stabilizes agriculture for reliable irrigation. Now, with the time and energy saved, the village can redirect into education, small businesses, and building stronger infrastructure like schools and clinics. As that change compounds over time, even greater tools are unlocked, and those tools create more tools and so on. 

The villagers may be unemployed as water collectors and carriers, but more work needs to be done. This brings me to the purpose of writing this article. A.I. will, and already has, taken many jobs, but it has opened up so many more possibilities for other jobs that didn''t exist before. It makes it easier for people to build better tools and frees us up for the opportunity to learn more. I''ve heard people say that A.I. making us dumber, but I strongly disagree with the logic of this argument. I believe that it''s making us smarter in different areas of life.

When you point to students using A.I. to write a paper, and say they aren''t learning, to me, that''s like telling those villagers to go get water the same way they did before. Do you not see the well in the center of the village? This is why the education system has failed us. In the real world, those students will go on to work for a living, and the only thing that will matter is the outcome. No business owner is going to ban their employees from using A.I., if it''s bringing in more money. It''s not cheating to use A.I., it''s reality. In the real world, if that village doesn''t use the well, that village would struggle with the same issues as before. Stop sending students in search of water when the information is right there. Think about how to incorporate it into learning instead of banning it and consider the infinite possibilities and jobs that artificial intelligence can create. You got this!',
      excerpt = 'A reflection on how artificial intelligence, like technological progress throughout history, frees humanity from repetitive tasks and opens new possibilities. Drawing parallels between a village gaining access to clean water and society adapting to AI.',
      status = 'published',
      published_at = NOW(),
      updated_at = NOW()
    WHERE slug = 'artificial-intelligence-the-job-killer';
  END IF;

  RAISE NOTICE 'Blog post updated successfully!';
END $$;

-- Verify the post exists and is published
SELECT 
  id,
  title,
  slug,
  published,
  status,
  published_at,
  created_at
FROM blog_posts
WHERE slug = 'artificial-intelligence-the-job-killer';
