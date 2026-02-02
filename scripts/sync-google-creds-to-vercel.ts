
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envLocalPath });

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

if (!email || !key) {
    console.error('❌ Missing Google Creds in .env.local');
    process.exit(1);
}

// Function to run vercel env add via spawn to handle special chars safely
function addEnv(keyName: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log(`Setting ${keyName}...`);

        // Remove existing first
        const remove = spawn('npx', ['vercel', 'env', 'rm', keyName, 'production', '-y'], { stdio: 'ignore' });
        remove.on('close', () => {
            // Add new
            const add = spawn('npx', ['vercel', 'env', 'add', keyName, 'production'], { stdio: ['pipe', 'inherit', 'inherit'] });

            add.stdin.write(value);
            add.stdin.end();

            add.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ ${keyName} set.`);
                    resolve();
                } else {
                    reject(new Error(`Failed to set ${keyName}, exit code ${code}`));
                }
            });
        });
    });
}

async function main() {
    console.log('🔄 Syncing Google Credentials to Vercel Production...');
    console.log(`Email: ${email}`);
    console.log(`Key Length: ${key?.length}`);

    try {
        await addEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', email!);
        await addEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', key!);
        console.log('\n🎉 Successfully synced credentials.');
        console.log('⚠️  You MUST redeploy for these changes to take effect.');
    } catch (e: any) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
}

main();
