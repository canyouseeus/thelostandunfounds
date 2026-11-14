/**
 * FR33 D. OHM INC. content check: npx tsx scripts/check-game-story.ts
 * Fails (exit 1) on a broken link, a duplicate gold id, a node that can't
 * reach its chapter's end, or a random playthrough that gets stuck.
 */
import { CHAPTERS, CHAPTER_ORDER, STORY_REWARDS } from '../src/lib/game/story';
import { ITEMS } from '../src/lib/game/items';
import { ENEMIES } from '../src/lib/game/enemies';
import { legalActions, newGame, normalizeState, step } from '../src/lib/game/engine';

const errors: string[] = [];
const goldIds = new Map<string, string>();

for (const ch of CHAPTER_ORDER) {
  if (!ch.nodes[ch.start]) errors.push(`${ch.id}: start ${ch.start} missing`);
  for (const n of Object.values(ch.nodes)) {
    const golds = [n.onEnter?.gold, ...n.choices.flatMap((c) => [c.effect?.gold, c.check?.passEffect?.gold, c.check?.failEffect?.gold, c.fight?.reward?.gold])]
      .filter(Boolean) as { id: string }[];
    for (const g of golds) {
      if (goldIds.has(g.id)) errors.push(`gold id ${g.id} used twice (${goldIds.get(g.id)} and ${n.id})`);
      goldIds.set(g.id, n.id);
    }
    const effs = [n.onEnter, ...n.choices.flatMap((c) => [c.effect, c.check?.passEffect, c.check?.failEffect, c.fight?.reward])];
    const items = [
      ...effs.flatMap((e) => [e?.item, ...(e?.items ?? []), ...Object.keys(e?.bag ?? {})]),
      ...n.choices.flatMap((c) => [c.requires?.item, ...(c.explore?.finds.map((f) => f.item) ?? [])]),
      ...(n.shop ?? []),
    ].filter(Boolean) as string[];
    for (const i of items) if (!ITEMS[i]) errors.push(`${n.id}: unknown item ${i}`);
    for (const i of n.shop ?? []) if (ITEMS[i] && ITEMS[i].price == null) errors.push(`${n.id}: shop item ${i} has no price`);
    const foes = n.choices.flatMap((c) => [...(c.fight?.enemies ?? []), ...(c.explore?.encounters.map((x) => x.enemy) ?? [])]);
    for (const f of foes) if (!ENEMIES[f]) errors.push(`${n.id}: unknown enemy ${f}`);
    for (const e of Object.values(ENEMIES)) for (const d of e.drops ?? []) if (!ITEMS[d.item]) errors.push(`enemy ${e.id}: unknown drop ${d.item}`);
    if (!n.choices.length) errors.push(`${n.id}: no choices`);
    for (const c of n.choices) {
      if (c.explore && (c.to || c.check || c.fight)) errors.push(`${n.id}/${c.id}: explore choice must not also move`);
      const targets = c.check ? [c.check.pass, c.check.fail] : c.fight ? [c.fight.win] : c.explore ? [n.id] : [c.to];
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
      for (const c of node.choices) for (const t of c.check ? [c.check.pass, c.check.fail] : c.fight ? [c.fight.win] : [c.to]) if (t && !t.startsWith('chapter:')) q.push(t);
    }
    if (!ok) errors.push(`${n.id}: cannot reach ${ch.id}'s end`);
  }
}

// Random playthroughs with every chapter unlocked: no action may ever be refused,
// and a random player must never get stuck. (A random player can't be expected
// to beat chapter 1's bosses, so this checks for errors, not completion; the
// balance sim covers finishing.) Then a scripted god-mode run must finish all three.
const unlocked = new Set(Object.keys(CHAPTERS));
let worstSteps = 0;
for (let run = 0; run < 400; run++) {
  let s = newGame();
  let steps = 0;
  while (!s.completed.includes('ch3') && steps < 1500) {
    if (s.statPoints > 0 && !s.combat) { const r = step(s, 'train:grit', Math.random, unlocked); if (!r.ok) { errors.push(`run ${run}: train refused`); break; } s = r.state; continue; }
    const opts = legalActions(s);
    if (!opts.length) { errors.push(`run ${run}: no available action at ${s.node}${s.combat ? ' (fight)' : ''}`); break; }
    const pick = opts[Math.floor(Math.random() * opts.length)];
    const r = step(s, pick, Math.random, unlocked);
    if (!r.ok) { errors.push(`run ${run}: ${r.error} at ${s.node}/${pick}`); break; }
    if (!normalizeState(JSON.parse(JSON.stringify(r.state)))) { errors.push(`run ${run}: invalid state after ${pick}`); break; }
    s = r.state; steps++;
  }
  worstSteps = Math.max(worstSteps, steps);
}
{
  // God mode: huge stats, so every fight is won and every story path completes.
  let s = newGame();
  s.stats = { grit: 60, wits: 60, style: 60 };
  let steps = 0;
  const seen = new Set<string>();
  while (!s.completed.includes('ch3') && steps < 3000) {
    const opts = legalActions(s);
    if (!opts.length) { errors.push(`god run: no action at ${s.node}`); break; }
    // Prefer unseen choices so every branch gets walked.
    const fresh = opts.filter((o) => !seen.has(`${s.node}/${o}`) && o !== 'c:flee');
    const pick = s.combat ? 'c:atk' : (fresh[0] ?? opts[Math.floor(Math.random() * opts.length)]);
    seen.add(`${s.node}/${pick}`);
    const r = step(s, pick, Math.random, unlocked);
    if (!r.ok) { errors.push(`god run: ${r.error} at ${s.node}/${pick}`); break; }
    s = r.state; steps++;
  }
  if (!s.completed.includes('ch3')) errors.push(`god run: did not finish (at ${s.node} after ${steps} steps)`);
}
// Old (v1) saves still load.
{
  const v1 = { v: 1, chapter: 'ch2', node: 'ch2.tower', hp: 10, maxHp: 26, stats: { grit: 3, wits: 1, style: 1 }, xp: 150, level: 2, inventory: ['scot33-band-tee', 'film'], flags: ['class', 'crew_toulous3'], completed: ['ch1'] };
  const m = normalizeState(v1);
  if (!m || m.node !== 'ch2.tower' || !m.completed.includes('ch1') || m.equipped.body !== 'scot33-band-tee') errors.push('v1 save did not migrate');
  const gone = normalizeState({ ...v1, chapter: 'ch1', node: 'ch1.nowhere' });
  if (!gone || gone.node !== 'ch1.start') errors.push('v1 save on a removed scene did not restart chapter 1');
}

// Locked chapter must refuse; owned chapter must open.
{
  const s = { ...newGame(), chapter: 'ch1', node: 'ch1.end' };
  const r = step(s, 'next', Math.random, new Set());
  if (r.ok || r.error !== 'locked') errors.push(`locked chapter was not refused (got ${r.ok ? 'ok' : r.error})`);
  const r2 = step(s, 'next', Math.random, new Set(['ch2']));
  if (!r2.ok || r2.state.chapter !== 'ch2') errors.push('owned chapter 2 did not open');
}

const perChapter = CHAPTER_ORDER.map((c) => `${c.id}=${Object.entries(STORY_REWARDS).filter(([k]) => k.startsWith(c.id + '.')).reduce((a, [, v]) => a + v, 0)}`);
console.log(`chapters: ${CHAPTER_ORDER.length}, nodes: ${CHAPTER_ORDER.reduce((a, c) => a + Object.keys(c.nodes).length, 0)}, gold ids: ${goldIds.size}`);
console.log(`max story gold per chapter: ${perChapter.join(' ')}, total ${Object.values(STORY_REWARDS).reduce((a, b) => a + b, 0)}`);
console.log(`400 random playthroughs ran clean (longest ${worstSteps} steps); god-mode run finished all chapters`);
if (errors.length) { console.error('FAIL\n' + errors.slice(0, 30).join('\n')); process.exit(1); }
console.log('PASS');
