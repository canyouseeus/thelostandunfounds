import type { Chapter, StoryNode } from './types.js';

/**
 * FR33 D. OHM INC. — story content.
 *
 * FR33 D. OHM INC. makes THE WRLD BLDR, a line of personal world generators.
 * SCOT33 (a tiger, always positive) has just got his brand-new WRLD BLDR
 * 3000 DELUXE EDITION, and he can't wait to build a world where everyone else
 * can be positive too.
 *
 * Gold reward ids (`gold.id`) are ledger refs: a player earns each one once,
 * ever, even if they replay. Never rename a live id — that would pay it again.
 * Fail branches always move the story forward (at a cost in HP), so nobody
 * gets stuck; running out of HP restarts the chapter with gear kept.
 */

function nodes(list: StoryNode[]): Record<string, StoryNode> {
  return Object.fromEntries(list.map((n) => [n.id, n]));
}

const ch1: Chapter = {
  id: 'ch1',
  number: 1,
  title: 'UNBOXING',
  tagline: 'SCOT33\'s brand-new WRLD BLDR 3000 DELUXE EDITION just arrived. Time to build a world.',
  priceCents: 0,
  start: 'ch1.start',
  nodes: nodes([
    {
      id: 'ch1.start',
      title: 'THE BOX',
      art: {
        stem: 'wrld-bldr-3000-robot-and-box',
        alt: 'The WRLD BLDR 3000 Deluxe Edition by FR33 D. OHM INC.: a boxy robot with antennae pops out of its package beside the box label.',
        width: 1200,
        height: 995,
        card: true,
        maxWidth: 420,
      },
      text: [
        'The box is taller than SCOT33. Across the side, in big friendly letters: FR33 D. OHM INC. PRESENTS THE WRLD BLDR 3000 DELUXE EDITION. PERSONAL WORLD GENERATOR. SOME ASSEMBLY REQUIRED.',
        'SCOT33 has wanted one of these his whole life. Not for himself. He wants to build a world where everyone gets to feel the way he feels right now.',
        'Taped to the lid, the quick-start card asks one question: HOW DO YOU LIKE TO BUILD?',
      ],
      choices: [
        { id: 'brawler', label: 'WITH MY OWN TWO HANDS. (BUILDER: +2 GRIT)', to: 'ch1.desk', effect: { stat: { grit: 2 }, flag: 'class' }, requires: { notFlag: 'class' } },
        { id: 'sleuth', label: 'I READ THE WHOLE MANUAL FIRST. (THINKER: +2 WITS)', to: 'ch1.desk', effect: { stat: { wits: 2 }, flag: 'class' }, requires: { notFlag: 'class' } },
        { id: 'icon', label: 'I FREESTYLE IT. (DREAMER: +2 STYLE)', to: 'ch1.desk', effect: { stat: { style: 2 }, flag: 'class' }, requires: { notFlag: 'class' } },
        { id: 'again', label: 'OPEN THE BOX AGAIN', to: 'ch1.desk', requires: { flag: 'class' } },
      ],
    },
    {
      id: 'ch1.desk',
      title: 'FIRST BOOT',
      text: [
        'Under a sea of packing peanuts: the WRLD BLDR itself, a chrome dome with one big round button, plus a warranty card. SCOT33 presses the button. It hums, glows, and shows a sad face.',
        'ERROR 33: NO WORLD SEED FOUND.',
        '"That\'s okay," SCOT33 tells it. "Everybody has a rough first day."',
      ],
      onEnter: { item: 'warranty-card' },
      choices: [
        { id: 'shove', label: 'GIVE IT A FRIENDLY THUMP', check: { stat: 'grit', dc: 11, pass: 'ch1.lostfound', fail: 'ch1.lostfound', passEffect: { xp: 20 }, failEffect: { hp: -5, xp: 5 } } },
        { id: 'talk', label: 'TELL IT WHAT KIND OF WORLD YOU WANT', check: { stat: 'style', dc: 11, pass: 'ch1.lostfound', fail: 'ch1.lostfound', passEffect: { xp: 20 }, failEffect: { hp: -4, xp: 5 } } },
        { id: 'vent', label: 'FIND THE HIDDEN SETTINGS MENU', check: { stat: 'wits', dc: 12, pass: 'ch1.vents', fail: 'ch1.lostfound', passEffect: { xp: 20 }, failEffect: { hp: -3, xp: 5 } } },
      ],
    },
    {
      id: 'ch1.vents',
      title: 'DEVELOPER MODE',
      text: [
        'Hold the button, tap it three times, hold again. The screen flips to DEVELOPER MODE. Someone at FR33 D. OHM INC. left a note in the code: "FOR WHOEVER FINDS THIS. BUILD SOMETHING KIND."',
        'A compartment clicks open. Inside are an instant camera and a little pouch of starter gold.',
      ],
      onEnter: { item: 'film', gold: { id: 'ch1.vents', amount: 25 } },
      choices: [{ id: 'drop', label: 'BACK TO THE MAIN MENU', to: 'ch1.lostfound' }],
    },
    {
      id: 'ch1.lostfound',
      title: 'DELUXE EDITION EXTRAS',
      art: {
        stem: 'build-your-own-reality-headline-white',
        alt: 'BUILD YOUR OWN REALITY!',
        width: 1200,
        height: 1105,
        card: false,
        maxWidth: 300,
      },
      text: [
        'At the bottom of the box is the Deluxe Edition bonus: a black tee with SCOT33\'s own face on it. He puts it on at once. The WRLD BLDR\'s sad face flips into a smile.',
        'WORLD SEED ACCEPTED. GENERATING WORLD ONE.',
      ],
      onEnter: { item: 'scot33-band-tee', gold: { id: 'ch1.lostfound', amount: 25 } },
      choices: [{ id: 'out', label: 'STEP INTO WORLD ONE', to: 'ch1.street' }],
    },
    {
      id: 'ch1.street',
      title: 'WORLD ONE',
      text: [
        'World One is an island the size of a backyard, and it is completely grey: grey grass, grey sky, a grey tree waiting to be told what color to be.',
        'Over the horizon drifts the Gloom, a low grey cloud that makes everything it touches feel a little pointless.',
        'On the grey tree sits a cat in a foam trucker hat with a FR33 D. OHM INC. badge. He\'s eating a taco.',
      ],
      choices: [
        { id: 'cat', label: '"HI! ARE YOU PART OF THE WORLD?"', to: 'ch1.toulous3' },
        { id: 'run', label: 'START BUILDING BEFORE THE GLOOM ARRIVES', check: { stat: 'grit', dc: 12, pass: 'ch1.static', fail: 'ch1.static', passEffect: { xp: 15 }, failEffect: { hp: -4 } } },
      ],
    },
    {
      id: 'ch1.toulous3',
      title: 'TECH SUPPORT',
      text: [
        '"TOULOUS3, FR33 D. OHM INC. Customer Support." He waves the taco. "Every new BLDR gets a support cat. Most people build a world just for themselves. A castle, a moat, keep out."',
        '"So what\'s yours for, tiger?"',
      ],
      choices: [
        { id: 'film', label: 'SNAP A PHOTO OF HIM SMILING AND SHOW HIM', to: 'ch1.recruit', effect: { xp: 30 }, requires: { item: 'film' } },
        { id: 'pitch', label: '"FOR EVERYBODY. A WORLD WHERE ANYONE CAN BE POSITIVE."', check: { stat: 'style', dc: 12, pass: 'ch1.recruit', fail: 'ch1.static', passEffect: { xp: 30 }, failEffect: { hp: -3 } } },
        { id: 'leave', label: '"TELL YOU LATER. THE GLOOM IS HERE!"', to: 'ch1.static' },
      ],
    },
    {
      id: 'ch1.recruit',
      title: 'CO-BUILDER',
      text: [
        'TOULOUS3 is quiet for a second. Then he drops out of the tree and offers a paw. "Nobody\'s ever said that in the setup wizard before. I\'m in. Support cat, co-builder, whatever you need."',
        'The grey tree turns a little bit green.',
      ],
      onEnter: { flag: 'crew_toulous3', gold: { id: 'ch1.recruit', amount: 50 } },
      choices: [{ id: 'go', label: 'FACE THE GLOOM TOGETHER', to: 'ch1.static' }],
    },
    {
      id: 'ch1.static',
      title: 'THE GLOOM',
      text: [
        'The Gloom rolls over the island. Under it, SCOT33 hears a small voice: "Why bother? It\'s just going to be grey anyway." The tree starts to droop.',
        'SCOT33 grins. He has heard that voice before, and he has never once agreed with it.',
      ],
      choices: [
        { id: 'fight', label: 'BUILD A WINDMILL AND BLOW IT AWAY', check: { stat: 'grit', dc: 12, pass: 'ch1.win', fail: 'ch1.win', passEffect: { xp: 40 }, failEffect: { hp: -7, xp: 10 } } },
        { id: 'flash', label: 'CODE A SUNRISE IN DEVELOPER MODE', check: { stat: 'wits', dc: 11, pass: 'ch1.win', fail: 'ch1.win', passEffect: { xp: 40 }, failEffect: { hp: -6, xp: 10 } } },
        { id: 'crew', label: '"TOULOUS3, HIT THE COLOR BUTTON!"', to: 'ch1.win', effect: { xp: 40 }, requires: { flag: 'crew_toulous3' } },
      ],
    },
    {
      id: 'ch1.win',
      title: 'FIRST COLOR',
      text: [
        'The Gloom thins to mist, then to nothing. Color pours in: green grass, blue sky, and a tree that chooses orange because it can. Down on the shore, a little boat bumps the sand. World One has its first visitor.',
      ],
      onEnter: { gold: { id: 'ch1.win', amount: 25 } },
      choices: [{ id: 'walk', label: 'GO SAY HELLO', to: 'ch1.end' }],
    },
    {
      id: 'ch1.end',
      title: 'WORLD ONE IS LIVE',
      art: {
        stem: 'wrld-bldr-3000-artwork',
        alt: 'The WRLD BLDR 3000 poster: BUILD YOUR OWN REALITY! above the robot and its Deluxe Edition box, signed THE LOST+UNFOUNDS.',
        width: 1200,
        height: 1787,
        card: true,
        maxWidth: 360,
      },
      text: [
        'The visitor steps off the boat, looks around and smiles without meaning to. SCOT33 puts up a sign: WORLD ONE. EVERYONE WELCOME. BE AS POSITIVE AS YOU LIKE.',
        'The WRLD BLDR chimes. NEW MESSAGE: "Congratulations! Your world has been selected for the WRLD BLDR EXPO. A collector called THE GILDED MAN would like to make you an offer."',
        'END OF CHAPTER 1.',
      ],
      end: true,
      onEnter: { gold: { id: 'ch1.complete', amount: 25 } },
      choices: [{ id: 'next', label: 'CHAPTER 2: THE GILDED MAN', to: 'chapter:ch2' }],
    },
  ]),
};

const ch2: Chapter = {
  id: 'ch2',
  number: 2,
  title: 'THE GILDED MAN',
  tagline: 'At the WRLD BLDR EXPO, a collector wants to buy SCOT33\'s world and cover it in gold.',
  priceCents: 300,
  start: 'ch2.start',
  nodes: nodes([
    {
      id: 'ch2.start',
      title: 'THE OFFER',
      text: [
        'An envelope of beaten gold leaf floats into World One. Inside is an offer from THE GILDED MAN, the richest collector at the EXPO. He buys worlds, paints every inch of them gold and locks the gate. The number has a lot of zeros, and the signature line is already signed.',
        'TOULOUS3 sniffs it. "Smells like a trap with a gift bag."',
      ],
      choices: [
        { id: 'tear', label: '"THANK YOU, BUT IT\'S NOT FOR SALE."', to: 'ch2.tower', effect: { xp: 10, flag: 'refused' } },
        { id: 'read', label: 'CHECK THE BACK OF YOUR WARRANTY CARD', check: { stat: 'wits', dc: 12, pass: 'ch2.loophole', fail: 'ch2.tower', passEffect: { xp: 20 }, failEffect: { hp: -3 } } },
      ],
    },
    {
      id: 'ch2.loophole',
      title: 'CLAUSE 33',
      text: [
        'Tiny print on the warranty card: "CLAUSE 33. A world built for everyone belongs to everyone in it. It cannot be sold, gilded or locked. — FR33 D. OHM INC."',
        'SCOT33 laughs out loud. Of course they thought of that. They make world builders.',
      ],
      onEnter: { flag: 'loophole', gold: { id: 'ch2.loophole', amount: 25 } },
      choices: [{ id: 'go', label: 'GO TO THE EXPO', to: 'ch2.tower' }],
    },
    {
      id: 'ch2.tower',
      title: 'THE EXPO',
      text: [
        'The WRLD BLDR EXPO fills FR33 D. OHM INC. HQ, a tower of glass and blinking build lights. Every floor shows off someone\'s world. The top floor belongs to THE GILDED MAN, and everything on it is gold: the carpet, the plants, the people standing very still.',
      ],
      choices: [
        { id: 'blend', label: 'MINGLE WITH THE CROWD', check: { stat: 'style', dc: 13, pass: 'ch2.lobby', fail: 'ch2.guards', passEffect: { xp: 25 }, failEffect: { hp: -4 } } },
        { id: 'stairs', label: 'TAKE THE STAFF STAIRS', check: { stat: 'grit', dc: 12, pass: 'ch2.stairs', fail: 'ch2.guards', passEffect: { xp: 25 }, failEffect: { hp: -5 } } },
      ],
    },
    {
      id: 'ch2.lobby',
      title: 'THE GIFT BOOTH',
      text: [
        'The FR33 D. OHM INC. booth is handing out exhibitor swag. Someone hands SCOT33 a black dad hat with his name stitched on the front. "Saw your world on the feed," they say. "Made my whole week."',
      ],
      onEnter: { item: 'scot33-dad-hat', gold: { id: 'ch2.lobby', amount: 25 } },
      choices: [{ id: 'up', label: 'RIDE THE ELEVATOR TO THE TOP', to: 'ch2.floor33' }],
    },
    {
      id: 'ch2.stairs',
      title: 'THE STAFF STAIRS',
      text: [
        'Thirty-three flights. On floor twelve TOULOUS3 stops at a locker with his name on it. "Support cats work out of here," he says, and pulls out his spare foam trucker hat. "You look like you need one."',
      ],
      onEnter: { item: 'toulous3-trucker', gold: { id: 'ch2.stairs', amount: 25 } },
      choices: [{ id: 'up', label: 'KEEP CLIMBING', to: 'ch2.floor33' }],
    },
    {
      id: 'ch2.guards',
      title: 'GOLD SALESBOTS',
      text: [
        'Two of THE GILDED MAN\'s salesbots roll up, all shine and smile. "Upgrade to GOLD today! Everything gold! Forever!" Wherever they point, things start turning gold and stop moving.',
      ],
      choices: [
        { id: 'fight', label: 'OUT-BUILD THEM: A RAMP RIGHT OVER', check: { stat: 'grit', dc: 13, pass: 'ch2.floor33', fail: 'ch2.floor33', passEffect: { xp: 30 }, failEffect: { hp: -6, xp: 10 } } },
        { id: 'bluff', label: '"WHAT DO YOU TWO WANT TO BUILD?"', check: { stat: 'style', dc: 12, pass: 'ch2.floor33', fail: 'ch2.floor33', passEffect: { xp: 30 }, failEffect: { hp: -5, xp: 10 } } },
      ],
    },
    {
      id: 'ch2.floor33',
      title: 'THE TOP FLOOR',
      text: [
        'The top floor is one gold door with a lock shaped like a smile that doesn\'t reach its eyes.',
      ],
      choices: [
        { id: 'pick', label: 'REWIRE THE LOCK WITH YOUR BLDR', check: { stat: 'wits', dc: 13, pass: 'ch2.vault', fail: 'ch2.vault', passEffect: { xp: 30 }, failEffect: { hp: -4, xp: 10 } } },
        { id: 'clause', label: 'HOLD UP THE WARRANTY CARD: CLAUSE 33', to: 'ch2.vault', effect: { xp: 30 }, requires: { flag: 'loophole' } },
      ],
    },
    {
      id: 'ch2.vault',
      title: 'THE GOLD COLLECTION',
      text: [
        'Inside, under glass, sit dozens of tiny worlds, every one painted solid gold. In each, the people stand frozen mid-laugh, mid-wave, mid-hello. On a pedestal lies a MASTER BUILD KEY.',
        'Behind you, slow applause.',
      ],
      onEnter: { item: 'gilded-key', gold: { id: 'ch2.vault', amount: 50 } },
      choices: [{ id: 'turn', label: 'TURN AROUND AND SMILE', to: 'ch2.gilded' }],
    },
    {
      id: 'ch2.gilded',
      title: 'THE GILDED MAN',
      text: [
        'He is tall and polished and he shines like a trophy. "Gold never changes, tiger. Gold never disappoints. Sell me your little world and it will be perfect forever."',
        '"But nobody in it gets to change either," says SCOT33. "That\'s not perfect. That\'s just stuck."',
      ],
      choices: [
        { id: 'fight', label: 'OUT-BUILD HIM, LIVE', check: { stat: 'grit', dc: 14, pass: 'ch2.freed', fail: 'ch2.freed', passEffect: { xp: 60 }, failEffect: { hp: -8, xp: 15 } } },
        { id: 'talk', label: '"WHEN DID YOU LAST BUILD SOMETHING FOR FUN?"', check: { stat: 'style', dc: 14, pass: 'ch2.freed', fail: 'ch2.freed', passEffect: { xp: 60 }, failEffect: { hp: -8, xp: 15 } } },
        { id: 'photo', label: 'TAKE HIS PICTURE AND SHOW HIM', to: 'ch2.freed', effect: { xp: 60 }, requires: { item: 'film' } },
      ],
    },
    {
      id: 'ch2.freed',
      title: 'THE GOLD SOFTENS',
      text: [
        'THE GILDED MAN stops. For a long moment he looks like someone who just remembered something. Then the MASTER BUILD KEY in SCOT33\'s paw glows, and the gold worlds under the glass soften into color. The frozen people blink, wave, and climb out to look around.',
        '"Is there room in your world?" one asks.',
      ],
      onEnter: { flag: 'crew_workers', gold: { id: 'ch2.freed', amount: 50 } },
      choices: [{ id: 'yes', label: '"THERE\'S ALWAYS ROOM. I\'LL BUILD MORE."', to: 'ch2.end' }],
    },
    {
      id: 'ch2.end',
      title: 'BEST IN SHOW',
      text: [
        'World One takes BEST IN SHOW. THE GILDED MAN leaves the EXPO without a word, but on his way out he picks up a starter BLDR.',
        'That night, World One has a hundred new citizens. Then, from somewhere under FR33 D. OHM INC. HQ, a bassline starts. Wherever it reaches, people stop smiling and forget why they ever did.',
        'END OF CHAPTER 2.',
      ],
      end: true,
      onEnter: { gold: { id: 'ch2.complete', amount: 25 } },
      choices: [{ id: 'next', label: 'CHAPTER 3: W3 COM3 TO 3AT YOUR BRAIN', to: 'chapter:ch3' }],
    },
  ]),
};

const ch3: Chapter = {
  id: 'ch3',
  number: 3,
  title: 'W3 COM3 TO 3AT YOUR BRAIN',
  tagline: 'A band with a song that makes you forget how to be positive is touring every world. World One is next.',
  priceCents: 300,
  start: 'ch3.start',
  nodes: nodes([
    {
      id: 'ch3.start',
      title: 'THE TOUR BUS',
      text: [
        'A tour bus has parked on World One\'s beach. The band on its roof has four mouths and one microphone. Every time they hit the chorus, another citizen sits down in the sand and forgets what they were excited about.',
        'SCOT33 cracks his knuckles. "Okay. Let\'s fix this."',
      ],
      choices: [
        { id: 'front', label: 'WALK RIGHT UP AND SAY HI', check: { stat: 'style', dc: 13, pass: 'ch3.greenroom', fail: 'ch3.pit', passEffect: { xp: 25 }, failEffect: { hp: -4 } } },
        { id: 'sub', label: 'BUILD A TUNNEL UNDER THE BUS', check: { stat: 'grit', dc: 13, pass: 'ch3.greenroom', fail: 'ch3.pit', passEffect: { xp: 25 }, failEffect: { hp: -5 } } },
      ],
    },
    {
      id: 'ch3.greenroom',
      title: 'THE MERCH TABLE',
      text: [
        'Behind the bus sits the band\'s merch table, unattended. Their tee reads W3 COM3 TO 3AT YOUR BRAIN!!! in letters loud enough to hurt. SCOT33 buys one and leaves the money in the jar. Wearing their words, he can hear the song without believing it.',
      ],
      onEnter: { item: 'w3-com3-tee', gold: { id: 'ch3.greenroom', amount: 25 } },
      choices: [{ id: 'on', label: 'FIND TOULOUS3', to: 'ch3.soundcheck' }],
    },
    {
      id: 'ch3.pit',
      title: 'THE CROWD',
      text: [
        'SCOT33 lands in the middle of the crowd. Everyone around him is forgetting something: a name, a plan, the color of the tree. The song pulls him toward the stage.',
      ],
      choices: [
        { id: 'push', label: 'HELP PEOPLE BACK ON THEIR FEET AS YOU GO', check: { stat: 'grit', dc: 12, pass: 'ch3.soundcheck', fail: 'ch3.soundcheck', passEffect: { xp: 20 }, failEffect: { hp: -5 } } },
        { id: 'hum', label: 'HUM A HAPPIER SONG OVER THEIRS', check: { stat: 'wits', dc: 12, pass: 'ch3.soundcheck', fail: 'ch3.soundcheck', passEffect: { xp: 20 }, failEffect: { hp: -4 } } },
      ],
    },
    {
      id: 'ch3.soundcheck',
      title: 'BACKSTAGE',
      text: [
        'TOULOUS3 is waiting by the bus\'s generator with a heavy black crewneck. "FR33 D. OHM INC. sent a care package. Your name\'s on it, of course." It fits like armor.',
        '"Two ways to do this," he says. "Cut their power, or out-play them."',
      ],
      onEnter: { item: 'scot33-crewneck', gold: { id: 'ch3.soundcheck', amount: 25 } },
      choices: [
        { id: 'cut', label: 'POWER DOWN THE GENERATOR', check: { stat: 'wits', dc: 14, pass: 'ch3.silence', fail: 'ch3.stage', passEffect: { xp: 40 }, failEffect: { hp: -6, xp: 10 } } },
        { id: 'stage', label: 'CLIMB ONTO THE ROOF', to: 'ch3.stage' },
      ],
    },
    {
      id: 'ch3.silence',
      title: 'QUIET',
      text: [
        'The generator winds down and the song stops mid-chord. In the quiet, the crowd hears the waves, and a few of them remember they like the sound of waves.',
      ],
      onEnter: { flag: 'silence', gold: { id: 'ch3.silence', amount: 50 } },
      choices: [{ id: 'stage', label: 'CLIMB ONTO THE ROOF', to: 'ch3.stage' }],
    },
    {
      id: 'ch3.stage',
      title: 'THE ROOF OF THE BUS',
      text: [
        'The four mouths turn toward SCOT33 at once. "W3 COM3," they sing, "TO 3AT YOUR BRAIN." The words reach for every good thing he believes.',
        'But up close he can see it: the band looks tired. Nobody ever asked them what they wanted to play.',
      ],
      choices: [
        { id: 'louder', label: 'PLAY SOMETHING HAPPIER, LOUDER', check: { stat: 'style', dc: 15, pass: 'ch3.encore', fail: 'ch3.encore', passEffect: { xp: 80 }, failEffect: { hp: -9, xp: 20 } } },
        { id: 'unplug', label: 'BUILD THEM A NEW STAGE MID-SONG', check: { stat: 'grit', dc: 15, pass: 'ch3.encore', fail: 'ch3.encore', passEffect: { xp: 80 }, failEffect: { hp: -9, xp: 20 } } },
        { id: 'crew', label: 'WORLD ONE SINGS WITH YOU', to: 'ch3.encore', effect: { xp: 80 }, requires: { flag: 'crew_workers' } },
        { id: 'quiet', label: '"WHAT DO YOU WANT TO PLAY?"', to: 'ch3.encore', effect: { xp: 80 }, requires: { flag: 'silence' } },
      ],
    },
    {
      id: 'ch3.encore',
      title: 'ENCORE',
      text: [
        'The song breaks. The four mouths turn back into four ordinary people holding instruments they never chose. One of them starts a new tune, a bright, silly one. The crowd stands up in the sand and remembers everything at once, out loud.',
      ],
      onEnter: { gold: { id: 'ch3.encore', amount: 75 } },
      choices: [{ id: 'out', label: 'WATCH THE SUNRISE', to: 'ch3.end' }],
    },
    {
      id: 'ch3.end',
      title: 'A WORLD FOR EVERYONE',
      text: [
        'Sunrise over World One. TOULOUS3, the citizens freed from the gold worlds, and a band with a brand-new song all crowd around the WRLD BLDR. SCOT33 hands out crew shirts.',
        'He presses the big round button one more time. NEW WORLD SEED ACCEPTED: EVERYONE\'S.',
        'END OF CHAPTER 3. MORE CHAPTERS SOON.',
      ],
      end: true,
      onEnter: { item: 'scot33-crop', gold: { id: 'ch3.complete', amount: 50 } },
      choices: [{ id: 'replay', label: 'REPLAY FROM CHAPTER 1', to: 'chapter:ch1' }],
    },
  ]),
};

export const CHAPTERS: Record<string, Chapter> = { ch1, ch2, ch3 };
export const FIRST_CHAPTER = 'ch1';
export const CHAPTER_ORDER = [ch1, ch2, ch3];

/** Every story reward id → amount, for the server to validate a claim against. */
export const STORY_REWARDS: Record<string, number> = Object.fromEntries(
  CHAPTER_ORDER.flatMap((c) =>
    Object.values(c.nodes).flatMap((n) => {
      const out: [string, number][] = [];
      if (n.onEnter?.gold) out.push([n.onEnter.gold.id, n.onEnter.gold.amount]);
      for (const ch of n.choices) {
        if (ch.effect?.gold) out.push([ch.effect.gold.id, ch.effect.gold.amount]);
        if (ch.check?.passEffect?.gold) out.push([ch.check.passEffect.gold.id, ch.check.passEffect.gold.amount]);
        if (ch.check?.failEffect?.gold) out.push([ch.check.failEffect.gold.id, ch.check.failEffect.gold.amount]);
      }
      return out;
    }),
  ),
);
