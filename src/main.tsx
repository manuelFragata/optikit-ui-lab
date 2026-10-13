import { StrictMode, useMemo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { App } from './App';
import { LightProvider } from './components/editor/light';
import { demoLight } from './demo/demoLight';
import { PreferencesProvider, usePreferences } from './settings/preferences';
import { AppSettings } from './settings/SettingsDialog';
import { createAppTheme, defaultFonts, loadFonts } from './theme';

loadFonts(defaultFonts.ui, defaultFonts.mono);

/** The theme, at the density chosen in Settings. */
function Themed({ children }: { children: ReactNode }) {
  const { density } = usePreferences().prefs;
  const theme = useMemo(() => createAppTheme({ density }), [density]);
  return (
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreferencesProvider>
      {/* Where the light goes: the demo stand-in, until the optics engine (oc-wasm) replaces it here. */}
      <LightProvider value={demoLight}>
        <Themed>
          <App />
          <AppSettings />
        </Themed>
      </LightProvider>
    </PreferencesProvider>
  </StrictMode>,
);
