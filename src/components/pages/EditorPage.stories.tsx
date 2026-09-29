import type { Meta, StoryObj } from '@storybook/react-vite';
import { linkTo } from '@storybook/addon-links';
import Box from '@mui/material/Box';
import { EditorShell } from '../compositions/EditorShell';
import { ColorSchemeToggle } from '../primitives/ColorSchemeToggle';

// The editor as a page: same component as Compositions/Editor Shell, but wired
// back to Pages/Home through the brand mark. Use the composition stories to
// explore layout controls.
const meta = {
  title: 'Pages/Editor',
  component: EditorShell,
  parameters: { layout: 'fullscreen' },
  args: {
    headerVariant: 'navy',
    onHome: linkTo('Pages/Home', 'Signed in'),
    headerActions: <ColorSchemeToggle />,
  },
  argTypes: {
    headerVariant: { name: 'Header style', control: 'inline-radio', options: ['navy', 'light'] },
    headerActions: { control: false },
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

export const Working: Story = {
  args: { railState: 'pinned', activePanel: 'palette', inspectorOpen: true },
};

export const Empty: Story = {
  name: 'New project',
  args: { projectName: 'Untitled design', railState: 'expanded', activePanel: 'palette', inspectorOpen: false },
};
