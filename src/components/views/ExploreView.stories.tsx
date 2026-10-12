import type { Meta, StoryObj } from '@storybook/react-vite';
import { exploreDesigns } from '../../demo/exploreContent';
import { exampleDesigns } from '../../demo/landingContent';
import { ExploreView } from './ExploreView';

const drawings = Object.fromEntries(exampleDesigns.map((e) => [e.id, e.schematic]));

const meta = {
  title: 'Views/Explore',
  component: ExploreView,
  parameters: { layout: 'fullscreen' },
  args: { designs: exploreDesigns, drawings, onOpen: () => {}, onBack: () => {} },
  argTypes: { designs: { control: false }, drawings: { control: false } },
} satisfies Meta<typeof ExploreView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Everyone: makers with several designs show as decks. */
export const Default: Story = {};

/** No designs yet. */
export const Empty: Story = { args: { designs: [] } };
