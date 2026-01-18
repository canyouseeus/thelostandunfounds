import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envLocal = path.resolve(__dirname, '.env.local');
const envMain = path.resolve(__dirname, '.env');

if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal });
if (fs.existsSync(envMain)) dotenv.config({ path: envMain });

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
const environment = process.env.PAYPAL_ENVIRONMENT || 'SANDBOX';
const isSandbox = environment.toUpperCase() === 'SANDBOX';

console.log('--- PayPal Token Generator ---');
console.log(`Environment: ${environment}`);
console.log(`Client ID:   ${clientId ? clientId.substring(0, 10) + '...' : 'MISSING'}`);
console.log(`Secret:      ${clientSecret ? clientSecret.substring(0, 5) + '...' : 'MISSING'}`);
console.log('------------------------------');

if (!clientId || !clientSecret) {
    console.error('❌ Error: Missing credentials in .env file.');
    process.exit(1);
}

const hostname = isSandbox ? 'api.sandbox.paypal.com' : 'api.paypal.com';
const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

const options = {
    hostname: hostname,
    port: 443,
    path: '/v1/oauth2/token',
    method: 'POST',
    headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log('\n✅ SUCCESS! Access Token Generated:');
                console.log('\n' + json.access_token + '\n');
                console.log('Scope:', json.scope);
                console.log('Expires In:', json.expires_in, 'seconds');
            } else {
                console.error(`\n❌ API Error (${res.statusCode}):`);
                console.error(JSON.stringify(json, null, 2));
                if (json.error === 'invalid_client') {
                    console.error('\n⚠️  Hint: Double check your Client ID and Secret. Are they for the correct environment (Live vs Sandbox)?');
                }
            }
        } catch (e) {
            console.error('\n❌ Error parsing response:', e.message);
            console.log('Raw Response:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`\n❌ Network Error: ${e.message}`);
});

req.write('grant_type=client_credentials');
req.end();
