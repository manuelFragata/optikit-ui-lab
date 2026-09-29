import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { linkTo } from '@storybook/addon-links';
import { LandingPage } from './LandingPage';

// What a signed-out visitor sees. Pages/Home "Signed out" renders the same page.
const meta = {
  title: 'Pages/Landing',
  component: LandingPage,
  parameters: { layout: 'fullscreen' },
  decorators: [
    // A scroll container of its own, so the sticky top bar can be seen working.
    (Story) => (
      <div style={{ height: '100vh', overflow: 'auto' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    autoAdvanceMs: 9000,
    onLogIn: linkTo('Pages/Home', 'Signed in'),
    onSignUp: linkTo('Pages/Home', 'Signed in'),
    onOpenExample: linkTo('Pages/Editor', 'Working (palette + properties)'),
    onOpenDesign: linkTo('Pages/Editor', 'Working (palette + properties)'),
    onNewProject: linkTo('Pages/Editor', 'New project'),
    onBrowseGallery: fn(),
    onChoosePlan: fn(),
  },
  argTypes: {
    autoAdvanceMs: { name: 'Auto-advance (ms, 0 = off)', control: { type: 'number', min: 0, step: 1000 } },
  },
} satisfies Meta<typeof LandingPage>;

export default meta;

export const SignedOut: StoryObj<typeof meta> = { name: 'Signed out' };
