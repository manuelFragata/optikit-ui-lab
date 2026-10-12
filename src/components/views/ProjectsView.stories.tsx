import type { Meta, StoryObj } from '@storybook/react-vite';
import { demoDrawerProjects } from '../../demo/projectsContent';
import { exampleDesigns } from '../../demo/landingContent';
import { ProjectsView } from './ProjectsView';

const drawings = Object.fromEntries(exampleDesigns.map((e) => [e.id, e.schematic]));

const meta = {
  title: 'Views/Projects',
  component: ProjectsView,
  parameters: { layout: 'fullscreen' },
  args: { owner: 'Manu', projects: demoDrawerProjects, drawings, onOpen: () => {}, onNewProject: () => {} },
  argTypes: { projects: { control: false }, drawings: { control: false } },
} satisfies Meta<typeof ProjectsView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The drawer: pinned, mine, and shared with me. */
export const Drawer: Story = {};

/** A new account with nothing filed yet. */
export const Empty: Story = { args: { projects: [] } };
