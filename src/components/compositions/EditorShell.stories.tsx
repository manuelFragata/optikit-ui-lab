import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import Box from '@mui/material/Box';
import type { DensityName } from '../../theme';
import { EditorShell, type EditorShellProps } from './EditorShell';

/** `density` is read by the global theme decorator in .storybook/preview.tsx. */
type ShellArgs = EditorShellProps & { density: DensityName };

const PANEL_STATES = ['collapsed', 'expanded', 'pinned'];

const meta = {
  title: 'Compositions/Editor Shell',
  component: EditorShell,
  parameters: { layout: 'fullscreen' },
  args: {
    headerVariant: 'light',
    panelState: 'collapsed',
    panel: 'palette',
    selectedId: null,
    view: '2d',
    density: 'comfortable',
  },
  argTypes: {
    panelState: { name: 'Sidebar panel', control: 'inline-radio', options: PANEL_STATES },
    panel: { name: 'Sidebar shows', control: 'inline-radio', options: ['sketch', 'palette', 'properties', 'layers', 'parts', 'bom', 'info'] },
    selectedId: { name: 'Selected part', control: 'select', options: [null, 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'] },
    view: { name: 'Canvas view', control: 'inline-radio', options: ['2d', '3d'] },
    headerVariant: { name: 'Header style', control: 'inline-radio', options: ['navy', 'light'] },
    density: { name: 'Density', control: 'inline-radio', options: ['comfortable', 'compact'] },
    headerActions: { control: false },
    schematic: { control: false },
  },
  decorators: [
    (Story) => (
      <Box sx={{ height: '100vh' }}>
        <Story />
      </Box>
    ),
  ],
  // `density` is for the theme (see .storybook/preview.tsx); the shell ignores it.
  render: function Render(args: ShellArgs) {
    const [, updateArgs] = useArgs<ShellArgs>();
    return (
      <EditorShell
        {...args}
        onPanelStateChange={(panelState) => updateArgs({ panelState })}
        onPanelChange={(panel) => updateArgs({ panel })}
        onSelectedIdChange={(selectedId) => updateArgs({ selectedId })}
        onViewChange={(view) => updateArgs({ view })}
      />
    );
  },
} satisfies Meta<ShellArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Everything collapsed',
};

export const SymbolSelected: Story = {
  name: 'Part selected',
  args: { selectedId: 'S3', panelState: 'expanded', panel: 'properties' },
};

export const Working: Story = {
  name: 'Working (properties pinned)',
  args: { panelState: 'pinned', panel: 'properties', selectedId: 'S3' },
};

export const ThreeD: Story = {
  name: '3D view',
  args: { view: '3d', panelState: 'pinned', panel: 'info' },
};
