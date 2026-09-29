/**
 * Design tokens: the ONLY place where raw values live.
 *
 * Components never read this file directly; they read the MUI theme built
 * from it in `theme.ts`. The token stories are the one exception, because
 * their job is to document these values.
 */

/* ------------------------------------------------------------------ */
/* Brand                                                               */
/* ------------------------------------------------------------------ */

export const brand = {
  navy: '#023773',
  teal: '#1F9C7C',
  lime: '#85B918',
  /** Lighter navy used where navy sits on dark surfaces. */
  navyTint: '#7FA6D9',
} as const;

export const white = '#FFFFFF';

/**
 * Neutral ramp. 50 and 500 are the brand greys; the rest are interpolated
 * starting values, and 600–900 exist so dark mode has surfaces to sit on.
 */
export const grey = {
  50: '#FAF9F9',
  100: '#F2F1F1',
  200: '#E4E3E3',
  300: '#CFCECE',
  400: '#B5B4B4',
  500: '#999999',
  600: '#6B6E73',
  700: '#3A3F47',
  800: '#23282F',
  850: '#1C2026',
  900: '#15181D',
} as const;

/* ------------------------------------------------------------------ */
/* Semantic colour roles, per scheme                                   */
/* ------------------------------------------------------------------ */

export interface ColorRoles {
  primary: { main: string; contrastText: string };
  secondary: { main: string; contrastText: string };
  accent: { main: string; contrastText: string };
  success: { main: string };
  warning: { main: string };
  error: { main: string };
  /** `sunken` is for recessed areas: thumbnails, table heads, wells. */
  background: { default: string; paper: string; sunken: string };
  text: { primary: string; secondary: string; disabled: string };
  divider: string;
  /** App header in its "navy bar" style. */
  header: { main: string; contrastText: string };
  /** Canvas placeholder grid. */
  canvas: { background: string; gridMinor: string; gridMajor: string };
}

export const colorRoles: Record<'light' | 'dark', ColorRoles> = {
  light: {
    primary: { main: brand.navy, contrastText: white },
    secondary: { main: brand.teal, contrastText: white },
    accent: { main: brand.lime, contrastText: grey[900] },
    success: { main: brand.teal },
    warning: { main: '#C77700' },
    error: { main: '#C62828' },
    background: { default: grey[50], paper: white, sunken: grey[100] },
    text: { primary: grey[900], secondary: grey[600], disabled: grey[500] },
    divider: grey[200],
    header: { main: brand.navy, contrastText: white },
    canvas: { background: grey[100], gridMinor: grey[200], gridMajor: grey[300] },
  },
  dark: {
    primary: { main: brand.teal, contrastText: white },
    secondary: { main: brand.navyTint, contrastText: grey[900] },
    accent: { main: brand.lime, contrastText: grey[900] },
    success: { main: brand.teal },
    warning: { main: '#F0A43A' },
    error: { main: '#EF6B6B' },
    background: { default: grey[900], paper: grey[800], sunken: grey[850] },
    text: { primary: grey[50], secondary: grey[400], disabled: grey[600] },
    divider: grey[700],
    header: { main: brand.navy, contrastText: white },
    canvas: { background: grey[900], gridMinor: grey[800], gridMajor: grey[700] },
  },
};

/* ------------------------------------------------------------------ */
/* Shape, spacing, density                                             */
/* ------------------------------------------------------------------ */

export const radius = {
  base: 4,
} as const;

/** Hairline width (px) for grid lines and similar 1-device-pixel rules. */
export const hairline = 1;

export const density = {
  comfortable: { spacing: 7, controlSize: 'medium' },
  compact: { spacing: 5, controlSize: 'small' },
} as const;

export type DensityName = keyof typeof density;

/** Layout dimensions, in spacing units (multiplied by the density's spacing base). */
export const layout = {
  headerHeight: 8,
  statusBarHeight: 4,
  railWidth: 7,
  sidePanelWidth: 40,
  inspectorWidth: 44,
  panelHeaderHeight: 6,
  canvasGridMinor: 2,
  canvasGridMajor: 10,
  /** Max content width of document-style pages (home, browse). */
  pageMaxWidth: 184,
  /** Height of design-card thumbnails. */
  thumbnailHeight: 20,
  /** Stacked-card content height, so switching cards never shifts the layout. */
  stackedCardHeight: 46,
  hairline,
} as const;

export type LayoutTokens = typeof layout;

/* ------------------------------------------------------------------ */
/* Typography                                                          */
/* ------------------------------------------------------------------ */

export const fontFamily = {
  ui: '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, "SFMono-Regular", Consolas, monospace',
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const typeScale = {
  h1: { fontSize: '1.75rem', lineHeight: 1.25, fontWeight: fontWeight.semibold },
  h2: { fontSize: '1.5rem', lineHeight: 1.3, fontWeight: fontWeight.semibold },
  h3: { fontSize: '1.25rem', lineHeight: 1.35, fontWeight: fontWeight.semibold },
  h4: { fontSize: '1.125rem', lineHeight: 1.4, fontWeight: fontWeight.semibold },
  h5: { fontSize: '1rem', lineHeight: 1.4, fontWeight: fontWeight.semibold },
  h6: { fontSize: '0.875rem', lineHeight: 1.4, fontWeight: fontWeight.semibold },
  subtitle1: { fontSize: '0.9375rem', lineHeight: 1.45, fontWeight: fontWeight.medium },
  subtitle2: { fontSize: '0.8125rem', lineHeight: 1.45, fontWeight: fontWeight.medium },
  body1: { fontSize: '0.875rem', lineHeight: 1.5, fontWeight: fontWeight.regular },
  body2: { fontSize: '0.8125rem', lineHeight: 1.45, fontWeight: fontWeight.regular },
  button: { fontSize: '0.8125rem', lineHeight: 1.5, fontWeight: fontWeight.medium, textTransform: 'none' },
  caption: { fontSize: '0.75rem', lineHeight: 1.4, fontWeight: fontWeight.regular },
  overline: {
    fontSize: '0.6875rem',
    lineHeight: 1.6,
    fontWeight: fontWeight.semibold,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  mono: { fontFamily: fontFamily.mono, fontSize: '0.8125rem', lineHeight: 1.45, fontWeight: fontWeight.regular },
} as const;

export type TypeScaleVariant = keyof typeof typeScale;
