import type { Meta, StoryObj } from '@storybook/react-vite';
import Stack from '@mui/material/Stack';
import { TagChip, type TagTone } from './TagChip';

const TONES: TagTone[] = ['neutral', 'primary', 'secondary', 'accent', 'success', 'warning', 'error'];

const meta = {
  title: 'Primitives/Tag Chip',
  component: TagChip,
  tags: ['autodocs'],
  args: { label: 'Aspheric', tone: 'primary', emphasis: 'subtle' },
  argTypes: {
    tone: { control: 'select', options: TONES },
    emphasis: { control: 'inline-radio', options: ['subtle', 'solid'] },
  },
} satisfies Meta<typeof TagChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Deletable: Story = {
  args: { onDelete: () => {} },
};

export const AllTones: Story = {
  render: (args) => (
    <Stack spacing={1}>
      {(['subtle', 'solid'] as const).map((emphasis) => (
        <Stack key={emphasis} direction="row" spacing={1}>
          {TONES.map((tone) => (
            <TagChip key={tone} {...args} tone={tone} emphasis={emphasis} label={tone} />
          ))}
        </Stack>
      ))}
    </Stack>
  ),
};
