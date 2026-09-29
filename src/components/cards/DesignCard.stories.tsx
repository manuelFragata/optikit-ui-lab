import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import Box from '@mui/material/Box';
import { demoInspiration } from '../../demo/homeContent';
import { DesignCard } from './DesignCard';

const meta = {
  title: 'Cards/Design Card',
  component: DesignCard,
  tags: ['autodocs'],
  args: { ...demoInspiration[0], onOpen: fn() },
  argTypes: {
    kind: { control: 'inline-radio', options: ['Part', 'Assembly', 'Instrument', 'Collection'] },
    cubes: { control: { type: 'range', min: 1, max: 6 } },
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: (theme) => theme.spacing(40) }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof DesignCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Instrument: Story = {};

export const Assembly: Story = { args: { ...demoInspiration[1], onOpen: fn() } };

export const Collection: Story = { args: { ...demoInspiration[2], onOpen: fn() } };

export const Part: Story = {
  args: {
    kind: 'Part',
    title: 'RMS-threaded objective lens insert',
    version: '2.3.0',
    description: 'Cube insert for any RMS objective, 4× to 60×.',
    tags: ['rms-thread', '3d-print'],
    cubes: 1,
  },
};
