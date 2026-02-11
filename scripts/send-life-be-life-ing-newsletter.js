import https from 'https';

// Configuration
const API_URL = 'https://www.thelostandunfounds.com/api/newsletter/send';
const TEST_EMAIL = 'thelostandunfounds@gmail.com'; // Default test email

// Content
const subject = "Life be life-ing";

const rawText = `What up, fam? Thanks to all the new subscribers for taking the time to sign up for the newsletter and thanks again to those who have been here from the jump. A lot has happened over the past couple of months since the last newsletter went out so this is just a recap of where we are at and where we are trying to go as we continue on.

As a lot of my friends know, I have been living in my car for the past two years as I have been committed to building up this brand from the ground up. It has given me a lot of perspective on life and friendships. I see how people interact with me while having this knowledge; some respect me for it, and some don’t understand it at all. We all choose our suck, and I think for me, I’d rather limit the amount of money I spend on a place of my own than work at a job I hate every day; draining my mental health as the clocks tick on.

I think as time goes on, I truly have been able to see the importance of maintaining this solitude, devoid of roommates/landlords, and paying out 75% of my check to rent and utilities, but as this project has gotten bigger, the strain on my tools and my car is nearing a breaking point.

This past weekend, my car battery died, and I was unable to jump it. I had to leave it unlocked as I had to get out and work. I had to leave it up to the universe to protect my interests, and the universe did just that, but there were some complications along the way.

My buddy, Micah Brown, a local Austin comedian and native Texan, and I were finishing up walking from the Westside when we were approaching my vehicle. From about 50 yards out, I could see that my car doors were wide open. As I started to run towards my car, I could see some of my belongings in the street. When I arrived at my car, I found that not only had my car been ransacked, but that the two men responsible for it were still in my car.

I think what happened next, some would view as a little reckless, and in retrospect I’m sure there’s another reality I lived in that would choose a different path, but Micah and I fought the intruders, exacting justice on behalf of anyone that has had their car broken into during the past few months with a vengeance The Dark Knight would have been proud of. As they scurried away, a vehicle approached and I asked them for a jump and we were able to get my car started and move it to another location.

Now, as a lot of you know, I have my camera with me at all times and this time was no different. Unfortunately, it was like one of those movies where the enemy was defeated but, as you and your band of victors valiantly celebrate, you realize one of your most trusted members has been mortally wounded in battle. Sadly, my camera’s lens was a casualty of this battle. It lasted for the rest of the night with some manual intervention but, the next morning, it stopped working completely.

Taking photos this past year has been my livelihood and has kept me in the fight and I have loved every moment of it. I think a few years ago a setback like this would have broken my spirit, but at this stage in life I feel like it’s just the beginning of something bigger and better. I’ve lost whole people. Friends and family alike. Some temporarily and some forever. So, losing a camera lens, while financially disruptive, isn’t a huge loss. It sucks, but I can overcome it.

I think there’s a reconciliation to getting all these thoughts out of my system as I have noticed a bittersweetness to the situation. Yes, we caught those guys before they could take anything but, the fallout afterwards, the reality of my situation and the slow economic bleeding that is taking place as I try to build systems to prevent these circumstances from occurring at all to me or anyone else and banging at the door. The thing is when it gets hardest we all have the inclination to give it all up and I keep pressing forward and there’s always a new hard. A new challenge.

The only way to go is up.`;

// Format HTML
// Split by double newlines to create paragraphs
const paragraphs = rawText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
const contentHtml = paragraphs.map(p => {
    // Basic text cleanup if needed
    const cleanText = p.trim();
    return `<p style="margin-bottom: 16px; line-height: 1.6;">${cleanText}</p>`;
}).join('\n');

// Parse command line args
const args = process.argv.slice(2);
const isProduction = args.includes('--production');
const customTestEmailArg = args.find(a => a.startsWith('--test='));
const customTestEmail = customTestEmailArg ? customTestEmailArg.split('=')[1] : null;

const targetEmail = isProduction ? null : (customTestEmail || TEST_EMAIL);

// Safety: Explicitly exclude subscribers who already received the previous unbranded email
const excludeRecipients = [
    'chrisrayrodjr@gmail.com',
    'micahjbrown@gmail.com',
    'jayron124@gmail.com',
    'jackshea44@yahoo.com',
    'growchildgrow@gmail.com'
];

console.log('Configuration:');
console.log('- Subject:', subject);
console.log('- Endpoint:', API_URL);
console.log('- Mode:', isProduction ? 'PRODUCTION (All Subscribers)' : `TEST (Sending to ${targetEmail})`);
console.log('- Paragraphs:', paragraphs.length);

if (isProduction) {
    console.log('\n⚠️  WARNING: You are about to send this newsletter to ALL subscribers.');
    console.log(`NOTE: The following ${excludeRecipients.length} recipients will be SKIPPED (already sent):`);
    console.log(excludeRecipients.join(', '));
    console.log('To confirm, please run with explicit confirmation (not implemented in this script to be safe).');
    console.log('Sending to production is enabled via flag.');
}

const postData = JSON.stringify({
    subject,
    content: rawText,
    contentHtml,
    testEmail: targetEmail, // If null, backend sends to complete list
    excludeRecipients // Pass the exclusion list to the backend
});

const url = new URL(API_URL);
const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = https.request(options, (res) => {
    console.log(`\nStatus Code: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Response:', JSON.stringify(json, null, 2));
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log('\n✅ Newsletter sent successfully!');
            } else {
                console.error('\n❌ Failed to send newsletter.');
            }
        } catch (e) {
            console.log('Raw Response:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();
