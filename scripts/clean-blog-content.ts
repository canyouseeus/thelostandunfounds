
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanBlogContent() {
    console.log('Starting blog content cleaning...');

    const { data: posts, error } = await supabase
        .from('blog_posts')
        .select('id, title, content');

    if (error) {
        console.error('Error fetching posts:', error);
        return;
    }

    console.log(`Found ${posts.length} posts. Analyzing...`);

    let updatedCount = 0;

    for (const post of posts) {
        let content = post.content || '';
        let hasChanges = false;

        // 1. Remove Em Dashes and En Dashes
        if (content.match(/[—–]/)) {
            content = content.replace(/[—–]/g, '-');
            hasChanges = true;
        }

        // 2. Normalize Line Breaks (3+ newlines -> 2 newlines)
        if (content.match(/\n{3,}/)) {
            content = content.replace(/\n{3,}/g, '\n\n');
            hasChanges = true;
        }

        if (hasChanges) {
            console.log(`Updating post: "${post.title}" (${post.id})`);
            const { error: updateError } = await supabase
                .from('blog_posts')
                .update({ content })
                .eq('id', post.id);

            if (updateError) {
                console.error(`Error updating post ${post.id}:`, updateError);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`\nCleanup complete! Updated ${updatedCount} posts.`);
}

cleanBlogContent();
