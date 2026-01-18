import { getZohoAuthContext, sendZohoEmail } from './_zoho-email-utils.js';

export async function sendPhotoDeliveryEmail(email: string, orderId: string, entitlements: any[]) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.thelostandunfounds.com';

  const linksHtml = entitlements.map(e => {
    const downloadUrl = `${baseUrl}/api/photos/download?token=${e.token}`;
    return `
          <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #333; background: #111;">
            <p style="color: #fff; margin: 0 0 10px 0; font-family: monospace; font-size: 12px;">PHOTO ID: ${e.photo_id || e.photoId}</p>
            <a href="${downloadUrl}" style="display: inline-block; padding: 10px 20px; background: #fff; color: #000; text-decoration: none; font-weight: bold; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Download High-Res</a>
          </div>
        `;
  }).join('');

  const htmlContent = `
        <div style="max-width: 600px; margin: 0 auto; color: #fff;">
          <h1 style="text-transform: uppercase; letter-spacing: -2px; font-size: 32px; margin-bottom: 10px;">Your Downloads are Ready</h1>
          <p style="color: #666; font-size: 16px; margin-bottom: 30px;">Thank you for your purchase from THE LOST ARCHIVES. Your high-resolution files are available for download below.</p>
          
          <div style="margin-bottom: 40px;">
            ${linksHtml}
          </div>

          <div style="padding-top: 20px; border-top: 1px solid #333; color: #444; font-size: 12px;">
            <p>Order ID: ${orderId}</p>
            <p>If you have any issues with your downloads, please reply to this email.</p>
          </div>
        </div>
      `;

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

  const htmlContent = `
        <div style="max-width: 600px; margin: 0 auto; color: #fff; background: #000; padding: 40px; border: 1px solid #333;">
            <h1 style="text-transform: uppercase; letter-spacing: -1px; font-size: 24px; border-bottom: 1px solid #333; padding-bottom: 20px;">New Purchase!</h1>
            
            <div style="margin: 30px 0;">
                <p style="color: #666; margin-bottom: 5px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Customer</p>
                <p style="font-size: 18px; margin: 0;">${customerEmail}</p>
            </div>

            <div style="margin: 30px 0;">
                <p style="color: #666; margin-bottom: 5px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Order ID</p>
                <p style="font-size: 18px; margin: 0;">${orderId}</p>
            </div>

            <div style="margin: 30px 0;">
                <p style="color: #666; margin-bottom: 15px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Items Purchased</p>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    ${itemsHtml}
                </ul>
            </div>

            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #333; text-align: center;">
                <a href="https://www.thelostandunfounds.com/admin" style="color: #666; font-size: 10px; text-transform: uppercase; text-decoration: none; letter-spacing: 2px;">View Admin Dashboard</a>
            </div>
        </div>
    `;

  const auth = await getZohoAuthContext();
  return await sendZohoEmail({
    auth,
    to: adminEmail,
    subject: `New Sale: ${customerEmail} - THE LOST+UNFOUNDS`,
    htmlContent
  });
}
