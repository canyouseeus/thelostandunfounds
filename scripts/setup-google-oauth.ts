import { google } from 'googleapis';
import http from 'http';
import { URL } from 'url';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.resolve(__dirname, '../.env.local');

// Load existing env
dotenv.config({ path: ENV_PATH });

const CLIENT_ID = '817758642642-j65tb1kscmmaiaocg5jg1qc4qbu4rsbt.apps.googleusercontent.com';
const REDIRECT_URI = 'http://localhost:9999/oauth2callback';
// --gsc: a separate read-only Search Console token for Admin → SEO, saved as
// GSC_REFRESH_TOKEN so the Drive token the photo sync uses is not replaced.
const GSC = process.argv.includes('--gsc');
const SCOPES = GSC
    ? ['https://www.googleapis.com/auth/webmasters.readonly']
    : ['https://www.googleapis.com/auth/drive'];
const TOKEN_KEY = GSC ? 'GSC_REFRESH_TOKEN' : 'GOOGLE_REFRESH_TOKEN';

async function prompt(question: string, hidden = false): Promise<string> {
    return new Promise((resolve) => {
        process.stdout.write(question);
        if (hidden && process.stdin.isTTY) {
            // Hide input
            const chunks: Buffer[] = [];
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.setEncoding('utf8');

            const onData = (chunk: Buffer | string) => {
                const char = chunk.toString();
                if (char === '\n' || char === '\r') {
                    process.stdin.setRawMode(false);
                    process.stdin.pause();
                    process.stdin.removeListener('data', onData);
                    process.stdout.write('\n');
                    resolve(chunks.join('').trim());
                } else if (char === '\u0003') {
                    process.exit();
                } else {
                    chunks.push(Buffer.from(char));
                }
            };
            process.stdin.on('data', onData);
        } else {
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            rl.question('', (answer) => {
                rl.close();
                resolve(answer.trim());
            });
        }
    });
}

async function main() {
    console.log(GSC ? '\n🔐 Google OAuth2 Setup for Search Console (read-only)\n' : '\n🔐 Google OAuth2 Setup for Photo Sync\n');

    // Get Client Secret
    let clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientSecret) {
        console.log('Paste your Google Client Secret (input will be hidden):');
        clientSecret = await prompt('Client Secret: ', true);
    } else {
        console.log('✓ Client Secret found in .env.local');
    }

    if (!clientSecret) {
        console.error('❌ Client Secret is required.');
        process.exit(1);
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, clientSecret, REDIRECT_URI);
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent',
    });

    console.log('\n📋 Opening browser for authorization...');
    exec(`open "${authUrl}"`);

    // Start local server to receive callback
    return new Promise<void>((resolve) => {
        const server = http.createServer(async (req, res) => {
            const url = new URL(req.url || '', `http://localhost:9999`);
            const code = url.searchParams.get('code');

            if (code) {
                try {
                    const { tokens } = await oauth2Client.getToken(code);
                    const refreshToken = tokens.refresh_token;

                    if (refreshToken) {
                        // Save to .env.local
                        let envContent = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';

                        // Add or update values
                        const updates: Record<string, string> = {
                            GOOGLE_CLIENT_ID: CLIENT_ID,
                            GOOGLE_CLIENT_SECRET: clientSecret!,
                            [TOKEN_KEY]: refreshToken,
                        };

                        for (const [key, value] of Object.entries(updates)) {
                            const regex = new RegExp(`^${key}=.*$`, 'm');
                            if (regex.test(envContent)) {
                                envContent = envContent.replace(regex, `${key}=${value}`);
                            } else {
                                envContent += `\n${key}=${value}`;
                            }
                        }

                        fs.writeFileSync(ENV_PATH, envContent.trim() + '\n');

                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end('<h1>✅ Success!</h1><p>You can close this window. Return to your terminal.</p>');

                        console.log('\n✅ OAuth2 credentials saved to .env.local!');
                        console.log(`   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ${TOKEN_KEY}\n`);
                        console.log(GSC
                            ? 'Add GSC_REFRESH_TOKEN to Vercel (Production) and redeploy; Admin → SEO then shows Search Console data.'
                            : 'You can now run ./organize_photos.sh to sync your photos.');
                    } else {
                        res.writeHead(400);
                        res.end('No refresh token received. Try again with prompt=consent.');
                        console.error('❌ No refresh token received.');
                    }
                } catch (err: any) {
                    res.writeHead(500);
                    res.end('Error exchanging code: ' + err.message);
                    console.error('❌ Error:', err.message);
                }
            } else {
                res.writeHead(400);
                res.end('No code received');
            }

            server.close();
            resolve();
        });

        server.listen(9999, () => {
            console.log('Waiting for authorization callback on http://localhost:9999...');
        });
    });
}

main().catch(console.error);
