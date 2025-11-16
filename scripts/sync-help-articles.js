/**
 * Help Articles Sync Script (JavaScript version)
 * Keeps help articles updated as the site changes
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
let envVars = {};
try {
  const envFile = readFileSync(join(__dirname, '../.env.local'), 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
} catch (e) {
  // .env.local doesn't exist, use process.env
}

const supabaseUrl = envVars.SUPABASE_URL || envVars.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Scan codebase for features and components
 */
function scanFeatures() {
  const features = [];
  const srcPath = join(__dirname, '../src');
  
  try {
    // Scan pages
    const pagesPath = join(srcPath, 'pages');
    if (statSync(pagesPath).isDirectory()) {
      const pages = readdirSync(pagesPath);
      pages.forEach(page => {
        if (page.endsWith('.tsx') || page.endsWith('.ts')) {
          const name = page.replace(/\.(tsx|ts)$/, '');
          features.push({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            path: `/src/pages/${page}`,
            category: getCategoryFromPage(name),
          });
        }
      });
    }

    // Scan admin components
    const adminPath = join(srcPath, 'components/admin');
    if (statSync(adminPath).isDirectory()) {
      const components = readdirSync(adminPath);
      components.forEach(component => {
        if (component.endsWith('.tsx') || component.endsWith('.ts')) {
          const name = component.replace(/\.(tsx|ts)$/, '');
          features.push({
            name: name.replace(/([A-Z])/g, ' $1').trim(),
            path: `/src/components/admin/${component}`,
            category: getCategoryFromComponent(name),
          });
        }
      });
    }
  } catch (error) {
    console.warn('Error scanning features:', error.message);
  }

  return features;
}

function getCategoryFromPage(pageName) {
  const categoryMap = {
    'Admin': 'Dashboard',
    'Home': 'Getting Started',
    'Blog': 'Blog Management',
    'Shop': 'Products',
    'Affiliate': 'Affiliates',
    'Profile': 'Settings',
    'Settings': 'Settings',
  };
  return categoryMap[pageName] || 'Dashboard';
}

function getCategoryFromComponent(componentName) {
  const categoryMap = {
    'DashboardOverview': 'Dashboard',
    'BlogPostManagement': 'Blog Management',
    'ProductManagement': 'Products',
    'AffiliateManagement': 'Affiliates',
    'TaskManagement': 'Tasks',
    'DailyJournal': 'Journal',
    'IdeaBoard': 'Ideas',
    'HelpCenter': 'Troubleshooting',
    'DeveloperTools': 'API',
  };
  return categoryMap[componentName] || 'Dashboard';
}

/**
 * Sync help articles with current features
 */
async function syncHelpArticles() {
  console.log('🔄 Starting help articles sync...\n');

  try {
    // Scan current features
    const features = scanFeatures();
    console.log(`📋 Found ${features.length} features/components\n`);

    // Get existing articles
    const { data: articles, error: fetchError } = await supabase
      .from('help_articles')
      .select('*')
      .order('updated_at', { ascending: false })
      .then(r => r)
      .catch(() => ({ data: null, error: null }));

    if (fetchError) {
      if (fetchError.code === '42P01') {
        console.error('❌ help_articles table does not exist.');
        console.error('   Please run the database schema first.\n');
        console.error('   See DATABASE_SETUP_GUIDE.md for instructions.\n');
        return;
      }
      throw fetchError;
    }

    console.log(`📚 Found ${articles?.length || 0} existing articles\n`);

    // Check for missing articles
    const categories = ['Getting Started', 'Dashboard', 'Blog Management', 'Products', 
                       'Affiliates', 'Tasks', 'Journal', 'Ideas', 'Analytics', 
                       'Settings', 'API', 'Troubleshooting'];
    
    const missingArticles = [];
    categories.forEach(category => {
      const hasArticle = articles?.some(a => a.category === category);
      if (!hasArticle) {
        missingArticles.push(category);
      }
    });

    if (missingArticles.length > 0) {
      console.log(`⚠️  Missing articles for categories: ${missingArticles.join(', ')}\n`);
      console.log('   Run "Load Default Articles" in Help Center to create them.\n');
    }

    // Check for outdated articles (older than 30 days)
    const outdatedArticles = [];
    if (articles) {
      articles.forEach(article => {
        const articleDate = new Date(article.updated_at);
        const daysSinceUpdate = (Date.now() - articleDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate > 30) {
          outdatedArticles.push({ ...article, daysSinceUpdate: Math.floor(daysSinceUpdate) });
        }
      });
    }

    if (outdatedArticles.length > 0) {
      console.log(`📝 Found ${outdatedArticles.length} articles that may need updates:\n`);
      outdatedArticles.forEach(article => {
        console.log(`   - "${article.title}" (${article.daysSinceUpdate} days old)`);
      });
      console.log('\n   Consider reviewing these articles for accuracy.\n');
    }

    // Summary
    console.log('✅ Sync complete!\n');
    console.log('Summary:');
    console.log(`   - Features scanned: ${features.length}`);
    console.log(`   - Existing articles: ${articles?.length || 0}`);
    console.log(`   - Missing categories: ${missingArticles.length}`);
    console.log(`   - Articles needing review: ${outdatedArticles.length}\n`);

    if (outdatedArticles.length > 0 || missingArticles.length > 0) {
      console.log('💡 Next steps:');
      if (missingArticles.length > 0) {
        console.log('   1. Load default articles in Help Center');
      }
      if (outdatedArticles.length > 0) {
        console.log('   2. Review and update outdated articles');
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error syncing articles:', error.message);
    if (error.code === '42P01') {
      console.error('\n💡 The help_articles table does not exist.');
      console.error('   Please create it by running the database schema.');
      console.error('   See DATABASE_SETUP_GUIDE.md for instructions.\n');
    }
    process.exit(1);
  }
}

// Run if executed directly
syncHelpArticles();

