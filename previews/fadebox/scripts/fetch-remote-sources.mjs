/*
 * Build-time source fetch for the standalone Vercel deployment.
 *
 * Why this exists: this preview is deployed as its own Vercel project via the
 * file-upload API rather than the git integration, and uploading the page
 * components and hero image inline is impractical. So the deploy ships only
 * the small config files, and the build pulls the large ones from this repo.
 *
 * Locally there is nothing to fetch — the files are already on disk and every
 * one of them is skipped, so `npm run build` never touches the network.
 */
import { access, mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

// Pinned to a commit rather than a branch so a later push cannot change what a
// rebuild produces.
const REPO = 'canyouseeus/thelostandunfounds'
const REF = process.env.FADEBOX_SOURCE_REF || 'c043d1b38157f1e7c24736526959d8c12cf8dd44'
const BASE = `https://raw.githubusercontent.com/${REPO}/${REF}/previews/fadebox`

const FILES = [
  'src/pages/FadeboxLanding.tsx',
  'src/pages/FadeboxProposal.tsx',
  'src/pages/FadeboxDashboard.tsx',
  'public/fadebox/hero-e5th.jpg',
  'public/logo-black.png',
]

const exists = (p) => access(p).then(() => true, () => false)

let fetched = 0
for (const rel of FILES) {
  if (await exists(rel)) {
    console.log(`· ${rel} (already present, skipping)`)
    continue
  }
  const url = `${BASE}/${rel}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url} — HTTP ${res.status} ${res.statusText}`)
  }
  const body = Buffer.from(await res.arrayBuffer())
  await mkdir(dirname(rel), { recursive: true })
  await writeFile(rel, body)
  console.log(`✓ ${rel} (${Math.round(body.length / 1024)} KB)`)
  fetched++
}

console.log(fetched ? `Fetched ${fetched} file(s) from ${REF}.` : 'All sources present locally.')
