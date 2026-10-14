import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Box from '@mui/material/Box';
import { Vec3Field, type Vec3 } from './Vec3Field';

// Three numbers, x y z, under one label: a part's position or turn in Properties.
const meta = {
  title: 'Primitives/Vec3 Field',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Position: Story = {
  render: function Render() {
    const [value, setValue] = useState<Vec3>({ x: 2, y: 1, z: 0 });
    return (
      <Box sx={{ width: 300 }}>
        <Vec3Field label="Position" unit="grid" value={value} onChange={setValue} step={1} precision={0} />
      </Box>
    );
  },
};

/** Locked axes are shown, not editable: here the part may only move along x. */
export const Locked: Story = {
  render: function Render() {
    const [value, setValue] = useState<Vec3>({ x: 2, y: 1, z: 0 });
    return (
      <Box sx={{ width: 300 }}>
        <Vec3Field label="Position" unit="grid" value={value} onChange={setValue} step={1} precision={0} locked={{ y: true, z: true }} />
      </Box>
    );
  },
};
