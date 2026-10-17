import { useColorScheme } from '@mui/material/styles';
import { benchColors, colorRoles, type RayColors } from '../../../theme/tokens';
import type { SymbolKind } from '../model';

/** The scene's colours. three.js reads plain values, not CSS variables, so they come from the tokens of the scheme in use. */
export interface SceneColors {
  ground: string;
  grid: string;
  gridMajor: string;
  /** Cages, ghosts, the hover outline. */
  meta: string;
  /** The selection and the current layer. */
  accent: string;
  /** An optic with no holder yet. */
  warning: string;
  /** Translucent cubes and boxes with no mesh. */
  placeholder: string;
  rays: RayColors;
  /** One per kind of optic, as optikit-v2's schematic glyphs. */
  glyphs: Record<SymbolKind, string>;
}

export function useSceneColors(): SceneColors {
  const { mode, systemMode } = useColorScheme();
  const scheme = (mode === 'system' ? systemMode : mode) === 'dark' ? 'dark' : 'light';
  const c = colorRoles[scheme];
  const g = benchColors[scheme].glyphs;
  return {
    ground: c.canvas.ground,
    grid: c.canvas.grid,
    gridMajor: c.canvas.gridMajor,
    meta: c.text.meta,
    accent: c.primary.main,
    warning: c.warning.main,
    placeholder: c.canvas.group,
    rays: c.rays,
    glyphs: { laser: g.source, mirror: g.mirror, dichroic: g.dichroic, lens: g.lens, objective: g.objective, camera: g.detector, filter: g.filter, beamsplitter: g.splitter, aperture: g.aperture },
  };
}
