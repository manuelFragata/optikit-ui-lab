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
    leftState: 'collapsed',
    leftPanel: 'palette',
    rightState: 'collapsed',
    rightPanel: 'properties',
    selectedId: null,
    view: '2d',
    density: 'comfortable',
  },
  argTypes: {
    leftState: { name: 'Left panel', control: 'inline-radio', options: PANEL_STATES },
    leftPanel: { name: 'Left panel shows', control: 'inline-radio', options: ['palette', 'layers', 'parts', 'files'] },
    rightState: { name: 'Right panel', control: 'inline-radio', options: PANEL_STATES },
    rightPanel: { name: 'Right panel shows', control: 'inline-radio', options: ['properties', 'history', 'info'] },
    selectedId: { name: 'Selected symbol', control: 'select', options: [null, 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'] },
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
  render: function Render({ density: _density, ...args }: ShellArgs) {
    const [, updateArgs] = useArgs<ShellArgs>();
    return (
      <EditorShell
        {...args}
        onLeftStateChange={(leftState) => updateArgs({ leftState })}
        onLeftPanelChange={(leftPanel) => updateArgs({ leftPanel })}
        onRightStateChange={(rightState) => updateArgs({ rightState })}
        onRightPanelChange={(rightPanel) => updateArgs({ rightPanel })}
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
  name: 'Symbol selected',
  args: { selectedId: 'S3', rightState: 'expanded' },
};

export const Working: Story = {
  name: 'Working (palette + properties pinned)',
  args: { leftState: 'pinned', rightState: 'pinned', selectedId: 'S3' },
};

export const ThreeD: Story = {
  name: '3D view',
  args: { view: '3d', rightState: 'pinned', rightPanel: 'info' },
};
