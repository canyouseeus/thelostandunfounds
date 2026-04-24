import { getZohoAuthContext, sendZohoEmail } from './_zoho-email-utils.js';
import { generateTransactionalEmail } from '../email-template.js';

export async function sendPhotoDeliveryEmail(email: string, orderId: string, entitlements: any[]) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.thelostandunfounds.com';

  const linksHtml = entitlements.map(e => {
    const downloadUrl = `${baseUrl}/api/photos/download?token=${e.token}`;
    return `
          <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #333; background: #111;">
            <p style="color: #fff; margin: 0 0 10px 0; font-family: monospace; font-size: 12px;">PHOTO ID: ${e.photo_id || e.photoId}</p>
            <a href="${downloadUrl}" style="display: inline-block; padding: 10px 20px; background: #000; color: #fff; border: 2px solid #fff; text-decoration: none; font-weight: bold; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Download High-Res</a>
          </div>
        `;
  }).join('');

  const body = `
        <h1 style="color:#fff;text-transform:uppercase;letter-spacing:-1px;font-size:28px;font-weight:bold;margin:0 0 10px;">Your Downloads are Ready</h1>
        <p style="color:#999;font-size:16px;margin:0 0 30px;">Thank you for your purchase from THE LOST ARCHIVES. Your high-resolution files are available below.</p>
        <div style="margin-bottom:40px;">${linksHtml}</div>
        <p style="color:#666;font-size:12px;margin:20px 0 0;">Order ID: ${orderId}</p>
        <p style="color:#666;font-size:12px;margin:4px 0 0;">If you have any issues with your downloads, please reply to this email.</p>
      `;

  const htmlContent = generateTransactionalEmail(body);

  const auth = await getZohoAuthContext();
  return await sendZohoEmail({
    auth,
    to: email,
    subject: 'Your Photo Marketplace Downloads - THE LOST+UNFOUNDS',
    htmlContent
  });
}

export async function sendAdminPurchaseNotification(customerEmail: string, orderId: string, items: any[]) {
  const adminEmail = 'thelostandunfounds@gmail.com'; // Admin notification address

  const itemsHtml = items.map(item => `
        <li style="margin-bottom: 10px; color: #fff; font-family: monospace;">
            <strong>${item.title || 'Untitled'}</strong> (ID: ${item.id})
        </li>
    `).join('');

  const body = `
        <h1 style="color:#fff;text-transform:uppercase;letter-spacing:-1px;font-size:24px;font-weight:bold;border-bottom:1px solid #333;padding-bottom:20px;margin:0 0 24px;">NEW PURCHASE</h1>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr><td style="color:#999;font-size:11px;letter-spacing:.15em;text-transform:uppercase;font-weight:bold;padding:8px 16px 4px 0;vertical-align:top;white-space:nowrap;">Customer</td><td style="color:#fff;font-size:16px;padding:8px 0;">${customerEmail}</td></tr>
          <tr><td style="color:#999;font-size:11px;letter-spacing:.15em;text-transform:uppercase;font-weight:bold;padding:8px 16px 4px 0;vertical-align:top;white-space:nowrap;">Order ID</td><td style="color:#fff;font-size:14px;font-family:monospace;padding:8px 0;">${orderId}</td></tr>
          <tr><td style="color:#999;font-size:11px;letter-spacing:.15em;text-transform:uppercase;font-weight:bold;padding:8px 16px 4px 0;vertical-align:top;white-space:nowrap;">Items</td><td style="color:#fff;font-size:14px;padding:8px 0;"><ul style="list-style:none;padding:0;margin:0;">${itemsHtml}</ul></td></tr>
        </table>
        <p style="margin:24px 0 0;"><a href="https://www.thelostandunfounds.com/admin" style="color:#999;font-size:11px;text-transform:uppercase;text-decoration:none;letter-spacing:2px;">View Admin Dashboard →</a></p>
    `;
  const htmlContent = generateTransactionalEmail(body);

  const auth = await getZohoAuthContext();
  return await sendZohoEmail({
    auth,
    to: adminEmail,
    subject: `New Sale: ${customerEmail} - THE LOST+UNFOUNDS`,
    htmlContent
  });
}
