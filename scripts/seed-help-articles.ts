/**
 * Seed Help Articles Script
 * Creates comprehensive help articles for the Help Center
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const helpArticles = [
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

async function seedHelpArticles() {
  console.log('Starting to seed help articles...');
  
  try {
    // Check if articles already exist
    const { data: existingArticles } = await supabase
      .from('help_articles')
      .select('title')
      .limit(1);
    
    if (existingArticles && existingArticles.length > 0) {
      console.log('Help articles already exist. Skipping seed.');
      console.log('To re-seed, delete existing articles first.');
      return;
    }

    // Insert all articles
    const { data, error } = await supabase
      .from('help_articles')
      .insert(helpArticles.map(article => ({
        ...article,
        views: 0,
        helpful: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })));

    if (error) {
      console.error('Error seeding articles:', error);
      throw error;
    }

    console.log(`✅ Successfully created ${helpArticles.length} help articles!`);
    console.log('Articles created:');
    helpArticles.forEach((article, index) => {
      console.log(`  ${index + 1}. ${article.title} (${article.category})`);
    });
  } catch (error: any) {
    console.error('Failed to seed help articles:', error);
    if (error.code === '42P01') {
      console.error('The help_articles table does not exist. Please run the database schema first.');
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  seedHelpArticles()
    .then(() => {
      console.log('Seed completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}

export { seedHelpArticles, helpArticles };

