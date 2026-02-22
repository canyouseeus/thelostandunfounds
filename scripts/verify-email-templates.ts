
import { wrapEmailContent } from '../lib/email-template';
import { ensureBannerHtml as ensureBannerUtils } from '../lib/api-handlers/_zoho-email-utils';

async function verify() {
    console.log('--- Testing wrapEmailContent ---');
    const content = '<h1>Hello World</h1><p>Test content.</p>';
    const wrapped = wrapEmailContent(content);

    if (wrapped.includes('align="left"') && wrapped.includes('margin: 0 !important;') && wrapped.includes('https://www.thelostandunfounds.com')) {
        console.log('✅ wrapEmailContent looks good (left-aligned and linked).');
    } else {
        console.log('❌ wrapEmailContent issues found:');
        if (!wrapped.includes('align="left"')) console.log('  - Missing align="left"');
        if (wrapped.includes('margin: 0 auto')) console.log('  - Still has margin: 0 auto');
        if (!wrapped.includes('https://www.thelostandunfounds.com')) console.log('  - Missing link');
    }

    console.log('\n--- Testing ensureBannerHtml (Utils) ---');
    const withBanner = ensureBannerUtils(content);
    if (withBanner.includes('text-align: left') && withBanner.includes('https://www.thelostandunfounds.com') && withBanner.includes('text-anchor=\'start\'')) {
        console.log('✅ ensureBannerHtml utils looks good.');
    } else {
        console.log('❌ ensureBannerHtml utils issues found:');
        if (!withBanner.includes('text-align: left')) console.log('  - Missing text-align: left');
        if (!withBanner.includes('https://www.thelostandunfounds.com')) console.log('  - Missing link');
        if (!withBanner.includes('text-anchor=\'start\'')) console.log('  - Missing text-anchor=\'start\' in SVG');
    }
}

verify().catch(console.error);
