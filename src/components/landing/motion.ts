/**
 * Motion for the landing page, on GSAP: headlines whose words rise into
 * place, numbers that count up, groups that come in one after another, and
 * the springy press on the pills. Everything plays once, when it scrolls into
 * view, and nothing moves for visitors who ask for reduced motion.
 */
import { useLayoutEffect, useRef, type RefObject } from 'react';
import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(DrawSVGPlugin, MorphSVGPlugin, ScrollTrigger, SplitText);

export { gsap };

/** The house easing: a quick start that settles softly. */
export const EASE_OUT = 'power3.out';

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Play when the element's top comes a little way into the window. */
const inView = (trigger: Element) => ({ trigger, start: 'top 88%', once: true });

/**
 * A headline whose words rise into place, sharpening from a blur, one after
 * another: at once (`immediate`, for the first screen) or when it scrolls
 * into view. Use on plain-text headings: the words are split in the DOM.
 */
export function useRiseIn<T extends HTMLElement>({ immediate = false, delay = 0 }: { immediate?: boolean; delay?: number } = {}): RefObject<T | null> {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const ctx = gsap.context(() => {
      const split = SplitText.create(el, { type: 'words', tag: 'span' });
      gsap.from(split.words, {
        opacity: 0,
        yPercent: 45,
        filter: 'blur(10px)',
        duration: 1,
        delay,
        ease: EASE_OUT,
        stagger: 0.06,
        scrollTrigger: immediate ? undefined : inView(el),
        // Leave the words as plain text again once they are in place.
        onComplete: () => split.revert(),
      });
    }, el);
    return () => ctx.revert();
  }, []);
  return ref;
}

/**
 * The element's children come in one after another (up a little, from
 * transparent) when it scrolls into view.
 */
export function useStaggerIn<T extends HTMLElement>({ y = 32, stagger = 0.12 }: { y?: number; stagger?: number } = {}): RefObject<T | null> {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from(el.children, { opacity: 0, y, scale: 0.97, duration: 0.9, ease: EASE_OUT, stagger, scrollTrigger: inView(el), clearProps: 'transform,opacity' });
    }, el);
    return () => ctx.revert();
  }, []);
  return ref;
}

/**
 * A number that counts up from zero when it scrolls into view. The element
 * holds the final text (so it reads right without motion); text that is not
 * a whole number is left alone. It keeps one width throughout, so what
 * follows it doesn't move while it counts.
 */
export function useCountUp<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const text = el?.textContent ?? '';
    if (!el || !/^\d+$/.test(text) || reducedMotion()) return;
    const counter = { value: 0 };
    const ctx = gsap.context(() => {
      gsap.to(counter, {
        value: Number(text),
        duration: 1.6,
        ease: 'power2.out',
        scrollTrigger: inView(el),
        // Room for as many of the widest digit as the final number has (this
        // face's digits are not all one width), measured now that the page's
        // fonts are in.
        onStart: () => {
          let widest = 0;
          for (let d = 0; d <= 9; d++) {
            el.textContent = String(d).repeat(text.length);
            widest = Math.max(widest, el.getBoundingClientRect().width);
          }
          el.style.minWidth = `${widest}px`;
          // Spare room goes in front, so the number ends where its label starts.
          el.style.textAlign = 'right';
          el.textContent = '0';
        },
        onUpdate: () => {
          el.textContent = String(Math.round(counter.value));
        },
      });
      el.textContent = '0';
    }, el);
    return () => {
      ctx.revert();
      el.textContent = text;
      el.style.minWidth = '';
      el.style.textAlign = '';
    };
  }, []);
  return ref;
}

/** Pressing: the element gives a little under the pointer. */
export function pressDown(el: Element) {
  if (reducedMotion()) return;
  gsap.to(el, { scale: 0.95, duration: 0.12, ease: 'power2.out', overwrite: 'auto' });
}

/** Letting go: it springs back. */
export function pressUp(el: Element) {
  if (reducedMotion()) return;
  gsap.to(el, { scale: 1, duration: 0.7, ease: 'elastic.out(1.1, 0.35)', overwrite: 'auto', clearProps: 'scale' });
}

/**
 * The light paths of the schematic in `root` draw themselves in, one after
 * another; their arrows and labels appear once each line is down. Returns a
 * stop function.
 */
export function drawRays(root: Element): () => void {
  const rays = [...root.querySelectorAll<SVGGElement>('.schematic-ray')];
  if (!rays.length || reducedMotion()) return () => undefined;
  const tl = gsap.timeline();
  rays.forEach((ray, i) => {
    const line = ray.querySelector('polyline');
    const marks = ray.querySelectorAll('path, text');
    const at = 0.15 + i * 0.35;
    if (line) {
      tl.fromTo(line, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.1, ease: 'power2.inOut', clearProps: 'strokeDasharray,strokeDashoffset' }, at);
    }
    tl.fromTo(marks, { opacity: 0 }, { opacity: 1, duration: 0.4, clearProps: 'opacity' }, at + 0.8);
  });
  return () => {
    tl.progress(1).kill();
  };
}
