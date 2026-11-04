import { readFileSync } from 'fs';
const envContent = readFileSync('/Users/thelostunfounds/thelostandunfounds/.env.local', 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^#=\s]+)\s*=\s*"?([^"]*)"?\s*$/);
  if (m) env[m[1]] = m[2];
}
process.env.SUPABASE_URL = env.VITE_SUPABASE_URL;
process.env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

const { listLibrarySubfolders, syncGalleryPhotos } = await import('./lib/api-handlers/_photo-sync-utils.js');
console.log('Listing subfolders for sarauxoxo...');
try {
  const info = await listLibrarySubfolders('sarauxoxo');
  console.log('Subfolders:', info.subfolders.length, '| Root photos:', info.rootPhotoCount);
  console.log(JSON.stringify(info, null, 2));
} catch(e) {
  console.error('listLibrarySubfolders failed:', e.message);
}
