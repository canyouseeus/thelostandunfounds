/**
 * FR33 D. OHM INC. balance check: npx tsx scripts/sim-game-balance.ts [runs]
 *
 * Plays chapter 1 many times with a sensible (not perfect) player: grinds a
 * little before each mini-boss, rests at the tree, buys gear and tacos, uses
 * skills. Prints how long a run takes, how often each boss wins, and the
 * level players are at when they face it. Use it after changing any number
 * in enemies.ts, items.ts or engine.ts.
 */
import { ENEMIES } from '../src/lib/game/enemies';
import { ITEMS } from '../src/lib/game/items';
import {
  atkOf,
  defOf,
  availableChoices,
  classOf,
  combatActions,
  currentNode,
  maxHpOf,
  newGame,
  step,
} from '../src/lib/game/engine';
import type { GameState, Stat } from '../src/lib/game/types';

const RUNS = Number(process.argv[2] || 400);

/** Mini-boss gates: [shard flag, area node, boss choice, level to try at]. */
const PLAN: [string, string, string, number][] = [
  ['shard_green', 'ch1.meadow', 'golem', 3],
  ['shard_orange', 'ch1.woods', 'elder', 4],
  ['shard_blue', 'ch1.shore', 'king', 5],
];
const FINAL_LEVEL = 6;

interface Stats {
  actions: number;
  fights: number;
  deaths: number;
  bossTries: Record<string, number>;
  bossWins: Record<string, number>;
  bossLevel: Record<string, number[]>;
  bossHpLeft: Record<string, number[]>;
  bossTurns: Record<string, number[]>;
  build: Record<string, string[]>;
  finished: boolean;
  level: number;
}

function trainStat(s: GameState): Stat {
  const cls = classOf(s);
  const main: Stat = cls === 'builder' ? 'grit' : cls === 'thinker' ? 'wits' : 'style';
  return s.level % 2 === 0 ? main : 'grit';
}

function pickCombat(s: GameState): string {
  const c = s.combat!;
  const acts = combatActions(s).filter((a) => !a.disabled);
  const has = (id: string) => acts.some((a) => a.id === id);
  const hpPct = s.hp / maxHpOf(s);
  const boss = !!ENEMIES[c.enemy].boss;
  if (hpPct < 0.35) {
    for (const id of ['c:item:taco', 'c:item:spicy-taco']) if (has(id)) return id;
    if (classOf(s) === 'dreamer' && has('c:skill:vibes')) return 'c:skill:vibes';
  }
  if (has('c:skill:button')) return 'c:skill:button';
  if (boss && hpPct > 0.5 && has('c:item:paint-bomb')) return 'c:item:paint-bomb';
  switch (classOf(s)) {
    case 'builder':
      if (has('c:skill:hammer') && (s.level < 5 || c.vibe < 4)) return 'c:skill:hammer';
      break;
    case 'thinker':
      if (has('c:skill:debug') && c.foe.weak === 0) return 'c:skill:debug';
      break;
    case 'dreamer':
      if (has('c:skill:vibes') && (hpPct < 0.7 || c.you.pumped === 0) && (s.level < 5 || !boss)) return 'c:skill:vibes';
      break;
  }
  if (boss && c.foe.stun === 0 && has('c:skill:pep') && s.level < 5) return 'c:skill:pep';
  return 'c:atk';
}

function shopping(s: GameState): string | null {
  const shop = currentNode(s).shop;
  if (!shop) return null;
  const owns = (id: string) => s.inventory.includes(id);
  const wantGear = ['foam-hammer', 'cardboard-armor', 'hard-hat', 'color-cannon'];
  for (const id of wantGear) {
    const it = ITEMS[id];
    const slotItem = s.equipped[it.slot!];
    const better = !slotItem || (it.atk ?? 0) + (it.def ?? 0) > (ITEMS[slotItem].atk ?? 0) + (ITEMS[slotItem].def ?? 0);
    if (!owns(id) && better && s.scrap >= it.price!) return `buy:${id}`;
  }
  if ((s.bag.taco ?? 0) < 4 && s.scrap >= ITEMS.taco.price! + 10) return 'buy:taco';
  if (s.level >= 4 && !s.bag['spare-battery'] && s.scrap >= ITEMS['spare-battery'].price! + 20) return 'buy:spare-battery';
  return null;
}

function pickStory(s: GameState, cls: string): string {
  if (s.statPoints > 0) return `train:${trainStat(s)}`;
  const choices = availableChoices(s);
  const ids = choices.map((c) => c.id);
  const node = s.node;
  const hpPct = s.hp / maxHpOf(s);
  const target = PLAN.find(([flag]) => !s.flags.includes(flag));

  if (node === 'ch1.start') return ids.includes(cls) ? cls : ids[0];
  if (node === 'ch1.tree') {
    if (hpPct < 1) return 'rest';
    const buy = shopping(s);
    if (buy) return buy;
    if (!target) return s.level >= FINAL_LEVEL ? 'eye' : 'shore';
    const area = target[1].slice(4);
    return area;
  }
  if (node === 'ch1.static') return s.level >= FINAL_LEVEL || s.flags.includes('sim_force') ? 'fight' : 'notyet';
  if (node === 'ch1.meadow' || node === 'ch1.woods' || node === 'ch1.shore') {
    if (hpPct < 0.45) {
      if (s.bag.taco && hpPct < 0.3) return 'use:taco';
      return 'back';
    }
    if (target && target[1] === node && s.level >= target[3]) {
      return hpPct >= 0.95 ? target[2] : 'back';
    }
    if (ids.includes('path') && s.level >= 3) return 'path';
    if (ids.includes('wreck') && s.level >= 4) return 'wreck';
    if (!target) return s.level >= FINAL_LEVEL ? 'back' : 'search';
    // Grind where it's safe: the target area, or the meadow if under-leveled for it.
    if (target && target[1] !== node) return 'back';
    return 'search';
  }
  if (node === 'ch1.grove') return 'open';
  if (ids.includes('more')) return 'back';
  // Defaults: avoid backing out, prefer progress.
  const prefer = ['film', 'pitch', 'vent', 'fight', 'out', 'cat', 'go', 'drop', 'walk', 'next', 'back'];
  for (const p of prefer) if (ids.includes(p)) return p;
  return ids[0];
}

function run(cls: string): Stats {
  let s = newGame();
  const st: Stats = { actions: 0, fights: 0, deaths: 0, bossTries: {}, bossWins: {}, bossLevel: {}, bossHpLeft: {}, bossTurns: {}, build: {}, finished: false, level: 1 };
  let currentBoss: string | null = null;
  let guard = 0;
  while (!s.completed.includes('ch1') && guard++ < 4000) {
    const id = s.combat ? pickCombat(s) : pickStory(s, cls);
    const wasCombat = !!s.combat;
    if (!wasCombat) {
      const ch = availableChoices(s).find((c) => c.id === id);
      if (ch?.fight || ch?.explore) {
        // count fights when they start
      }
    }
    // Retarget the node "back" choice if the node has none (search-fight nodes).
    let r = step(s, id, Math.random, new Set());
    if (!r.ok && id === 'back') r = step(s, availableChoices(s)[0].id, Math.random, new Set());
    if (!r.ok) throw new Error(`${cls}: ${r.error} at ${s.node} doing ${id}`);
    st.actions++;
    if (!wasCombat && r.state.combat) {
      st.fights++;
      const e = ENEMIES[r.state.combat.enemy];
      if (e.boss) {
        currentBoss = e.id;
        st.bossTries[e.id] = (st.bossTries[e.id] ?? 0) + 1;
        (st.bossLevel[e.id] ??= []).push(r.state.level);
        (st.build[e.id] ??= []).push(`atk${atkOf(r.state)} def${defOf(r.state)} hp${maxHpOf(r.state)} tacos${r.state.bag.taco ?? 0}`);
      }
    }
    if (r.events.some((e) => e.type === 'fallen' && !e.revived)) st.deaths++;
    if (wasCombat && !r.state.combat && currentBoss && !r.events.some((e) => e.type === 'fallen')) {
      st.bossWins[currentBoss] = (st.bossWins[currentBoss] ?? 0) + 1;
      (st.bossHpLeft[currentBoss] ??= []).push(s.hp / maxHpOf(s));
      (st.bossTurns[currentBoss] ??= []).push(s.combat!.turn);
      currentBoss = null;
    }
    if (!r.state.combat) currentBoss = null;
    if (process.env.DBG && guard > 3900) console.log(s.node, id, s.level, s.hp, maxHpOf(s), s.flags.join(','));
    s = r.state;
  }
  st.finished = s.completed.includes('ch1');
  st.level = s.level;
  return st;
}

function pct(n: number, d: number) {
  return d ? `${Math.round((100 * n) / d)}%` : '-';
}

for (const cls of ['brawler', 'sleuth', 'icon']) {
  const all = Array.from({ length: RUNS }, () => run(cls));
  const fin = all.filter((r) => r.finished);
  const avg = (f: (r: Stats) => number) => (all.reduce((a, r) => a + f(r), 0) / all.length).toFixed(1);
  console.log(`\n== ${cls.toUpperCase()} (${RUNS} runs) finished ${pct(fin.length, all.length)}`);
  console.log(`actions ${avg((r) => r.actions)} · fights ${avg((r) => r.fights)} · deaths ${avg((r) => r.deaths)} · end level ${avg((r) => r.level)}`);
  for (const b of ['shrug-golem', 'doubtwood-elder', 'static-king', 'the-gloom']) {
    const tries = all.reduce((a, r) => a + (r.bossTries[b] ?? 0), 0);
    const wins = all.reduce((a, r) => a + (r.bossWins[b] ?? 0), 0);
    const lv = all.flatMap((r) => r.bossLevel[b] ?? []);
    const left = all.flatMap((r) => r.bossHpLeft[b] ?? []);
    const turns = all.flatMap((r) => r.bossTurns[b] ?? []);
    const mean = (xs: number[]) => (xs.reduce((a, x) => a + x, 0) / (xs.length || 1));
    console.log(`  ${b.padEnd(16)} win/try ${pct(wins, tries).padStart(4)} · lv ${mean(lv).toFixed(1)} · hp left on win ${Math.round(mean(left) * 100)}% · turns ${mean(turns).toFixed(1)} · e.g. ${all[0].build[b]?.[0] ?? ''}`);
  }
}
