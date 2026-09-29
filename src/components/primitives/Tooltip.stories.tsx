import type { Meta, StoryObj } from '@storybook/react-vite';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

const meta = {
  title: 'Primitives/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  args: {
    title: 'Adds a new surface after the selection',
    placement: 'top',
    children: <Button variant="outlined">Hover me</Button>,
  },
  argTypes: {
    placement: { control: 'select', options: ['top', 'right', 'bottom', 'left'] },
    children: { control: false },
  },
  decorators: [
    (Story) => (
      <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Open: Story = {
  args: { open: true },
};

export const WithShortcut: Story = {
  args: {
    open: true,
    title: (
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline' }}>
        <span>Duplicate</span>
        <Typography variant="mono" sx={{ opacity: 0.7 }}>
          Ctrl+D
        </Typography>
      </Stack>
    ),
  },
};
