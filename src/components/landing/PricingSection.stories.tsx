import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { pricingPlans } from '../../demo/landingContent';
import { PricingSection } from './PricingSection';

const meta = {
  title: 'Landing/Pricing Section',
  component: PricingSection,
  parameters: { layout: 'padded' },
  args: { plans: pricingPlans, onChoosePlan: fn(), index: '04' },
  argTypes: { plans: { control: false } },
} satisfies Meta<typeof PricingSection>;

export default meta;

export const Pricing: StoryObj<typeof meta> = {};
