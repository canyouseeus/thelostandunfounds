import fs from 'fs';
import path from 'path';

// Any mounted volume with a DCIM folder is a camera card, whatever it's named
// (CLAPTROP, CLAPTROP3, Untitled…). Never key discovery off the volume name.

/**
 * Scan a volumes root for mounted camera cards — volumes that contain a DCIM directory.
 * Returns [{ volume, name, dcim }] sorted by name.
 */
export function discoverClaptropCards(volumesRoot = '/Volumes') {
    let entries = [];
    try {
        entries = fs.readdirSync(volumesRoot, { withFileTypes: true });
    } catch {
        return [];
    }

    const found = [];
    for (const entry of entries) {
        if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
        const volume = path.join(volumesRoot, entry.name);
        // /Volumes/Macintosh HD is a link to the boot disk, not a card.
        try {
            if (fs.realpathSync(volume) === '/') continue;
        } catch {
            continue;
        }
        const dcim = path.join(volume, 'DCIM');
        try {
            if (!fs.statSync(dcim).isDirectory()) continue;
        } catch {
            continue;
        }
        found.push({ volume, name: entry.name, dcim });
    }

    return found.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Resolve the DCIM path to import from.
 * Returns { dcim, name, reason } — dcim is null when nothing usable was found.
 * `reason` is 'override' | 'single' | 'ambiguous' | 'none'.
 */
export function resolveClaptropDcim(override, volumesRoot = '/Volumes') {
    if (override) {
        // Accept either the volume root or the DCIM directory itself.
        const base = path.basename(override).toUpperCase() === 'DCIM'
            ? override
            : path.join(override, 'DCIM');
        const dcim = fs.existsSync(base) ? base : (fs.existsSync(override) ? override : null);
        return { dcim, name: override, reason: 'override', matches: [] };
    }

    const matches = discoverClaptropCards(volumesRoot);
    if (matches.length === 1) {
        return { dcim: matches[0].dcim, name: matches[0].name, reason: 'single', matches };
    }
    if (matches.length > 1) {
        return { dcim: null, name: null, reason: 'ambiguous', matches };
    }
    return { dcim: null, name: null, reason: 'none', matches };
}
