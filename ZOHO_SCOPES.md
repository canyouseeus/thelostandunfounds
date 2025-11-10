# Zoho Campaigns API Scopes

## Required Scopes for Email Sign-Up

For the `listsubscribe` endpoint (adding subscribers to your email list), you need:

### Minimum Required:
- **`ZohoCampaigns.contact.CREATE`** - Required to add/create contacts/subscribers

### Optional but Recommended:
- **`ZohoCampaigns.contact.READ`** - Helps with error handling and checking if contact exists

## All Available Zoho Campaigns Scopes

If you need more functionality later, here are all available scopes:

### Contact Scopes:
- `ZohoCampaigns.contact.READ` - Read contacts
- `ZohoCampaigns.contact.CREATE` - Create/add contacts
- `ZohoCampaigns.contact.UPDATE` - Update contacts
- `ZohoCampaigns.contact.DELETE` - Delete contacts

### List Scopes:
- `ZohoCampaigns.list.READ` - Read mailing lists
- `ZohoCampaigns.list.CREATE` - Create mailing lists
- `ZohoCampaigns.list.UPDATE` - Update mailing lists
- `ZohoCampaigns.list.DELETE` - Delete mailing lists

### Campaign Scopes:
- `ZohoCampaigns.campaign.READ` - Read campaigns
- `ZohoCampaigns.campaign.CREATE` - Create campaigns
- `ZohoCampaigns.campaign.UPDATE` - Update campaigns
- `ZohoCampaigns.campaign.DELETE` - Delete campaigns

### Template Scopes:
- `ZohoCampaigns.template.READ` - Read email templates
- `ZohoCampaigns.template.CREATE` - Create templates
- `ZohoCampaigns.template.UPDATE` - Update templates

## For Your Use Case (Email Sign-Up Form)

**Minimum:** Just `ZohoCampaigns.contact.CREATE` is enough

**Recommended:** `ZohoCampaigns.contact.CREATE` + `ZohoCampaigns.contact.READ`

You don't need any other scopes unless you plan to:
- Create/manage lists (need list scopes)
- Send campaigns (need campaign scopes)
- Manage templates (need template scopes)
