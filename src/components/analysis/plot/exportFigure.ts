/**
 * A plot as a file, for a report or a paper: SVG (vector) or PNG (raster, 3×).
 *
 * The plot on screen draws with the theme's CSS variables and the app's
 * fonts; a file on its own has neither. So the export copies the plot,
 * writes each colour as it resolves in the scheme that reads on the chosen
 * ground (`PlotGround`: white, transparent, dark or a colour), puts that
 * ground behind it, and embeds the plots' serif (STIX Two Text, SIL OFL 1.1,
 * which allows embedding) so the file reads the same anywhere.
 */
import greekItalic from '../../../theme/fonts/stix-two-text/STIXTwoText-greek-400-italic.woff2';
import greekNormal from '../../../theme/fonts/stix-two-text/STIXTwoText-greek-400-normal.woff2';
import latinItalic from '../../../theme/fonts/stix-two-text/STIXTwoText-latin-400-italic.woff2';
import latinNormal from '../../../theme/fonts/stix-two-text/STIXTwoText-latin-400-normal.woff2';
import { downloadBlob } from '../../primitives/download';

const LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const GREEK = 'U+0370-0377, U+037A-037F, U+0384-038A, U+038C, U+038E-03A1, U+03A3-03FF';
const FACES = [
  { url: latinNormal, style: 'normal', range: LATIN },
  { url: latinItalic, style: 'italic', range: LATIN },
  { url: greekNormal, style: 'normal', range: GREEK },
  { url: greekItalic, style: 'italic', range: GREEK },
];

/** The font faces as CSS with the files inline, fetched once. */
let embedded: Promise<string> | null = null;
function embeddedFonts(): Promise<string> {
  embedded ??= Promise.all(
    FACES.map(async (f) => {
      const bytes = new Uint8Array(await (await fetch(f.url)).arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return `@font-face{font-family:'STIX Two Text';font-style:${f.style};font-weight:400;src:url(data:font/woff2;base64,${btoa(binary)}) format('woff2');unicode-range:${f.range};}`;
    }),
  ).then((faces) => faces.join(''));
  embedded.catch(() => (embedded = null));
  return embedded;
}

/**
 * The ground a plot is saved on: white (for a paper), transparent, dark (for
 * dark slides), or a colour of one's own (`#rrggbb`). The ink follows it: the
 * light scheme's on a light ground, the dark scheme's on a dark one.
 */
export type PlotGround = 'white' | 'transparent' | 'dark' | `#${string}`;

/** Is a `#rrggbb` colour dark (relative luminance under the middle grey)? */
export function isDark(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  // 0.179: where black and white ink read equally well (WCAG contrast).
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.179;
}

/** The colour scheme whose ink reads on a ground. */
export const schemeOf = (ground: PlotGround): 'light' | 'dark' => (ground === 'dark' || (ground.startsWith('#') && isDark(ground)) ? 'dark' : 'light');

const PAPER_VAR = 'var(--mui-palette-background-paper)';

/** What a CSS colour expression (with the theme's variables) resolves to in a scheme, whatever the screen shows. */
function resolver(scheme: 'light' | 'dark') {
  // The theme sets its variables on [data-light] and [data-dark] (colorSchemeSelector 'data').
  const host = document.createElement('div');
  host.setAttribute(`data-${scheme}`, '');
  host.style.display = 'none';
  const probe = document.createElement('span');
  host.appendChild(probe);
  document.body.appendChild(host);
  const cache = new Map<string, string>();
  const resolve = (expr: string) => {
    let v = cache.get(expr);
    if (v === undefined) {
      probe.style.color = '';
      probe.style.color = expr;
      v = getComputedStyle(probe).color || expr;
      cache.set(expr, v);
    }
    return v;
  };
  return { resolve, done: () => host.remove() };
}

const COLOR_ATTRS = ['fill', 'stroke', 'stop-color', 'color'];

/** The plot as a standalone SVG document, on `ground`. */
export async function svgOf(svg: SVGSVGElement, ground: PlotGround = 'white'): Promise<{ text: string; width: number; height: number }> {
  const width = svg.width.baseVal.value;
  const height = svg.height.baseVal.value;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const { resolve, done } = resolver(schemeOf(ground));
  try {
    // The plot's own paper (its area, the legend's box, the halo behind labels) takes the ground's colour.
    const groundFill = ground === 'transparent' ? 'none' : ground === 'white' ? '#ffffff' : ground === 'dark' ? resolve(PAPER_VAR) : ground;
    const colour = (expr: string) => (expr.trim() === PAPER_VAR ? groundFill : resolve(expr));
    for (const el of [clone, ...clone.querySelectorAll('*')]) {
      for (const name of COLOR_ATTRS) {
        const v = el.getAttribute(name);
        if (v && v.includes('var(')) el.setAttribute(name, colour(v));
      }
      const style = el.getAttribute('style');
      if (style && style.includes('var('))
        el.setAttribute(
          'style',
          style.replace(/var\([^)]*\)/g, (m) => colour(m)),
        );
    }
    const ns = 'http://www.w3.org/2000/svg';
    clone.setAttribute('xmlns', ns);
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));
    clone.removeAttribute('style');
    const styleEl = document.createElementNS(ns, 'style');
    styleEl.textContent = await embeddedFonts();
    if (groundFill !== 'none') {
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('width', '100%');
      rect.setAttribute('height', '100%');
      rect.setAttribute('fill', groundFill);
      clone.insertBefore(rect, clone.firstChild);
    }
    clone.insertBefore(styleEl, clone.firstChild);
    return { text: `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`, width, height };
  } finally {
    done();
  }
}

export async function exportSvg(svg: SVGSVGElement, fileName: string, ground: PlotGround = 'white') {
  const { text } = await svgOf(svg, ground);
  downloadBlob(`${fileName}.svg`, new Blob([text], { type: 'image/svg+xml' }));
}

/** The plot drawn at `scale` × its size on screen (3: about 300 dpi at its printed size), as PNG; transparent stays transparent. */
export async function exportPng(svg: SVGSVGElement, fileName: string, ground: PlotGround = 'white', scale = 3) {
  const { text, width, height } = await svgOf(svg, ground);
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'sync';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('The plot could not be drawn as an image.'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser cannot draw the image.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('The image could not be made.');
    downloadBlob(`${fileName}.png`, blob);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** A file name from a figure's title: "Spot · at Camera" → "spot-at-camera". */
export const fileNameOf = (title: string) =>
  title
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-') || 'plot';
