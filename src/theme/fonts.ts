import { monoFonts, uiFonts, type FontOption, type MonoFontName, type UiFontName } from './tokens';
// Self-hosted brand font (Objectivity, SIL OFL 1.1); bundled by Vite, so it works offline too.
import './fonts/objectivity/objectivity.css';

const LINK_ID = 'optikit-fonts';

function googleHref(fonts: FontOption[]): string | null {
  const families = fonts.flatMap((f) => (f.google ? [`family=${f.google}`] : []));
  return families.length ? `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap` : null;
}

/**
 * Loads the chosen UI and mono fonts from Google Fonts by (re)writing one
 * <link> in <head>. Fonts are declared only in tokens.ts, so switching the
 * default there is enough; no HTML file needs editing. Self-hosted fonts
 * (no `google` query) are already loaded by the CSS import above.
 */
export function loadFonts(ui: UiFontName, mono: MonoFontName): void {
  if (typeof document === 'undefined') return;
  const href = googleHref([uiFonts[ui], monoFonts[mono]]);
  let link = document.getElementById(LINK_ID) as HTMLLinkElement | null;
  if (!href) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement('link');
    link.id = LINK_ID;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}

/** Loads every candidate at once, for the side-by-side comparison story. */
export function loadAllFontCandidates(): void {
  if (typeof document === 'undefined' || document.getElementById(`${LINK_ID}-all`)) return;
  const href = googleHref([...Object.values(uiFonts), ...Object.values(monoFonts)]);
  if (!href) return;
  const link = document.createElement('link');
  link.id = `${LINK_ID}-all`;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}
