import type { Meta, StoryObj } from '@storybook/react-vite';
import { featureHighlights } from '../../demo/landingContent';
import { BenchPreview } from './BenchPreview';

const meta = {
  title: 'Landing/Bench Preview',
  component: BenchPreview,
  parameters: { layout: 'padded' },
  args: { features: featureHighlights, autoAdvanceMs: 6500 },
  argTypes: {
    features: { control: false },
    autoAdvanceMs: { name: 'Auto-advance (ms, 0 = off)', control: { type: 'number', min: 0, step: 500 } },
  },
} satisfies Meta<typeof BenchPreview>;

export default meta;

/** Loads real openUC2 modules from the public OptiKit Store on GitHub at run time. */
export const Default: StoryObj<typeof meta> = {};
