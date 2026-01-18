import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

const jsonPath = process.argv[2];

if (!jsonPath) {
    console.error('Usage: npx tsx scripts/update-google-creds-from-file.ts <path-to-json-key-file>');
    process.exit(1);
}

const envLocalPath = path.resolve(process.cwd(), '.env.local');

async function main() {
    try {
        console.log(`Reading credentials from: ${jsonPath}`);
        const keyFileContent = fs.readFileSync(jsonPath, 'utf-8');
        const keyData = JSON.parse(keyFileContent);

        const email = keyData.client_email;
        const privateKey = keyData.private_key;

        if (!email || !privateKey) {
            throw new Error('Invalid key file: missing client_email or private_key');
        }

        console.log(`Email: ${email}`);
        console.log('Updating .env.local...');

        let envContent = fs.existsSync(envLocalPath) ? fs.readFileSync(envLocalPath, 'utf-8') : '';

        // Remove existing keys
        envContent = envContent.split('\n').filter(line =>
            !line.startsWith('GOOGLE_SERVICE_ACCOUNT_EMAIL=') &&
            !line.startsWith('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=')
        ).join('\n');

        // Add new keys (ensure newline at end of file before appending if needed, though split/join handles standard lines)
        if (envContent && !envContent.endsWith('\n')) envContent += '\n';

        // We must escape quotes for .env file if we wrap in quotes, but private key has newlines (literals).
        // Standard .env parsers handle newlines if wrapped in quotes.
        // The private_key from JSON usually has \n literals.
        envContent += `GOOGLE_SERVICE_ACCOUNT_EMAIL="${email}"\n`;
        envContent += `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="${privateKey}"\n`;

        fs.writeFileSync(envLocalPath, envContent);
        console.log('✅ Updated .env.local');

        // Update Vercel
        console.log('Updating Vercel Production...');

        try {
            console.log('Removing old keys from Vercel...');
            execSync(`npx vercel env rm GOOGLE_SERVICE_ACCOUNT_EMAIL production -y`, { stdio: 'ignore' });
            execSync(`npx vercel env rm GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY production -y`, { stdio: 'ignore' });
        } catch (e) {
            // Ignore errors if keys don't exist
        }

        console.log('Adding new email to Vercel...');
        execSync(`echo -n "${email}" | npx vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL production`, { stdio: 'inherit' });

        console.log('Adding new private key to Vercel...');
        // We pass the string exactly as is (with \n literals) 
        execSync(`echo -n '${privateKey}' | npx vercel env add GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY production`, { stdio: 'inherit' });

        console.log('✅ Vercel updated successfully.');

    } catch (err: any) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

main();
