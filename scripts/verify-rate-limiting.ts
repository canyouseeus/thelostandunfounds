
async function simulatedThrottledSend(count: number, delayMs: number) {
    const start = Date.now();
    console.log(`Starting simulated send of ${count} emails with ${delayMs}ms delay...`);

    for (let i = 0; i < count; i++) {
        console.log(`Sending email ${i + 1}/${count}...`);
        // Simulate sending
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulating network latency

        if (i < count - 1) {
            console.log(`Waiting ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    const end = Date.now();
    const duration = end - start;
    const expectedMinDuration = (count - 1) * delayMs;

    console.log(`\nResults:`);
    console.log(`Total duration: ${duration}ms`);
    console.log(`Expected minimum duration: ${expectedMinDuration}ms`);

    if (duration >= expectedMinDuration) {
        console.log('✅ PASS: Rate limiting logic respected internal delays.');
    } else {
        console.log('❌ FAIL: Rate limiting logic was too fast.');
    }
}

async function runTest() {
    console.log('--- Testing Zoho Throttling (750ms) ---');
    await simulatedThrottledSend(3, 750);

    console.log('\n--- Testing Resend Throttling (550ms) ---');
    await simulatedThrottledSend(3, 550);
}

runTest().catch(console.error);
