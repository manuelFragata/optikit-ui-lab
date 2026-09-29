import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';
import Box from '@mui/material/Box';
import { SliderField, type SliderFieldProps } from './SliderField';

const meta = {
  title: 'Primitives/Slider Field',
  component: SliderField,
  tags: ['autodocs'],
  args: {
    label: 'Aperture diameter',
    value: 12.5,
    min: 0,
    max: 50,
    step: 0.5,
    precision: 1,
    unit: 'mm',
    disabled: false,
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <Box sx={{ maxWidth: (theme) => theme.spacing(52) }}>
        <Story />
      </Box>
    ),
  ],
  render: function Render(args: SliderFieldProps) {
    const [, updateArgs] = useArgs<SliderFieldProps>();
    return (
      <SliderField
        {...args}
        onChange={(value) => {
          args.onChange(value);
          updateArgs({ value });
        }}
      />
    );
  },
} satisfies Meta<typeof SliderField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Angle: Story = {
  args: { label: 'Tilt', value: 0, min: -45, max: 45, step: 0.1, precision: 1, unit: '°' },
};

export const Disabled: Story = {
  args: { disabled: true },
};
