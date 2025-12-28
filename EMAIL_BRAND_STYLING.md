# Email Brand Styling Guide

## Brand Requirements for All Emails

All emails sent from THE LOST+UNFOUNDS must follow these strict brand guidelines:

### Visual Style
- **Background Color**: `#000000` (pure black)
- **Text Color**: `#ffffff` (white) for main content
- **Secondary Text**: `rgba(255, 255, 255, 0.6)` for footer/secondary text
- **Borders**: `rgba(255, 255, 255, 0.1)` for subtle dividers

### Email Header Image
- **Header Image URL**: `https://nonaqhllakrckbtbawrb.supabase.co/storage/v1/object/public/brand-assets/1764772922060_IMG_1244.png`
- **Max Width**: `100%` (responsive, constrained by container max-width of 600px)
- **Display**: Left-aligned, with padding below (30px)
- **Alt Text**: "THE LOST+UNFOUNDS"
- **Style**: `max-width: 100%; height: auto; display: block;`

### Typography
- **Font Family**: `Arial, sans-serif` (fallback to system fonts)
- **Main Heading**: 
  - Text: "CAN YOU SEE US?"
  - Size: `28px`
  - Weight: `bold`
  - Letter Spacing: `0.1em`
  - Color: `#ffffff`
  - Text Align: `center`
- **Subheading**: 
  - Size: `24px`
  - Weight: `600`
  - Color: `#ffffff`
  - Text Align: `center`
- **Body Text**: 
  - Size: `16px`
  - Line Height: `1.6`
  - Color: `#ffffff`
  - Text Align: `center`
- **Footer Text**: 
  - Size: `12px`
  - Line Height: `1.5`
  - Color: `rgba(255, 255, 255, 0.6)`
  - Text Align: `center`

### Layout
- **Max Width**: `600px`
- **Padding**: `40px 20px` (outer container)
- **Content Padding**: `0` (inner content)
- **Spacing**: Use margins (`20px`, `30px`) between sections

### Prohibited Elements
- ❌ **NO EMOJIS** - Do not use emojis anywhere in emails
- ❌ No bright colors (except white text on black)
- ❌ No decorative graphics (except logo)
- ❌ No animated elements
- ❌ No images except the email header image

### Required Elements
- ✅ Email header image at the top (left-aligned)
- ✅ Black background (`#000000`)
- ✅ White text (`#ffffff`)
- ✅ Footer with copyright: `© [YEAR] THE LOST+UNFOUNDS. All rights reserved.`
- ✅ Footer disclaimer: "If you didn't sign up for this newsletter, you can safely ignore this email." (for newsletter emails)

### Email Template Structure

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #000000;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #000000;">
          <!-- Branding Header -->
          <tr>
            <td align="left" style="padding: 0 0 30px 0;">
              <img src="https://nonaqhllakrckbtbawrb.supabase.co/storage/v1/object/public/brand-assets/1764772922060_IMG_1244.png" alt="THE LOST+UNFOUNDS" style="max-width: 100%; height: auto; display: block;">
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding: 0; color: #ffffff;">
              <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0 0 20px 0; text-align: center; letter-spacing: 0.1em;">
                CAN YOU SEE US?
              </h1>
              <!-- Your content here -->
              <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 30px 0;">
              <p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                If you didn't sign up for this newsletter, you can safely ignore this email.
              </p>
              <p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; line-height: 1.5; margin: 20px 0 0 0; text-align: center;">
                © ${new Date().getFullYear()} THE LOST+UNFOUNDS. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### Content Guidelines
- Keep messages concise and professional
- Use centered text alignment
- Maintain consistent spacing (20px, 30px margins)
- Use horizontal rules (`<hr>`) with `rgba(255, 255, 255, 0.1)` for section breaks
- Lists should be centered with no bullet points (use `list-style: none`)

### Examples of Correct Usage

✅ **Correct**: "Thanks for subscribing! We're excited to have you join THE LOST+UNFOUNDS community."
❌ **Incorrect**: "Thanks for subscribing! 🎉 We're excited to have you join THE LOST+UNFOUNDS community."

✅ **Correct**: Black background with white text
❌ **Incorrect**: Colored backgrounds or colored text

✅ **Correct**: Logo centered at top
❌ **Incorrect**: Logo missing or positioned elsewhere

### Implementation Checklist
When creating a new email template, verify:
- [ ] Background is `#000000` (black)
- [ ] All text is white (`#ffffff`) or gray (`rgba(255, 255, 255, 0.6)`)
- [ ] Email header image is included at the top
- [ ] No emojis anywhere
- [ ] Footer includes copyright and disclaimer
- [ ] Max width is 600px
- [ ] Text is centered
- [ ] Font is Arial or sans-serif
