import type { Item } from './types.js';

/**
 * Gear, consumables and key items.
 *
 * Items with a `shopHandle` are merch drops: the same piece is sold for
 * real in the site shop, and the game links to it. Handles match the live
 * catalog (/api/shop/products) as of 2026-11-11.
 *
 * Gear has a `slot` and only counts while equipped. Consumables have a `use`
 * and stack in the bag. Prices are SCRAP (in-game only, never money).
 */
export const ITEMS: Record<string, Item> = {
  // ── Merch drops (real products) ─────────────────────────────────────────
  'scot33-band-tee': {
    id: 'scot33-band-tee',
    name: '"SCOT33" BAND TEE',
    blurb: 'Came free in the Deluxe Edition box. Good vibes, on purpose.',
    slot: 'body',
    def: 1,
    bonus: { style: 1 },
    shopHandle: 'scot33-band-tee',
  },
  'toulous3-trucker': {
    id: 'toulous3-trucker',
    name: '"TOULOUS3" FOAM TRUCKER HAT',
    blurb: 'Official FR33 D. OHM INC. tech support headwear.',
    slot: 'head',
    def: 1,
    bonus: { wits: 1 },
    shopHandle: 'toulous3-foam-trucker-hat',
  },
  'scot33-dad-hat': {
    id: 'scot33-dad-hat',
    name: '"SCOT33" DAD HAT',
    blurb: 'Keeps the sun of a brand-new world out of your eyes.',
    slot: 'head',
    def: 1,
    bonus: { wits: 1 },
    shopHandle: 'scot33-dad-hat',
  },
  'scot33-crewneck': {
    id: 'scot33-crewneck',
    name: '"SCOT33" BAND CREWNECK',
    blurb: 'Warm enough for any climate you build. Fits like armor.',
    slot: 'body',
    def: 4,
    bonus: { grit: 1 },
    maxHp: 5,
    shopHandle: 'scot33-band-crewneck',
  },
  'w3-com3-tee': {
    id: 'w3-com3-tee',
    name: 'W3 COM3 TO 3AT YOUR BRAIN!!! BAND TEE',
    blurb: 'Wear their words and they can\'t use them on you.',
    slot: 'body',
    def: 3,
    bonus: { grit: 1 },
    shopHandle: 'w3-com3-to-3at-your-brain-band-tee',
  },
  'scot33-crop': {
    id: 'scot33-crop',
    name: '"SCOT33" WOMENS CROP TOP',
    blurb: 'Crew shirt for the first citizens of your world.',
    slot: 'body',
    def: 3,
    bonus: { style: 1 },
    shopHandle: 'scot33-womens-crop-top',
  },

  // ── Weapons (building tools) ────────────────────────────────────────────
  'bubble-gloves': {
    id: 'bubble-gloves',
    name: 'BUBBLE WRAP GLOVES',
    blurb: 'Packed in the box. Every punch pops.',
    slot: 'weapon',
    atk: 1,
  },
  'foam-hammer': {
    id: 'foam-hammer',
    name: 'FOAM HAMMER',
    blurb: 'Soft on the outside. Not on the inside.',
    slot: 'weapon',
    atk: 3,
    price: 45,
  },
  'paint-roller': {
    id: 'paint-roller',
    name: 'PAINT ROLLER',
    blurb: 'Rolls color back into whatever it hits.',
    slot: 'weapon',
    atk: 4,
    bonus: { style: 1 },
  },
  'steel-wrench': {
    id: 'steel-wrench',
    name: 'STEEL-TOE WRENCH',
    blurb: 'FR33 D. OHM INC. field-repair tool. Finds the weak bolt.',
    slot: 'weapon',
    atk: 5,
    crit: 10,
  },
  'color-cannon': {
    id: 'color-cannon',
    name: 'COLOR CANNON',
    blurb: 'Fires pure, concentrated color. Top shelf at the support desk.',
    slot: 'weapon',
    atk: 7,
    price: 260,
  },

  // ── Headwear ────────────────────────────────────────────────────────────
  'hard-hat': {
    id: 'hard-hat',
    name: 'HARD HAT',
    blurb: 'Some assembly required. Some protection included.',
    slot: 'head',
    def: 1,
    maxHp: 4,
    price: 35,
  },
  'dev-visor': {
    id: 'dev-visor',
    name: 'DEVELOPER VISOR',
    blurb: 'Shows the code behind things. Mostly the bugs.',
    slot: 'head',
    def: 1,
    bonus: { wits: 2 },
  },

  // ── Body ────────────────────────────────────────────────────────────────
  'cardboard-armor': {
    id: 'cardboard-armor',
    name: 'CARDBOARD ARMOR',
    blurb: 'Made from the WRLD BLDR box. Double-walled.',
    slot: 'body',
    def: 3,
    price: 55,
  },
  'bubble-jacket': {
    id: 'bubble-jacket',
    name: 'BUBBLE WRAP JACKET',
    blurb: 'Pop-proof. Mostly.',
    slot: 'body',
    def: 4,
    maxHp: 8,
  },

  // ── Trinkets ────────────────────────────────────────────────────────────
  'sunny-pin': {
    id: 'sunny-pin',
    name: 'SUNNY SIDE PIN',
    blurb: 'A little enamel sun. Hard to hit someone this cheerful.',
    slot: 'trinket',
    bonus: { style: 2 },
  },
  'lucky-bolt': {
    id: 'lucky-bolt',
    name: 'LUCKY BOLT',
    blurb: 'Came off something important. Still warm.',
    slot: 'trinket',
    crit: 8,
    bonus: { wits: 1 },
  },
  'acorn-of-maybe': {
    id: 'acorn-of-maybe',
    name: 'ACORN OF MAYBE',
    blurb: 'Dropped by the DOUBTWOOD ELDER. Turns out maybe means yes.',
    slot: 'trinket',
    maxHp: 10,
    bonus: { grit: 1 },
  },

  // ── Consumables (SCRAP prices at the support desk) ──────────────────────
  taco: {
    id: 'taco',
    name: 'TACO',
    blurb: 'TOULOUS3\'s favorite. Heals 14 HP.',
    use: { heal: 14 },
    carry: 9,
    price: 12,
  },
  'spicy-taco': {
    id: 'spicy-taco',
    name: 'EXTRA SPICY TACO',
    blurb: 'Heals 10 HP and PUMPS you up: +30% damage for 3 turns.',
    use: { heal: 10, pumped: 3 },
    carry: 5,
    price: 28,
  },
  'pep-soda': {
    id: 'pep-soda',
    name: 'PEP SODA',
    blurb: '+3 VIBE and shakes off GREYED and WEAKENED. Fights only.',
    use: { vibe: 3, cleanse: true, combatOnly: true },
    carry: 5,
    price: 20,
  },
  'paint-bomb': {
    id: 'paint-bomb',
    name: 'PAINT BOMB',
    blurb: '15 damage, straight through any armor. Fights only.',
    use: { damage: 15, combatOnly: true },
    carry: 5,
    price: 24,
  },
  'spare-battery': {
    id: 'spare-battery',
    name: 'SPARE BATTERY',
    blurb: 'If you would fall in a fight, it kicks in and brings you back at half HP. Carry one.',
    use: { revive: true, combatOnly: true },
    carry: 1,
    price: 70,
  },

  // ── Key items ───────────────────────────────────────────────────────────
  'warranty-card': {
    id: 'warranty-card',
    name: 'WARRANTY CARD',
    blurb: 'WRLD BLDR 3000 DELUXE EDITION. Lifetime coverage. Read the back.',
  },
  film: {
    id: 'film',
    name: 'INSTANT CAMERA',
    blurb: 'Snap a moment and the BLDR can build it again. People see themselves honestly in it.',
  },
  'gilded-key': {
    id: 'gilded-key',
    name: 'MASTER BUILD KEY',
    blurb: 'Unlocks every setting on any WRLD BLDR ever made.',
  },
  'shard-green': {
    id: 'shard-green',
    name: 'GREEN COLOR SHARD',
    blurb: 'The color of grass that has never been grey. 1 of 3.',
  },
  'shard-orange': {
    id: 'shard-orange',
    name: 'ORANGE COLOR SHARD',
    blurb: 'The color a tree picks when it gets to pick. 1 of 3.',
  },
  'shard-blue': {
    id: 'shard-blue',
    name: 'BLUE COLOR SHARD',
    blurb: 'The color of a sky with nothing to hide. 1 of 3.',
  },
};

export function itemName(id: string): string {
  return ITEMS[id]?.name ?? id.toUpperCase();
}

export function isConsumable(id: string): boolean {
  return !!ITEMS[id]?.use;
}

/** One line of what a piece of gear does: "ATK +3 · DEF +1 · WITS +2". */
export function gearSummary(id: string): string {
  const it = ITEMS[id];
  if (!it) return '';
  const parts: string[] = [];
  if (it.atk) parts.push(`ATK +${it.atk}`);
  if (it.def) parts.push(`DEF +${it.def}`);
  if (it.maxHp) parts.push(`MAX HP +${it.maxHp}`);
  if (it.crit) parts.push(`CRIT +${it.crit}%`);
  for (const [k, v] of Object.entries(it.bonus ?? {})) if (v) parts.push(`${k.toUpperCase()} +${v}`);
  return parts.join(' · ');
}
