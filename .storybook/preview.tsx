import { useEffect, useMemo, type ReactNode } from 'react';
import type { Decorator, Preview } from '@storybook/react-vite';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, useColorScheme } from '@mui/material/styles';
import { createAppTheme, type DensityName } from '../src/theme';
import { LightProvider } from '../src/components/editor/light';
import { demoLight } from '../src/demo/demoLight';

type Scheme = 'light' | 'dark';

/** Keeps MUI's colour scheme in sync with the toolbar global. */
function SchemeSync({ scheme }: { scheme: Scheme }) {
  const { setMode } = useColorScheme();
  useEffect(() => setMode(scheme), [scheme, setMode]);
  return null;
}

function ThemeWrapper({ scheme, density, children }: { scheme: Scheme; density: DensityName; children: ReactNode }) {
  const theme = useMemo(() => createAppTheme({ density }), [density]);
  return (
    <ThemeProvider theme={theme} defaultMode={scheme} storageManager={null} disableTransitionOnChange>
      <CssBaseline enableColorScheme />
      <SchemeSync scheme={scheme} />
      {/* The demo light, as in the app. */}
      <LightProvider value={demoLight}>{children}</LightProvider>
    </ThemeProvider>
  );
}

// A story can override density with a `density` arg (see the EditorShell
// stories); otherwise the toolbar value applies.
const withMuiTheme: Decorator = (Story, context) => (
  <ThemeWrapper
    scheme={(context.globals.scheme ?? 'light') as Scheme}
    density={(context.args.density ?? context.globals.density ?? 'comfortable') as DensityName}
  >
    <Story />
  </ThemeWrapper>
);

const preview: Preview = {
  decorators: [withMuiTheme],
  globalTypes: {
    scheme: {
      description: 'MUI colour scheme',
      toolbar: {
        title: 'Scheme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
    density: {
      description: 'Theme density',
      toolbar: {
        title: 'Density',
        icon: 'component',
        items: [
          { value: 'comfortable', title: 'Comfortable' },
          { value: 'compact', title: 'Compact' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    scheme: 'light',
    density: 'comfortable',
  },
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
    options: {
      storySort: {
        order: [
          'Tokens',
          ['Colours', 'Typography', 'Spacing'],
          'Primitives',
          ['Button', 'Pill', 'Pill Switch', 'Tag Chip', 'Tooltip', 'Text Field', 'Number Input', 'Vec3 Field', 'Slider Field', 'Select'],
          'Panels',
          ['Side Panel', 'Disclosure Section', 'Overflow Menu'],
          'Cards',
          ['Dashboard Card', 'Design Card', 'Stacked Cards'],
          'Editor',
          ['Schematic Canvas', 'Canvas Overlays', 'Sidebar Panels'],
          'Landing',
          ['Example Showcase', 'Community Section', 'Bench Preview', 'Pricing Section'],
          'Compositions',
          ['Workspace Shell', 'Editor Shell', 'Settings Dialog'],
          'Views',
          ['Explore', 'Design Page', 'Projects', 'New Project', 'File', 'Commercial'],
          'Pages',
          ['Prototype', 'Landing', 'Home', 'Editor'],
        ],
      },
    },
  },
};

export default preview;
