import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envLocal = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal });

const token = process.env.PAYPAL_ACCESS_TOKEN;
const environment = process.env.PAYPAL_ENVIRONMENT || 'PRODUCTION';
const isSandbox = environment.toUpperCase() === 'SANDBOX';
const hostname = isSandbox ? 'api-m.sandbox.paypal.com' : 'api-m.paypal.com';

console.log('--- PayPal Direct Verification ---');
console.log(`Environment: ${environment}`);
console.log(`Token:       ${token ? token.substring(0, 10) + '...' : 'MISSING'}`);
console.log(`Target:      https://${hostname}/v1/catalogs/products?page_size=1`);

if (!token) {
    console.error('❌ Error: PAYPAL_ACCESS_TOKEN is missing from .env.local');
    process.exit(1);
}

const options = {
    hostname: hostname,
    port: 443,
    path: '/v1/catalogs/products?page_size=1',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('\n✅ SUCCESS! Credentials are valid.');
            console.log('PayPal API responded successfully.');
        } else {
            console.error(`\n❌ API Error (${res.statusCode}):`);
            console.error(data);
        }
    });
});

req.on('error', (e) => {
    console.error(`\n❌ Network Error: ${e.message}`);
});

req.end();
