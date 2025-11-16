# Help Articles Maintenance Guide

## Quick Reference

### Running Database Schema
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `comprehensive-admin-schema.sql`
3. Paste and run in SQL Editor
4. Verify `help_articles` table exists

### Keeping Articles Updated

**Automatic (Recommended)**:
```bash
npm run sync:help-articles
```

**Manual**:
1. Go to Help Center in Admin Dashboard
2. Review flagged articles
3. Update content as needed

## When to Update Articles

- ✅ New feature added
- ✅ Feature behavior changed
- ✅ UI/UX updated
- ✅ New workflow introduced
- ✅ Article is 30+ days old
- ✅ User feedback indicates confusion

## Update Checklist

When updating an article:
- [ ] Content matches current functionality
- [ ] Screenshots/examples are current
- [ ] Links are working
- [ ] Tags are relevant
- [ ] Category is correct
- [ ] Date updated is recent

## Creating New Articles

For new features:
1. Identify the feature category
2. Write clear, step-by-step guide
3. Include examples/screenshots
4. Add relevant tags
5. Link to related articles
6. Test the workflow yourself

## Article Quality Standards

- **Clear**: Easy to understand
- **Complete**: Covers all aspects
- **Current**: Reflects latest version
- **Concise**: No unnecessary fluff
- **Actionable**: Step-by-step instructions
- **Searchable**: Good tags and keywords

