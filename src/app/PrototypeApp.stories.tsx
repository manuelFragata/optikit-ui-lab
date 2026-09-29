import type { Meta, StoryObj } from '@storybook/react-vite';
import Box from '@mui/material/Box';
import { PrototypeApp } from './PrototypeApp';

// The whole clickable prototype. Routes live in the iframe's URL hash
// (#/, #/editor/<id>, #/account, #/login, #/signup), so the browser's
// back button works when the story is opened full screen.
const meta = {
  title: 'Pages/Prototype',
  component: PrototypeApp,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <Box sx={{ height: '100vh', overflow: 'auto', '& > *': { minHeight: '100%' } }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof PrototypeApp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ClickThrough: Story = { name: 'Click-through' };
