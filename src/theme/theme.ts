import type { CSSProperties } from 'react';
import { createTheme, type Theme } from '@mui/material/styles';
import {
  colorRoles,
  defaultFonts,
  density as densityTokens,
  layout,
  monoFonts,
  radius,
  typeScale,
  uiFonts,
  type ColorRoles,
  type DensityName,
  type LayoutTokens,
  type MonoFontName,
  type RadiusTokens,
  type UiFontName,
} from './tokens';

/* ------------------------------------------------------------------ */
/* Type augmentation for the custom theme keys                         */
/* ------------------------------------------------------------------ */

declare module '@mui/material/styles' {
  interface Theme {
    layout: LayoutTokens;
    density: DensityName;
    /** Radii in px; `shape.borderRadius` equals `radius.base`. */
    radius: RadiusTokens;
    fonts: { ui: UiFontName; mono: MonoFontName };
  }
  interface ThemeOptions {
    layout?: LayoutTokens;
    density?: DensityName;
    radius?: RadiusTokens;
    fonts?: { ui: UiFontName; mono: MonoFontName };
  }
  interface Palette {
    header: ColorRoles['header'];
    brand: ColorRoles['brand'];
    canvas: ColorRoles['canvas'];
    rays: ColorRoles['rays'];
  }
  interface PaletteOptions {
    header?: ColorRoles['header'];
    brand?: ColorRoles['brand'];
    canvas?: ColorRoles['canvas'];
    rays?: ColorRoles['rays'];
  }
  interface PaletteColor {
    /** Tinted background for badges and selected rows. */
    soft?: string;
    /** Text and icons on `soft`. */
    onSoft?: string;
  }
  interface SimplePaletteColorOptions {
    soft?: string;
    onSoft?: string;
  }
  interface TypeBackground {
    sunken: string;
  }
  interface TypeText {
    /** Meta text: timestamps, counts, hashes. */
    meta: string;
  }
  interface TypographyVariants {
    mono: CSSProperties;
    display: CSSProperties;
    headline: CSSProperties;
    meta: CSSProperties;
  }
  interface TypographyVariantsOptions {
    mono?: CSSProperties;
    display?: CSSProperties;
    headline?: CSSProperties;
    meta?: CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    mono: true;
    display: true;
    headline: true;
    meta: true;
  }
}

/* ------------------------------------------------------------------ */
/* Theme factory                                                       */
/* ------------------------------------------------------------------ */

export interface AppThemeOptions {
  density?: DensityName;
  uiFont?: UiFontName;
  monoFont?: MonoFontName;
}

export function createAppTheme({
  density: densityName = 'comfortable',
  uiFont = defaultFonts.ui,
  monoFont = defaultFonts.mono,
}: AppThemeOptions = {}): Theme {
  const d = densityTokens[densityName];
  const size = d.controlSize;
  const dense = densityName === 'compact';

  return createTheme({
    // Object form of `cssVariables: true`: the 'data' selector lets the
    // scheme be switched at runtime with useColorScheme().setMode().
    cssVariables: { colorSchemeSelector: 'data' },
    colorSchemes: {
      light: { palette: colorRoles.light },
      dark: { palette: colorRoles.dark },
    },
    spacing: d.spacing,
    shape: { borderRadius: radius.base },
    typography: {
      fontFamily: uiFonts[uiFont].family,
      ...typeScale,
      mono: { ...typeScale.mono, fontFamily: monoFonts[monoFont].family },
      // Custom variants don't inherit the typography fontFamily; set it so they also hold inside <button>.
      meta: { ...typeScale.meta, fontFamily: uiFonts[uiFont].family },
      display: { ...typeScale.display, fontFamily: uiFonts[uiFont].family },
      headline: { ...typeScale.headline, fontFamily: uiFonts[uiFont].family },
    },
    layout,
    radius,
    density: densityName,
    fonts: { ui: uiFont, mono: monoFont },
    components: {
      MuiButton: {
        defaultProps: { size, disableElevation: true },
        styleOverrides: {
          root: { whiteSpace: 'nowrap' },
        },
        variants: [
          // Bench: one accent action per view; the rest are neutral outline + ink.
          {
            props: { variant: 'outlined', color: 'primary' },
            style: ({ theme }) => ({
              borderColor: (theme.vars ?? theme).palette.divider,
              color: (theme.vars ?? theme).palette.text.primary,
              '&:hover': {
                borderColor: (theme.vars ?? theme).palette.text.secondary,
                backgroundColor: (theme.vars ?? theme).palette.action.hover,
              },
            }),
          },
        ],
      },
      MuiIconButton: { defaultProps: { size } },
      MuiToggleButton: { defaultProps: { size } },
      MuiTextField: { defaultProps: { size } },
      MuiFormControl: { defaultProps: { size } },
      MuiSlider: { defaultProps: { size } },
      MuiChip: {
        defaultProps: { size: 'small' },
        styleOverrides: { root: ({ theme }) => ({ borderRadius: theme.shape.borderRadius }) },
      },
      MuiList: { defaultProps: { dense } },
      MuiMenuItem: { defaultProps: { dense } },
      MuiLink: {
        defaultProps: { underline: 'always' },
        styleOverrides: { root: { textUnderlineOffset: '0.2em' } },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          // Fields sit on the sunken tone with a hairline border.
          root: ({ theme }) => ({
            backgroundColor: (theme.vars ?? theme).palette.background.sunken,
            '&:hover:not(.Mui-focused):not(.Mui-error) .MuiOutlinedInput-notchedOutline': {
              borderColor: (theme.vars ?? theme).palette.text.secondary,
            },
          }),
          notchedOutline: ({ theme }) => ({ borderColor: (theme.vars ?? theme).palette.divider }),
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            '&.Mui-selected, &.Mui-selected:hover': {
              backgroundColor: (theme.vars ?? theme).palette.primary.soft,
              color: (theme.vars ?? theme).palette.primary.onSoft,
              '& .MuiListItemIcon-root': { color: 'inherit' },
            },
          }),
        },
      },
      MuiTab: {
        styleOverrides: { root: { textTransform: 'none' } },
      },
      MuiTooltip: {
        defaultProps: { arrow: true, enterDelay: 400 },
        styleOverrides: {
          tooltip: ({ theme }) => ({
            backgroundColor: (theme.vars ?? theme).palette.text.primary,
            color: (theme.vars ?? theme).palette.background.paper,
            ...theme.typography.body2,
          }),
          arrow: ({ theme }) => ({ color: (theme.vars ?? theme).palette.text.primary }),
        },
      },
    },
  });
}

/** Default (comfortable) theme, for the app entry point. */
export const theme = createAppTheme();
