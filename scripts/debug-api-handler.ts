
// Script to test the Shop API handler locally to catch import/runtime errors
import handler from '../api/shop/[...path]';

console.log('🚀 Loading Shop API Handler...');

async function runTest() {
    try {
        console.log('✅ Handler loaded successfully.');

        // Mock Vercel Request/Response
        const req = {
            method: 'GET',
            url: '/api/shop/ping',
            query: { path: 'ping' },
            headers: {},
        };

        const res = {
            status: (code: any) => {
                console.log(`Response Status: ${code}`);
                return {
                    json: (data: any) => console.log('Response JSON:', data),
                    end: () => console.log('Response Ended'),
                };
            },
            setHeader: (key: any, value: any) => console.log(`Set Header: ${key}=${value}`),
            headersSent: false,
        };

        console.log('👉 Invoking handler with /ping...');
        await handler(req as any, res as any);

        console.log('✅ /ping test complete.');

        // Test products route (which was crashing)
        console.log('\n👉 Invoking handler with /products...');
        const reqProducts = {
            method: 'GET',
            url: '/api/shop/products',
            query: { path: 'products' },
            headers: {},
        };

        await handler(reqProducts as any, res as any);
        console.log('✅ /products test complete.');

    } catch (error) {
        console.error('❌ CRASH DETECTED:', error);
        process.exit(1);
    }
}

runTest();
