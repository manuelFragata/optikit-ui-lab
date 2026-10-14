import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Stack from '@mui/material/Stack';
import { PillSwitch } from './PillSwitch';

// One of a few, with the highlight sliding to the choice: Settings and the File tab's Share.
const meta = {
  title: 'Primitives/Pill Switch',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoOptions: Story = {
  name: 'Two options',
  render: function Render() {
    const [value, setValue] = useState<'right' | 'middle'>('right');
    return (
      <PillSwitch
        aria-label="Orbit in 3D with"
        value={value}
        onChange={setValue}
        options={[
          { value: 'right', label: 'Right button' },
          { value: 'middle', label: 'Middle button' },
        ]}
      />
    );
  },
};

export const ThreeOptions: Story = {
  name: 'Three options',
  render: function Render() {
    const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');
    const [access, setAccess] = useState<'invited' | 'view' | 'edit'>('invited');
    return (
      <Stack spacing={2}>
        <PillSwitch
          aria-label="Label size"
          value={size}
          onChange={setSize}
          options={[
            { value: 'small', label: 'Small' },
            { value: 'medium', label: 'Medium' },
            { value: 'large', label: 'Large' },
          ]}
        />
        <PillSwitch
          aria-label="Anyone with the link"
          value={access}
          onChange={setAccess}
          options={[
            { value: 'invited', label: 'Invited only' },
            { value: 'view', label: 'Can view' },
            { value: 'edit', label: 'Can edit' },
          ]}
        />
      </Stack>
    );
  },
};
