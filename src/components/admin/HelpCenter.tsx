/**
 * Help Center Component
 * Knowledge base, documentation, and help articles
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../Toast';
import { HelpCircle, Plus, Edit, Trash2, Save, X, Search, Book, FileText } from 'lucide-react';
import { LoadingSpinner } from '../Loading';

export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  views: number;
  helpful: number;
  created_at: string;
  updated_at: string;
}

const categories = [
  'Getting Started',
  'Dashboard',
  'Blog Management',
  'Products',
  'Affiliates',
  'Tasks',
  'Journal',
  'Ideas',
  'Analytics',
  'Settings',
  'API',
  'Troubleshooting',
];

export default function HelpCenter() {
  const { success, error: showError } = useToast();
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingArticle, setEditingArticle] = useState<HelpArticle | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    loadArticles();
    
    // Check for article updates on mount (in development)
    if (import.meta.env.DEV) {
      const checkForUpdates = async () => {
        try {
          // Check if articles are older than 30 days
          const { data } = await supabase
            .from('help_articles')
            .select('updated_at')
            .order('updated_at', { ascending: true })
            .limit(1)
            .then(r => r)
            .catch(() => ({ data: null }));
          
          if (data && data.length > 0) {
            const oldestArticle = new Date(data[0].updated_at);
            const daysSinceUpdate = (Date.now() - oldestArticle.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysSinceUpdate > 30) {
              console.log(`ℹ️  Some help articles are ${Math.floor(daysSinceUpdate)} days old. Consider running 'npm run sync:help-articles' to check for updates.`);
            }
          }
        } catch (error) {
          // Silently fail - this is just a helpful reminder
        }
      };
      
      // Only check after articles are loaded
      setTimeout(checkForUpdates, 2000);
    }
  }, []);

  const seedDefaultArticles = async () => {
    const defaultArticles = [
      {
        title: 'Getting Started with Admin Dashboard',
        content: `# Welcome to THE LOST+UNFOUNDS Admin Dashboard

The Admin Dashboard is your central command center for managing all aspects of your platform. This guide will help you get started.

## Overview

The dashboard provides access to:
- **Dashboard Overview**: View platform metrics and KPIs
- **Blog Management**: Create and manage blog posts
- **Product Management**: Manage your store catalog
- **Affiliate Program**: Track and manage affiliates
- **Daily Journal**: Document your daily work
- **Task Management**: Organize and track tasks
- **Idea Board**: Capture and organize ideas
- **Analytics**: View detailed platform analytics
- **Help Center**: Access documentation and help articles
- **Developer Tools**: Code snippets and utilities
- **Settings**: Platform configuration

## Navigation

- **Left Sidebar**: Click any menu item to navigate to that section
- **Tabs**: Open multiple sections as tabs for easy switching
- **Browser Navigation**: Use back/forward buttons to navigate through your tab history

## Quick Start

1. Start by exploring the **Dashboard Overview** to see your platform metrics
2. Create your first **Blog Post** or **Product**
3. Set up **Tasks** to track your work
4. Use the **Daily Journal** to document your progress

## Need Help?

Check the Help Center for detailed guides on each feature, or use the search function to find specific topics.`,
        category: 'Getting Started',
        tags: ['dashboard', 'getting-started', 'overview', 'navigation']
      },
      {
        title: 'Understanding the Dashboard Overview',
        content: `# Dashboard Overview Guide

The Dashboard Overview provides a comprehensive view of your platform's key metrics and performance indicators.

## Key Metrics Displayed

### User Statistics
- **Total Users**: Total number of registered users
- **Active Subscriptions**: Number of users with active subscriptions
- **Subscription Breakdown**: Free, Premium, and Pro tier distribution

### Platform Activity
- **Tool Usage**: Total number of tool interactions
- **Monthly Revenue**: Revenue generated this month
- **Content Statistics**: Products, blog posts, tasks, ideas, and affiliates

## Reading the Cards

Each metric card shows:
- **Icon**: Visual indicator of the metric type
- **Value**: Current metric value
- **Title**: What the metric represents
- **Progress Bars**: Visual representation of completion or distribution

## Subscription Tiers

The dashboard breaks down users by subscription tier:
- **Free**: Basic access with limited features
- **Premium**: Enhanced features and unlimited access
- **Pro**: Full access including API capabilities

## Content Statistics

View counts and status for:
- Products (total and active)
- Blog Posts (total and published)
- Tasks (total and completed)
- Ideas (total and active)
- Affiliates (total and active)

## Quick Actions

Use the Quick Actions section to:
- Create new blog posts
- Add products
- Create tasks
- Capture ideas

All actions are accessible directly from the dashboard for quick access to common tasks.`,
        category: 'Dashboard',
        tags: ['dashboard', 'metrics', 'analytics', 'overview']
      },
      {
        title: 'How to Create and Manage Blog Posts',
        content: `# Blog Post Management Guide

Learn how to create, edit, and manage blog posts for your platform.

## Creating a New Blog Post

1. Navigate to **Blog Posts** in the sidebar
2. Click **"New Post"** button
3. Fill in the required fields:
   - **Title**: The post title (slug is auto-generated)
   - **Content**: Write your post content (supports markdown)
   - **Excerpt**: Short description for previews
   - **Featured Image**: Upload or add image URL
   - **Status**: Choose Draft or Published
4. Click **"Save Post"**

## Editing Blog Posts

1. Click on any blog post card to edit
2. Modify the fields as needed
3. Click **"Update Post"** to save changes

## Post Status

- **Draft**: Post is saved but not visible to the public
- **Published**: Post is live and visible to visitors

## Best Practices

- Write clear, engaging titles
- Use excerpts to create compelling previews
- Add featured images for better visual appeal
- Use markdown formatting for better readability
- Save drafts frequently while writing

## Managing Posts

- **View**: Click any post to view/edit
- **Delete**: Use the delete button to remove posts
- **Search**: Use the search bar to find specific posts
- **Filter**: Filter by status (Draft/Published)

## SEO Tips

- Use descriptive titles
- Write compelling excerpts
- Add relevant tags
- Include keywords naturally in content
- Use proper heading structure (H1, H2, etc.)`,
        category: 'Blog Management',
        tags: ['blog', 'content', 'writing', 'cms']
      },
      {
        title: 'Managing Your Product Catalog',
        content: `# Product Management Guide

Learn how to add, edit, and manage products in your store.

## Adding a New Product

1. Go to **Products** in the sidebar
2. Click **"New Product"**
3. Fill in product details:
   - **Name**: Product name
   - **Description**: Detailed product description
   - **Price**: Product price
   - **SKU**: Stock keeping unit (optional)
   - **Inventory**: Available quantity
   - **Category**: Product category
   - **Images**: Upload product images
   - **Status**: Active, Draft, or Archived
4. Click **"Save Product"**

## Product Status

- **Active**: Product is available for purchase
- **Draft**: Product is saved but not visible
- **Archived**: Product is hidden from store

## Inventory Management

- Track available inventory quantities
- Set inventory levels to manage stock
- Products with 0 inventory can be marked as out of stock

## Product Images

- Upload multiple images per product
- First image is used as the featured image
- Images are displayed in product galleries

## Categories

Organize products by categories:
- Makes browsing easier for customers
- Helps with store organization
- Improves product discoverability

## Best Practices

- Write detailed, accurate descriptions
- Use high-quality product images
- Set appropriate prices
- Keep inventory updated
- Use clear, descriptive product names
- Add relevant categories and tags`,
        category: 'Products',
        tags: ['products', 'e-commerce', 'inventory', 'store']
      },
      {
        title: 'Affiliate Program Management',
        content: `# Affiliate Program Guide

Manage your affiliate network and track commissions.

## Creating Affiliates

1. Navigate to **Affiliates** section
2. Click **"Add Affiliate"**
3. Enter affiliate information:
   - **Name**: Affiliate name
   - **Email**: Contact email
   - **Commission Rate**: Percentage or fixed amount
   - **Status**: Active or Inactive
4. Save the affiliate

## Tracking Commissions

- View total commissions earned per affiliate
- Track clicks and conversions
- Monitor affiliate performance
- Generate commission reports

## Affiliate Links

- Each affiliate gets unique tracking links
- Links track clicks and conversions
- Commission is calculated automatically

## Commission Types

- **Percentage**: Commission based on sale percentage
- **Fixed**: Fixed amount per sale

## Managing Affiliates

- **Activate/Deactivate**: Control affiliate status
- **View Performance**: See clicks, conversions, earnings
- **Edit Details**: Update affiliate information
- **Remove**: Delete inactive affiliates

## Best Practices

- Set competitive commission rates
- Provide marketing materials to affiliates
- Track performance regularly
- Communicate with top performers
- Review and approve affiliate applications`,
        category: 'Affiliates',
        tags: ['affiliates', 'commissions', 'marketing', 'referrals']
      },
      {
        title: 'Task Management System',
        content: `# Task Management Guide

Organize and track your work with the task management system.

## Creating Tasks

1. Go to **Tasks** section
2. Click **"New Task"**
3. Fill in task details:
   - **Title**: Task name
   - **Description**: Detailed task description
   - **Project**: Project or category
   - **Priority**: Low, Medium, High, or Critical
   - **Status**: Todo, In Progress, or Completed
   - **Due Date**: Optional deadline
4. Save the task

## Task Status

- **Todo**: Task not yet started
- **In Progress**: Currently working on
- **Completed**: Task finished

## Task Priority

- **Low**: Not urgent
- **Medium**: Normal priority
- **High**: Important
- **Critical**: Urgent and important

## Organizing Tasks

- Group by project
- Filter by status or priority
- Sort by due date
- Search for specific tasks

## Best Practices

- Break large tasks into smaller ones
- Set realistic due dates
- Update status regularly
- Use projects to organize related tasks
- Prioritize critical tasks
- Review and complete tasks daily`,
        category: 'Tasks',
        tags: ['tasks', 'productivity', 'project-management', 'organization']
      },
      {
        title: 'Using the Daily Journal',
        content: `# Daily Journal Guide

Document your daily work, thoughts, and progress.

## Creating Journal Entries

1. Navigate to **Daily Journal**
2. Click **"New Entry"**
3. Write your entry:
   - **Date**: Select the date (defaults to today)
   - **Title**: Entry title
   - **Content**: Your journal entry
   - **Tags**: Add tags for organization
4. Save your entry

## Journal Benefits

- Track daily progress
- Document important decisions
- Record ideas and insights
- Reflect on accomplishments
- Maintain work history

## Organizing Entries

- **Tags**: Add tags to categorize entries
- **Search**: Find entries by keyword
- **Date Navigation**: Browse by date
- **Filter**: Filter by tags or date range

## Best Practices

- Write entries daily
- Be consistent with format
- Use tags for organization
- Include accomplishments and challenges
- Document important decisions
- Review past entries regularly

## Entry Structure

Consider including:
- What you accomplished
- Challenges faced
- Ideas or insights
- Plans for tomorrow
- Notes or reminders`,
        category: 'Journal',
        tags: ['journal', 'documentation', 'productivity', 'reflection']
      },
      {
        title: 'Idea Board Management',
        content: `# Idea Board Guide

Capture, organize, and track your ideas.

## Adding Ideas

1. Go to **Ideas** section
2. Click **"New Idea"**
3. Enter idea details:
   - **Title**: Idea name
   - **Description**: Detailed description
   - **Category**: Idea category
   - **Priority**: Low, Medium, High, or Critical
   - **Status**: Backlog, Considering, Planned, In Progress, Completed, or Archived
   - **Tags**: Add relevant tags
4. Save the idea

## Idea Status

- **Backlog**: Initial idea, not yet reviewed
- **Considering**: Under evaluation
- **Planned**: Approved and scheduled
- **In Progress**: Currently being worked on
- **Completed**: Idea implemented
- **Archived**: No longer relevant

## Idea Priority

- **Low**: Nice to have
- **Medium**: Worth considering
- **High**: Important idea
- **Critical**: Must implement

## Organizing Ideas

- Group by category
- Filter by status or priority
- Use tags for cross-referencing
- Link to related tasks or journal entries

## Best Practices

- Capture ideas immediately
- Review ideas regularly
- Move promising ideas to "Planned"
- Archive outdated ideas
- Link related ideas together
- Document implementation details`,
        category: 'Ideas',
        tags: ['ideas', 'innovation', 'planning', 'brainstorming']
      },
      {
        title: 'Understanding Analytics',
        content: `# Analytics Guide

Learn how to interpret and use platform analytics.

## Available Analytics

The Analytics section provides multiple views:

### Users Analytics
- Total user count
- Subscription tier breakdown
- User growth trends

### Subscription Analytics
- Active subscriptions
- Tier distribution
- Subscription trends

### Revenue Analytics
- Total revenue
- Monthly revenue
- Revenue by source

### Traffic Analytics
- Tool usage statistics
- Popular features
- User engagement metrics

### Content Analytics
- Product statistics
- Blog post performance
- Content engagement

## Navigating Analytics

- Use arrow buttons to cycle through charts
- Click chart icons for quick navigation
- View detailed breakdowns
- Compare metrics over time

## Key Metrics

- **Total Users**: Platform user base size
- **Active Subscriptions**: Paying customers
- **Tool Usage**: Feature adoption
- **Revenue**: Financial performance
- **Content**: Content library size

## Using Analytics

- Identify trends
- Make data-driven decisions
- Track growth
- Monitor performance
- Plan improvements

## Best Practices

- Review analytics regularly
- Compare periods
- Identify patterns
- Set goals based on data
- Track key metrics over time`,
        category: 'Analytics',
        tags: ['analytics', 'metrics', 'data', 'reporting']
      },
      {
        title: 'Platform Settings and Configuration',
        content: `# Settings Guide

Configure platform settings and preferences.

## Accessing Settings

Navigate to **Settings** in the sidebar to access:
- Platform configuration
- Security settings
- Integration settings
- Quick overview cards

## Quick Overview

The Settings page includes overview cards showing:
- Dashboard metrics
- Blog post count
- Product count
- Affiliate statistics
- Analytics summary
- Task completion
- Idea count
- Journal entries

Click any card to navigate to that section.

## Opening New Tabs

Use the "Open New Tab" section to:
- Open any section in a new tab
- Manage multiple sections simultaneously
- Quick access to all features

## Platform Configuration

Configure:
- General platform settings
- Security and access controls
- Third-party integrations
- API settings

## Best Practices

- Review settings regularly
- Keep security settings updated
- Configure integrations properly
- Test settings after changes
- Document custom configurations`,
        category: 'Settings',
        tags: ['settings', 'configuration', 'preferences', 'admin']
      },
      {
        title: 'Developer Tools and Code Snippets',
        content: `# Developer Tools Guide

Access developer utilities and code snippets.

## Code Snippets Library

Store and organize reusable code snippets:
- **Save Snippets**: Store frequently used code
- **Organize by Language**: JavaScript, Python, SQL, etc.
- **Add Descriptions**: Document code purpose
- **Tag Snippets**: Organize with tags

## Using Code Snippets

1. Navigate to **Developer Tools**
2. View your code library
3. Copy snippets for use
4. Edit or delete as needed

## Database Queries

Execute SQL queries directly:
- Test database queries
- Debug data issues
- Perform maintenance
- Analyze data

## Best Practices

- Document code snippets well
- Use descriptive titles
- Add comments to code
- Organize by language
- Keep snippets updated
- Share useful snippets with team`,
        category: 'API',
        tags: ['developer', 'code', 'snippets', 'utilities']
      },
      {
        title: 'Troubleshooting Common Issues',
        content: `# Troubleshooting Guide

Solutions to common platform issues.

## Dashboard Not Loading

**Issue**: Dashboard shows errors or won't load

**Solutions**:
- Check browser console for errors
- Clear browser cache
- Refresh the page
- Check internet connection
- Verify you're logged in as admin

## Data Not Appearing

**Issue**: Metrics or data showing as zero

**Solutions**:
- Verify database tables exist
- Check database permissions
- Ensure data has been created
- Review error logs
- Check RLS policies

## Can't Save Articles/Posts

**Issue**: Unable to save content

**Solutions**:
- Check required fields are filled
- Verify database connection
- Check browser console for errors
- Ensure you have admin permissions
- Try refreshing and saving again

## Tabs Not Working

**Issue**: Browser tabs not functioning

**Solutions**:
- Clear browser cache
- Check JavaScript is enabled
- Try a different browser
- Refresh the page
- Check console for errors

## Performance Issues

**Issue**: Slow loading or lag

**Solutions**:
- Clear browser cache
- Close unnecessary tabs
- Check internet connection
- Review large data sets
- Optimize queries

## Getting Help

If issues persist:
1. Check the Help Center for more articles
2. Review error messages in console
3. Check database logs
4. Contact support if needed`,
        category: 'Troubleshooting',
        tags: ['troubleshooting', 'help', 'errors', 'support']
      },
      {
        title: 'Browser Tab Navigation',
        content: `# Browser Tab Navigation Guide

Learn how to use the browser-like tab system.

## Opening Tabs

- Click any section in the sidebar to open it
- Use Settings menu to open new tabs
- Tabs appear at the top of the main view

## Tab Features

- **Active Tab**: Currently viewed content (highlighted)
- **Close Button**: Appears on hover (X icon)
- **Tab Icons**: Visual indicators for each section
- **Tab Labels**: Section names

## Navigation Controls

- **Back Button (←)**: Go to previous tab in history
- **Forward Button (→)**: Go to next tab in history
- **Tab Click**: Switch to that tab
- **Close Tab**: Remove tab from view

## Tab History

The system tracks your navigation:
- Opening a new tab adds to history
- Back/forward navigate through history
- Closing tabs doesn't affect history
- History persists during session

## Best Practices

- Keep frequently used tabs open
- Close tabs you're done with
- Use back/forward for quick navigation
- Organize tabs by workflow
- Don't open too many tabs at once

## Tips

- Right-click (future feature) for tab options
- Keyboard shortcuts (future feature) for navigation
- Tab order reflects opening sequence
- Active tab is always visible`,
        category: 'Dashboard',
        tags: ['navigation', 'tabs', 'browser', 'interface']
      },
      {
        title: 'Password Generator Tool',
        content: `# Password Generator Guide

Generate secure passwords for your accounts.

## Using the Generator

1. Navigate to **Password Generator**
2. Configure options:
   - **Length**: Set password length (8-64 characters)
   - **Include Uppercase**: A-Z letters
   - **Include Lowercase**: a-z letters
   - **Include Numbers**: 0-9 digits
   - **Include Symbols**: Special characters
3. Click **"Generate Password"**
4. Copy the generated password

## Password Strength

Strong passwords include:
- Mix of character types
- At least 12 characters
- No dictionary words
- No personal information
- Unique for each account

## Security Best Practices

- Use different passwords for each account
- Change passwords regularly
- Don't share passwords
- Use a password manager
- Enable two-factor authentication
- Store passwords securely

## Password Tips

- Longer is stronger
- Mix character types
- Avoid common patterns
- Don't reuse passwords
- Update compromised passwords immediately`,
        category: 'Settings',
        tags: ['password', 'security', 'generator', 'utilities']
      }
    ];

    try {
      // Insert all articles
      const { error } = await supabase
        .from('help_articles')
        .insert(defaultArticles.map(article => ({
          ...article,
          views: 0,
          helpful: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })));

      if (error) {
        if (error.code === '42P01') {
          showError('The help_articles table does not exist. Please run the database schema first.');
        } else {
          throw error;
        }
        return;
      }

      success(`Created ${defaultArticles.length} help articles!`);
      loadArticles();
    } catch (error: any) {
      console.error('Error seeding articles:', error);
      showError(error.message || 'Failed to create help articles');
    }
  };

  const loadArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('help_articles')
        .select('*')
        .order('created_at', { ascending: false })
        .then(r => r)
        .catch(() => ({ data: [], error: null }));

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading articles:', error);
        // Don't show error if table doesn't exist - just show empty state
        if (error.code === '42P01') {
          console.warn('help_articles table does not exist yet');
        } else {
          showError('Failed to load help articles');
        }
      }
      setArticles(data || []);
    } catch (error: any) {
      console.error('Error loading articles:', error);
      // Only show error if it's not a missing table error
      if (!error.message?.includes('does not exist')) {
        showError('Failed to load help articles');
      }
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag),
    });
  };

  const handleSave = async () => {
    try {
      const articleData = {
        ...formData,
        updated_at: new Date().toISOString(),
      };

      if (editingArticle) {
        const { error } = await supabase
          .from('help_articles')
          .update(articleData)
          .eq('id', editingArticle.id);

        if (error) throw error;
        success('Article updated successfully');
      } else {
        const { error } = await supabase
          .from('help_articles')
          .insert([{
            ...articleData,
            views: 0,
            helpful: 0,
            created_at: new Date().toISOString(),
          }]);

        if (error) throw error;
        success('Article created successfully');
      }

      resetForm();
      loadArticles();
    } catch (error: any) {
      console.error('Error saving article:', error);
      showError(error.message || 'Failed to save article');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
      const { error } = await supabase
        .from('help_articles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      success('Article deleted successfully');
      loadArticles();
    } catch (error: any) {
      console.error('Error deleting article:', error);
      showError('Failed to delete article');
    }
  };

  const handleEdit = (article: HelpArticle) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      category: article.category,
      tags: article.tags || [],
    });
    setIsCreating(true);
  };

  const resetForm = () => {
    setEditingArticle(null);
    setIsCreating(false);
    setFormData({
      title: '',
      content: '',
      category: '',
      tags: [],
    });
    setTagInput('');
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = !searchQuery ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (article.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = !selectedCategory || article.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const articlesByCategory = categories.map(cat => ({
    category: cat,
    articles: filteredArticles.filter(a => a.category === cat),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-6 h-6" />
          Help Center
        </h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition"
        >
          <Plus className="w-4 h-4" />
          New Article
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search help articles..."
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
          />
        </div>
        <select
          value={selectedCategory || ''}
          onChange={(e) => setSelectedCategory(e.target.value || null)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <div className="bg-black border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">
              {editingArticle ? 'Edit Article' : 'Create New Article'}
            </h3>
            <button
              onClick={resetForm}
              className="text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-white/80 mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                placeholder="Article title"
              />
            </div>

            <div>
              <label className="block text-white/80 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white/80 mb-2">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                rows={12}
                placeholder="Write your help article content here. You can use markdown formatting..."
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-white/80 mb-2">Tags</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                  placeholder="Add tag and press Enter"
                />
                <button
                  onClick={addTag}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-3 py-1 bg-white/10 text-white rounded-full text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition"
              >
                <Save className="w-4 h-4" />
                {editingArticle ? 'Update Article' : 'Create Article'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {articles.length === 0 && !isCreating && (
        <div className="bg-black border border-white/10 rounded-lg p-12 text-center">
          <HelpCircle className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Help Articles Yet</h3>
          <p className="text-white/60 mb-6 max-w-md mx-auto">
            Get started by creating your first help article, or load default articles to get started quickly.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => seedDefaultArticles()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-lg hover:bg-white/90 transition font-medium"
            >
              <FileText className="w-5 h-5" />
              Load Default Articles
            </button>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Your First Article
            </button>
          </div>
        </div>
      )}

      {/* Articles by Category */}
      {articles.length > 0 && (
        <div className="space-y-6">
          {articlesByCategory.map(({ category, articles: categoryArticles }) => {
            if (categoryArticles.length === 0 && selectedCategory !== category) return null;
            
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-4">
                  <Book className="w-5 h-5 text-white/60" />
                  <h3 className="text-xl font-bold text-white">{category}</h3>
                  <span className="text-white/60 text-sm">({categoryArticles.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryArticles.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-white/40 text-sm">
                      No articles in this category
                    </div>
                  ) : (
                    categoryArticles.map(article => (
                      <div
                        key={article.id}
                        className="bg-black border border-white/10 rounded-lg p-4 hover:border-white/30 transition cursor-pointer"
                        onClick={() => handleEdit(article)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-white flex-1">{article.title}</h4>
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(article);
                              }}
                              className="p-1 text-white/60 hover:text-white"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(article.id);
                              }}
                              className="p-1 text-white/60 hover:text-red-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <p className="text-white/60 text-sm mb-3 line-clamp-3">{article.content}</p>

                        <div className="flex items-center justify-between text-xs text-white/40">
                          <span>{article.views} views</span>
                          <span>{article.helpful} helpful</span>
                        </div>

                        {article.tags && article.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {article.tags.map(tag => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 bg-white/5 text-white/60 rounded text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
