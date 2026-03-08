
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getZohoAuthContext, sendZohoEmail } from '../../lib/api-handlers/_zoho-email-utils';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Verify this is a cron request from Vercel
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const now = new Date();
        const currentSlotIndex = Math.floor(now.getTime() / 8000);

        // 1. Get Current Banner Status across all surfaces (using a representative one like 'gallery')
        const { data: currentBanner, error: bannerError } = await supabase.rpc('get_current_banner', {
            target_surface: 'gallery'
        });

        if (bannerError) throw bannerError;
        if (!currentBanner) return res.status(200).json({ message: 'No active banners' });

        const campaignId = currentBanner.campaign_id;
        const layer = currentBanner.layer;

        // 2. Load Campaign Details
        const { data: campaign } = await supabase
            .from('banner_campaigns')
            .select('*')
            .eq('id', campaignId)
            .single();

        if (!campaign) return res.status(200).json({ message: 'Campaign not found' });

        const auth = await getZohoAuthContext();
        const results = [];

        // 3. Notification Logic

        // CASE A: Banner is Live (in Queue)
        if (layer === 'public_queue') {
            const { data: existingLive } = await supabase
                .from('banner_notification_log')
                .select('id')
                .eq('campaign_id', campaignId)
                .eq('notification_type', 'live')
                .limit(1);

            if (!existingLive || existingLive.length === 0) {
                await sendZohoEmail({
                    auth,
                    to: campaign.owner_email,
                    subject: `Your Banner is now LIVE on THE LOST+UNFOUNDS!`,
                    htmlContent: `
                    <div style="color: #ffffff; background-color: #000000; padding: 40px; font-family: sans-serif;">
                        <h1 style="font-size: 32px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase;">Your Banner is Live</h1>
                        <p style="font-size: 16px; font-weight: 300; line-height: 1.6; color: #cccccc;">
                            Congratulations! Your banner campaign "<strong>${campaign.title}</strong>" is now active in our marketplace queue.
                        </p>
                        <div style="margin: 30px 0; border: 1px solid #333; padding: 20px;">
                            <img src="${campaign.image_url}" style="width: 100%; height: auto; border: 1px solid #222;" />
                        </div>
                        <p style="font-size: 14px; color: #888;">
                            Your content is being rotated across our Gallery, Shop, and Blog surfaces.
                        </p>
                        <a href="https://www.thelostandunfounds.com" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #ffffff; color: #000000; text-decoration: none; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">View Live Site</a>
                    </div>
                `
                });

                await supabase.from('banner_notification_log').insert({
                    campaign_id: campaignId,
                    notification_type: 'live'
                });
                results.push('Sent Live notification');
            }
        }

        // CASE B: Banner is in IDLE Mode (Expired but still showing)
        if (layer === 'public_idle') {
            const { data: existingIdle } = await supabase
                .from('banner_notification_log')
                .select('id')
                .eq('campaign_id', campaignId)
                .eq('notification_type', 'expired_idle')
                .limit(1);

            if (!existingIdle || existingIdle.length === 0) {
                await sendZohoEmail({
                    auth,
                    to: campaign.owner_email,
                    subject: `Campaign Expired (Action Required): Maintain your visibility with 33% OFF`,
                    htmlContent: `
                    <div style="color: #ffffff; background-color: #000000; padding: 40px; font-family: sans-serif;">
                        <h1 style="font-size: 32px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; color: #f59e0b;">Time Slot Expired</h1>
                        <p style="font-size: 16px; font-weight: 300; line-height: 1.6; color: #cccccc;">
                            Your purchased time for "<strong>${campaign.title}</strong>" has expired. 
                        </p>
                        <div style="background-color: #111; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
                            <p style="margin: 0; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; font-size: 14px;">Status: Idle Bonus Time</p>
                            <p style="margin: 10px 0 0 0; font-size: 13px; color: #aaa;">
                                Because there are currently no other campaigns in the queue, your banner is <strong>still visible</strong> to our audience. However, it will be immediately replaced as soon as a new ad is purchased.
                            </p>
                        </div>
                        <h2 style="font-size: 20px; font-weight: 900; text-transform: uppercase; margin-top: 40px;">Secure More Time — 33% OFF</h2>
                        <p style="font-size: 14px; color: #888; margin-bottom: 25px;">
                            Don't lose your spot. Since you're already in the slot, we're offering you a <strong>33% discount</strong> to extend your campaign right now.
                        </p>
                        <a href="https://www.thelostandunfounds.com/advertise?renew=${campaignId}&discount=IDLE33" style="display: inline-block; padding: 15px 30px; background-color: #f59e0b; color: #000000; text-decoration: none; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Claim Discount & Renew</a>
                    </div>
                `
                });

                await supabase.from('banner_notification_log').insert({
                    campaign_id: campaignId,
                    notification_type: 'expired_idle'
                });
                results.push('Sent Idle notification with 33% discount');
            }
        }

        // CASE C: Replaced (Monitor transitions)
        // Find the most recent 'active' campaign from the log that isn't this one
        const { data: lastNotified } = await supabase
            .from('banner_notification_log')
            .select('campaign_id, notification_type')
            .order('sent_at', { ascending: false })
            .limit(2);

        // If the most recent notified campaign is different from current,
        // and we haven't sent a 'replaced' notification for it yet.
        if (lastNotified && lastNotified.length > 0) {
            const lastCampaignId = lastNotified[0].campaign_id;
            if (lastCampaignId !== campaignId) {
                // The previous campaign has been replaced. 
                // Fetch its details to notify the owner.
                const { data: prevCampaign } = await supabase
                    .from('banner_campaigns')
                    .select('*')
                    .eq('id', lastCampaignId)
                    .single();

                if (prevCampaign) {
                    const { data: alreadyReplaced } = await supabase
                        .from('banner_notification_log')
                        .select('id')
                        .eq('campaign_id', lastCampaignId)
                        .eq('notification_type', 'replaced')
                        .limit(1);

                    if (!alreadyReplaced || alreadyReplaced.length === 0) {
                        await sendZohoEmail({
                            auth,
                            to: prevCampaign.owner_email,
                            subject: `Your Banner has been Replaced`,
                            htmlContent: `
                            <div style="color: #ffffff; background-color: #000000; padding: 40px; font-family: sans-serif;">
                                <h1 style="font-size: 32px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; color: #ef4444;">Banner Replaced</h1>
                                <p style="font-size: 16px; font-weight: 300; line-height: 1.6; color: #cccccc;">
                                    Your campaign "<strong>${prevCampaign.title}</strong>" is no longer visible on THE LOST+UNFOUNDS.
                                </p>
                                <p style="font-size: 14px; color: #888; margin: 20px 0;">
                                    A new campaign has taken over the current time slot. If you'd like to return to the marketplace, you can purchase new slots at any time.
                                </p>
                                <a href="https://www.thelostandunfounds.com/advertise" style="display: inline-block; padding: 12px 24px; background-color: #ffffff; color: #000000; text-decoration: none; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Buy New Slots</a>
                            </div>
                        `
                        });

                        await supabase.from('banner_notification_log').insert({
                            campaign_id: lastCampaignId,
                            notification_type: 'replaced'
                        });
                        results.push(`Sent Replaced notification for campaign ${lastCampaignId}`);
                    }
                }
            }
        }

        return res.status(200).json({
            message: 'Processed banner notifications',
            campaign: campaign.title,
            layer,
            notifications: results
        });

    } catch (error: any) {
        console.error('Banner notifications cron error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
