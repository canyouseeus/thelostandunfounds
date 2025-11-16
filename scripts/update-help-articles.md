# Help Articles Update System

## Overview

This system ensures help articles stay current as the site evolves. Articles are automatically checked and flagged for updates when features change.

## How It Works

### 1. Automatic Detection
- Scans codebase for features and components
- Compares with existing help articles
- Identifies missing or outdated articles

### 2. Update Triggers

Articles are flagged for review when:
- **New features added** - New components/pages detected
- **30+ days old** - Articles older than 30 days
- **Category changes** - Features added to article's category
- **Manual trigger** - Run sync script manually

### 3. Update Process

1. **Run Sync Script**
   ```bash
   npm run sync:help-articles
   ```

2. **Review Flagged Articles**
   - Check Help Center for outdated articles
   - Update content as needed
   - Mark as reviewed

3. **Create Missing Articles**
   - Use "Load Default Articles" if needed
   - Create custom articles for new features

## Manual Update Workflow

### When Adding a New Feature:

1. **Add the feature** to your codebase
2. **Run sync script** to detect it:
   ```bash
   npm run sync:help-articles
   ```
3. **Create/update article** in Help Center:
   - Go to Help Center
   - Click "New Article"
   - Document the new feature
   - Add appropriate category and tags

### When Modifying Existing Features:

1. **Update the feature** in code
2. **Check Help Center** for related articles
3. **Update articles** to reflect changes:
   - Click on article to edit
   - Update content
   - Save changes

## Automated Checks

The sync script checks:
- ✅ All pages in `/src/pages/`
- ✅ All admin components in `/src/components/admin/`
- ✅ Article age (flags if > 30 days old)
- ✅ Missing categories
- ✅ Feature-to-article mapping

## Best Practices

1. **Update articles immediately** when features change
2. **Run sync monthly** to catch outdated content
3. **Use consistent categories** for easier organization
4. **Add tags** for better searchability
5. **Include screenshots** or examples when helpful
6. **Keep articles concise** but complete

## Integration with CI/CD

Add to your deployment pipeline:

```yaml
# .github/workflows/deploy.yml
- name: Sync Help Articles
  run: npm run sync:help-articles
  continue-on-error: true  # Don't fail deployment if sync fails
```

## Monitoring

Check article health:
- **Age**: Articles should be updated every 30-90 days
- **Coverage**: All major features should have articles
- **Accuracy**: Content should match current functionality
- **Usage**: Track views to prioritize updates

