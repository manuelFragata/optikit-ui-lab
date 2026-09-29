import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { demoGallery } from '../../demo/homeContent';
import { communityFacts } from '../../demo/landingContent';
import { CommunitySection } from './CommunitySection';

const community = {
  title: 'Landing/Community Section',
  component: CommunitySection,
  parameters: { layout: 'padded' },
  args: { items: demoGallery.slice(2, 6), facts: communityFacts, onOpenDesign: fn(), onBrowseGallery: fn() },
  argTypes: { items: { control: false }, facts: { control: false } },
} satisfies Meta<typeof CommunitySection>;

export default community;

export const Community: StoryObj<typeof community> = {};
