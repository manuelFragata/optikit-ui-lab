import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { featureHighlights, pricingPlans } from '../../demo/landingContent';
import { PricingSection } from './PricingSection';

const meta = {
  title: 'Landing/Pricing Section',
  component: PricingSection,
  parameters: { layout: 'padded' },
  args: { features: featureHighlights, plans: pricingPlans, onChoosePlan: fn() },
  argTypes: { features: { control: false }, plans: { control: false } },
} satisfies Meta<typeof PricingSection>;

export default meta;

export const Pricing: StoryObj<typeof meta> = {};
