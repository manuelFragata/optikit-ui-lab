import type { CSSProperties } from 'react';
import { createTheme, type Theme } from '@mui/material/styles';
import {
  colorRoles,
  density as densityTokens,
  fontFamily,
  layout,
  radius,
  typeScale,
  type ColorRoles,
  type DensityName,
  type LayoutTokens,
  type RadiusTokens,
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
  }
  interface ThemeOptions {
    layout?: LayoutTokens;
    density?: DensityName;
    radius?: RadiusTokens;
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
  }
  interface TypographyVariantsOptions {
    mono?: CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    mono: true;
  }
}

/* ------------------------------------------------------------------ */
/* Theme factory                                                       */
/* ------------------------------------------------------------------ */

export function createAppTheme(densityName: DensityName = 'comfortable'): Theme {
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
      fontFamily: fontFamily.ui,
      ...typeScale,
    },
    layout,
    radius,
    density: densityName,
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
