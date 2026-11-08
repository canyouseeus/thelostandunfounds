/**
 * Split a run's files into the first copy of each content and the repeats.
 *
 * Checking against Drive can't catch this: two local copies of one photo are
 * both new to Drive, so both would go into the zip.
 */
export function splitSameRunRepeats(
    filePaths: string[],
    keyOf: (filePath: string) => string,
): { unique: string[]; repeats: string[] } {
    const seen = new Set<string>();
    const unique: string[] = [];
    const repeats: string[] = [];
    for (const filePath of filePaths) {
        const key = keyOf(filePath);
        if (seen.has(key)) {
            repeats.push(filePath);
        } else {
            seen.add(key);
            unique.push(filePath);
        }
    }
    return { unique, repeats };
}
