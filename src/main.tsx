import { StrictMode, useMemo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { App } from './App';
import { usePreferences } from './settings/preferences';
import { PreferencesProvider } from './settings/PreferencesProvider';
import { StandinsProvider } from './standins/StandinsProvider';
import { networkFromSearch } from './standins/network';
import { AppSettings } from './settings/SettingsDialog';
import { createAppTheme } from './theme';

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

/** How the stand-ins answer: a short delay, or what the address asks for (?latency=800&fail=0.3). */
const network = networkFromSearch(window.location.search);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreferencesProvider>
      {/* The light, the library and the service: the lab's stand-ins, until the real ones replace them here. */}
      <StandinsProvider network={network}>
        <Themed>
          <App />
          <AppSettings />
        </Themed>
      </StandinsProvider>
    </PreferencesProvider>
  </StrictMode>,
);
