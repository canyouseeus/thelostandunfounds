import { CHAPTERS, FIRST_CHAPTER } from './story.js';
import { ITEMS } from './items.js';
import type { Choice, Effect, GameEvent, GameState, Requirement, Stat, StepResult, StoryNode } from './types.js';
import { STATS } from './types.js';

/** Engine version stored in each save; bump when state shape changes. */
export const ENGINE_VERSION = 1;

const XP_PER_LEVEL = 100;

export function newGame(): GameState {
  const ch = CHAPTERS[FIRST_CHAPTER];
  return {
    v: ENGINE_VERSION,
    chapter: ch.id,
    node: ch.start,
    hp: 20,
    maxHp: 20,
    stats: { grit: 1, wits: 1, style: 1 },
    xp: 0,
    level: 1,
    inventory: [],
    flags: [],
    completed: [],
  };
}

/** Reject anything that isn't a well-formed save pointing at a real node. */
export function isValidState(s: any): s is GameState {
  if (!s || typeof s !== 'object') return false;
  if (typeof s.chapter !== 'string' || !CHAPTERS[s.chapter]) return false;
  if (typeof s.node !== 'string' || !CHAPTERS[s.chapter].nodes[s.node]) return false;
  if (![s.hp, s.maxHp, s.xp, s.level].every((n) => Number.isFinite(n))) return false;
  if (!s.stats || !STATS.every((k) => Number.isFinite(s.stats[k]))) return false;
  return Array.isArray(s.inventory) && Array.isArray(s.flags) && Array.isArray(s.completed);
}

export function currentNode(state: GameState): StoryNode {
  return CHAPTERS[state.chapter].nodes[state.node];
}

export function effectiveStat(state: GameState, stat: Stat): number {
  let total = state.stats[stat];
  for (const id of state.inventory) total += ITEMS[id]?.bonus?.[stat] ?? 0;
  return total;
}

export function meetsRequirement(state: GameState, req?: Requirement): boolean {
  if (!req) return true;
  if (req.item && !state.inventory.includes(req.item)) return false;
  if (req.flag && !state.flags.includes(req.flag)) return false;
  if (req.notFlag && state.flags.includes(req.notFlag)) return false;
  return true;
}

export function availableChoices(state: GameState): Choice[] {
  return currentNode(state).choices.filter((c) => meetsRequirement(state, c.requires));
}

function applyEffect(state: GameState, effect: Effect | undefined, events: GameEvent[]) {
  if (!effect) return;
  if (effect.stat) {
    for (const k of STATS) state.stats[k] += effect.stat[k] ?? 0;
  }
  if (effect.maxHp) {
    state.maxHp += effect.maxHp;
    state.hp += effect.maxHp;
  }
  if (effect.item && !state.inventory.includes(effect.item)) {
    state.inventory.push(effect.item);
    const extra = ITEMS[effect.item]?.maxHp ?? 0;
    if (extra) {
      state.maxHp += extra;
      state.hp += extra;
    }
    events.push({ type: 'item', id: effect.item });
  }
  if (effect.flag && !state.flags.includes(effect.flag)) state.flags.push(effect.flag);
  if (effect.hp) {
    const before = state.hp;
    state.hp = Math.max(0, Math.min(state.maxHp, state.hp + effect.hp));
    if (state.hp !== before) events.push({ type: 'hp', amount: state.hp - before });
  }
  if (effect.xp) {
    state.xp += effect.xp;
    events.push({ type: 'xp', amount: effect.xp });
    while (state.xp >= state.level * XP_PER_LEVEL) {
      state.level += 1;
      state.maxHp += 3;
      state.hp = state.maxHp;
      events.push({ type: 'level', level: state.level });
    }
  }
  if (effect.gold) events.push({ type: 'gold', id: effect.gold.id, amount: effect.gold.amount });
}

function enterNode(state: GameState, chapterId: string, nodeId: string, events: GameEvent[]) {
  state.chapter = chapterId;
  state.node = nodeId;
  const node = CHAPTERS[chapterId].nodes[nodeId];
  applyEffect(state, node.onEnter, events);
  if (node.end && !state.completed.includes(chapterId)) {
    state.completed.push(chapterId);
    events.push({ type: 'chapter_complete', chapter: chapterId });
  }
}

/**
 * Take one choice. Pure: returns a new state plus what happened.
 * `rng` returns [0, 1) — Math.random in the browser, crypto on the server.
 * `unlocked` lists the paid chapters this player owns.
 */
export function step(
  prev: GameState,
  choiceId: string,
  rng: () => number,
  unlocked: Set<string>,
): StepResult {
  const state: GameState = JSON.parse(JSON.stringify(prev));
  const choice = currentNode(state).choices.find((c) => c.id === choiceId);
  if (!choice) return { ok: false, error: 'bad_choice' };
  if (!meetsRequirement(state, choice.requires)) return { ok: false, error: 'requirement' };

  const events: GameEvent[] = [];
  let target = choice.to;

  if (target?.startsWith('chapter:')) {
    const chId = target.slice('chapter:'.length);
    const ch = CHAPTERS[chId];
    if (!ch) return { ok: false, error: 'bad_choice' };
    if (ch.priceCents > 0 && !unlocked.has(chId)) return { ok: false, error: 'locked', chapter: chId };
    applyEffect(state, choice.effect, events);
    state.hp = state.maxHp;
    enterNode(state, chId, ch.start, events);
    return { ok: true, state, events };
  }

  applyEffect(state, choice.effect, events);

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
    // Fallen: back to the chapter's start, healed, gear kept.
    events.push({ type: 'fallen' });
    state.hp = state.maxHp;
    state.node = CHAPTERS[state.chapter].start;
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
  if (ch.priceCents > 0 && !unlocked.has(chId)) return { ok: false, error: 'locked', chapter: chId };
  const order = Object.values(CHAPTERS).sort((a, b) => a.number - b.number);
  const prevCh = order.find((c) => c.number === ch.number - 1);
  if (prevCh && !prev.completed.includes(prevCh.id)) return { ok: false, error: 'requirement' };
  const state: GameState = JSON.parse(JSON.stringify(prev));
  const events: GameEvent[] = [];
  state.hp = state.maxHp;
  enterNode(state, chId, ch.start, events);
  return { ok: true, state, events };
}
