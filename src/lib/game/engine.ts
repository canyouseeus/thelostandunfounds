import { CHAPTERS, FIRST_CHAPTER } from './story.js';
import { ITEMS } from './items.js';
import { ENEMIES } from './enemies.js';
import type {
  Choice,
  ClassId,
  CombatState,
  Effect,
  GameEvent,
  GameState,
  Requirement,
  Slot,
  Stat,
  StepResult,
  StoryNode,
} from './types.js';
import { SLOTS, STATS } from './types.js';

/**
 * FR33 D. OHM INC. engine. Pure functions: the same code runs in the browser
 * (guests) and on the server (signed-in players, crypto dice).
 *
 * Everything a player does is one `step(state, choiceId)`:
 *   <node choice id>   a story choice (may start a fight or search an area)
 *   c:atk | c:guard | c:flee | c:skill:<id> | c:item:<id>   fight actions
 *   equip:<item> | unequip:<slot> | use:<item> | buy:<item> | train:<stat>
 */

/** Engine version stored in each save; bump when state shape changes. */
export const ENGINE_VERSION = 2;

const BASE_HP = 24;
const HP_PER_LEVEL = 6;
export const MAX_VIBE = 6;

// ── Levels ────────────────────────────────────────────────────────────────

/** Total XP needed to reach `level`. L2 100, L3 300, L4 600, L5 1000, L6 1500. */
export function xpForLevel(level: number): number {
  return 50 * (level - 1) * level;
}

// ── Derived stats ─────────────────────────────────────────────────────────

function equippedItems(state: GameState) {
  return SLOTS.map((s) => state.equipped?.[s]).filter((id): id is string => !!id && !!ITEMS[id]).map((id) => ITEMS[id]);
}

export function effectiveStat(state: GameState, stat: Stat): number {
  let total = state.stats[stat];
  for (const it of equippedItems(state)) total += it.bonus?.[stat] ?? 0;
  return total;
}

export function maxHpOf(state: GameState): number {
  let total = state.maxHp + 2 * effectiveStat(state, 'grit');
  for (const it of equippedItems(state)) total += it.maxHp ?? 0;
  return total;
}

export function atkOf(state: GameState): number {
  let total = 2 + effectiveStat(state, 'grit') + Math.floor(state.level / 2);
  for (const it of equippedItems(state)) total += it.atk ?? 0;
  return total;
}

export function defOf(state: GameState): number {
  let total = Math.floor(state.level / 3);
  for (const it of equippedItems(state)) total += it.def ?? 0;
  return total;
}

/** Percent. */
export function critOf(state: GameState): number {
  let total = 5 + 4 * effectiveStat(state, 'wits');
  for (const it of equippedItems(state)) total += it.crit ?? 0;
  return Math.min(50, total);
}

/** Percent of enemy hits you slip. */
export function dodgeOf(state: GameState): number {
  return Math.min(30, 3 * effectiveStat(state, 'style'));
}

// ── Skills ────────────────────────────────────────────────────────────────

export interface Skill {
  id: string;
  name: string;
  cost: number;
  desc: string;
  level: number;
}

const CLASS_SKILL: Record<ClassId, Skill> = {
  builder: { id: 'hammer', name: 'HAMMER TIME', cost: 2, level: 1, desc: '2.3× damage. Never misses.' },
  thinker: { id: 'debug', name: 'DEBUG', cost: 2, level: 1, desc: '1.4× damage through armor, and WEAKENS the enemy for 3 turns.' },
  dreamer: { id: 'vibes', name: 'GOOD VIBES', cost: 2, level: 1, desc: 'Heal 35% of max HP and get PUMPED (+30% damage) for 3 turns.' },
};

const SHARED_SKILLS: Skill[] = [
  { id: 'pep', name: 'PEP TALK', cost: 3, level: 3, desc: 'Talk the enemy down so it skips its next turn. STYLE raises the odds; big enemies resist.' },
  { id: 'button', name: 'BIG ROUND BUTTON', cost: 5, level: 5, desc: 'Press the WRLD BLDR\'s button: triple damage through armor.' },
];

export function classOf(state: GameState): ClassId {
  return state.cls ?? 'builder';
}

export function skillsFor(state: GameState): Skill[] {
  return [CLASS_SKILL[classOf(state)], ...SHARED_SKILLS].filter((s) => state.level >= s.level);
}

/** Skills you will learn later (for the UI). */
export function upcomingSkills(state: GameState): Skill[] {
  return SHARED_SKILLS.filter((s) => state.level < s.level);
}

// ── State ─────────────────────────────────────────────────────────────────

export function newGame(): GameState {
  const ch = CHAPTERS[FIRST_CHAPTER];
  return {
    v: ENGINE_VERSION,
    chapter: ch.id,
    node: ch.start,
    hp: BASE_HP + 2,
    maxHp: BASE_HP,
    stats: { grit: 1, wits: 1, style: 1 },
    xp: 0,
    level: 1,
    inventory: [],
    flags: [],
    completed: [],
    cls: null,
    scrap: 0,
    equipped: {},
    bag: {},
    statPoints: 0,
    combat: null,
    checkpoint: ch.start,
  };
}

/** Reject anything that isn't a well-formed current save pointing at a real node. */
export function isValidState(s: any): s is GameState {
  if (!s || typeof s !== 'object' || s.v !== ENGINE_VERSION) return false;
  if (typeof s.chapter !== 'string' || !CHAPTERS[s.chapter]) return false;
  if (typeof s.node !== 'string' || !CHAPTERS[s.chapter].nodes[s.node]) return false;
  if (![s.hp, s.maxHp, s.xp, s.level, s.scrap, s.statPoints].every((n) => Number.isFinite(n))) return false;
  if (!s.stats || !STATS.every((k) => Number.isFinite(s.stats[k]))) return false;
  if (!s.equipped || typeof s.equipped !== 'object' || !s.bag || typeof s.bag !== 'object') return false;
  if (s.combat !== null && (typeof s.combat !== 'object' || !ENEMIES[s.combat.enemy])) return false;
  if (typeof s.checkpoint !== 'string') return false;
  return Array.isArray(s.inventory) && Array.isArray(s.flags) && Array.isArray(s.completed);
}

/**
 * Load any save we have ever written: current saves pass through, v1 saves
 * (before combat) are upgraded. Chapter progress, completed chapters and
 * gear are kept; a v1 save sitting on a chapter 1 scene that no longer
 * exists starts chapter 1 over. Returns null for junk.
 */
export function normalizeState(raw: any): GameState | null {
  if (isValidState(raw)) return raw;
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.chapter !== 'string' || !CHAPTERS[raw.chapter]) return null;
  if (!raw.stats || !STATS.every((k) => Number.isFinite(raw.stats[k]))) return null;
  if (!Array.isArray(raw.inventory) || !Array.isArray(raw.flags) || !Array.isArray(raw.completed)) return null;
  const fresh = newGame();
  const ch = CHAPTERS[raw.chapter];
  const level = Number.isFinite(raw.level) ? Math.max(1, Math.floor(raw.level)) : 1;
  const flags: string[] = raw.flags.filter((f: unknown) => typeof f === 'string');
  const cls: ClassId = flags.includes('class_thinker')
    ? 'thinker'
    : flags.includes('class_dreamer')
      ? 'dreamer'
      : raw.stats.wits > raw.stats.grit && raw.stats.wits >= raw.stats.style
        ? 'thinker'
        : raw.stats.style > raw.stats.grit
          ? 'dreamer'
          : 'builder';
  const s: GameState = {
    ...fresh,
    chapter: ch.id,
    node: typeof raw.node === 'string' && ch.nodes[raw.node] ? raw.node : ch.start,
    stats: { grit: raw.stats.grit, wits: raw.stats.wits, style: raw.stats.style },
    xp: Number.isFinite(raw.xp) ? Math.max(xpForLevel(level), raw.xp) : xpForLevel(level),
    level,
    maxHp: BASE_HP + HP_PER_LEVEL * (level - 1),
    inventory: raw.inventory.filter((id: unknown) => typeof id === 'string' && ITEMS[id as string] && !ITEMS[id as string].use),
    flags,
    completed: raw.completed.filter((c: unknown) => typeof c === 'string' && CHAPTERS[c as string]),
    cls: flags.includes('class') ? cls : null,
    checkpoint: ch.start,
  };
  if (Number.isFinite(raw.scrap)) s.scrap = Math.max(0, Math.floor(raw.scrap));
  if (raw.bag && typeof raw.bag === 'object') {
    for (const [id, n] of Object.entries(raw.bag)) if (ITEMS[id]?.use && Number.isFinite(n)) s.bag[id] = Math.max(0, Math.floor(n as number));
  }
  // Wear the best piece owned for each slot.
  for (const id of s.inventory) autoEquip(s, id);
  s.hp = maxHpOf(s);
  return s;
}

export function currentNode(state: GameState): StoryNode {
  return CHAPTERS[state.chapter].nodes[state.node];
}

export function meetsRequirement(state: GameState, req?: Requirement): boolean {
  if (!req) return true;
  if (req.item && !state.inventory.includes(req.item)) return false;
  if (req.flag && !state.flags.includes(req.flag)) return false;
  if (req.flags && !req.flags.every((f) => state.flags.includes(f))) return false;
  if (req.notFlag && state.flags.includes(req.notFlag)) return false;
  return true;
}

/** Story choices on the current scene (none while a fight is on). */
export function availableChoices(state: GameState): Choice[] {
  if (state.combat) return [];
  return currentNode(state).choices.filter((c) => meetsRequirement(state, c.requires));
}

export interface CombatAction {
  id: string;
  label: string;
  detail?: string;
  disabled?: boolean;
  kind: 'attack' | 'guard' | 'skill' | 'item' | 'flee';
}

/** What you can do on your turn in a fight. */
export function combatActions(state: GameState): CombatAction[] {
  const c = state.combat;
  if (!c) return [];
  const out: CombatAction[] = [
    { id: 'c:atk', kind: 'attack', label: 'ATTACK', detail: '+1 VIBE' },
    { id: 'c:guard', kind: 'guard', label: 'GUARD', detail: 'HALF DAMAGE · +2 VIBE' },
  ];
  for (const sk of skillsFor(state)) {
    out.push({ id: `c:skill:${sk.id}`, kind: 'skill', label: sk.name, detail: `${sk.cost} VIBE · ${sk.desc}`, disabled: c.vibe < sk.cost });
  }
  for (const [id, n] of Object.entries(state.bag)) {
    const it = ITEMS[id];
    if (!it?.use || n <= 0 || it.use.revive) continue;
    out.push({ id: `c:item:${id}`, kind: 'item', label: `${it.name} ×${n}`, detail: it.blurb });
  }
  if (!c.noFlee) out.push({ id: 'c:flee', kind: 'flee', label: 'RUN', detail: `${fleeChance(state)}% CHANCE` });
  return out;
}

function fleeChance(state: GameState): number {
  return Math.min(90, 50 + 5 * effectiveStat(state, 'wits'));
}

/** Every action id that is legal right now (used by the content check and balance sim). */
export function legalActions(state: GameState): string[] {
  if (state.combat) return combatActions(state).filter((a) => !a.disabled).map((a) => a.id);
  return availableChoices(state).map((c) => c.id);
}

// ── Effects ───────────────────────────────────────────────────────────────

function addItem(state: GameState, id: string, events: GameEvent[]) {
  const it = ITEMS[id];
  if (!it) return;
  if (it.use) {
    const have = state.bag[id] ?? 0;
    const cap = it.carry ?? 9;
    if (have >= cap) {
      events.push({ type: 'log', text: `${it.name}: BAG FULL, LEFT IT.`, tone: 'info' });
      return;
    }
    state.bag[id] = have + 1;
    events.push({ type: 'item', id });
    return;
  }
  if (state.inventory.includes(id)) return;
  state.inventory.push(id);
  events.push({ type: 'item', id });
  autoEquip(state, id);
}

/** Put on a new piece of gear if that slot is empty or it is clearly better. */
function autoEquip(state: GameState, id: string) {
  const it = ITEMS[id];
  if (!it?.slot) return;
  const cur = state.equipped[it.slot];
  if (!cur || gearScore(id) > gearScore(cur)) state.equipped[it.slot] = id;
}

export function gearScore(id: string): number {
  const it = ITEMS[id];
  if (!it) return 0;
  const stats = Object.values(it.bonus ?? {}).reduce((a, b) => a + (b ?? 0), 0);
  return (it.atk ?? 0) * 2 + (it.def ?? 0) * 2 + (it.maxHp ?? 0) / 3 + (it.crit ?? 0) / 5 + stats * 1.5;
}

function gainXp(state: GameState, amount: number, events: GameEvent[]) {
  state.xp += amount;
  events.push({ type: 'xp', amount });
  while (state.xp >= xpForLevel(state.level + 1)) {
    state.level += 1;
    state.maxHp += HP_PER_LEVEL;
    state.statPoints += 1;
    state.hp = maxHpOf(state);
    events.push({ type: 'level', level: state.level });
    for (const sk of SHARED_SKILLS) {
      if (sk.level === state.level) events.push({ type: 'log', text: `NEW SKILL: ${sk.name}. ${sk.desc}`, tone: 'win' });
    }
  }
}

function applyEffect(state: GameState, effect: Effect | undefined, events: GameEvent[]) {
  if (!effect) return;
  if (effect.cls) state.cls = effect.cls;
  if (effect.stat) {
    for (const k of STATS) state.stats[k] += effect.stat[k] ?? 0;
  }
  if (effect.maxHp) {
    state.maxHp += effect.maxHp;
    state.hp += effect.maxHp;
  }
  for (const id of [effect.item, ...(effect.items ?? [])]) if (id) addItem(state, id, events);
  for (const [id, n] of Object.entries(effect.bag ?? {})) for (let i = 0; i < n; i++) addItem(state, id, events);
  for (const f of [effect.flag, ...(effect.flags ?? [])]) if (f && !state.flags.includes(f)) state.flags.push(f);
  if (effect.fullHeal) {
    const before = state.hp;
    state.hp = maxHpOf(state);
    if (state.hp !== before) events.push({ type: 'hp', amount: state.hp - before });
  }
  if (effect.hp) {
    const before = state.hp;
    state.hp = Math.max(0, Math.min(maxHpOf(state), state.hp + effect.hp));
    if (state.hp !== before) events.push({ type: 'hp', amount: state.hp - before });
  }
  if (effect.scrap) {
    state.scrap = Math.max(0, state.scrap + effect.scrap);
    events.push({ type: 'scrap', amount: effect.scrap });
  }
  if (effect.xp) gainXp(state, effect.xp, events);
  if (effect.gold) events.push({ type: 'gold', id: effect.gold.id, amount: effect.gold.amount });
}

function enterNode(state: GameState, chapterId: string, nodeId: string, events: GameEvent[]) {
  state.chapter = chapterId;
  state.node = nodeId;
  const node = CHAPTERS[chapterId].nodes[nodeId];
  if (node.checkpoint || nodeId === CHAPTERS[chapterId].start) state.checkpoint = nodeId;
  applyEffect(state, node.onEnter, events);
  if (node.end && !state.completed.includes(chapterId)) {
    state.completed.push(chapterId);
    events.push({ type: 'chapter_complete', chapter: chapterId });
  }
}

/** Out of HP: wake up at the last checkpoint, healed, half your SCRAP gone. */
function fall(state: GameState, events: GameEvent[]) {
  const lost = Math.floor(state.scrap / 2);
  state.scrap -= lost;
  state.combat = null;
  state.hp = maxHpOf(state);
  const ch = CHAPTERS[state.chapter];
  state.node = ch.nodes[state.checkpoint] ? state.checkpoint : ch.start;
  events.push({ type: 'fallen', scrapLost: lost });
}

// ── Dice ──────────────────────────────────────────────────────────────────

function randInt(rng: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function chance(rng: () => number, pct: number): boolean {
  return rng() * 100 < pct;
}

function weighted<T extends { weight: number }>(rng: () => number, list: T[]): T {
  const total = list.reduce((a, x) => a + x.weight, 0);
  let r = rng() * total;
  for (const x of list) {
    r -= x.weight;
    if (r < 0) return x;
  }
  return list[list.length - 1];
}

// ── Fights ────────────────────────────────────────────────────────────────

function startCombat(state: GameState, enemies: string[], win: string, events: GameEvent[], opts: { noFlee?: boolean; reward?: Effect } = {}) {
  const first = ENEMIES[enemies[0]];
  state.combat = {
    enemy: first.id,
    hp: first.hp,
    maxHp: first.hp,
    queue: enemies.slice(1),
    phase: 1,
    turn: 1,
    vibe: state.cls === 'dreamer' ? 2 : 1,
    you: { weak: 0, grey: 0, greyDmg: 0, pumped: 0, guard: false },
    foe: { weak: 0, stun: 0, guard: false },
    win,
    noFlee: opts.noFlee || !!first.boss,
    reward: opts.reward,
  };
  const count = enemies.length > 1 ? ` (1 OF ${enemies.length})` : '';
  events.push({ type: 'log', text: `FIGHT: ${first.name}${count}.`, tone: 'info' });
}

function foeAtk(c: CombatState): number {
  const e = ENEMIES[c.enemy];
  let atk = e.atk + (c.phase === 2 ? e.phase2?.atk ?? 0 : 0);
  if (c.foe.weak > 0) atk = Math.floor(atk * 0.7);
  return atk;
}

export function foeDef(c: CombatState): number {
  const e = ENEMIES[c.enemy];
  return e.def + (c.phase === 2 ? e.phase2?.def ?? 0 : 0) + (c.foe.guard ? 3 : 0);
}

/** Your hit on the enemy. Returns damage dealt (0 = miss). */
function playerHit(state: GameState, rng: () => number, events: GameEvent[], mult: number, opts: { pierce?: boolean; sure?: boolean; label: string }): number {
  const c = state.combat!;
  const e = ENEMIES[c.enemy];
  const hitPct = Math.min(98, 90 + 2 * effectiveStat(state, 'wits') - Math.round((e.evade ?? 0) * 100));
  if (!opts.sure && !chance(rng, hitPct)) {
    events.push({ type: 'log', text: `${opts.label}: MISSED.`, tone: 'info' });
    return 0;
  }
  const crit = chance(rng, critOf(state));
  const m = mult * (crit ? 1.75 : 1) * (c.you.pumped > 0 ? 1.3 : 1) * (c.you.weak > 0 ? 0.7 : 1);
  const raw = Math.round((atkOf(state) + randInt(rng, 0, 2)) * m);
  const dmg = Math.max(1, raw - (opts.pierce ? 0 : foeDef(c)));
  c.hp = Math.max(0, c.hp - dmg);
  events.push({ type: 'log', text: `${opts.label}: ${dmg} DAMAGE${crit ? ' (CRITICAL!)' : ''}.`, tone: 'hit' });
  return dmg;
}

/** The enemy's turn. */
function foeTurn(state: GameState, rng: () => number, events: GameEvent[]) {
  const c = state.combat!;
  const e = ENEMIES[c.enemy];
  c.foe.guard = false;
  if (c.foe.stun > 0) {
    c.foe.stun -= 1;
    events.push({ type: 'log', text: `${e.name} STOPS TO THINK AND SKIPS ITS TURN.`, tone: 'info' });
    return;
  }
  const moves = e.moves.filter((m) => !m.phase || m.phase === c.phase);
  const move = weighted(rng, moves);
  const hitOnce = (power: number, pierce = false): number => {
    if (!pierce && chance(rng, dodgeOf(state))) {
      events.push({ type: 'log', text: `${e.name} USES ${move.name}. YOU DODGE IT.`, tone: 'info' });
      return 0;
    }
    if (!pierce && !chance(rng, 92)) {
      events.push({ type: 'log', text: `${e.name} USES ${move.name}. IT MISSES.`, tone: 'info' });
      return 0;
    }
    let dmg = Math.max(1, Math.round((foeAtk(c) + randInt(rng, 0, 2)) * power) - (pierce ? 0 : defOf(state)));
    if (c.you.guard) dmg = Math.max(1, Math.ceil(dmg / 2));
    state.hp = Math.max(0, state.hp - dmg);
    events.push({ type: 'log', text: `${e.name} USES ${move.name}: YOU TAKE ${dmg}.`, tone: 'hurt' });
    return dmg;
  };
  switch (move.kind) {
    case 'hit':
      hitOnce(move.power ?? 1);
      break;
    case 'heavy':
      hitOnce(move.power ?? 1.6);
      break;
    case 'pierce':
      hitOnce(move.power ?? 1, true);
      break;
    case 'double':
      hitOnce(0.7);
      if (state.hp > 0) hitOnce(0.7);
      break;
    case 'weaken':
      if (hitOnce(move.power ?? 0.6) > 0) {
        c.you.weak = 3;
        events.push({ type: 'log', text: 'YOU ARE WEAKENED: -30% DAMAGE FOR 3 TURNS.', tone: 'hurt' });
      }
      break;
    case 'grey':
      hitOnce(0.5);
      c.you.grey = 3;
      c.you.greyDmg = move.power ?? 2;
      events.push({ type: 'log', text: `YOU ARE GREYED: -${c.you.greyDmg} HP A TURN FOR 3 TURNS.`, tone: 'hurt' });
      break;
    case 'drain':
      hitOnce(move.power ?? 0.8);
      if (c.vibe > 0) {
        c.vibe -= 1;
        events.push({ type: 'log', text: '-1 VIBE.', tone: 'hurt' });
      }
      break;
    case 'guard':
      c.foe.guard = true;
      events.push({ type: 'log', text: `${e.name} USES ${move.name}: +3 DEF UNTIL ITS NEXT TURN.`, tone: 'info' });
      break;
    case 'heal': {
      const amt = Math.round(c.maxHp * (move.power ?? 0.12));
      c.hp = Math.min(c.maxHp, c.hp + amt);
      events.push({ type: 'log', text: `${e.name} USES ${move.name}: HEALS ${amt}.`, tone: 'info' });
      break;
    }
  }
}

/** TOULOUS3 helps out in chapter 1 once he's on the crew. */
function crewTurn(state: GameState, rng: () => number, events: GameEvent[]) {
  const c = state.combat!;
  if (!state.flags.includes('crew_toulous3') || state.chapter !== 'ch1' || !chance(rng, 30)) return;
  if (state.hp < maxHpOf(state) * 0.4) {
    const amt = 4 + state.level;
    state.hp = Math.min(maxHpOf(state), state.hp + amt);
    events.push({ type: 'log', text: `TOULOUS3 TOSSES YOU A TACO: +${amt} HP.`, tone: 'win' });
  } else {
    const dmg = 3 + state.level;
    c.hp = Math.max(0, c.hp - dmg);
    events.push({ type: 'log', text: `TOULOUS3 THROWS HIS FOAM HAT: ${dmg} DAMAGE.`, tone: 'hit' });
  }
}

function useItemInCombat(state: GameState, id: string, events: GameEvent[]): boolean {
  const it = ITEMS[id];
  const c = state.combat!;
  if (!it?.use || it.use.revive || (state.bag[id] ?? 0) <= 0) return false;
  state.bag[id] -= 1;
  if (state.bag[id] <= 0) delete state.bag[id];
  const u = it.use;
  const parts: string[] = [];
  if (u.heal) {
    const before = state.hp;
    state.hp = Math.min(maxHpOf(state), state.hp + u.heal);
    parts.push(`+${state.hp - before} HP`);
  }
  if (u.vibe) {
    c.vibe = Math.min(MAX_VIBE, c.vibe + u.vibe);
    parts.push(`+${u.vibe} VIBE`);
  }
  if (u.cleanse) {
    c.you.grey = 0;
    c.you.weak = 0;
  }
  if (u.pumped) {
    c.you.pumped = u.pumped;
    parts.push('PUMPED');
  }
  if (u.damage) {
    c.hp = Math.max(0, c.hp - u.damage);
    parts.push(`${u.damage} DAMAGE`);
  }
  events.push({ type: 'log', text: `${it.name}: ${parts.join(', ') || 'USED'}.`, tone: u.damage ? 'hit' : 'win' });
  return true;
}

/** The current enemy fell: loot, then the next wave or the end of the fight. */
function foeDown(state: GameState, rng: () => number, events: GameEvent[]) {
  const c = state.combat!;
  const e = ENEMIES[c.enemy];
  events.push({ type: 'log', text: `${e.name} FADES BACK INTO COLOR.`, tone: 'win' });
  gainXp(state, e.xp, events);
  const scrap = randInt(rng, e.scrap[0], e.scrap[1]);
  state.scrap += scrap;
  events.push({ type: 'scrap', amount: scrap });
  for (const d of e.drops ?? []) if (rng() < d.chance) addItem(state, d.item, events);

  const next = c.queue.shift();
  if (next) {
    const ne = ENEMIES[next];
    c.enemy = ne.id;
    c.hp = ne.hp;
    c.maxHp = ne.hp;
    c.phase = 1;
    c.foe = { weak: 0, stun: 0, guard: false };
    events.push({ type: 'log', text: `ANOTHER ONE: ${ne.name}.`, tone: 'info' });
    return;
  }
  const { win, reward } = c;
  state.combat = null;
  applyEffect(state, reward, events);
  // A search fight ends where it started; a scripted fight moves the story on.
  if (win !== state.node) enterNode(state, state.chapter, win, events);
}

function combatStep(state: GameState, actionId: string, rng: () => number, events: GameEvent[]): boolean {
  const c = state.combat!;
  const e = ENEMIES[c.enemy];
  c.you.guard = false;
  let gain = 1;

  if (actionId === 'c:atk') {
    playerHit(state, rng, events, 1, { label: 'YOU ATTACK' });
  } else if (actionId === 'c:guard') {
    c.you.guard = true;
    gain = 2;
    events.push({ type: 'log', text: 'YOU GUARD.', tone: 'info' });
  } else if (actionId === 'c:flee') {
    if (c.noFlee) return false;
    if (chance(rng, fleeChance(state))) {
      events.push({ type: 'log', text: 'YOU GET AWAY.', tone: 'info' });
      state.combat = null;
      return true;
    }
    events.push({ type: 'log', text: `${e.name} CUTS YOU OFF.`, tone: 'hurt' });
    gain = 0;
  } else if (actionId.startsWith('c:item:')) {
    if (!useItemInCombat(state, actionId.slice(7), events)) return false;
    gain = 0;
  } else if (actionId.startsWith('c:skill:')) {
    const sk = skillsFor(state).find((s) => s.id === actionId.slice(8));
    if (!sk || c.vibe < sk.cost) return false;
    c.vibe -= sk.cost;
    gain = 0;
    switch (sk.id) {
      case 'hammer':
        playerHit(state, rng, events, 2.3, { label: 'HAMMER TIME', sure: true });
        break;
      case 'debug':
        playerHit(state, rng, events, 1.4, { label: 'DEBUG', pierce: true, sure: true });
        c.foe.weak = 3;
        events.push({ type: 'log', text: `${e.name} IS WEAKENED: -30% DAMAGE FOR 3 TURNS.`, tone: 'hit' });
        break;
      case 'vibes': {
        const amt = Math.round(maxHpOf(state) * 0.35);
        const before = state.hp;
        state.hp = Math.min(maxHpOf(state), state.hp + amt);
        c.you.pumped = 3;
        c.you.weak = 0;
        events.push({ type: 'log', text: `GOOD VIBES: +${state.hp - before} HP AND PUMPED.`, tone: 'win' });
        break;
      }
      case 'pep': {
        const pct = Math.min(90, 55 + 5 * effectiveStat(state, 'style')) / (e.boss ? 2 : 1);
        if (chance(rng, pct)) {
          c.foe.stun = 1;
          events.push({ type: 'log', text: `PEP TALK LANDS. ${e.name} STOPS TO THINK ABOUT IT.`, tone: 'hit' });
        } else {
          events.push({ type: 'log', text: `PEP TALK: ${e.name} ISN'T READY TO HEAR IT.`, tone: 'info' });
        }
        break;
      }
      case 'button':
        playerHit(state, rng, events, 3, { label: 'BIG ROUND BUTTON', pierce: true, sure: true });
        break;
    }
  } else {
    return false;
  }

  if (c.hp > 0) crewTurn(state, rng, events);

  if (c.hp <= 0) {
    foeDown(state, rng, events);
    if (state.combat) state.combat.vibe = Math.min(MAX_VIBE, state.combat.vibe + gain);
    return true;
  }

  // Boss phase change.
  if (e.phase2 && c.phase === 1 && c.hp <= c.maxHp * e.phase2.at) {
    c.phase = 2;
    events.push({ type: 'log', text: e.phase2.text, tone: 'hurt' });
  }

  foeTurn(state, rng, events);

  if (c.you.grey > 0 && state.hp > 0) {
    state.hp = Math.max(0, state.hp - c.you.greyDmg);
    c.you.grey -= 1;
    events.push({ type: 'log', text: `GREYED: -${c.you.greyDmg} HP.`, tone: 'hurt' });
  }
  if (c.you.weak > 0) c.you.weak -= 1;
  if (c.you.pumped > 0) c.you.pumped -= 1;
  if (c.foe.weak > 0) c.foe.weak -= 1;
  c.vibe = Math.min(MAX_VIBE, c.vibe + gain);
  c.turn += 1;

  if (state.hp <= 0) {
    if ((state.bag['spare-battery'] ?? 0) > 0) {
      delete state.bag['spare-battery'];
      state.hp = Math.ceil(maxHpOf(state) / 2);
      c.you.grey = 0;
      events.push({ type: 'fallen', revived: true });
    } else {
      fall(state, events);
    }
  }
  return true;
}

// ── Outside fights ────────────────────────────────────────────────────────

function utilityStep(state: GameState, choiceId: string, events: GameEvent[]): boolean | null {
  const i = choiceId.indexOf(':');
  const kind = choiceId.slice(0, i);
  const arg = choiceId.slice(i + 1);
  switch (kind) {
    case 'train': {
      if (!STATS.includes(arg as Stat) || state.statPoints <= 0) return false;
      state.statPoints -= 1;
      state.stats[arg as Stat] += 1;
      if (arg === 'grit') state.hp += 2;
      events.push({ type: 'log', text: `${arg.toUpperCase()} +1.`, tone: 'win' });
      return true;
    }
    case 'equip': {
      const it = ITEMS[arg];
      if (!it?.slot || !state.inventory.includes(arg)) return false;
      state.equipped[it.slot] = arg;
      state.hp = Math.min(state.hp, maxHpOf(state));
      events.push({ type: 'log', text: `EQUIPPED ${it.name}.`, tone: 'info' });
      return true;
    }
    case 'unequip': {
      if (!SLOTS.includes(arg as Slot) || !state.equipped[arg as Slot]) return false;
      delete state.equipped[arg as Slot];
      state.hp = Math.min(state.hp, maxHpOf(state));
      return true;
    }
    case 'use': {
      const it = ITEMS[arg];
      if (!it?.use || it.use.combatOnly || (state.bag[arg] ?? 0) <= 0) return false;
      if (state.hp >= maxHpOf(state)) return false;
      state.bag[arg] -= 1;
      if (state.bag[arg] <= 0) delete state.bag[arg];
      const before = state.hp;
      state.hp = Math.min(maxHpOf(state), state.hp + (it.use.heal ?? 0));
      events.push({ type: 'log', text: `${it.name}: +${state.hp - before} HP.`, tone: 'win' });
      return true;
    }
    case 'buy': {
      const it = ITEMS[arg];
      const shop = currentNode(state).shop ?? [];
      if (!it || !shop.includes(arg) || it.price == null) return false;
      if (!it.use && state.inventory.includes(arg)) return false;
      if (it.use && (state.bag[arg] ?? 0) >= (it.carry ?? 9)) return false;
      if (state.scrap < it.price) return null;
      state.scrap -= it.price;
      events.push({ type: 'scrap', amount: -it.price });
      addItem(state, arg, events);
      return true;
    }
  }
  return false;
}

/**
 * Take one action. Pure: returns a new state plus what happened.
 * `rng` returns [0, 1) — Math.random in the browser, crypto on the server.
 * `unlocked` lists the paid chapters this player owns.
 */
export function step(prev: GameState, choiceId: string, rng: () => number, unlocked: Set<string>): StepResult {
  if (typeof choiceId !== 'string' || choiceId.length > 80) return { ok: false, error: 'bad_choice' };
  const state: GameState = JSON.parse(JSON.stringify(prev));
  const events: GameEvent[] = [];

  if (choiceId.startsWith('c:')) {
    if (!state.combat) return { ok: false, error: 'bad_choice' };
    return combatStep(state, choiceId, rng, events) ? { ok: true, state, events } : { ok: false, error: 'bad_choice' };
  }
  if (/^(train|equip|unequip|use|buy):/.test(choiceId)) {
    if (state.combat) return { ok: false, error: 'in_combat' };
    const r = utilityStep(state, choiceId, events);
    if (r === null) return { ok: false, error: 'scrap' };
    return r ? { ok: true, state, events } : { ok: false, error: 'bad_choice' };
  }
  if (state.combat) return { ok: false, error: 'in_combat' };

  const choice = currentNode(state).choices.find((c) => c.id === choiceId);
  if (!choice) return { ok: false, error: 'bad_choice' };
  if (!meetsRequirement(state, choice.requires)) return { ok: false, error: 'requirement' };

  let target = choice.to;

  if (target?.startsWith('chapter:')) {
    const chId = target.slice('chapter:'.length);
    const ch = CHAPTERS[chId];
    if (!ch) return { ok: false, error: 'bad_choice' };
    if (ch.priceCents > 0 && !unlocked.has(chId)) return { ok: false, error: 'locked', chapter: chId };
    applyEffect(state, choice.effect, events);
    state.hp = maxHpOf(state);
    enterNode(state, chId, ch.start, events);
    return { ok: true, state, events };
  }

  applyEffect(state, choice.effect, events);

  if (choice.fight) {
    startCombat(state, choice.fight.enemies, choice.fight.win, events, { noFlee: choice.fight.noFlee, reward: choice.fight.reward });
    return { ok: true, state, events };
  }

  if (choice.explore) {
    const ex = choice.explore;
    if (rng() < ex.fightChance) {
      const enc = weighted(rng, ex.encounters);
      startCombat(state, [enc.enemy], state.node, events);
    } else {
      const find = weighted(rng, ex.finds);
      const ownsGear = !!find.item && !ITEMS[find.item]?.use && state.inventory.includes(find.item);
      if (find.item && !ownsGear) {
        events.push({ type: 'log', text: find.text, tone: 'win' });
        addItem(state, find.item, events);
      } else {
        const [lo, hi] = find.scrap ?? [5, 10];
        const amt = randInt(rng, lo, hi);
        events.push({ type: 'log', text: find.scrap ? find.text : 'YOU FIND A FEW BITS OF SCRAP.', tone: 'win' });
        state.scrap += amt;
        events.push({ type: 'scrap', amount: amt });
      }
    }
    return { ok: true, state, events };
  }

  if (choice.check) {
    const { stat, dc } = choice.check;
    const roll = Math.floor(rng() * 20) + 1;
    const bonus = effectiveStat(state, stat);
    const total = roll + bonus;
    const passed = total >= dc;
    events.push({ type: 'roll', stat, roll, bonus, total, dc, passed });
    applyEffect(state, passed ? choice.check.passEffect : choice.check.failEffect, events);
    target = passed ? choice.check.pass : choice.check.fail;
  }

  if (state.hp <= 0) {
    fall(state, events);
    return { ok: true, state, events };
  }

  if (!target || !CHAPTERS[state.chapter].nodes[target]) return { ok: false, error: 'bad_choice' };
  enterNode(state, state.chapter, target, events);
  return { ok: true, state, events };
}

/** Jump to the start of a chapter already reached or owned (chapter select). */
export function startChapter(prev: GameState, chId: string, unlocked: Set<string>): StepResult {
  const ch = CHAPTERS[chId];
  if (!ch) return { ok: false, error: 'bad_choice' };
  if (prev.combat) return { ok: false, error: 'in_combat' };
  if (ch.priceCents > 0 && !unlocked.has(chId)) return { ok: false, error: 'locked', chapter: chId };
  const order = Object.values(CHAPTERS).sort((a, b) => a.number - b.number);
  const prevCh = order.find((c) => c.number === ch.number - 1);
  if (prevCh && !prev.completed.includes(prevCh.id)) return { ok: false, error: 'requirement' };
  const state: GameState = JSON.parse(JSON.stringify(prev));
  const events: GameEvent[] = [];
  state.hp = maxHpOf(state);
  enterNode(state, chId, ch.start, events);
  return { ok: true, state, events };
}
