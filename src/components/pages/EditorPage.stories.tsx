import type { Meta, StoryObj } from '@storybook/react-vite';
import { linkTo } from '@storybook/addon-links';
import Box from '@mui/material/Box';
import { demoSchematic } from '../../demo/editorContent';
import { EditorShell } from '../compositions/EditorShell';
import { ColorSchemeToggle } from '../primitives/ColorSchemeToggle';

// The editor as a page. Everything is uncontrolled here (default* props), so
// panels open, close and pin exactly as they would in the app. Use
// Compositions/Editor Shell to drive the layout from Storybook controls.
const meta = {
  title: 'Pages/Editor',
  component: EditorShell,
  parameters: { layout: 'fullscreen' },
  args: {
    onHome: linkTo('Pages/Home', 'Signed in'),
    headerActions: <ColorSchemeToggle />,
  },
  argTypes: {
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
} satisfies Meta<typeof EditorShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Nothing selected',
};

export const Working: Story = {
  name: 'Working (palette + properties)',
  args: { defaultLeftState: 'pinned', defaultLeftPanel: 'palette', defaultRightState: 'pinned', defaultSelectedId: 'S3' },
};

export const Empty: Story = {
  name: 'New project',
  args: {
    projectName: 'Untitled design',
    version: '0.0.1',
    schematic: { ...demoSchematic, symbols: [], rays: [] },
    defaultLeftState: 'expanded',
  },
};
