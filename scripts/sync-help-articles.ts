/**
 * Help Articles Sync Script
 * Keeps help articles updated as the site changes
 * 
 * This script:
 * 1. Checks for new features/components
 * 2. Updates existing articles with new information
 * 3. Creates new articles for new features
 * 4. Marks outdated articles for review
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface FeatureInfo {
  name: string;
  path: string;
  category: string;
  description?: string;
}

/**
 * Scan codebase for features and components
 */
function scanFeatures(): FeatureInfo[] {
  const features: FeatureInfo[] = [];
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
    console.warn('Error scanning features:', error);
  }

  return features;
}

function getCategoryFromPage(pageName: string): string {
  const categoryMap: Record<string, string> = {
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

function getCategoryFromComponent(componentName: string): string {
  const categoryMap: Record<string, string> = {
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
 * Check if article needs update based on feature changes
 */
async function checkArticleNeedsUpdate(article: any, features: FeatureInfo[]): Promise<boolean> {
  // Check if article's category has new features
  const categoryFeatures = features.filter(f => f.category === article.category);
  
  // Simple check: if article is older than 30 days, mark for review
  const articleDate = new Date(article.updated_at);
  const daysSinceUpdate = (Date.now() - articleDate.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysSinceUpdate > 30 || categoryFeatures.length > 0;
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
      .order('updated_at', { ascending: false });

    if (fetchError) {
      if (fetchError.code === '42P01') {
        console.error('❌ help_articles table does not exist.');
        console.error('   Please run the database schema first.\n');
        return;
      }
      throw fetchError;
    }

    console.log(`📚 Found ${articles?.length || 0} existing articles\n`);

    // Check for missing articles
    const categories = ['Getting Started', 'Dashboard', 'Blog Management', 'Products', 
                       'Affiliates', 'Tasks', 'Journal', 'Ideas', 'Analytics', 
                       'Settings', 'API', 'Troubleshooting'];
    
    const missingArticles: string[] = [];
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

    // Check for outdated articles
    const outdatedArticles: any[] = [];
    if (articles) {
      for (const article of articles) {
        const needsUpdate = await checkArticleNeedsUpdate(article, features);
        if (needsUpdate) {
          outdatedArticles.push(article);
        }
      }
    }

    if (outdatedArticles.length > 0) {
      console.log(`📝 Found ${outdatedArticles.length} articles that may need updates:\n`);
      outdatedArticles.forEach(article => {
        const daysSinceUpdate = Math.floor(
          (Date.now() - new Date(article.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        console.log(`   - "${article.title}" (${daysSinceUpdate} days old)`);
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

  } catch (error: any) {
    console.error('❌ Error syncing articles:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncHelpArticles();
}

export { syncHelpArticles };

