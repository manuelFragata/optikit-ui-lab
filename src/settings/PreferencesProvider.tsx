import { useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_PREFERENCES, PreferencesContext, type Preferences } from './preferences';

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
  return <PreferencesContext.Provider value={{ prefs, update, settingsOpen, setSettingsOpen }}>{children}</PreferencesContext.Provider>;
}
