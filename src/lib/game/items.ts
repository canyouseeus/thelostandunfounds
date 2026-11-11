import type { Item } from './types.js';

/**
 * Gear. Items with a `shopHandle` are merch drops: the same piece is sold for
 * real in the site shop, and the game links to it. Handles match the live
 * catalog (/api/shop/products) as of 2026-11-11.
 */
export const ITEMS: Record<string, Item> = {
  'scot33-band-tee': {
    id: 'scot33-band-tee',
    name: '"SCOT33" BAND TEE',
    blurb: 'Came free in the Deluxe Edition box. Good vibes, on purpose. +1 STYLE.',
    bonus: { style: 1 },
    shopHandle: 'scot33-band-tee',
  },
  'toulous3-trucker': {
    id: 'toulous3-trucker',
    name: '"TOULOUS3" FOAM TRUCKER HAT',
    blurb: 'Official FR33DOM INC. tech support headwear. +1 WITS.',
    bonus: { wits: 1 },
    shopHandle: 'toulous3-foam-trucker-hat',
  },
  'scot33-dad-hat': {
    id: 'scot33-dad-hat',
    name: '"SCOT33" DAD HAT',
    blurb: 'Keeps the sun of a brand-new world out of your eyes. +1 WITS.',
    bonus: { wits: 1 },
    shopHandle: 'scot33-dad-hat',
  },
  'scot33-crewneck': {
    id: 'scot33-crewneck',
    name: '"SCOT33" BAND CREWNECK',
    blurb: 'Warm enough for any climate you build. +1 GRIT, +5 MAX HP.',
    bonus: { grit: 1 },
    maxHp: 5,
    shopHandle: 'scot33-band-crewneck',
  },
  'w3-com3-tee': {
    id: 'w3-com3-tee',
    name: 'W3 COM3 TO 3AT YOUR BRAIN!!! BAND TEE',
    blurb: 'Wear their words and they can\'t use them on you. +1 GRIT.',
    bonus: { grit: 1 },
    shopHandle: 'w3-com3-to-3at-your-brain-band-tee',
  },
  'scot33-crop': {
    id: 'scot33-crop',
    name: '"SCOT33" WOMENS CROP TOP',
    blurb: 'Crew shirt for the first citizens of your world. +1 STYLE.',
    bonus: { style: 1 },
    shopHandle: 'scot33-womens-crop-top',
  },
  'warranty-card': {
    id: 'warranty-card',
    name: 'WARRANTY CARD',
    blurb: 'WORLD BUILD3R 3000 DELUXE EDITION. Lifetime coverage. Read the back.',
  },
  'film': {
    id: 'film',
    name: 'INSTANT CAMERA',
    blurb: 'Snap a moment and the BUILD3R can build it again. People see themselves honestly in it.',
  },
  'gilded-key': {
    id: 'gilded-key',
    name: 'MASTER BUILD KEY',
    blurb: 'Unlocks every setting on any WORLD BUILD3R ever made.',
  },
};

export function itemName(id: string): string {
  return ITEMS[id]?.name ?? id.toUpperCase();
}
