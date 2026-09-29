import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import Box from '@mui/material/Box';
import { demoPanelItems } from '../../demo/panelContent';
import type { DensityName } from '../../theme';
import { EditorShell, type EditorShellProps } from './EditorShell';

/** `density` is read by the global theme decorator in .storybook/preview.tsx. */
type ShellArgs = EditorShellProps & { density: DensityName };

const meta = {
  title: 'Compositions/Editor Shell',
  component: EditorShell,
  parameters: { layout: 'fullscreen' },
  args: {
    headerVariant: 'light',
    railState: 'collapsed',
    activePanel: 'palette',
    inspectorOpen: true,
    density: 'comfortable',
    projectName: 'Double Gauss 50 mm f/2',
  },
  argTypes: {
    railState: { name: 'Rail', control: 'inline-radio', options: ['collapsed', 'expanded', 'pinned'] },
    activePanel: { name: 'Active panel', control: 'inline-radio', options: demoPanelItems.map((i) => i.id) },
    inspectorOpen: { name: 'Inspector open', control: 'boolean' },
    headerVariant: { name: 'Header style', control: 'inline-radio', options: ['navy', 'light'] },
    density: { name: 'Density', control: 'inline-radio', options: ['comfortable', 'compact'] },
    headerActions: { control: false },
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
        onRailStateChange={(railState) => updateArgs({ railState })}
        onActivePanelChange={(activePanel) => updateArgs({ activePanel })}
        onInspectorOpenChange={(inspectorOpen) => updateArgs({ inspectorOpen })}
      />
    );
  },
} satisfies Meta<ShellArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EverythingCollapsed: Story = {
  args: { railState: 'collapsed', inspectorOpen: false },
};

export const Working: Story = {
  name: 'Working (palette + inspector open)',
  args: { railState: 'pinned', activePanel: 'palette', inspectorOpen: true },
};
