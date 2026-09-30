import { useEffect, useId, useRef, type RefObject } from 'react';
import Box from '@mui/material/Box';

type Point = { x: number; y: number };

/**
 * The beats, in seconds from the start of a card's turn: the arrow draws out
 * to the callout, the words come up, the arrow reels back into the card and
 * its head becomes the cursor, which clicks "Assembly".
 */
const BEAT = { draw: 0.5, drawFor: 1.25, reveal: 1.35, collapse: 3.1, collapseFor: 0.95, morphFor: 0.4, moveFor: 0.7, press: 0.14, leave: 0.8 };

/** Arrowhead, tip at the origin, pointing along +x. */
const HEAD = 'M0 0 L-13 -6.5 L-9.5 0 L-13 6.5 Z';
/** The pointer, tip at the origin (same outline as the demo cursor on phones). */
const POINTER = 'M0 0 L0 16 L4.5 11.8 L7.6 18.2 L10.3 17 L7.3 10.7 L13.4 10.4 Z';

/**
 * A smooth path through `pts` (Catmull-Rom, drawn as cubic Béziers), so the
 * stroke has no corners wherever it bends or loops.
 */
function smoothPath(pts: Point[]): string {
  const n = (v: number) => Math.round(v * 10) / 10;
  let d = `M ${n(pts[0].x)} ${n(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${n(c1.x)} ${n(c1.y)}, ${n(c2.x)} ${n(c2.y)}, ${n(p2.x)} ${n(p2.y)}`;
  }
  return d;
}

/**
 * From `s` (in the card, beside the switch) up out of the card, low under
 * the title, round one loop, and up to `e` (the callout).
 */
function arrowPath(s: Point, e: Point): string {
  const dx = e.x - s.x;
  const dy = e.y - s.y;
  const loop = { x: s.x + 0.6 * dx, y: s.y + 0.3 * dy };
  const r = 24;
  return smoothPath([
    s,
    { x: s.x + 0.16 * dx, y: s.y + 0.16 * dy },
    { x: loop.x - 0.2 * dx, y: loop.y + 0.08 * dy },
    { x: loop.x + r * 0.9, y: loop.y - r * 0.2 },
    { x: loop.x + r * 0.3, y: loop.y - r * 1.6 },
    { x: loop.x - r * 0.9, y: loop.y - r * 0.9 },
    { x: loop.x + r * 0.2, y: loop.y + r * 0.35 },
    { x: loop.x + 0.45 * (e.x - loop.x), y: loop.y + 0.3 * (e.y - loop.y) + 10 },
    e,
  ]);
}

export interface ArrowDemoProps {
  rootRef: RefObject<HTMLElement | null>;
  /** The "Assembly" button: where the arrow starts and the cursor clicks. */
  fromRef: RefObject<HTMLElement | null>;
  /** The callout's title: where the arrow points. */
  toRef: RefObject<HTMLElement | null>;
  onReveal: () => void;
  onClick: () => void;
}

/**
 * One turn of the arrow demo, on a GSAP timeline. A dashed arrow draws
 * itself out of the card to the callout, reels back in head first, and the
 * head morphs into the cursor that clicks "Assembly". Everything is measured
 * from the page when it starts and again if the layout changes, so the click
 * lands on the button. Mounting starts it; unmounting stops it.
 */
export function ArrowDemo({ rootRef, fromRef, toRef, onReveal, onClick }: ArrowDemoProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const handlers = useRef({ onReveal, onClick });
  handlers.current = { onReveal, onClick };
  const maskId = `arrow-mask-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    let cancelled = false;
    let tl: gsap.core.Timeline | null = null;
    let ro: ResizeObserver | null = null;
    const done = { reveal: false, click: false };

    (async () => {
      const [{ gsap }, { DrawSVGPlugin }, { MorphSVGPlugin }] = await Promise.all([
        import('gsap'),
        import('gsap/DrawSVGPlugin'),
        import('gsap/MorphSVGPlugin'),
      ]);
      // Measure with the page's own fonts in place, or the title moves after.
      await document.fonts.ready;
      if (cancelled) return;
      gsap.registerPlugin(DrawSVGPlugin, MorphSVGPlugin);

      const build = () => {
        const svg = svgRef.current;
        const root = rootRef.current?.getBoundingClientRect();
        const button = fromRef.current?.getBoundingClientRect();
        const title = toRef.current?.getBoundingClientRect();
        if (!svg || !root || !button || !title) return;
        const at = tl?.time() ?? 0;
        tl?.kill();

        const s = { x: button.right - root.left + 16, y: button.top - root.top + button.height / 2 };
        const e = { x: title.left - root.left - 22, y: title.top - root.top + Math.min(title.height / 2, 24) };
        // The middle of the word "Assembly".
        const target = { x: button.left - root.left + button.width / 2, y: button.top - root.top + button.height / 2 };
        const d = arrowPath(s, e);

        const line = svg.querySelector<SVGPathElement>('.arrow-line')!;
        const reveal = svg.querySelector<SVGPathElement>('.arrow-reveal')!;
        const pos = svg.querySelector<SVGGElement>('.arrow-pos')!;
        const turn = svg.querySelector<SVGGElement>('.arrow-turn')!;
        const shape = svg.querySelector<SVGPathElement>('.arrow-shape')!;
        const ring = svg.querySelector<SVGCircleElement>('.arrow-ring')!;
        line.setAttribute('d', d);
        reveal.setAttribute('d', d);
        const total = line.getTotalLength();

        // The head's state, tweened and then drawn: how far along the line,
        // whether it faces back, how far it has turned upright as the
        // pointer, how far it has moved on to the button, and its press.
        const head = { along: 0, back: 0, upright: 0, move: 0, scale: 1, opacity: 0 };
        const draw = () => {
          const len = head.along * total;
          const tip = line.getPointAtLength(len);
          const a = line.getPointAtLength(Math.max(0, len - 6));
          const b = line.getPointAtLength(Math.min(total, len + 6));
          let angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 180 * head.back;
          angle = ((angle % 360) + 540) % 360 - 180; // -180..180, so it turns upright the short way
          const x = tip.x + (target.x - tip.x) * head.move;
          const y = tip.y + (target.y - tip.y) * head.move;
          pos.setAttribute('transform', `translate(${x} ${y})`);
          turn.setAttribute('transform', `rotate(${angle * (1 - head.upright)}) scale(${head.scale})`);
          pos.style.opacity = String(head.opacity);
        };

        const t = gsap.timeline({ onUpdate: draw });
        t.set(reveal, { drawSVG: '0% 0%' }, 0)
          .set(shape, { morphSVG: HEAD, fill: 'currentColor', stroke: 'currentColor', strokeWidth: 0 }, 0)
          .set(ring, { opacity: 0, attr: { r: 4, cx: target.x, cy: target.y } }, 0)
          .set(head, { along: 0, back: 0, upright: 0, move: 0, scale: 1, opacity: 0 }, 0)
          // Out: the dashes are uncovered behind the head as it runs to the callout.
          .to(head, { opacity: 1, duration: 0.15 }, BEAT.draw)
          .to([reveal], { drawSVG: '0% 100%', duration: BEAT.drawFor, ease: 'power2.inOut' }, BEAT.draw)
          .to(head, { along: 1, duration: BEAT.drawFor, ease: 'power2.inOut' }, BEAT.draw)
          .call(() => {
            if (!done.reveal) handlers.current.onReveal();
            done.reveal = true;
          }, [], BEAT.reveal)
          // Back: head first, rolling the line up behind it.
          .set(head, { back: 1 }, BEAT.collapse)
          .to(reveal, { drawSVG: '0% 0%', duration: BEAT.collapseFor, ease: 'power2.inOut' }, BEAT.collapse)
          .to(head, { along: 0, duration: BEAT.collapseFor, ease: 'power2.inOut' }, BEAT.collapse);

        // The head becomes the pointer, which glides to the button and clicks.
        const morphAt = BEAT.collapse + BEAT.collapseFor - 0.1;
        const moveAt = morphAt + BEAT.morphFor;
        const pressAt = moveAt + BEAT.moveFor + 0.1;
        t.to(shape, { morphSVG: POINTER, fill: '#fff', stroke: '#111', strokeWidth: 1.3, duration: BEAT.morphFor, ease: 'power3.inOut' }, morphAt)
          .to(head, { upright: 1, duration: BEAT.morphFor, ease: 'power3.inOut' }, morphAt)
          .to(head, { move: 1, duration: BEAT.moveFor, ease: 'power3.inOut' }, moveAt)
          .to(head, { scale: 0.84, duration: BEAT.press / 2, ease: 'power2.in', yoyo: true, repeat: 1 }, pressAt)
          .fromTo(ring, { opacity: 1, attr: { r: 4 } }, { opacity: 0, attr: { r: 22 }, duration: 0.6, ease: 'power2.out' }, pressAt)
          .call(() => {
            if (!done.click) handlers.current.onClick();
            done.click = true;
          }, [], pressAt + BEAT.press / 2)
          .to(head, { opacity: 0, duration: 0.3 }, pressAt + BEAT.leave);
        tl = t;
        // Rebuilt after a layout change: carry on from where it was.
        if (at > 0) t.time(at, true);
      };

      build();
      let last = rootRef.current?.getBoundingClientRect();
      ro = new ResizeObserver(() => {
        const now = rootRef.current?.getBoundingClientRect();
        if (now && last && (now.width !== last.width || now.height !== last.height)) build();
        last = now;
      });
      if (rootRef.current) ro.observe(rootRef.current);
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      tl?.kill();
    };
  }, [rootRef, fromRef, toRef]);

  return (
    <Box
      component="svg"
      ref={svgRef}
      aria-hidden
      sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 20, pointerEvents: 'none', color: 'text.primary' }}
    >
      <defs>
        {/* The line is dashed; it is drawn by uncovering it with a solid stroke. */}
        <mask id={maskId} maskUnits="userSpaceOnUse" x="-200" y="-200" width="4000" height="4000">
          <path className="arrow-reveal" fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" />
        </mask>
      </defs>
      <path
        className="arrow-line"
        mask={`url(#${maskId})`}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="6 7"
        shapeRendering="geometricPrecision"
      />
      <circle className="arrow-ring" fill="none" stroke="currentColor" strokeWidth={2} opacity={0} />
      <g className="arrow-pos" opacity={0} style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.28))' }}>
        <g className="arrow-turn">
          <path className="arrow-shape" d={HEAD} strokeLinejoin="round" />
        </g>
      </g>
    </Box>
  );
}
