/**
 * FR33 D. OHM INC. — the text RPG at /game.
 *
 * The same engine runs in two places:
 *   - the browser, for guests (progress in localStorage, gold is only a preview);
 *   - the server (/api/game), for signed-in players. There the dice are rolled
 *     server-side and every gold reward is a ledger row, so gold can only be
 *     earned by actually playing.
 */

export type Stat = 'grit' | 'wits' | 'style';

export const STATS: Stat[] = ['grit', 'wits', 'style'];

export type Slot = 'weapon' | 'head' | 'body' | 'trinket';

export const SLOTS: Slot[] = ['weapon', 'head', 'body', 'trinket'];

export type ClassId = 'builder' | 'thinker' | 'dreamer';

export interface Effect {
  hp?: number;
  /** Refill HP to max. */
  fullHeal?: boolean;
  maxHp?: number;
  xp?: number;
  /** SCRAP: the in-game currency for TOULOUS3's shop. Not money, never redeemable. */
  scrap?: number;
  stat?: Partial<Record<Stat, number>>;
  item?: string;
  /** Extra items (gear, key items or consumables). */
  items?: string[];
  /** Consumables added to the bag: id → count. */
  bag?: Record<string, number>;
  flag?: string;
  flags?: string[];
  cls?: ClassId;
  /** One-time story reward. `id` is the ledger ref: a player earns it once, ever. */
  gold?: { id: string; amount: number };
}

export interface Requirement {
  item?: string;
  flag?: string;
  /** Every one of these flags. */
  flags?: string[];
  notFlag?: string;
}

/** A scripted fight: one enemy, or several in a row (waves). */
export interface FightSpec {
  enemies: string[];
  /** Node to go to after the last enemy falls. */
  win: string;
  /** Bosses and ambushes: no running. */
  noFlee?: boolean;
  /** Applied once the fight is won (story gold, flags, loot). */
  reward?: Effect;
}

/** Search an area: a random fight, or something found on the ground. */
export interface ExploreSpec {
  /** 0..1: chance the search turns up a fight. */
  fightChance: number;
  encounters: { enemy: string; weight: number }[];
  finds: { weight: number; text: string; scrap?: [number, number]; item?: string }[];
}

export interface Check {
  stat: Stat;
  /** Roll d20 + stat; pass on >= dc. */
  dc: number;
  pass: string;
  fail: string;
  passEffect?: Effect;
  failEffect?: Effect;
}

export interface Choice {
  id: string;
  label: string;
  /** Node id, or `chapter:<id>` to start another chapter. */
  to?: string;
  check?: Check;
  effect?: Effect;
  requires?: Requirement;
  fight?: FightSpec;
  explore?: ExploreSpec;
  /** Shown on the button, e.g. "REC. LV 3". */
  hint?: string;
}

/** Poster art shown in a scene (files in public/game-art/cutouts). */
export interface SceneArt {
  /** File stem: `/game-art/cutouts/<stem>.webp` (1200w) and `<stem>-600.webp`. */
  stem: string;
  alt: string;
  /** Intrinsic size of the 1200w file, to reserve space while it loads. */
  width: number;
  height: number;
  /** Black-on-white art sits on a white card; white art sits on the dark page. */
  card: boolean;
  /** Max display width in px. */
  maxWidth: number;
}

export interface StoryNode {
  id: string;
  title?: string;
  /** Optional art shown above the scene text. */
  art?: SceneArt;
  text: string[];
  /** Applied once, on arrival. */
  onEnter?: Effect;
  choices: Choice[];
  /** Last node of the chapter. */
  end?: boolean;
  /** Falling in a fight sends you back to the last checkpoint you reached. */
  checkpoint?: boolean;
  /** Items TOULOUS3 sells here, for SCRAP. */
  shop?: string[];
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  tagline: string;
  /** 0 = free. Paid chapters unlock through Stripe Checkout. */
  priceCents: number;
  start: string;
  nodes: Record<string, StoryNode>;
}

export interface ConsumableUse {
  heal?: number;
  vibe?: number;
  /** Damage that ignores DEF. */
  damage?: number;
  /** Turns of PUMPED (+30% damage). */
  pumped?: number;
  /** Clears GREYED and WEAKENED. */
  cleanse?: boolean;
  /** Used automatically when you would fall in a fight: back up at 50% HP. */
  revive?: boolean;
  /** Only usable in a fight. */
  combatOnly?: boolean;
}

export interface Item {
  id: string;
  name: string;
  blurb: string;
  bonus?: Partial<Record<Stat, number>>;
  maxHp?: number;
  /** Gear: the slot it is worn in. Only equipped gear counts. */
  slot?: Slot;
  atk?: number;
  def?: number;
  /** Extra crit chance, in percent. */
  crit?: number;
  /** Consumable: goes in the bag, stacks. */
  use?: ConsumableUse;
  /** Most of one consumable you can carry. */
  carry?: number;
  /** Price in SCRAP at TOULOUS3's shop. */
  price?: number;
  /** Real product in the site shop (`/shop?item=<handle>`). */
  shopHandle?: string;
}

export type EnemyMoveKind = 'hit' | 'heavy' | 'double' | 'pierce' | 'weaken' | 'grey' | 'drain' | 'guard' | 'heal';

export interface EnemyMove {
  kind: EnemyMoveKind;
  name: string;
  weight: number;
  /** Damage multiplier (default 1). For `grey`, damage per turn. For `heal`, share of max HP. */
  power?: number;
  /** Only in this phase (bosses). */
  phase?: 1 | 2;
}

export interface Enemy {
  id: string;
  name: string;
  blurb: string;
  hp: number;
  atk: number;
  def: number;
  /** 0..1 chance your hits miss, on top of the base miss chance. */
  evade?: number;
  xp: number;
  scrap: [number, number];
  drops?: { item: string; chance: number }[];
  moves: EnemyMove[];
  boss?: boolean;
  /** Bosses: a second phase below this share of HP. */
  phase2?: { at: number; atk: number; def?: number; text: string };
}

export interface CombatState {
  enemy: string;
  hp: number;
  maxHp: number;
  /** Enemies still to come after this one. */
  queue: string[];
  phase: 1 | 2;
  turn: number;
  /** Builds every turn; skills spend it. */
  vibe: number;
  you: { weak: number; grey: number; greyDmg: number; pumped: number; guard: boolean };
  foe: { weak: number; stun: number; guard: boolean };
  win: string;
  noFlee?: boolean;
  reward?: Effect;
}

export interface GameState {
  v: number;
  chapter: string;
  node: string;
  hp: number;
  maxHp: number;
  stats: Record<Stat, number>;
  xp: number;
  level: number;
  /** Gear and key items owned. Consumables live in `bag`. */
  inventory: string[];
  flags: string[];
  completed: string[];
  /** v2+: RPG systems. */
  cls?: ClassId | null;
  scrap: number;
  equipped: Partial<Record<Slot, string>>;
  bag: Record<string, number>;
  statPoints: number;
  combat: CombatState | null;
  checkpoint: string;
}

export type GameEvent =
  | { type: 'roll'; stat: Stat; roll: number; bonus: number; total: number; dc: number; passed: boolean }
  | { type: 'gold'; id: string; amount: number }
  | { type: 'item'; id: string }
  | { type: 'hp'; amount: number }
  | { type: 'xp'; amount: number }
  | { type: 'level'; level: number }
  | { type: 'fallen'; scrapLost?: number; revived?: boolean }
  | { type: 'scrap'; amount: number }
  | { type: 'log'; text: string; tone?: 'hit' | 'hurt' | 'info' | 'win' }
  | { type: 'chapter_complete'; chapter: string };

export type StepResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: 'bad_choice' | 'locked' | 'requirement' | 'in_combat' | 'scrap'; chapter?: string };
