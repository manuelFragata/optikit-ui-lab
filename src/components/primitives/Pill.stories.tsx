import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { Pill } from './Pill';

const meta = {
  title: 'Primitives/Pill',
  component: Pill,
  tags: ['autodocs'],
  args: { children: 'Fluorescence', active: false, overlay: false },
} satisfies Meta<typeof Pill>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Without `onClick`, a plain label (a tag). */
export const Label: Story = {};

/** With `onClick`, a toggle: the tag filters in Explore. */
export const Filters: Story = {
  render: function Render() {
    const [on, setOn] = useState<string[]>(['microscopy']);
    const toggle = (t: string) => setOn(on.includes(t) ? on.filter((x) => x !== t) : [...on, t]);
    return (
      <Stack direction="row" spacing={1}>
        {['microscopy', 'spectroscopy', 'education', 'frame'].map((t) => (
          <Pill key={t} active={on.includes(t)} onClick={() => toggle(t)}>
            {t}
          </Pill>
        ))}
      </Stack>
    );
  },
};

/** On a picture, with a paper fill. */
export const Overlay: Story = {
  args: { overlay: true, children: 'Internal' },
  render: (args) => (
    <Box sx={{ p: 3, bgcolor: 'text.secondary', borderRadius: 2 }}>
      <Pill {...args} />
    </Box>
  ),
};
