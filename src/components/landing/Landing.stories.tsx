import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { exampleDesigns } from '../../demo/landingContent';
import { ExampleShowcase } from './ExampleShowcase';

const meta = {
  title: 'Landing/Example Showcase',
  component: ExampleShowcase,
  parameters: { layout: 'padded' },
  args: { examples: exampleDesigns, autoAdvanceMs: 9000, onOpen: fn(), onLocked: fn() },
  argTypes: {
    examples: { control: false },
    autoAdvanceMs: { name: 'Auto-advance (ms, 0 = off)', control: { type: 'number', min: 0, step: 1000 } },
  },
} satisfies Meta<typeof ExampleShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Click a part on the drawing and move its slider; the change stays when you flip slides. */
export const Default: Story = {};

export const NoAutoAdvance: Story = { name: 'No auto-advance', args: { autoAdvanceMs: 0 } };
