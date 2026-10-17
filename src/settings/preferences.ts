import { createContext, useContext } from 'react';
import type { DensityName } from '../theme';

/** Small, medium or large: for names and for the move arrows. */
export type Size = 'small' | 'medium' | 'large';

/**
 * How the person likes to work, set once in Settings and kept between
 * sessions (in this browser). What the canvas shows while working (rays,
 * cages, snap…) is not here: that stays in the editor's dock.
 */
export interface Preferences {
  density: DensityName;
  /** Part and ray names: in 3D a fixed size on screen, in 2D a factor on the drawing's text. */
  labelSize: Size;
  /** The 3D move arrows on the selection. */
  arrowSize: Size;
  /** The mouse button that orbits the 3D view; the other one pans. */
  orbitButton: 'right' | 'middle';
  /** Wheel up zooms out instead of in (2D and 3D). */
  invertZoom: boolean;
  /** The edge the editor's sidebar (its panels and panes) sits on. */
  sidebar: 'left' | 'right';
  /** The ground exported plots are saved on: 'white', 'transparent', 'dark' or a '#rrggbb' colour. */
  plotGround: string;
}

export const DEFAULT_PREFERENCES: Preferences = {
  density: 'comfortable',
  labelSize: 'medium',
  arrowSize: 'medium',
  orbitButton: 'right',
  invertZoom: false,
  sidebar: 'left',
  plotGround: 'white',
};

interface PreferencesState {
  prefs: Preferences;
  update: (patch: Partial<Preferences>) => void;
  /** The Settings dialog, opened from the header or from Ctrl K. */
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
}

// Without a provider (a story), the defaults, and changes go nowhere.
export const PreferencesContext = createContext<PreferencesState>({ prefs: DEFAULT_PREFERENCES, update: () => {}, settingsOpen: false, setSettingsOpen: () => {} });

export const usePreferences = () => useContext(PreferencesContext);
