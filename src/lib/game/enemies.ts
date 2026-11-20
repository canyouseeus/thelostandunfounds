import type { Enemy } from './types.js';

/**
 * Chapter 1 enemies: things the Gloom makes. They drop SCRAP (in-game shop
 * currency) and sometimes gear. They never drop GOLD: gold is real site
 * credit, so it only comes from one-time story rewards.
 *
 * Numbers are tuned with scripts/sim-game-balance.ts.
 */
export const ENEMIES: Record<string, Enemy> = {
  // ── Tutorial ────────────────────────────────────────────────────────────
  'static-gremlin': {
    id: 'static-gremlin',
    name: 'STATIC GREMLIN',
    blurb: 'Lives in new electronics. Crackles when nervous, which is always.',
    hp: 14,
    atk: 3,
    def: 0,
    xp: 25,
    scrap: [6, 6],
    moves: [{ kind: 'hit', name: 'ZAP', weight: 1 }],
  },

  // ── The Grey Meadow (rec. level 1–2) ────────────────────────────────────
  'meh-mite': {
    id: 'meh-mite',
    name: 'MEH MITE',
    blurb: 'Tiny, grey, and unbothered by everything.',
    hp: 16,
    atk: 4,
    def: 0,
    xp: 16,
    scrap: [4, 8],
    drops: [{ item: 'taco', chance: 0.15 }],
    moves: [
      { kind: 'hit', name: 'NIBBLE', weight: 3 },
      { kind: 'heavy', name: 'BIG SHRUG', weight: 1, power: 1.5 },
    ],
  },
  'sigh-slime': {
    id: 'sigh-slime',
    name: 'SIGH SLIME',
    blurb: 'Every time it moves, it sighs. It is exhausting to be near.',
    hp: 20,
    atk: 4,
    def: 1,
    xp: 20,
    scrap: [5, 9],
    moves: [
      { kind: 'hit', name: 'SPLAT', weight: 3 },
      { kind: 'drain', name: 'LONG SIGH', weight: 2, power: 0.8 },
    ],
  },
  'gnat-swarm': {
    id: 'gnat-swarm',
    name: 'GREY GNAT SWARM',
    blurb: 'A cloud of tiny complaints. Hard to swat.',
    hp: 14,
    atk: 5,
    def: 0,
    evade: 0.15,
    xp: 18,
    scrap: [4, 8],
    moves: [
      { kind: 'hit', name: 'BUZZ', weight: 2 },
      { kind: 'double', name: 'SWARM', weight: 1 },
    ],
  },
  'shrug-golem': {
    id: 'shrug-golem',
    name: 'THE SHRUG GOLEM',
    blurb: 'A pile of grey rocks that answers every question with "eh". Guards the GREEN COLOR SHARD.',
    hp: 95,
    atk: 10,
    def: 2,
    xp: 60,
    scrap: [30, 30],
    boss: true,
    moves: [
      { kind: 'hit', name: 'ROCK FIST', weight: 3 },
      { kind: 'guard', name: 'SHRUGS IT OFF', weight: 1 },
      { kind: 'heavy', name: 'AVALANCHE OF EH', weight: 1, power: 1.6 },
    ],
  },

  // ── The Drizzle Woods (rec. level 3) ────────────────────────────────────
  'why-wisp': {
    id: 'why-wisp',
    name: 'WHY-BOTHER WISP',
    blurb: 'A cold little light that asks "why bother?" until you wonder too.',
    hp: 30,
    atk: 9,
    def: 1,
    evade: 0.1,
    xp: 34,
    scrap: [8, 14],
    drops: [{ item: 'pep-soda', chance: 0.12 }],
    moves: [
      { kind: 'hit', name: 'COLD FLICKER', weight: 3 },
      { kind: 'weaken', name: '"WHY BOTHER?"', weight: 2, power: 0.6 },
    ],
  },
  'doomscroll-bat': {
    id: 'doomscroll-bat',
    name: 'DOOMSCROLL BAT',
    blurb: 'Hangs upside down and never stops scrolling. Bites twice.',
    hp: 28,
    atk: 9,
    def: 1,
    xp: 34,
    scrap: [8, 14],
    moves: [
      { kind: 'hit', name: 'BITE', weight: 2 },
      { kind: 'double', name: 'ONE MORE SCROLL', weight: 2 },
    ],
  },
  'stump-of-doubt': {
    id: 'stump-of-doubt',
    name: 'STUMP OF DOUBT',
    blurb: 'Used to be a tree. Decided it couldn\'t.',
    hp: 44,
    atk: 9,
    def: 3,
    xp: 44,
    scrap: [10, 16],
    drops: [{ item: 'spicy-taco', chance: 0.15 }],
    moves: [
      { kind: 'hit', name: 'ROOT SLAP', weight: 3 },
      { kind: 'grey', name: 'GREY SAP', weight: 1, power: 2 },
    ],
  },
  'doubtwood-elder': {
    id: 'doubtwood-elder',
    name: 'THE DOUBTWOOD ELDER',
    blurb: 'The oldest tree in the woods, grey to the roots. Guards the ORANGE COLOR SHARD.',
    hp: 150,
    atk: 15,
    def: 3,
    xp: 100,
    scrap: [45, 45],
    boss: true,
    moves: [
      { kind: 'hit', name: 'BRANCH SWEEP', weight: 3 },
      { kind: 'grey', name: 'GREY ROOTS', weight: 2, power: 3 },
      { kind: 'weaken', name: '"YOU\'LL NEVER GROW"', weight: 1, power: 0.7 },
      { kind: 'heal', name: 'DRINKS THE DRIZZLE', weight: 1, power: 0.12 },
    ],
  },

  // ── Static Shore (rec. level 4) ─────────────────────────────────────────
  'static-crab': {
    id: 'static-crab',
    name: 'STATIC CRAB',
    blurb: 'Hard shell, harder opinions.',
    hp: 40,
    atk: 11,
    def: 4,
    xp: 46,
    scrap: [10, 18],
    moves: [
      { kind: 'hit', name: 'PINCH', weight: 3 },
      { kind: 'guard', name: 'SHELL UP', weight: 1 },
    ],
  },
  'naysayer-gull': {
    id: 'naysayer-gull',
    name: 'NAYSAYER GULL',
    blurb: 'Shrieks "NAH" at anything new. Goes straight for the soft spots.',
    hp: 32,
    atk: 11,
    def: 1,
    evade: 0.15,
    xp: 44,
    scrap: [10, 18],
    drops: [{ item: 'paint-bomb', chance: 0.12 }],
    moves: [
      { kind: 'hit', name: 'PECK', weight: 2 },
      { kind: 'pierce', name: '"NAH."', weight: 2 },
    ],
  },
  'riptide-of-meh': {
    id: 'riptide-of-meh',
    name: 'RIPTIDE OF MEH',
    blurb: 'A grey wave that pulls everything a little further from shore.',
    hp: 44,
    atk: 11,
    def: 2,
    xp: 50,
    scrap: [12, 20],
    moves: [
      { kind: 'hit', name: 'CRASH', weight: 2 },
      { kind: 'grey', name: 'UNDERTOW', weight: 1, power: 3 },
      { kind: 'drain', name: 'LOW TIDE', weight: 1, power: 0.8 },
    ],
  },
  'static-king': {
    id: 'static-king',
    name: 'THE STATIC KING',
    blurb: 'A crab the size of a car, crowned in TV snow. Guards the BLUE COLOR SHARD.',
    hp: 215,
    atk: 18,
    def: 6,
    xp: 130,
    scrap: [55, 55],
    boss: true,
    moves: [
      { kind: 'hit', name: 'CROWN PINCH', weight: 3 },
      { kind: 'double', name: 'DOUBLE CLAW', weight: 2 },
      { kind: 'guard', name: 'ROYAL SHELL', weight: 1 },
      { kind: 'drain', name: 'WHITE NOISE', weight: 1, power: 0.8 },
    ],
  },

  // ── The Gloom (chapter 1 boss) ──────────────────────────────────────────
  'the-gloom': {
    id: 'the-gloom',
    name: 'THE GLOOM',
    blurb: 'The low grey cloud that makes everything feel a little pointless. It has a voice, and it sounds like yours on a bad day.',
    hp: 260,
    atk: 18,
    def: 4,
    xp: 300,
    scrap: [80, 80],
    boss: true,
    phase2: {
      at: 0.5,
      atk: 4,
      text: 'THE GLOOM THICKENS. The sky goes dark grey and the drizzle turns to rain. "WHY. EVEN. BOTHER."',
    },
    moves: [
      { kind: 'hit', name: 'DRIZZLE', weight: 3 },
      { kind: 'weaken', name: '"WHY BOTHER?"', weight: 2, power: 0.6, phase: 1 },
      { kind: 'grey', name: 'GREY OUT', weight: 2, power: 3 },
      { kind: 'heavy', name: 'DOWNPOUR', weight: 2, power: 1.6, phase: 2 },
      { kind: 'drain', name: 'IT\'S ALL POINTLESS', weight: 1, power: 0.8, phase: 2 },
    ],
  },
};
