import { useEffect, useRef } from 'react';
import { ConditionKind } from '../../lib/weather';

/**
 * The ambient condition layer behind the weather tile: rain falls, snow drifts,
 * cloud and fog bands slide across. Decorative only: it sits under the
 * readout at low opacity and never takes pointer events.
 *
 * Canvas rather than CSS keyframes for two reasons. Particle counts and speeds
 * are derived from the tile's measured size, so the effect stays proportional
 * across every shape the widget takes; the same rule the type follows with
 * `cqmin`. And one animation frame drives every particle, instead of dozens of
 * separately-composited elements on a dashboard that stays open all day.
 */
export function WeatherFx({ kind, isDay = true }: { kind: ConditionKind; isDay?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear skies get no particles. Bailing here rather than rendering an empty
    // loop keeps an idle dashboard genuinely idle.
    if (kind === 'clear') return;

    let w = 0;
    let h = 0;
    let dpr = 1;

    /** x/y are fractions of the tile, so a resize never strands a particle. */
    type P = { x: number; y: number; v: number; s: number; d: number };
    let parts: P[] = [];

    // A deterministic generator: two tiles showing the same weather should not
    // be distinguishable, and a re-render should not reshuffle the field.
    let seed = 1;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const build = () => {
      seed = 1;
      // Count scales with area so a 4x4 is not sparse and a 2x1 is not choked.
      const area = (w * h) / (240 * 240);
      const density = kind === 'rain' ? 26 : kind === 'storm' ? 34 : kind === 'snow' ? 20 : 5;
      const n = Math.max(3, Math.round(density * Math.sqrt(Math.max(area, 0.35))));
      parts = Array.from({ length: n }, () => ({
        x: rand(),
        y: rand(),
        v: 0.35 + rand() * 0.65,
        s: 0.4 + rand() * 0.6,
        d: rand(),
      }));
    };

    const measure = () => {
      const r = canvas.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(canvas);

    // The tile's shorter edge is the unit everything else in this widget scales
    // against; the effect uses it too so a drop is the same relative length at
    // every size.
    const unit = () => Math.min(w, h);

    const drawCloud = (p: P, t: number) => {
      const u = unit();
      // Bands rather than puffs: at 80px tall a drawn cloud is mush, whereas a
      // soft horizontal sweep still reads as overcast.
      const y = p.y * h;
      const width = u * (0.9 + p.s * 1.4);
      const x = ((p.x + t * 0.00002 * p.v * (p.d > 0.5 ? 1 : -1)) % 1.4) * (w + width) - width * 0.5;
      const g = ctx.createLinearGradient(x, 0, x + width, 0);
      const a = (kind === 'fog' ? 0.16 : 0.1) * (isDay ? 1 : 0.7);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, width, u * (kind === 'fog' ? 0.14 : 0.1) * (0.6 + p.s));
    };

    let flash = 0;
    let raf = 0;
    let last = 0;

    const frame = (t: number) => {
      const dt = last ? Math.min(t - last, 64) : 16;
      last = t;
      ctx.clearRect(0, 0, w, h);
      const u = unit();

      if (kind === 'storm') {
        // Roughly every four seconds, and brief; a dashboard is not a screensaver.
        flash -= dt;
        if (flash < -4000 && rand() < 0.06) flash = 130;
        if (flash > 0) {
          ctx.fillStyle = `rgba(255,255,255,${0.09 * (flash / 130)})`;
          ctx.fillRect(0, 0, w, h);
        }
      }

      for (const p of parts) {
        if (kind === 'cloud' || kind === 'fog') {
          drawCloud(p, t);
          continue;
        }

        if (kind === 'snow') {
          p.y += (dt / 1000) * p.v * 0.16;
          if (p.y > 1.05) { p.y = -0.05; p.x = rand(); }
          const wobble = Math.sin(t * 0.001 * p.v + p.d * 6.28) * u * 0.03;
          ctx.beginPath();
          ctx.arc(p.x * w + wobble, p.y * h, u * 0.012 * (0.6 + p.s), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${0.16 + p.s * 0.2})`;
          ctx.fill();
          continue;
        }

        // rain / storm: streaks angled slightly off vertical
        p.y += (dt / 1000) * p.v * (kind === 'storm' ? 1.5 : 1.05);
        if (p.y > 1.05) { p.y = -0.15; p.x = rand(); }
        const len = u * 0.11 * (0.5 + p.s);
        const x = p.x * w;
        const y = p.y * h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - len * 0.18, y + len);
        ctx.strokeStyle = `rgba(255,255,255,${0.1 + p.s * 0.16})`;
        ctx.lineWidth = Math.max(0.5, u * 0.004);
        ctx.stroke();
      }

      raf = requestAnimationFrame(frame);
    };

    // Reduced motion still gets the texture, just held still: one frame, no loop.
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      frame(0);
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [kind, isDay]);

  if (kind === 'clear') return null;

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ borderRadius: 0 }}
    />
  );
}
