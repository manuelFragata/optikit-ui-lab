import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Stack from '@mui/material/Stack';
import { NumberInput } from './NumberInput';

// A number with steppers: type it, scroll it, or arrow up and down. Clamped to min and max.
const meta = {
  title: 'Primitives/Number Input',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithUnit: Story = {
  name: 'With a unit',
  render: function Render() {
    const [hours, setHours] = useState(2);
    const [discount, setDiscount] = useState(0);
    return (
      <Stack spacing={2} sx={{ width: 160 }}>
        <NumberInput size="small" label="Assembly" value={hours} min={0} max={40} step={0.5} unit="h" onChange={setHours} />
        <NumberInput size="small" label="Discount" value={discount} min={0} max={50} unit="%" onChange={setDiscount} />
      </Stack>
    );
  },
};

/** No visible label: an axis letter inside, and an accessible name. */
export const AxisField: Story = {
  name: 'Axis field',
  render: function Render() {
    const [x, setX] = useState(1.25);
    return <NumberInput size="small" value={x} step={0.05} precision={2} startLabel="X" ariaLabel="Position X" onChange={setX} sx={{ width: 120 }} />;
  },
};
