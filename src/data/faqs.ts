/**
 * FAQ copy shown on /docs (FAQ section) and /docs/photographer-guide.
 *
 * Plain data so the React pages and scripts/pre-render-core-pages.ts read the
 * same list: the pre-render emits it as FAQPage structured data and as visible
 * text, and FAQPage markup must match the questions the page actually shows.
 * Edit the copy here, never in the components.
 */

export interface FAQItem {
  question: string;
  answer: string;
}

export const DOCS_FAQ: FAQItem[] = [
  {
    question: 'How do I create an account?',
    answer: 'Click the "LOG IN" button in the top right corner, then select "Sign Up". You can use your email address or sign in with Google.',
  },
  {
    question: 'What are the subscription tiers?',
    answer: 'We offer three tiers: Free (5 downloads/day), Premium ($9.99/month, unlimited downloads), and Pro ($19.99/month, unlimited downloads + API access).',
  },
  {
    question: 'How do I download TikTok videos?',
    answer: 'Navigate to the TikTok Downloader tool, paste the TikTok video URL, and click Download. The video will be processed and available for download.',
  },
  {
    question: 'Are there download limits?',
    answer: 'Free accounts have a limit of 5 downloads per day. Premium and Pro accounts have unlimited downloads.',
  },
  {
    question: 'Can I cancel my subscription?',
    answer: 'Yes, you can cancel your subscription at any time from your Settings page. Your access will continue until the end of your billing period.',
  },
  {
    question: 'Do you store my data?',
    answer: 'We only store the data necessary to provide our services. We do not store downloaded videos on our servers. See our Privacy Policy for more details.',
  },
  {
    question: 'How do I contact support?',
    answer: 'You can contact us through the Support page or email us directly at support@thelostandunfounds.com.',
  },
];

export const PHOTOGRAPHER_FAQ: FAQItem[] = [
    {
        question: 'How do I add new photos?',
        answer: 'Simply add photos to your shared Google Drive folder. Click "Sync" in your dashboard to update your gallery.'
    },
    {
        question: 'What file formats are supported?',
        answer: 'We support JPG, PNG, and HEIC images. RAW files are converted automatically.'
    },
    {
        question: 'How do I remove a photo?',
        answer: 'Delete or move the photo out of your shared folder, then sync your gallery.'
    },
    {
        question: 'When do I get paid?',
        answer: 'Payments are processed through Stripe. You\'ll receive your commission within 24-48 hours of a sale.'
    },
    {
        question: 'Can I have multiple galleries?',
        answer: 'Yes! Contact us to set up additional galleries for different events or clients.'
    }
];
