/**
 * Think and Grow Rich Workbook
 *
 * Public companion page for the book club. Thirteen principles, what each one
 * asks of you, and the actions to run — as checkboxes with a progress bar.
 *
 * Where Hill's claims are not supported (the subconscious as something you can
 * program, thought as a radio signal, the sixth sense), the chapter says so
 * rather than repeating it quietly. That honesty is the point of the page.
 *
 * Noir: black ground, no borders, no shadows, square corners, UPPERCASE h1 and
 * chapter titles, body text left-aligned. Progress is a per-viewer convenience
 * in localStorage — every read and write is guarded, and the page renders
 * correctly when storage is unavailable.
 */

import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';

const STORAGE_KEY = 'tgr-workbook-v1';

const AUDIBLE_URL =
  'https://www.audible.com/pd/B0D5P4MXBW?source_code=ASSORAP0511160006&share_location=library_overflow';

interface Chapter {
  id: string;
  num: string;
  title: string;
  idea: string;
  text: string;
  rules?: string[];
  fears?: [string, string][];
  acts: string[];
  care?: string;
  notes?: string;
  placeholder?: string;
}

const CHAPTERS: Chapter[] = [
  {
    id: 'desire',
    num: '01',
    title: 'Desire',
    idea: 'Every achievement starts with a specific, intense want.',
    text: 'Hill says wishing does nothing. What works is a want so concrete that you can write it down and act on it.',
    rules: [
      'Name the exact amount or result. “More money” doesn’t count.',
      'Decide what you will give in return. Nothing arrives for free.',
      'Set a date and start now, even if the plan is rough.',
      'Write it all down and read it aloud every morning and every night.',
    ],
    acts: [
      'Write your exact number and your deadline.',
      'Write what you will give in exchange for it.',
      'Draft a first plan and take one step today.',
      'Read the written statement aloud tonight.',
    ],
    notes: 'Your written statement',
    placeholder: 'By [date] I will have [exact amount or result], and in return I will …',
  },
  {
    id: 'faith',
    num: '02',
    title: 'Faith',
    idea: 'Belief is a habit you build by repetition.',
    text: 'In the book, faith isn’t a feeling you wait for. You train it by repeating your goal, with emotion behind it, until you expect the result.',
    rules: [
      'Repeat the statement daily and put real feeling into it.',
      'Picture yourself already having the result.',
      'Catch doubt when it shows up and answer it with your statement.',
    ],
    acts: [
      'Add one line to your statement about why you will get it.',
      'Read it with real feeling for seven days straight.',
    ],
    care: 'Picturing success alone can reduce effort. Research on goal-setting suggests pairing the picture with the obstacles you expect, and a plan for each.',
  },
  {
    id: 'auto',
    num: '03',
    title: 'Autosuggestion',
    idea: 'Feed your mind the same written instruction, twice a day.',
    text: 'Hill’s method: read your written goal aloud, slowly, morning and night, until it shapes what you do.',
    rules: [
      'Written and spoken beats just thinking about it.',
      'Do it first thing in the morning and right before sleep.',
      'Read it as if it’s already true.',
    ],
    acts: [
      'Put your statement where you’ll see it every day.',
      'Set two daily reminders to read it.',
    ],
    care: 'The claim that this rewrites your subconscious isn’t supported. The part that works is the habit: a daily cue that keeps your goal in front of you.',
  },
  {
    id: 'knowledge',
    num: '04',
    title: 'Specialized knowledge',
    idea: 'General knowledge doesn’t pay. Knowledge aimed at your goal does.',
    text: 'Hill separates knowing a lot from knowing the specific things your goal needs. You can learn them or borrow them from people who already have them.',
    rules: [
      'Work out exactly what you need to know for your goal.',
      'Get it from courses, books, or people who have it.',
      'Knowledge only pays when you organize it and use it.',
    ],
    acts: [
      'List the five skills your goal requires and rate yourself 1 to 5 on each.',
      'Schedule learning time this week for your lowest score.',
      'Name one person who already has the knowledge you lack.',
    ],
  },
  {
    id: 'imagination',
    num: '05',
    title: 'Imagination',
    idea: 'Every plan starts as an idea.',
    text: 'Hill describes two kinds: recombining existing ideas, and coming up with new ones. Most useful ideas are new combinations of old ones.',
    rules: [
      'Ideas are the raw material for plans.',
      'Imagination gets stronger the more you use it.',
      'Borrow from other fields and rearrange.',
    ],
    acts: [
      'Write down three ideas a day for a week.',
      'Take one idea from another field and apply it to your work.',
    ],
  },
  {
    id: 'planning',
    num: '06',
    title: 'Organized planning',
    idea: 'Desire becomes results through a plan and a team.',
    text: 'This chapter turns the want into action. Build a plan, get allies whose skills cover yours, and revise the plan when it fails.',
    rules: [
      'Ally with people who fill your gaps.',
      'Expect the first plan to fail. Replace it, don’t quit.',
      'Lead by understanding people, not just directing them.',
    ],
    acts: [
      'Write a 90-day plan with dates.',
      'Ask two people to review it and poke holes.',
      'Put a check-in date on the calendar to revise it.',
    ],
  },
  {
    id: 'decision',
    num: '07',
    title: 'Decision',
    idea: 'Decide fast, change your mind slowly.',
    text: 'Hill says successful people decide quickly and reverse slowly. Failures do the opposite.',
    rules: [
      'Indecision is a habit. Break it with small, quick decisions.',
      'Don’t hand the call to other people’s opinions.',
      'Once you’ve decided, act.',
    ],
    acts: [
      'Pick one decision you’ve been stalling on and make it within 24 hours.',
      'Set a “decide by” date for your next big call.',
    ],
  },
  {
    id: 'persistence',
    num: '08',
    title: 'Persistence',
    idea: 'Sustained effort is what turns belief into results.',
    text: 'Hill claims most people quit right before the payoff. He lists four things that sustain effort: a definite purpose, a plan you act on, a mind closed to discouragement, and allies who back you.',
    rules: [
      'Watch for excuses, waiting for approval, and settling for good enough.',
      'Plan for bad weeks in advance.',
      'Keep at least one person who encourages you.',
    ],
    acts: [
      'Write your top three excuses and a counter to each.',
      'Tell one person who will hold you to your goal.',
      'Decide now what you’ll do on a bad week.',
    ],
    care: 'Persistence matters, but so does knowing when to change tactics or stop. The book leans heavily on stories of people who kept going and won.',
  },
  {
    id: 'master',
    num: '09',
    title: 'The master mind',
    idea: 'Two or more people working in harmony toward one aim.',
    text: 'Hill’s idea is a small group that gives you knowledge, ideas, and drive you don’t have alone.',
    rules: [
      'Pick members for what they add, not just because you like them.',
      'Give something back to each person.',
      'Meet on a schedule with an agenda.',
    ],
    acts: [
      'List three to five people who cover your gaps.',
      'Invite one of them to a recurring monthly meeting.',
      'Write down what each of you is working toward.',
    ],
  },
  {
    id: 'energy',
    num: '10',
    title: 'Channeling your energy',
    idea: 'Point strong drive at your work.',
    text: 'Hill argues that strong emotion, including romantic and sexual energy, can be redirected into creative output.',
    rules: [
      'High energy needs a target, or it scatters.',
      'People who love their work tend to have more drive.',
    ],
    acts: [
      'Find when your energy peaks and put your hardest work there.',
      'Give your strongest current feeling a project to go into.',
    ],
    care: 'The physiology in this chapter is Hill’s theory, not science. The takeaway that holds up: put your peak energy on the important work.',
  },
  {
    id: 'sub',
    num: '11',
    title: 'The subconscious mind',
    idea: 'Watch what you feed your mind, especially with emotion.',
    text: 'Hill pictures a layer of the mind that acts on whatever you feed it, and acts most on emotionally charged ideas, including fear.',
    rules: [
      'Feed it your goals with feeling.',
      'Negative thoughts get acted on too.',
      'Notice what you dwell on.',
    ],
    acts: [
      'For one day, write down your top three negative self-talk phrases.',
      'Rewrite each into a specific, useful instruction.',
    ],
    care: 'Same caution as autosuggestion. The literal model isn’t supported, but noticing and rewriting self-talk is a real, useful practice.',
  },
  {
    id: 'brain',
    num: '12',
    title: 'The brain',
    idea: 'Your mental state shows up in how you deal with people.',
    text: 'Hill compares the brain to a radio that sends and receives thought vibrations.',
    rules: [
      'Your mood and focus show in how you talk and act.',
      'Spend time around people whose state you want.',
    ],
    acts: ['Before an important call, spend two minutes getting into the state you want.'],
    care: 'There is no evidence that thoughts are broadcast. The practical point is that your state affects the people around you.',
  },
  {
    id: 'sixth',
    num: '13',
    title: 'The sixth sense',
    idea: 'Hill’s last principle is intuition, plus an imagination exercise.',
    text: 'He describes holding imaginary meetings with people you admire and asking them questions.',
    rules: [
      'Do the other twelve first.',
      'Imagine advisors you respect and ask what they’d tell you.',
    ],
    acts: [
      'Pick three people whose judgment you respect and ask what each would tell you about a real problem.',
    ],
    care: 'The mystical framing is unproven. The advisor exercise is a perspective-taking technique, and that part works.',
  },
  {
    id: 'fear',
    num: '+',
    title: 'The six fears',
    idea: 'Hill says these six fears block everything else.',
    text: 'Near the end of the book, Hill names six fears that hold people back. Find the one that runs you.',
    fears: [
      ['Poverty', 'Overcaution, doubt, putting decisions off.'],
      ['Criticism', 'Holding back to avoid what others will say.'],
      ['Ill health', 'Constant worry over every symptom.'],
      ['Loss of love', 'Jealousy and suspicion.'],
      ['Old age', 'Assuming your best years are behind you.'],
      ['Death', 'Dread that eats into today.'],
    ],
    acts: [
      'Pick the fear that runs you most.',
      'Write the last time it made a decision for you.',
    ],
    notes: 'Which fear, and what it decided',
    placeholder: 'The fear: …  The decision it made for me: …',
  },
];

const TOTAL_ACTS = CHAPTERS.reduce((n, c) => n + c.acts.length, 0);

interface Saved {
  checks: Record<string, boolean>;
  notes: Record<string, string>;
}

function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { checks: parsed.checks || {}, notes: parsed.notes || {} };
    }
  } catch {
    // Private windows, blocked site data, or a bad JSON payload. The workbook
    // still works, it just starts empty.
  }
  return { checks: {}, notes: {} };
}

export default function ThinkAndGrowRichWorkbook() {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({ desire: true });
  const [armed, setArmed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Read storage after mount so the pre-rendered HTML and the first client
  // render agree.
  useEffect(() => {
    const saved = loadSaved();
    setChecks(saved.checks);
    setNotes(saved.notes);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ checks, notes }));
    } catch {
      // Nothing to do — the page works, progress just won't survive a reload.
    }
  }, [checks, notes, hydrated]);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  const toggle = useCallback((id: string) => {
    setChecks((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  }, []);

  const done = Object.keys(checks).length;
  const pct = TOTAL_ACTS ? (done / TOTAL_ACTS) * 100 : 0;

  const clearProgress = () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    setChecks({});
    setNotes({});
  };

  return (
    <>
      <Helmet>
        <title>THE LOST+UNFOUNDS | Think and Grow Rich Workbook</title>
        <meta
          name="description"
          content="A free companion workbook for Think and Grow Rich. All thirteen principles, the actions to run for each, and an honest note on which of Hill's claims hold up."
        />
        <link
          rel="canonical"
          href="https://www.thelostandunfounds.com/book-club/think-and-grow-rich"
        />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Masthead */}
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/35 mb-4">
          The Lost+Unfounds · Book Club
        </p>
        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight leading-none mb-6"
          style={{ fontWeight: 900 }}
        >
          Think and Grow Rich Workbook
        </h1>
        <p className="text-base text-white/[0.87] text-left leading-relaxed mb-3 max-w-[60ch]">
          Thirteen principles, what each one asks of you, and the actions to run. Check an action
          when it's done — the bar below tracks the whole book.
        </p>
        <p className="text-sm text-white/55 text-left leading-relaxed max-w-[62ch]">
          Paraphrased from the book's ideas, not a transcript. Chapter order and titles vary
          slightly by edition. Where a chapter's claims don't hold up, we say so instead of quietly
          repeating them.
        </p>

        {/* Audible offer */}
        <section className="bg-white/5 p-6 mt-10" style={{ borderRadius: 0 }}>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-3">
            Get the book free
          </h2>
          <p className="text-base text-white/[0.87] text-left leading-relaxed mb-4 max-w-[58ch]">
            Audible is running a 30-day free trial right now. The trial covers this title, so you
            can listen to the whole thing at no cost and work the chapters below as you go. Cancel
            any time inside the 30 days and you keep the book.
          </p>
          <a
            href={AUDIBLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-4 text-sm font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors"
            style={{ borderRadius: 0 }}
          >
            Start the free trial
          </a>
          <p className="text-xs text-white/55 text-left leading-relaxed mt-4 max-w-[62ch]">
            Trial terms are set by Audible and can change without notice. Check the offer on their
            page before you sign up.
          </p>
        </section>

        {/* Progress */}
        <div className="sticky top-0 z-10 bg-black py-4 mt-8 mb-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-widest text-white tabular-nums">
              {done} of {TOTAL_ACTS} actions done
            </span>
            <button
              type="button"
              onClick={clearProgress}
              className="px-3.5 py-2 text-[11px] font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
              style={{ borderRadius: 0 }}
            >
              {armed ? 'Tap again to clear' : 'Clear progress'}
            </button>
          </div>
          <div className="h-1 bg-white/10 mt-3">
            <div className="h-full bg-white transition-all duration-200" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Chapters */}
        <div className="flex flex-col gap-2.5">
          {CHAPTERS.map((c) => {
            const chDone = c.acts.filter((_, i) => checks[`${c.id}-${i}`]).length;
            const isOpen = !!open[c.id];
            return (
              <div key={c.id} className="bg-white/5" style={{ borderRadius: 0 }}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen((p) => ({ ...p, [c.id]: !p[c.id] }))}
                  className="w-full text-left px-5 py-4 grid grid-cols-[3.25rem_1fr_auto] gap-x-4 items-center hover:bg-white/10 transition-colors"
                  style={{ borderRadius: 0 }}
                >
                  <span className="row-span-2 text-3xl font-black text-white/[0.14] tabular-nums leading-none text-center">
                    {c.num}
                  </span>
                  <span className="text-base font-bold text-white uppercase tracking-wider">
                    {c.title}
                  </span>
                  <span
                    className={`row-span-2 px-2.5 py-1 text-[11px] font-bold tracking-wider tabular-nums whitespace-nowrap ${
                      chDone === c.acts.length ? 'bg-white text-black' : 'bg-white/10 text-white/55'
                    }`}
                    style={{ borderRadius: 0 }}
                  >
                    {chDone}/{c.acts.length}
                  </span>
                  <span className="col-start-2 text-sm text-white/55 leading-snug">{c.idea}</span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-6">
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35 mt-2 mb-2.5">
                      The idea
                    </h3>
                    <p className="text-base text-white/[0.87] text-left leading-relaxed max-w-[64ch]">
                      {c.text}
                    </p>

                    {c.rules && (
                      <>
                        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35 mt-6 mb-2.5">
                          Rules of thumb
                        </h3>
                        <ul className="list-disc pl-5 max-w-[64ch] space-y-2">
                          {c.rules.map((r) => (
                            <li key={r} className="text-base text-white/[0.87] text-left">
                              {r}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {c.fears && (
                      <>
                        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35 mt-6 mb-2.5">
                          The fears
                        </h3>
                        <ul className="flex flex-col gap-0.5">
                          {c.fears.map(([name, desc]) => (
                            <li key={name} className="bg-[#0a0a0a] p-3" style={{ borderRadius: 0 }}>
                              <span className="block text-xs font-bold uppercase tracking-wider text-white mb-0.5">
                                {name}
                              </span>
                              <span className="text-[15px] text-white/55 text-left">{desc}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {c.care && (
                      <div className="bg-[#0a0a0a] p-4 mt-6" style={{ borderRadius: 0 }}>
                        <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-white/35 mb-1.5">
                          Read with care
                        </span>
                        <p className="text-[15px] text-white/[0.87] text-left leading-relaxed">
                          {c.care}
                        </p>
                      </div>
                    )}

                    <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35 mt-6 mb-2.5">
                      Do this
                    </h3>
                    <ul className="flex flex-col gap-0.5">
                      {c.acts.map((a, i) => {
                        const actId = `${c.id}-${i}`;
                        const isChecked = !!checks[actId];
                        return (
                          <li key={actId}>
                            <label
                              className="flex gap-3.5 items-start p-3 cursor-pointer hover:bg-white/10 transition-colors"
                              style={{ borderRadius: 0 }}
                            >
                              <input
                                type="checkbox"
                                id={`act-${actId}`}
                                checked={isChecked}
                                onChange={() => toggle(actId)}
                                className="sr-only peer"
                              />
                              <span
                                aria-hidden="true"
                                className="shrink-0 w-5 h-5 mt-0.5 grid place-content-center bg-white/10 peer-checked:bg-white peer-focus-visible:bg-white transition-colors"
                                style={{ borderRadius: 0 }}
                              >
                                <svg
                                  viewBox="0 0 12 12"
                                  className={`w-3 h-3 ${isChecked ? 'block' : 'hidden'}`}
                                  fill="none"
                                >
                                  <path
                                    d="M1 6.2 L4.4 9.5 L11 2.4"
                                    stroke="#000000"
                                    strokeWidth="2"
                                    strokeLinecap="square"
                                  />
                                </svg>
                              </span>
                              <span
                                className={`text-base text-left ${
                                  isChecked ? 'text-white/35 line-through' : 'text-white/[0.87]'
                                }`}
                              >
                                {a}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>

                    {c.notes && (
                      <>
                        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35 mt-6 mb-2.5">
                          {c.notes}
                        </h3>
                        <textarea
                          id={`note-${c.id}`}
                          aria-label={c.notes}
                          placeholder={c.placeholder}
                          value={notes[c.id] || ''}
                          onChange={(e) =>
                            setNotes((p) => ({ ...p, [c.id]: e.target.value }))
                          }
                          className="w-full min-h-[96px] p-3 text-base text-white bg-white/10 placeholder:text-white/35 resize-y"
                          style={{ borderRadius: 0, border: 0 }}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Verdict */}
        <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mt-14 mb-4">
          What holds up, what doesn't
        </h2>
        <div className="flex flex-col gap-1.5">
          <div className="bg-white/5 p-5" style={{ borderRadius: 0 }}>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35 mb-3">
              Solid, practical advice
            </h3>
            <ul className="list-disc pl-5 space-y-2 max-w-[64ch]">
              <li className="text-base text-white/[0.87] text-left">
                Writing a specific goal with a number and a deadline.
              </li>
              <li className="text-base text-white/[0.87] text-left">
                Reviewing it every day so it stays in front of you.
              </li>
              <li className="text-base text-white/[0.87] text-left">
                Learning the specific skills your goal needs.
              </li>
              <li className="text-base text-white/[0.87] text-left">
                Deciding quickly, changing your mind slowly, and adjusting plans instead of
                quitting.
              </li>
              <li className="text-base text-white/[0.87] text-left">
                Meeting regularly with people who fill your gaps and keep you accountable.
              </li>
            </ul>
          </div>
          <div className="bg-white/5 p-5" style={{ borderRadius: 0 }}>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35 mb-3">
              Unproven or overstated
            </h3>
            <ul className="list-disc pl-5 space-y-2 max-w-[64ch]">
              <li className="text-base text-white/[0.87] text-left">
                The subconscious as something you can program, and the brain as a thought
                transmitter. Hill offers no evidence for either.
              </li>
              <li className="text-base text-white/[0.87] text-left">
                The physiology behind the energy-channeling chapter, and the sixth sense.
              </li>
              <li className="text-base text-white/[0.87] text-left">
                The success stories. They are anecdotes with survivorship bias, and some of Hill's
                claims about his ties to famous industrialists are disputed.
              </li>
            </ul>
          </div>
        </div>

        {/* Colophon */}
        <div className="mt-12 flex flex-col gap-2">
          <span className="text-xs font-black uppercase tracking-[0.24em] text-white">
            The Lost+Unfounds
          </span>
          <p className="text-xs text-white/35 text-left leading-relaxed max-w-[64ch]">
            Your checkmarks and notes are saved in this browser only. They don't sync between
            devices and clearing site data wipes them.
          </p>
          <p className="text-xs text-white/35 text-left leading-relaxed max-w-[64ch]">
            Amazon Affiliate Disclosure: As an Amazon Associate,{' '}
            <strong className="text-white/55">THE LOST+UNFOUNDS</strong> earns from qualifying
            purchases.
          </p>
        </div>
      </div>
    </>
  );
}
