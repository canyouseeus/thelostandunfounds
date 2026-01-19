
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');

// Secure password prompt without echo
function askSecret(query: string): Promise<string> {
    return new Promise((resolve) => {
        process.stdout.write(query);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        let secret = '';

        const handler = (c: Buffer) => {
            const char = c.toString();

            switch (char) {
                case '\n':
                case '\r':
                case '\u0004': // Ctrl+D
                    process.stdin.removeListener('data', handler);
                    process.stdin.setRawMode(false);
                    process.stdin.pause();
                    process.stdout.write('\n'); // Move to next line
                    resolve(secret.trim());
                    break;
                case '\u0003': // Ctrl+C
                    process.exit();
                    break;
                case '\u007f': // Backspace
                    if (secret.length > 0) {
                        secret = secret.slice(0, -1);
                    }
                    break;
                default:
                    secret += char;
                    break;
            }
        };

        process.stdin.on('data', handler);
    });
}

async function main() {
    console.log('\n🔒 Google Client Secret Update Helper (Secure Mode)\n');

    try {
        const newSecret = await askSecret('Paste your NEW Google Client Secret: ');

        if (!newSecret) {
            console.error('❌ Secret cannot be empty.');
            process.exit(1);
        }

        let content = '';
        if (fs.existsSync(envPath)) {
            content = fs.readFileSync(envPath, 'utf-8');
        } else {
            console.log('Creating new .env.local file...');
        }

        // Check if key exists
        if (content.match(/^GOOGLE_CLIENT_SECRET=/m)) {
            content = content.replace(/^GOOGLE_CLIENT_SECRET=.*/m, `GOOGLE_CLIENT_SECRET=${newSecret}`);
        } else {
            const prefix = content.endsWith('\n') || content === '' ? '' : '\n';
            content += `${prefix}GOOGLE_CLIENT_SECRET=${newSecret}\n`;
        }

        fs.writeFileSync(envPath, content);

        console.log('✅ Successfully updated .env.local');
        console.log(`Updated GOOGLE_CLIENT_SECRET to: ${newSecret.substring(0, 5)}...`);

        console.log('\n⚠️  CRITICAL NEXT STEP:');
        console.log('   You MUST now copy this exact secret to your Supabase Dashboard:');
        console.log('   Authentication -> Providers -> Google -> Client Secret');

    } catch (error) {
        console.error('Failed to update file:', error);
    }
}

main();
