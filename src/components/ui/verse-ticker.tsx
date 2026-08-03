import { useEffect, useState } from 'react';
import { cn } from './utils';

/**
 * Daily verse ticker.
 *
 * Verses are bundled rather than fetched: the site's CSP restricts connect-src
 * to 'self', and a header ornament shouldn't depend on a third-party API being
 * up. The day-of-year index makes the choice stable for the whole day and
 * rotates through the list across the year.
 *
 * King James Version — public domain.
 */
const VERSES: { text: string; ref: string; jesus?: boolean }[] = [
  // Red-letter — the words of Jesus, rendered in red per the usual convention.
  { text: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.', ref: 'Matthew 11:28', jesus: true },
  { text: 'I am the way, the truth, and the life: no man cometh unto the Father, but by me.', ref: 'John 14:6', jesus: true },
  { text: 'Peace I leave with you, my peace I give unto you: let not your heart be troubled, neither let it be afraid.', ref: 'John 14:27', jesus: true },
  { text: 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.', ref: 'Matthew 6:33', jesus: true },
  { text: 'With men it is impossible, but not with God: for with God all things are possible.', ref: 'Mark 10:27', jesus: true },
  { text: 'Let not your heart be troubled: ye believe in God, believe also in me.', ref: 'John 14:1', jesus: true },
  { text: 'I am the light of the world: he that followeth me shall not walk in darkness, but shall have the light of life.', ref: 'John 8:12', jesus: true },
  { text: 'Take therefore no thought for the morrow: for the morrow shall take thought for the things of itself.', ref: 'Matthew 6:34', jesus: true },
  { text: 'Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you.', ref: 'Matthew 7:7', jesus: true },
  { text: 'Ye are the light of the world. A city that is set on an hill cannot be hid.', ref: 'Matthew 5:14', jesus: true },

  { text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.', ref: 'Proverbs 3:5' },
  { text: 'I can do all things through Christ which strengtheneth me.', ref: 'Philippians 4:13' },
  { text: 'The LORD is my shepherd; I shall not want.', ref: 'Psalm 23:1' },
  { text: 'Be strong and of a good courage; be not afraid, neither be thou dismayed.', ref: 'Joshua 1:9' },
  { text: 'This is the day which the LORD hath made; we will rejoice and be glad in it.', ref: 'Psalm 118:24' },
  { text: 'And we know that all things work together for good to them that love God.', ref: 'Romans 8:28' },
  { text: 'Thy word is a lamp unto my feet, and a light unto my path.', ref: 'Psalm 119:105' },
  { text: 'Let all your things be done with charity.', ref: '1 Corinthians 16:14' },
  { text: 'Commit thy works unto the LORD, and thy thoughts shall be established.', ref: 'Proverbs 16:3' },
  { text: 'The LORD shall fight for you, and ye shall hold your peace.', ref: 'Exodus 14:14' },
  { text: 'Whatsoever ye do, do it heartily, as to the Lord, and not unto men.', ref: 'Colossians 3:23' },
  { text: 'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.', ref: '2 Timothy 1:7' },
  { text: 'Let us not be weary in well doing: for in due season we shall reap, if we faint not.', ref: 'Galatians 6:9' },
  { text: 'A man’s heart deviseth his way: but the LORD directeth his steps.', ref: 'Proverbs 16:9' },
  { text: 'He giveth power to the faint; and to them that have no might he increaseth strength.', ref: 'Isaiah 40:29' },
  { text: 'The lot is cast into the lap; but the whole disposing thereof is of the LORD.', ref: 'Proverbs 16:33' },
  { text: 'Casting all your care upon him; for he careth for you.', ref: '1 Peter 5:7' },
  { text: 'In all labour there is profit: but the talk of the lips tendeth only to penury.', ref: 'Proverbs 14:23' },
  { text: 'Weeping may endure for a night, but joy cometh in the morning.', ref: 'Psalm 30:5' },
  { text: 'Be careful for nothing; but in every thing by prayer and supplication let your requests be made known unto God.', ref: 'Philippians 4:6' },
];

function dayOfYear(d: Date) {
  const start = Date.UTC(d.getFullYear(), 0, 0);
  const now = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((now - start) / 86_400_000);
}

export function verseOfTheDay(date = new Date()) {
  return VERSES[dayOfYear(date) % VERSES.length];
}

/**
 * Scroll speed in words per minute. Driving the animation off word count
 * rather than a fixed duration keeps long and short verses moving at the
 * same reading pace — otherwise a 25-word verse would race past while a
 * 10-word one crawls.
 */
const WORDS_PER_MINUTE = 85;

export function VerseTicker({ className, wpm = WORDS_PER_MINUTE }: { className?: string; wpm?: number }) {
  const [verse, setVerse] = useState(() => verseOfTheDay());

  const wordCount = verse.text.trim().split(/\s+/).length + 2; // +2 for the reference
  const durationSec = Math.max(6, (wordCount / wpm) * 60);

  // Re-check hourly so the verse rolls over at midnight without a reload.
  useEffect(() => {
    const t = setInterval(() => setVerse(verseOfTheDay()), 60 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className={cn(
        'overflow-hidden',
        // Soften both ends so text dissolves instead of clipping on a hard edge.
        '[mask-image:linear-gradient(to_right,transparent_0%,black_12%,black_88%,transparent_100%)]',
        '[-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_12%,black_88%,transparent_100%)]',
        className,
      )}
      title={`${verse.text} — ${verse.ref}`}
    >
      {/* Two copies scrolling as one track: the second follows immediately
          behind the first, so text is on screen at every point in the loop
          instead of the gap a single pass leaves. */}
      <div
        className="flex w-max whitespace-nowrap hover:[animation-play-state:paused]"
        style={{ animation: `verse-scroll ${durationSec}s linear infinite` }}
      >
        {[0, 1].map(i => (
          <span key={i} className="flex items-center pr-16" aria-hidden={i === 1}>
            <span
              className={cn(
                'font-mono text-[13px] tracking-widest',
                // Red-letter convention: the words of Jesus in red.
                verse.jesus ? 'text-red-400' : 'text-white',
              )}
            >
              {verse.text}
            </span>
            <span className="font-mono text-[13px] tracking-widest text-white/60 ml-3">
              — {verse.ref}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
