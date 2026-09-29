import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';
import Box from '@mui/material/Box';
import { SelectField, type SelectFieldProps } from './SelectField';

type Material = 'n-bk7' | 'n-sf11' | 'fused-silica' | 'caf2';
type Props = SelectFieldProps<Material>;

const OPTIONS: Props['options'] = [
  { value: 'n-bk7', label: 'N-BK7' },
  { value: 'n-sf11', label: 'N-SF11' },
  { value: 'fused-silica', label: 'Fused silica' },
  { value: 'caf2', label: 'CaF₂' },
];

const meta = {
  title: 'Primitives/Select',
  component: SelectField<Material>,
  tags: ['autodocs'],
  args: {
    label: 'Material',
    value: 'n-bk7',
    options: OPTIONS,
    helperText: '',
    disabled: false,
    onChange: fn(),
  },
  argTypes: {
    value: { control: 'select', options: OPTIONS.map((o) => o.value) },
    options: { control: false },
  },
  decorators: [
    (Story) => (
      <Box sx={{ maxWidth: (theme) => theme.spacing(40) }}>
        <Story />
      </Box>
    ),
  ],
  render: function Render(args: Props) {
    const [, updateArgs] = useArgs<Props>();
    return (
      <SelectField
        {...args}
        onChange={(value) => {
          args.onChange(value);
          updateArgs({ value });
        }}
      />
    );
  },
} satisfies Meta<Props>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHelper: Story = {
  args: { helperText: 'From the Schott catalogue' },
};

export const Disabled: Story = {
  args: { disabled: true },
};
