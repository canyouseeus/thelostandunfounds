/**
 * FR33 D. OHM INC. content check: npx tsx scripts/check-game-story.ts
 * Fails (exit 1) on a broken link, a duplicate gold id, a node that can't
 * reach its chapter's end, or a random playthrough that gets stuck.
 */
import { CHAPTERS, CHAPTER_ORDER, STORY_REWARDS } from '../src/lib/game/story';
import { ITEMS } from '../src/lib/game/items';
import { availableChoices, newGame, step } from '../src/lib/game/engine';

const errors: string[] = [];
const goldIds = new Map<string, string>();

for (const ch of CHAPTER_ORDER) {
  if (!ch.nodes[ch.start]) errors.push(`${ch.id}: start ${ch.start} missing`);
  for (const n of Object.values(ch.nodes)) {
    const golds = [n.onEnter?.gold, ...n.choices.flatMap((c) => [c.effect?.gold, c.check?.passEffect?.gold, c.check?.failEffect?.gold])]
      .filter(Boolean) as { id: string }[];
    for (const g of golds) {
      if (goldIds.has(g.id)) errors.push(`gold id ${g.id} used twice (${goldIds.get(g.id)} and ${n.id})`);
      goldIds.set(g.id, n.id);
    }
    const items = [n.onEnter?.item, ...n.choices.flatMap((c) => [c.effect?.item, c.requires?.item])].filter(Boolean) as string[];
    for (const i of items) if (!ITEMS[i]) errors.push(`${n.id}: unknown item ${i}`);
    if (!n.choices.length) errors.push(`${n.id}: no choices`);
    for (const c of n.choices) {
      const targets = c.check ? [c.check.pass, c.check.fail] : [c.to];
      for (const t of targets) {
        if (!t) errors.push(`${n.id}/${c.id}: no target`);
        else if (t.startsWith('chapter:')) { if (!CHAPTERS[t.slice(8)]) errors.push(`${n.id}/${c.id}: bad chapter ${t}`); }
        else if (!ch.nodes[t]) errors.push(`${n.id}/${c.id}: missing node ${t}`);
      }
    }
  }
  // Every node can reach the end node (ignoring requirements, which only add options).
  const endIds = Object.values(ch.nodes).filter((n) => n.end).map((n) => n.id);
  if (endIds.length !== 1) errors.push(`${ch.id}: expected one end node, found ${endIds.length}`);
  for (const n of Object.values(ch.nodes)) {
    const seen = new Set<string>(); const q = [n.id]; let ok = false;
    while (q.length) {
      const id = q.shift()!; if (seen.has(id)) continue; seen.add(id);
      const node = ch.nodes[id]; if (!node) continue; if (node.end) { ok = true; break; }
      for (const c of node.choices) for (const t of c.check ? [c.check.pass, c.check.fail] : [c.to]) if (t && !t.startsWith('chapter:')) q.push(t);
    }
    if (!ok) errors.push(`${n.id}: cannot reach ${ch.id}'s end`);
  }
}

// Random playthroughs with every chapter unlocked: each must finish all three chapters.
const unlocked = new Set(Object.keys(CHAPTERS));
let worstSteps = 0;
for (let run = 0; run < 2000; run++) {
  let s = newGame();
  let steps = 0;
  while (!s.completed.includes('ch3') && steps < 500) {
    const opts = availableChoices(s);
    if (!opts.length) { errors.push(`run ${run}: no available choice at ${s.node}`); break; }
    const pick = opts[Math.floor(Math.random() * opts.length)];
    const r = step(s, pick.id, Math.random, unlocked);
    if (!r.ok) { errors.push(`run ${run}: ${r.error} at ${s.node}/${pick.id}`); break; }
    s = r.state; steps++;
  }
  if (!s.completed.includes('ch3')) { errors.push(`run ${run}: stuck after ${steps} steps at ${s.node}`); break; }
  worstSteps = Math.max(worstSteps, steps);
}

// Locked chapter must refuse.
{
  let s = newGame();
  const lockedRun = (() => {
    for (let i = 0; i < 200; i++) {
      const opts = availableChoices(s);
      const r = step(s, opts[0].id, () => 0.99, new Set());
      if (!r.ok) return r.error;
      s = r.state;
    }
    return 'never-locked';
  })();
  if (lockedRun !== 'locked') errors.push(`locked chapter was not refused (got ${lockedRun})`);
}

const perChapter = CHAPTER_ORDER.map((c) => `${c.id}=${Object.entries(STORY_REWARDS).filter(([k]) => k.startsWith(c.id + '.')).reduce((a, [, v]) => a + v, 0)}`);
console.log(`chapters: ${CHAPTER_ORDER.length}, nodes: ${CHAPTER_ORDER.reduce((a, c) => a + Object.keys(c.nodes).length, 0)}, gold ids: ${goldIds.size}`);
console.log(`max story gold per chapter: ${perChapter.join(' ')}, total ${Object.values(STORY_REWARDS).reduce((a, b) => a + b, 0)}`);
console.log(`2000 random playthroughs finished; longest took ${worstSteps} steps`);
if (errors.length) { console.error('FAIL\n' + errors.slice(0, 30).join('\n')); process.exit(1); }
console.log('PASS');
