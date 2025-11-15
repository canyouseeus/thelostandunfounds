#!/usr/bin/env node

/**
 * Send welcome email directly using Zoho API
 * This works independently of the dev server
 * 
 * Usage: node scripts/send-welcome-email-now.js thelostandunfounds@gmail.com
 */

const email = process.argv[2] || 'thelostandunfounds@gmail.com';

// Load environment variables from .env.local
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    content.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        envVars[match[1].trim()] = match[2].trim();
      }
    });
    return envVars;
  }
  return {};
}

const env = { ...process.env, ...loadEnvFile() };

async function sendWelcomeEmail() {
  const clientId = env.ZOHO_CLIENT_ID;
  const clientSecret = env.ZOHO_CLIENT_SECRET;
  const refreshToken = env.ZOHO_REFRESH_TOKEN;
  const fromEmail = env.ZOHO_FROM_EMAIL || env.ZOHO_EMAIL;
  const siteUrl = 'https://thelostandunfounds.com';

  if (!clientId || !clientSecret || !refreshToken || !fromEmail) {
    console.error('❌ Missing Zoho email credentials!');
    console.log('\nRequired environment variables:');
    console.log('  ZOHO_CLIENT_ID');
    console.log('  ZOHO_CLIENT_SECRET');
    console.log('  ZOHO_REFRESH_TOKEN');
    console.log('  ZOHO_FROM_EMAIL');
    console.log('\nAdd these to .env.local file');
    process.exit(1);
  }

  console.log('📧 Sending welcome email to:', email);
  console.log('📤 From:', fromEmail);
  console.log('🌐 Site URL:', siteUrl);
  console.log('');

  try {
    // Step 1: Get access token
    console.log('1️⃣ Getting access token...');
    const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token error: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log('✅ Access token obtained');

    // Step 2: Get account ID
    console.log('2️⃣ Getting account ID...');
    const accountInfoResponse = await fetch('https://mail.zoho.com/api/accounts', {
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
      },
    });

    let accountId = null;
    if (accountInfoResponse.ok) {
      const accounts = await accountInfoResponse.json();
      if (accounts.data && accounts.data.length > 0) {
        accountId = accounts.data[0].accountId || accounts.data[0].account_id;
      }
    }

    if (!accountId) {
      accountId = fromEmail.split('@')[0];
    }
    console.log('✅ Account ID:', accountId);

    // Step 3: Create email HTML
    const emailHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to THE LOST+UNFOUNDS</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #000000; color: #ffffff;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #000000;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #000000; border: 1px solid rgba(255, 255, 255, 0.1);">
          <!-- Logo Section -->
          <tr>
            <td align="center" style="padding: 40px 20px 20px;">
              <img src="${siteUrl}/logo.png" alt="THE LOST+UNFOUNDS" style="max-width: 190px; height: auto; display: block;" />
            </td>
          </tr>
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 20px 40px;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 0.05em; text-transform: uppercase;">
                CAN YOU SEE US?
              </h1>
            </td>
          </tr>
          
          <!-- Welcome Message -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #ffffff;">
                Welcome to THE LOST+UNFOUNDS
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: rgba(255, 255, 255, 0.9);">
                Thank you for subscribing! We're excited to have you join our community.
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: rgba(255, 255, 255, 0.9);">
                You'll be the first to know about:
              </p>
              <ul style="margin: 0 0 30px 0; padding-left: 20px; color: rgba(255, 255, 255, 0.9); font-size: 16px; line-height: 1.8;">
                <li>New tools and features</li>
                <li>Product launches and updates</li>
                <li>Exclusive offers and announcements</li>
                <li>Behind-the-scenes content</li>
              </ul>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${siteUrl}" style="display: inline-block; padding: 14px 32px; background-color: #ffffff; color: #000000; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em;">
                      Visit Our Site
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid rgba(255, 255, 255, 0.1); text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: rgba(255, 255, 255, 0.6);">
                © ${new Date().getFullYear()} THE LOST+UNFOUNDS. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: rgba(255, 255, 255, 0.4);">
                You're receiving this because you subscribed at thelostandunfounds.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Step 4: Send email
    console.log('3️⃣ Sending email...');
    const mailApiUrl = `https://mail.zoho.com/api/accounts/${accountId}/messages`;
    const emailResponse = await fetch(mailApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: fromEmail,
        toAddress: email,
        subject: 'Welcome to THE LOST+UNFOUNDS',
        content: emailHTML,
        mailFormat: 'html',
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Email send failed: ${errorText}`);
    }

    console.log('');
    console.log('✅ Welcome email sent successfully!');
    console.log('📬 Check your inbox at:', email);
    console.log('');
    console.log('The email includes:');
    console.log('  • Your logo');
    console.log('  • "CAN YOU SEE US?" header');
    console.log('  • Brand styling (black background, white text)');
    console.log('  • Welcome message and updates list');

  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error('');
    process.exit(1);
  }
}

sendWelcomeEmail();
