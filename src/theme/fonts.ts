import { monoFonts, uiFonts, type MonoFontName, type UiFontName } from './tokens';

const LINK_ID = 'optikit-fonts';

/**
 * Loads the chosen UI and mono fonts from Google Fonts by (re)writing one
 * <link> in <head>. Fonts are declared only in tokens.ts, so switching the
 * default there is enough; no HTML file needs editing.
 */
export function loadFonts(ui: UiFontName, mono: MonoFontName): void {
  if (typeof document === 'undefined') return;
  const href = `https://fonts.googleapis.com/css2?family=${uiFonts[ui].google}&family=${monoFonts[mono].google}&display=swap`;
  let link = document.getElementById(LINK_ID) as HTMLLinkElement | null;
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
  const families = [...Object.values(uiFonts), ...Object.values(monoFonts)].map((f) => `family=${f.google}`).join('&');
  const link = document.createElement('link');
  link.id = `${LINK_ID}-all`;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  document.head.appendChild(link);
}
