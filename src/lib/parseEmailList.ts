/**
 * Pull every email address out of pasted text: commas, semicolons, spaces, new
 * lines and "Name <a@b.com>" all work. Lowercased, because Supabase Auth stores
 * sign-in emails lowercased and gallery access matches against that.
 *
 * `invalid` is anything that looks like a failed address, so a typo is shown
 * rather than dropped. Plain words are taken for names and ignored, unless the
 * text holds no address at all.
 */
export function parseEmailList(text: string): { emails: string[]; invalid: string[] } {
  const emails: string[] = [];
  const invalid: string[] = [];
  const words: string[] = [];
  for (const raw of text.split(/[\s,;<>()[\]"']+/)) {
    const token = raw.replace(/^mailto:/i, '').replace(/[.:]+$/, '').trim();
    if (!token) continue;
    if (/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(token)) {
      const email = token.toLowerCase();
      if (!emails.includes(email)) emails.push(email);
    } else if (token.includes('@') || token.includes('.')) {
      invalid.push(raw);
    } else {
      words.push(raw);
    }
  }
  return { emails, invalid: emails.length ? invalid : [...invalid, ...words] };
}
