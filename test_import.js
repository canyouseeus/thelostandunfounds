import fs from 'fs';
import path from 'path';
import { resolveClaptropDcim } from './scripts/find-claptrop-card.mjs';

function getFilesRecursive(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;

    const list = fs.readdirSync(dir);
    for (const file of list) {
        if (file.startsWith('.')) continue;
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFilesRecursive(filePath));
        } else {
            results.push(filePath);
        }
    }
    return results;
}

// Same discovery as scripts/upload-to-drive.ts: any CLAPTROP* volume with a DCIM
// folder. Override with: node test_import.js --sd "/Volumes/CLAPTROP IV"
const SD_OVERRIDE = (() => {
    const i = process.argv.indexOf('--sd');
    return i !== -1 ? process.argv[i + 1] : undefined;
})();
const card = resolveClaptropDcim(SD_OVERRIDE);

console.log('=== SD CARD IMPORT TEST ===');

if (card.reason === 'ambiguous') {
    console.error('Multiple CLAPTROP volumes mounted:');
    for (const m of card.matches) console.error(`   • ${m.volume}`);
    console.error('Re-run with --sd "<path>".');
    process.exit(1);
}

const SD_CARD_PATH = card.dcim;

if (SD_CARD_PATH && fs.existsSync(SD_CARD_PATH)) {
    console.log(`SD card detected (${card.name}): ${SD_CARD_PATH} — scanning files...`);
    const allFiles = getFilesRecursive(SD_CARD_PATH);
    console.log(`Found ${allFiles.length} files. Grouping...`);

    const FOLDER_CONFIG = {
        JPG: { local: path.join(process.env.HOME || '', 'Desktop', 'PHOTO UPLOADS', 'jpg') },
        RAW: { local: path.join(process.env.HOME || '', 'Desktop', 'PHOTO UPLOADS', 'raf') },
        MOV: { local: path.join(process.env.HOME || '', 'Desktop', 'PHOTO UPLOADS', 'mov') }
    };

    const processingOrder = [
        { type: 'JPG', ext: ['.jpg', '.jpeg'] },
        { type: 'RAW', ext: ['.raf'] },
        { type: 'MOV', ext: ['.mov', '.mp4'] }
    ];

    for (const group of processingOrder) {
        const targetConfig = FOLDER_CONFIG[group.type];
        if (!fs.existsSync(targetConfig.local)) {
            fs.mkdirSync(targetConfig.local, { recursive: true });
        }
        
        const filesToCopy = allFiles.filter(f => group.ext.includes(path.extname(f).toLowerCase()));
        console.log(`\nImporting ${filesToCopy.length} ${group.type} files...`);

        let count = 0;
        for (const srcPath of filesToCopy) {
            const fileName = path.basename(srcPath);
            const destPath = path.join(targetConfig.local, fileName);
            if (fs.existsSync(destPath)) {
                // skip
                continue;
            }
            try {
                fs.copyFileSync(srcPath, destPath);
                count++;
                if (count % 10 === 0) console.log(`Copied ${count} ${group.type} files...`);
            } catch (err) {
                console.error(`Error copying ${fileName}:`, err.message);
            }
        }
    }
    console.log('\n✅ Import complete.');
} else {
    console.log('No CLAPTROP volume found under /Volumes (looked for CLAPTROP / CLAPTROP II / …');
    console.log('containing a DCIM folder). Pass --sd "/Volumes/<your card>" to point at it.');
}
