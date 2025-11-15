#!/usr/bin/env node

/**
 * Send welcome email to existing subscriber
 * Usage: node scripts/send-welcome-to-existing-subscriber.js thelostandunfounds@gmail.com
 */

const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/send-welcome-to-existing-subscriber.js <email>');
  process.exit(1);
}

async function sendWelcomeEmail() {
  try {
    // Determine the API URL
    const apiUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}/api/send-welcome-email`
      : 'http://localhost:3000/api/send-welcome-email';

    console.log(`Sending welcome email to: ${email}`);
    console.log(`Using API: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Welcome email sent successfully!');
      console.log('Check your inbox at:', email);
    } else {
      console.error('❌ Failed to send email:', data);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

sendWelcomeEmail();
