/**
 * Bulk gallery download — one request, one .zip.
 *
 * The download is a plain HTML form POST to /api/gallery/zip, NOT a fetch()
 * turned into a blob and NOT a window.open per photo:
 *
 *  - window.open per photo is what this replaces. iOS Safari treats each
 *    attachment as its own "Do you want to download…?" prompt and blocks the
 *    programmatic ones after the first.
 *  - fetch() + blob holds the whole archive in page memory, which a phone
 *    tab will not survive for a full shoot.
 *
 * A form post navigates to a response the server marks `attachment`, so the
 * browser streams it straight to disk, saves it as a single file, and the page
 * stays exactly where it was. POST (not GET) so a hundred file ids never hit a
 * URL length limit.
 */

/** Must match ZIP_MAX_FILES in api/gallery/[...path].ts. */
export const ZIP_MAX_FILES = 100;

export interface ZipFile {
    /** Google Drive file id — the same key /api/gallery/stream takes. */
    id: string;
    name: string;
}

/** Split a list into zip-sized parts. One part is the common case. */
export function splitIntoZipParts<T>(items: T[], size: number = ZIP_MAX_FILES): T[][] {
    const parts: T[][] = [];
    for (let i = 0; i < items.length; i += size) parts.push(items.slice(i, i + size));
    return parts;
}

/** Start one zip download. Call from a user gesture (a tap handler). */
export function startZipDownload(files: ZipFile[], email: string): void {
    if (files.length === 0) return;

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/gallery/zip';
    form.target = '_self';
    form.style.display = 'none';

    const add = (name: string, value: string) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
    };
    add('email', email);
    add('files', JSON.stringify(files));

    document.body.appendChild(form);
    form.submit();
    // The navigation is already committed; the form has done its job.
    window.setTimeout(() => form.remove(), 1000);
}
