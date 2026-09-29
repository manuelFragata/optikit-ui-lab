/**
 * Design tokens: the ONLY place where raw values live.
 *
 * Values follow "Direction C · Bench": hairlines instead of fills, labels and
 * values in mono, one accent used sparingly. Values marked (derived) are not
 * on the Bench sheet and were filled in to complete the dark scheme or the
 * warning/error roles; replace them when the sheet covers them.
 *
 * Components never read this file directly; they read the MUI theme built
 * from it in `theme.ts`. The token stories are the one exception, because
 * their job is to document these values.
 */

/* ------------------------------------------------------------------ */
/* Brand: identity only, never UI chrome                               */
/* ------------------------------------------------------------------ */

export const brand = {
  /** Wordmark, page titles. Light scheme only. */
  anchor: '#023672',
  /** Logo and landing page only. */
  lime: '#84B818',
} as const;

/* ------------------------------------------------------------------ */
/* UI colours per scheme                                               */
/* ------------------------------------------------------------------ */

export interface SchemeColors {
  /** Buttons, selection, focus, links. */
  accent: string;
  accentHover: string;
  /** Selected rows, active tool. */
  accentSoft: string;
  /** Text and icons on accentSoft. */
  onAccentSoft: string;
  /** Text on a solid accent fill. */
  onAccent: string;
  /** In a cube, buildable, published. Fill only; text sits on statusSoft in onStatusSoft. */
  status: string;
  statusSoft: string;
  onStatusSoft: string;
  warning: string;
  warningSoft: string;
  onWarningSoft: string;
  error: string;
  errorSoft: string;
  onErrorSoft: string;
  /** Page ground behind cards. */
  page: string;
  /** Panels, cards. */
  surface: string;
  /** Table heads, fields, thumbnails. */
  sunken: string;
  /** 1px panel separation. */
  line: string;
  /** Primary text. */
  ink: string;
  /** Secondary text. */
  ink2: string;
  /** Meta text; the 4.5:1 floor. */
  ink3: string;
}

export const colors: Record<'light' | 'dark', SchemeColors> = {
  light: {
    accent: '#1A745D',
    accentHover: '#145C4A',
    accentSoft: '#E2F0EB',
    onAccentSoft: '#115A47',
    onAccent: '#FFFFFF',
    status: '#76B133',
    statusSoft: '#EAF3DC',
    onStatusSoft: '#3A6210',
    warning: '#B45309', // (derived)
    warningSoft: '#FCEFE3', // (derived)
    onWarningSoft: '#8A3F06', // (derived)
    error: '#B42318', // (derived)
    errorSoft: '#FBE9E7', // (derived)
    onErrorSoft: '#912018', // (derived)
    page: '#FAFAF8',
    surface: '#FFFFFF',
    sunken: '#F1F2EF',
    line: '#DDDFD9',
    ink: '#16191A',
    ink2: '#4E5553',
    ink3: '#636B69',
  },
  dark: {
    accent: '#5BB49D',
    accentHover: '#74C4AF', // (derived)
    accentSoft: '#15312A',
    onAccentSoft: '#8ACFBA',
    onAccent: '#101315',
    status: '#76B133',
    statusSoft: '#1E2C12',
    onStatusSoft: '#A6D27A', // (derived)
    warning: '#F0A64B', // (derived)
    warningSoft: '#33240F', // (derived)
    onWarningSoft: '#F3C185', // (derived)
    error: '#F07A70', // (derived)
    errorSoft: '#3A1916', // (derived)
    onErrorSoft: '#F5A39B', // (derived)
    page: '#101315',
    surface: '#171A19',
    sunken: '#0F1211',
    line: '#2A2F2C',
    ink: '#EAEDEB',
    ink2: '#AEB6B2', // (derived)
    ink3: '#8E9793', // (derived)
  },
};

/* ------------------------------------------------------------------ */
/* Canvas: no brand colour on the drawing surface                      */
/* ------------------------------------------------------------------ */

export interface CanvasColors {
  /** Editor ground. */
  ground: string;
  /** Minor grid lines, every cube. */
  grid: string;
  /** Major grid lines, every 5 cubes. */
  gridMajor: string;
  /** Symbol stroke. */
  symbol: string;
  /** Grouping box (dashed). */
  group: string;
  /** Selection outline and handles. */
  selection: string;
}

/**
 * The landing page's 3D bench (three.js reads plain hex, not CSS variables).
 * The beam is the 520 nm laser's green, not a UI colour. (derived)
 */
export interface BenchColors {
  beam: string;
  plate: string;
  tile: string;
  outline: string;
  selection: string;
  /** Stage background, top to bottom. */
  stageTop: string;
  stageBottom: string;
}

export const benchColors: Record<'light' | 'dark', BenchColors> = {
  light: {
    beam: '#2FBF4A',
    plate: '#3A4047',
    tile: '#F4F4F1',
    outline: '#8C959E',
    selection: '#1A745D',
    stageTop: '#E9EDF1',
    stageBottom: '#D6DDE3',
  },
  dark: {
    beam: '#4BE06A',
    plate: '#2A3037',
    tile: '#C9CDD1',
    outline: '#6B747D',
    selection: '#5BB49D',
    stageTop: '#1C2329',
    stageBottom: '#12171B',
  },
};

export const canvasColors: Record<'light' | 'dark', CanvasColors> = {
  light: {
    ground: '#FFFFFF',
    grid: '#E7EAEE',
    gridMajor: '#D2D8DE',
    symbol: '#333A41',
    group: '#B9C2CA',
    selection: '#101418',
  },
  dark: {
    ground: '#101315',
    grid: '#20262B',
    gridMajor: '#2B333A',
    symbol: '#C7D0D8',
    group: '#49535B',
    selection: '#EAEDEB', // (derived)
  },
};

/** Ray hues, in the order new rays pick them. Drawn 2px with a direction arrow and a label. */
export interface RayColors {
  ray1: string;
  ray2: string;
  ray3: string;
  ray4: string;
  ray5: string;
  ray6: string;
}

export const rayColors: Record<'light' | 'dark', RayColors> = {
  light: {
    ray1: '#1D63D1',
    ray2: '#B8430A',
    ray3: '#0E7490',
    ray4: '#A02E86',
    ray5: '#136A3A',
    ray6: '#9A2B25',
  },
  dark: {
    ray1: '#6EA8FA',
    ray2: '#F0A64B',
    ray3: '#4CC3DF', // (derived)
    ray4: '#E283CC', // (derived)
    ray5: '#5CC98A', // (derived)
    ray6: '#F08A80', // (derived)
  },
};

/* ------------------------------------------------------------------ */
/* Semantic roles, as the theme consumes them                          */
/* ------------------------------------------------------------------ */

interface Tone {
  main: string;
  contrastText: string;
  /** Tinted background for badges and selected rows. */
  soft: string;
  /** Text and icons on `soft`. */
  onSoft: string;
}

export interface ColorRoles {
  primary: Tone & { dark: string };
  /** Neutral: secondary actions use outline + ink, never a second hue. */
  secondary: { main: string; contrastText: string };
  success: Tone;
  warning: Tone;
  error: Tone;
  background: { default: string; paper: string; sunken: string };
  text: { primary: string; secondary: string; meta: string; disabled: string };
  divider: string;
  /** App header in its solid "anchor bar" style. */
  header: { main: string; contrastText: string };
  brand: { anchor: string; lime: string };
  canvas: CanvasColors;
  rays: RayColors;
}

function roles(mode: 'light' | 'dark'): ColorRoles {
  const c = colors[mode];
  return {
    primary: { main: c.accent, dark: c.accentHover, contrastText: c.onAccent, soft: c.accentSoft, onSoft: c.onAccentSoft },
    secondary: { main: c.ink2, contrastText: c.surface },
    success: { main: c.status, contrastText: c.surface, soft: c.statusSoft, onSoft: c.onStatusSoft },
    warning: { main: c.warning, contrastText: c.surface, soft: c.warningSoft, onSoft: c.onWarningSoft },
    error: { main: c.error, contrastText: c.surface, soft: c.errorSoft, onSoft: c.onErrorSoft },
    background: { default: c.page, paper: c.surface, sunken: c.sunken },
    text: { primary: c.ink, secondary: c.ink2, meta: c.ink3, disabled: c.ink3 },
    divider: c.line,
    header: { main: brand.anchor, contrastText: '#FFFFFF' },
    brand,
    canvas: canvasColors[mode],
    rays: rayColors[mode],
  };
}

export const colorRoles: Record<'light' | 'dark', ColorRoles> = {
  light: roles('light'),
  dark: roles('dark'),
};

/* ------------------------------------------------------------------ */
/* Shape, spacing, density                                             */
/* ------------------------------------------------------------------ */

export const radius = {
  /** Controls, chips, fields (Bench). */
  base: 3,
  /** Landing-page cards. */
  card: 16,
  /** Tiles and rows nested inside a card. */
  tile: 8,
  /** Large landing-page stages (example slideshow, 3D bench). (derived) */
  stage: 28,
  /** Pills: landing CTAs, tag filters. */
  pill: 999,
} as const;

export type RadiusTokens = typeof radius;

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
  canvasGridMinor: 4,
  canvasGridMajor: 20,
  /** Max content width of document-style pages (home, browse). */
  pageMaxWidth: 184,
  /** Height of design-card thumbnails. */
  thumbnailHeight: 20,
  /** Stacked-card content height, so switching cards never shifts the layout. */
  stackedCardHeight: 34,
  /** Site top bar (landing, home, account): height, and the tint of the page behind it. */
  topbarHeight: 8,
  /** Percent of the page colour kept in the translucent top bar (derived). */
  topbarTint: 78,
  /** Backdrop blur behind the top bar, spacing units (derived). */
  topbarBlur: 1.5,
  /** Height of the 3D bench stage on the landing page. */
  benchStageHeight: 84,
  benchStageHeightCompact: 60,
  /** Height of the example stage on the signed-out landing page. */
  exampleStageHeight: 58,
  exampleStageHeightCompact: 36,
  /** Cube height in the landing-page feature bench. */
  featureCubeHeight: 22,
  hairline,
} as const;

export type LayoutTokens = typeof layout;

/* ------------------------------------------------------------------ */
/* Typography                                                          */
/* ------------------------------------------------------------------ */

export interface FontOption {
  label: string;
  /** CSS font-family stack. */
  family: string;
  /** Google Fonts `family=` query, loaded at runtime by theme/fonts.ts. */
  google: string;
  note: string;
}

const SANS_FALLBACK = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const MONO_FALLBACK = 'ui-monospace, "SFMono-Regular", Consolas, monospace';

/**
 * UI typeface candidates. Switch between them live with the Storybook
 * toolbar ("Font"); make one the default with `defaultFonts` below.
 */
export const uiFonts = {
  plex: {
    label: 'IBM Plex Sans',
    family: `"IBM Plex Sans", ${SANS_FALLBACK}`,
    google: 'IBM+Plex+Sans:wght@400;500;600;700',
    note: 'Humanist, soft curves. The original choice.',
  },
  instrument: {
    label: 'Instrument Sans',
    family: `"Instrument Sans", ${SANS_FALLBACK}`,
    google: 'Instrument+Sans:wght@400;500;600;700',
    note: 'Compact grotesque, flat terminals. Close to the Bench mockups.',
  },
  interTight: {
    label: 'Inter Tight',
    family: `"Inter Tight", ${SANS_FALLBACK}`,
    google: 'Inter+Tight:wght@400;500;600;700',
    note: 'Neutral UI grotesque, tighter spacing than Inter.',
  },
  archivo: {
    label: 'Archivo',
    family: `"Archivo", ${SANS_FALLBACK}`,
    google: 'Archivo:wght@400;500;600;700',
    note: 'Sturdy engineering grotesque, squarer curves.',
  },
  barlow: {
    label: 'Barlow',
    family: `"Barlow", ${SANS_FALLBACK}`,
    google: 'Barlow:wght@400;500;600;700',
    note: 'DIN-like, technical signage feel. Narrow.',
  },
  publicSans: {
    label: 'Public Sans',
    family: `"Public Sans", ${SANS_FALLBACK}`,
    google: 'Public+Sans:wght@400;500;600;700',
    note: 'Plain government-style neo-grotesque.',
  },
} satisfies Record<string, FontOption>;

/** Monospace candidates for labels, values and coordinates ("Mono" in the toolbar). */
export const monoFonts = {
  plexMono: {
    label: 'IBM Plex Mono',
    family: `"IBM Plex Mono", ${MONO_FALLBACK}`,
    google: 'IBM+Plex+Mono:wght@400;500',
    note: 'Slab-ish, typewriter feel.',
  },
  jetbrains: {
    label: 'JetBrains Mono',
    family: `"JetBrains Mono", ${MONO_FALLBACK}`,
    google: 'JetBrains+Mono:wght@400;500',
    note: 'Tall x-height, very legible numbers.',
  },
  robotoMono: {
    label: 'Roboto Mono',
    family: `"Roboto Mono", ${MONO_FALLBACK}`,
    google: 'Roboto+Mono:wght@400;500',
    note: 'Neutral and narrow.',
  },
  sourceCode: {
    label: 'Source Code Pro',
    family: `"Source Code Pro", ${MONO_FALLBACK}`,
    google: 'Source+Code+Pro:wght@400;500',
    note: 'Light, open, classic code face.',
  },
} satisfies Record<string, FontOption>;

export type UiFontName = keyof typeof uiFonts;
export type MonoFontName = keyof typeof monoFonts;

/** The fonts the app and Storybook start with. Change these two names to switch for good. */
export const defaultFonts: { ui: UiFontName; mono: MonoFontName } = {
  ui: 'instrument',
  mono: 'jetbrains',
};

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/**
 * Bench scale: Display 24/600, Section 17/600, Body 13/400, UI 12/400,
 * Label 10/500, Mono 12/400. The remaining MUI variants sit between them.
 */
export const typeScale = {
  // Marketing sizes for the signed-out landing page only (derived; Bench stops at Display 24).
  display: { fontSize: 'clamp(2.25rem, 5.6vw, 4.5rem)', lineHeight: 1.02, fontWeight: fontWeight.regular, letterSpacing: '-0.04em' },
  headline: { fontSize: 'clamp(1.625rem, 3.4vw, 2.75rem)', lineHeight: 1.08, fontWeight: fontWeight.regular, letterSpacing: '-0.035em' },
  h1: { fontSize: '1.5rem', lineHeight: 1.3, fontWeight: fontWeight.semibold, letterSpacing: '-0.01em' }, // Display 24
  h2: { fontSize: '1.0625rem', lineHeight: 1.4, fontWeight: fontWeight.semibold }, // Section 17
  h3: { fontSize: '1rem', lineHeight: 1.4, fontWeight: fontWeight.semibold },
  h4: { fontSize: '0.9375rem', lineHeight: 1.4, fontWeight: fontWeight.semibold },
  h5: { fontSize: '0.875rem', lineHeight: 1.4, fontWeight: fontWeight.semibold },
  h6: { fontSize: '0.8125rem', lineHeight: 1.4, fontWeight: fontWeight.semibold },
  subtitle1: { fontSize: '0.875rem', lineHeight: 1.45, fontWeight: fontWeight.medium },
  subtitle2: { fontSize: '0.8125rem', lineHeight: 1.45, fontWeight: fontWeight.medium },
  body1: { fontSize: '0.8125rem', lineHeight: 1.5, fontWeight: fontWeight.regular }, // Body 13
  body2: { fontSize: '0.75rem', lineHeight: 1.5, fontWeight: fontWeight.regular }, // UI 12
  button: { fontSize: '0.75rem', lineHeight: 1.5, fontWeight: fontWeight.medium, textTransform: 'none' }, // UI 12
  caption: { fontSize: '0.6875rem', lineHeight: 1.45, fontWeight: fontWeight.regular },
  overline: {
    // Label 10
    fontSize: '0.625rem',
    lineHeight: 1.6,
    fontWeight: fontWeight.medium,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  // Secondary lines under a title ("9 cubes · 6 parts", "v0.4.2 · 2 h ago"): the UI font with
  // tabular figures, so counts and versions line up without a monospace look.
  meta: { fontSize: '0.75rem', lineHeight: 1.5, fontWeight: fontWeight.regular, fontVariantNumeric: 'tabular-nums' },
  // fontFamily comes from the selected mono font (see createAppTheme).
  mono: { fontSize: '0.75rem', lineHeight: 1.5, fontWeight: fontWeight.regular }, // Mono 12
} as const;

export type TypeScaleVariant = keyof typeof typeScale;
