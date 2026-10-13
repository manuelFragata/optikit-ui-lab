import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
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
}

export const DEFAULT_PREFERENCES: Preferences = {
  density: 'comfortable',
  labelSize: 'medium',
  arrowSize: 'medium',
  orbitButton: 'right',
  invertZoom: false,
};

const STORAGE_KEY = 'optikit.preferences';

/** The saved preferences over the defaults (none saved, or storage blocked: the defaults). */
function load(): Preferences {
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function save(prefs: Preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Not kept this time; they still apply until the page is closed.
  }
}

interface PreferencesContext {
  prefs: Preferences;
  update: (patch: Partial<Preferences>) => void;
  /** The Settings dialog, opened from the header or from Ctrl K. */
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
}

// Without a provider (a story), the defaults, and changes go nowhere.
const Context = createContext<PreferencesContext>({ prefs: DEFAULT_PREFERENCES, update: () => {}, settingsOpen: false, setSettingsOpen: () => {} });

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState(load);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Ctrl , (⌘ , on a Mac) opens Settings from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setSettingsOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const update = (patch: Partial<Preferences>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    save(next);
  };
  return <Context.Provider value={{ prefs, update, settingsOpen, setSettingsOpen }}>{children}</Context.Provider>;
}

export const usePreferences = () => useContext(Context);
