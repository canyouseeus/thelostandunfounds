/**
 * Ahrefs Crawl Score Checker
 *
 * Fetches the Site Audit health score (crawl score) from the Ahrefs API
 * for thelostandunfounds.com.
 *
 * Usage:
 *   npx tsx scripts/check-ahrefs-crawl-score.ts
 *
 * Required env variable:
 *   AHREFS_API_KEY  — generate at https://app.ahrefs.com/api
 */

import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const AHREFS_API_KEY = process.env.AHREFS_API_KEY;
const TARGET_DOMAIN = 'thelostandunfounds.com';
const AHREFS_API_BASE = 'https://api.ahrefs.com/v3';

interface AhrefsProject {
  id: number;
  name: string;
  domain: string;
  protocol: string;
}

interface AhrefsProjectsResponse {
  projects: AhrefsProject[];
}

interface AhrefsCrawl {
  id: number;
  created_at: string;
  pages_crawled: number;
  health_score: number | null;
  status: string;
}

interface AhrefsCrawlsResponse {
  crawls: AhrefsCrawl[];
}

async function ahrefsGet<T>(path: string): Promise<T> {
  const url = `${AHREFS_API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${AHREFS_API_KEY}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ahrefs API error ${res.status} for ${url}: ${body}`);
  }

  return res.json() as Promise<T>;
}

function formatScore(score: number | null): string {
  if (score === null || score === undefined) return 'N/A';
  const pct = Math.round(score);
  const bar = '#'.repeat(Math.round(pct / 5)).padEnd(20, '-');
  const label = pct >= 90 ? 'Excellent' : pct >= 70 ? 'Good' : pct >= 50 ? 'Needs work' : 'Poor';
  return `${pct}%  [${bar}]  ${label}`;
}

async function checkCrawlScore() {
  if (!AHREFS_API_KEY) {
    console.error('Error: AHREFS_API_KEY is not set.');
    console.error('Add it to .env.local or export it before running this script.');
    console.error('  Generate a key at: https://app.ahrefs.com/api');
    process.exit(1);
  }

  console.log(`Fetching Ahrefs crawl score for ${TARGET_DOMAIN}...\n`);

  // Step 1: list projects and find the one for our domain
  const { projects } = await ahrefsGet<AhrefsProjectsResponse>('/site-audit/projects');

  if (!projects || projects.length === 0) {
    console.error('No Site Audit projects found in your Ahrefs account.');
    console.error(`Make sure you have set up a project for ${TARGET_DOMAIN} in Ahrefs Site Audit.`);
    process.exit(1);
  }

  const project = projects.find(
    (p) =>
      p.domain.replace(/^www\./, '') === TARGET_DOMAIN.replace(/^www\./, '') ||
      p.domain.includes(TARGET_DOMAIN)
  );

  if (!project) {
    console.error(`No project found matching domain: ${TARGET_DOMAIN}`);
    console.log('Available projects:');
    projects.forEach((p) => console.log(`  - ${p.domain} (id: ${p.id})`));
    process.exit(1);
  }

  console.log(`Project: ${project.name} (id: ${project.id}, domain: ${project.domain})`);

  // Step 2: get crawls for this project (most recent first)
  const { crawls } = await ahrefsGet<AhrefsCrawlsResponse>(
    `/site-audit/projects/${project.id}/crawls?limit=5`
  );

  if (!crawls || crawls.length === 0) {
    console.error('No crawls found for this project. Trigger a crawl in Ahrefs Site Audit first.');
    process.exit(1);
  }

  const latest = crawls[0];

  // Step 3: print report
  console.log('\n--- Ahrefs Site Audit Report ---\n');
  console.log(`Crawl date    : ${new Date(latest.created_at).toLocaleString()}`);
  console.log(`Status        : ${latest.status}`);
  console.log(`Pages crawled : ${latest.pages_crawled?.toLocaleString() ?? 'N/A'}`);
  console.log(`Crawl score   : ${formatScore(latest.health_score)}`);

  if (crawls.length > 1) {
    console.log('\n--- Recent crawl history ---\n');
    crawls.slice(1).forEach((c) => {
      const score = c.health_score !== null ? `${Math.round(c.health_score)}%` : 'N/A';
      console.log(`  ${new Date(c.created_at).toLocaleDateString()}  score: ${score}  pages: ${c.pages_crawled?.toLocaleString() ?? 'N/A'}`);
    });
  }

  console.log('');
}

checkCrawlScore().catch((err) => {
  console.error('Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
