import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { DEFAULT_PREFERENCES } from './preferences';
import { SettingsDialog } from './SettingsDialog';

const meta = {
  title: 'Compositions/Settings Dialog',
  component: SettingsDialog,
  args: { open: true, value: DEFAULT_PREFERENCES, onClose: () => {}, onChange: () => {} },
  argTypes: { value: { control: 'object' } },
  // Choices update the `value` control, so the story behaves like the app.
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return <SettingsDialog {...args} onChange={(patch) => updateArgs({ value: { ...args.value, ...patch } })} />;
  },
} satisfies Meta<typeof SettingsDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
