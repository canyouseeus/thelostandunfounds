
import fetch from 'node-fetch';

async function testCapture() {
    const orderId = '86e37cee-7ff1-4328-8918-2c202ff61c82';
    console.log('Testing capture for Order:', orderId);

    try {
        const res = await fetch('http://localhost:3000/api/gallery/capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId })
        });

        console.log('Status:', res.status);
        const data = await res.json();
        console.log('Response:', JSON.stringify(data, null, 2));

        if (data.entitlements) {
            console.log('Entitlements count:', data.entitlements.length);
        }
    } catch (err) {
        console.error('Fetch failed:', err);
    }
}

testCapture();
