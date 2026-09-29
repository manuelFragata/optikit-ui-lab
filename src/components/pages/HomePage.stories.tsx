import type { Meta, StoryObj } from '@storybook/react-vite';
import { linkTo } from '@storybook/addon-links';
import { HomePage } from './HomePage';

const meta = {
  title: 'Pages/Home',
  component: HomePage,
  parameters: { layout: 'fullscreen' },
  args: {
    signedIn: true,
    userName: 'Beni',
    autoAdvanceMs: 7000,
    onOpenProject: linkTo('Pages/Editor', 'Working'),
    onNewProject: linkTo('Pages/Editor', 'New project'),
    onHome: linkTo('Pages/Home', 'Signed in'),
    onLogIn: linkTo('Pages/Home', 'Signed in'),
    onSignUp: linkTo('Pages/Home', 'Signed in'),
  },
  argTypes: {
    signedIn: { name: 'Signed in', control: 'boolean' },
    autoAdvanceMs: { name: 'Auto-advance (ms, 0 = off)', control: { type: 'number', min: 0, step: 1000 } },
    projects: { control: false },
  },
} satisfies Meta<typeof HomePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SignedIn: Story = { name: 'Signed in' };

export const SignedOut: Story = {
  name: 'Signed out',
  args: { signedIn: false },
};

export const NoProjects: Story = {
  name: 'Signed in, no projects',
  args: { projects: [] },
};
