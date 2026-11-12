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

export interface Effect {
  hp?: number;
  maxHp?: number;
  xp?: number;
  stat?: Partial<Record<Stat, number>>;
  item?: string;
  flag?: string;
  /** One-time story reward. `id` is the ledger ref: a player earns it once, ever. */
  gold?: { id: string; amount: number };
}

export interface Requirement {
  item?: string;
  flag?: string;
  notFlag?: string;
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

export interface Item {
  id: string;
  name: string;
  blurb: string;
  bonus?: Partial<Record<Stat, number>>;
  maxHp?: number;
  /** Real product in the site shop (`/shop?item=<handle>`). */
  shopHandle?: string;
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
  inventory: string[];
  flags: string[];
  completed: string[];
}

export type GameEvent =
  | { type: 'roll'; stat: Stat; roll: number; bonus: number; total: number; dc: number; passed: boolean }
  | { type: 'gold'; id: string; amount: number }
  | { type: 'item'; id: string }
  | { type: 'hp'; amount: number }
  | { type: 'xp'; amount: number }
  | { type: 'level'; level: number }
  | { type: 'fallen' }
  | { type: 'chapter_complete'; chapter: string };

export type StepResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: 'bad_choice' | 'locked' | 'requirement'; chapter?: string };
