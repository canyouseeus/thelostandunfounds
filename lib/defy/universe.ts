/**
 * DEFY MULTIVERSE — universe derivation.
 *
 * A universe is not a row. It is a function of an email address.
 *
 *   sha256(normalized_email + PEPPER) -> 32 bytes
 *   bytes[0..7]  -> the 64-bit universe address (18,446,744,073,709,551,616 of them)
 *   bytes[8..]   -> name, constellation, traits, palette, creed
 *
 * Nothing here touches the database. Two calls with the same email always produce
 * the same universe, forever, which is what lets the address space be astronomically
 * large at zero storage cost. Changing PEPPER or any word list below re-rolls every
 * universe that has ever been assigned — treat them as append-only.
 */
import { createHash } from 'crypto'

const PEPPER = '::DEFY-MULTIVERSE::v1'

/** The eight constellations. Your universe belongs to one; it is your side in the standings. */
export const CONSTELLATIONS = [
  { key: 'ASHFORD',     hue: 18,  blurb: 'Born of what was left after the fire went out.' },
  { key: 'BRIGHTWATER', hue: 196, blurb: 'Everything here reflects something that is not here.' },
  { key: 'CARRION',     hue: 348, blurb: 'Nothing is wasted. Nothing is forgiven.' },
  { key: 'DUSKWOLD',    hue: 268, blurb: 'The hour before dark, held open indefinitely.' },
  { key: 'EMBERLINE',   hue: 32,  blurb: 'A thin bright seam between two colder things.' },
  { key: 'FATHOM',      hue: 220, blurb: 'Measured in how far down, never how far across.' },
  { key: 'GLASSMERE',   hue: 156, blurb: 'Still enough to walk on. Never quite solid.' },
  { key: 'HOLLOWTIDE',  hue: 286, blurb: 'It comes in. It takes. It does not go back out.' },
] as const

export const TRAIT_KEYS = ['ENTROPY', 'GRAVITY', 'SIGNAL', 'DECAY', 'LUMEN', 'DRIFT'] as const
export type TraitKey = typeof TRAIT_KEYS[number]

const EPITHETS = [
  'PALE', 'SEVENTH', 'DROWNED', 'PATIENT', 'UNWRITTEN', 'LOW', 'GILDED', 'SILENT',
  'FOLDED', 'LAST', 'HUNGRY', 'CIVIL', 'BURNING', 'HOLLOW', 'SLOW', 'BRIEF',
  'IRON', 'SUNKEN', 'VACANT', 'FAITHFUL', 'SPLIT', 'QUIET', 'BITTER', 'FIRST',
  'BLIND', 'TIDAL', 'THIN', 'GREAT', 'LESSER', 'CROOKED', 'HONEST', 'FALSE',
  'WAKING', 'SEALED', 'OPEN', 'LONG', 'SUDDEN', 'ANCIENT', 'BORROWED', 'STOLEN',
  'GENTLE', 'SEVERE', 'NAMELESS', 'TWICE-BUILT', 'UNLIT', 'RUINED', 'PERFECT', 'RUSTED',
  'WINTERED', 'MARKED', 'FORGIVEN', 'ORPHAN', 'ARDENT', 'MUTE', 'GLAD', 'STARVED',
  'WIDE', 'NARROW', 'BRIGHT', 'DIM', 'CERTAIN', 'DOUBTFUL', 'ETERNAL', 'MORTAL',
]

const ROOTS = [
  'HOLLOWAY', 'UNDERTOW', 'VANTAGE', 'CINDERFALL', 'MERIDIAN', 'THRESHOLD', 'ARCHIVE', 'HARBOR',
  'LANTERN', 'REMNANT', 'CATHEDRAL', 'FURROW', 'SIGNAL', 'BASTION', 'ORCHARD', 'QUARRY',
  'PASSAGE', 'RECKONING', 'FOUNDRY', 'MARROW', 'BELFRY', 'ESTUARY', 'CAUSEWAY', 'WATCHTOWER',
  'GARDEN', 'TERMINUS', 'REFUGE', 'CROSSING', 'PROMISE', 'INTERVAL', 'RESERVOIR', 'SPIRE',
  'HINTERLAND', 'ANTECHAMBER', 'DELTA', 'BULWARK', 'AVIARY', 'CISTERN', 'MEADOWLARK', 'OBSERVATORY',
  'SALTFLAT', 'DOWNPOUR', 'GRAVEYARD', 'WORKSHOP', 'PILGRIMAGE', 'AFTERMATH', 'CORRIDOR', 'ALMANAC',
  'LIGHTHOUSE', 'MOORING', 'SEPULCHRE', 'ORBIT', 'FRACTURE', 'CONFLUENCE', 'HEARTHSTONE', 'VESTIBULE',
  'BOUNDARY', 'MENAGERIE', 'AQUEDUCT', 'PARAPET', 'SANCTUM', 'DRIFTWOOD', 'STOREHOUSE', 'FIRMAMENT',
]

const CREED_OPENERS = [
  'We do not agree, and that is the point.',
  'We were assigned. We did not apply.',
  'We keep what the others threw out.',
  'We count differently here.',
  'We arrived late and stayed longest.',
  'We are what the majority is not.',
  'We hold the line nobody drew.',
  'We remember the version before this one.',
  'We were never asked, so we answered anyway.',
  'We measure worth by who disagrees.',
  'We do not follow. We are not followed.',
  'We take the smaller road on purpose.',
  'We built this out of what did not fit.',
  'We are the correction, not the record.',
  'We are outnumbered and unbothered.',
  'We do the arithmetic ourselves.',
]

const CREED_MIDDLES = [
  'The crowd is a direction, not a destination.',
  'Consensus is a kind of weather. It passes.',
  'Whatever everyone chose, something was lost choosing it.',
  'The majority is only ever early or wrong.',
  'A thing believed by all is a thing examined by none.',
  'Agreement is cheap. Standing apart costs.',
  'There is no safety in numbers, only company.',
  'The loudest answer is rarely the last one.',
  'Every rule was once a minority opinion.',
  'What is obvious has already stopped being true.',
  'The road with everyone on it goes nowhere new.',
  'Certainty is the sound a door makes closing.',
  'Being right and being outvoted are not opposites.',
  'The record is written by whoever stayed to write it.',
  'We were told the answer. We checked.',
  'Numbers persuade. They do not prove.',
]

const CREED_CLOSERS = [
  'Defy accordingly.',
  'Choose last. Choose alone.',
  'Hold.',
  'Count again.',
  'Break with it.',
  'Stand where it is thin.',
  'Take the empty side.',
  'Refuse the obvious.',
  'Go the other way.',
  'Wait for the room to lean, then do not.',
  'Be the remainder.',
  'Answer for your universe.',
  'The smaller side is the side.',
  'Dissent, precisely.',
  'Nothing is settled.',
  'Begin outnumbered.',
]

export interface Universe {
  /** 16 hex chars — the 64-bit coordinate. Unique to this email, effectively forever. */
  address: string
  /** Human-facing designation, e.g. "PALE HOLLOWAY". Repeats across the address space by design. */
  name: string
  /** Full designation, e.g. "PALE HOLLOWAY · 7F3A9C21E4B02D18". Unique. */
  designation: string
  constellation: number
  constellationKey: string
  constellationBlurb: string
  traits: Record<TraitKey, number>
  palette: { hue: number; accent: string; deep: string; wash: string }
  creed: string
  /** 1-in-N phrasing for the reveal. Always the full address space. */
  rarity: string
}

export const UNIVERSE_ADDRESS_SPACE = 18446744073709551616n // 2^64

export function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase()
}

export function isPlausibleEmail(email: string): boolean {
  const e = normalizeEmail(email)
  // Deliberately permissive: one @, something either side, a dot in the domain, no spaces.
  return e.length <= 254 && /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(e)
}

/**
 * Derive the universe for an email. Pure — same input, same output, no I/O.
 */
export function deriveUniverse(email: string): Universe {
  const normalized = normalizeEmail(email)
  const h = createHash('sha256').update(normalized + PEPPER).digest()

  const address = h.subarray(0, 8).toString('hex').toUpperCase()

  const traits = {} as Record<TraitKey, number>
  TRAIT_KEYS.forEach((key, i) => {
    // 1..100 rather than 0..255 so the reveal bars read as percentages.
    traits[key] = 1 + Math.floor((h[8 + i] / 256) * 100)
  })

  const constellation = h[14] % CONSTELLATIONS.length
  const c = CONSTELLATIONS[constellation]

  const name = `${EPITHETS[h[15] % EPITHETS.length]} ${ROOTS[h[16] % ROOTS.length]}`

  // Members of a constellation are recognizably related: same base hue, +/- 14 degrees.
  const hue = (c.hue + ((h[17] % 29) - 14) + 360) % 360
  const sat = 58 + (h[18] % 22)
  const palette = {
    hue,
    accent: `hsl(${hue} ${sat}% 62%)`,
    deep: `hsl(${hue} ${Math.round(sat * 0.7)}% 12%)`,
    wash: `hsl(${hue} ${Math.round(sat * 0.5)}% 6%)`,
  }

  const creed = [
    CREED_OPENERS[h[19] % CREED_OPENERS.length],
    CREED_MIDDLES[h[20] % CREED_MIDDLES.length],
    CREED_CLOSERS[h[21] % CREED_CLOSERS.length],
  ].join(' ')

  return {
    address,
    name,
    designation: `${name} · ${address}`,
    constellation,
    constellationKey: c.key,
    constellationBlurb: c.blurb,
    traits,
    palette,
    creed,
    rarity: UNIVERSE_ADDRESS_SPACE.toLocaleString('en-US'),
  }
}

/** The multiverse day. UTC so every player everywhere gets the same defiance at the same instant. */
export function currentDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}
