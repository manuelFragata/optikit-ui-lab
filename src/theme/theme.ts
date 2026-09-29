import type { CSSProperties } from 'react';
import { createTheme, type Theme } from '@mui/material/styles';
import {
  colorRoles,
  density as densityTokens,
  fontFamily,
  grey,
  layout,
  radius,
  typeScale,
  type ColorRoles,
  type DensityName,
  type LayoutTokens,
} from './tokens';

/* ------------------------------------------------------------------ */
/* Type augmentation for the custom theme keys                         */
/* ------------------------------------------------------------------ */

declare module '@mui/material/styles' {
  interface Theme {
    layout: LayoutTokens;
    density: DensityName;
  }
  interface ThemeOptions {
    layout?: LayoutTokens;
    density?: DensityName;
  }
  interface Palette {
    accent: ColorRoles['accent'];
    header: ColorRoles['header'];
    canvas: ColorRoles['canvas'];
  }
  interface PaletteOptions {
    accent?: ColorRoles['accent'];
    header?: ColorRoles['header'];
    canvas?: ColorRoles['canvas'];
  }
  interface TypeBackground {
    sunken: string;
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

function palette(mode: 'light' | 'dark') {
  return { ...colorRoles[mode], grey };
}

export function createAppTheme(densityName: DensityName = 'comfortable'): Theme {
  const d = densityTokens[densityName];
  const size = d.controlSize;
  const dense = densityName === 'compact';

  return createTheme({
    // Object form of `cssVariables: true`: the 'data' selector lets the
    // scheme be switched at runtime with useColorScheme().setMode().
    cssVariables: { colorSchemeSelector: 'data' },
    colorSchemes: {
      light: { palette: palette('light') },
      dark: { palette: palette('dark') },
    },
    spacing: d.spacing,
    shape: { borderRadius: radius.base },
    typography: {
      fontFamily: fontFamily.ui,
      ...typeScale,
    },
    layout,
    density: densityName,
    components: {
      MuiButton: {
        defaultProps: { size, disableElevation: true },
      },
      MuiIconButton: { defaultProps: { size } },
      MuiToggleButton: { defaultProps: { size } },
      MuiTextField: { defaultProps: { size } },
      MuiFormControl: { defaultProps: { size } },
      MuiSlider: { defaultProps: { size } },
      MuiChip: { defaultProps: { size: 'small' } },
      MuiList: { defaultProps: { dense } },
      MuiMenuItem: { defaultProps: { dense } },
      MuiTooltip: {
        defaultProps: { arrow: true, enterDelay: 400 },
      },
    },
  });
}

/** Default (comfortable) theme, for the app entry point. */
export const theme = createAppTheme();
