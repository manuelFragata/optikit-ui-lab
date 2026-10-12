import type { Meta, StoryObj } from '@storybook/react-vite';
import { exampleDesigns } from '../../../demo/landingContent';
import { kitBoxes, projectTemplates } from '../../../demo/newProjectContent';
import { NewProjectDialog } from './NewProjectDialog';

const drawings = Object.fromEntries(exampleDesigns.map((e) => [e.id, e.schematic]));

const meta = {
  title: 'Views/New Project',
  component: NewProjectDialog,
  parameters: { layout: 'fullscreen' },
  args: { open: true, templates: projectTemplates, boxes: kitBoxes, drawings, onClose: () => {}, onCreate: () => {} },
  argTypes: { templates: { control: false }, boxes: { control: false }, drawings: { control: false } },
} satisfies Meta<typeof NewProjectDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opens on templates, the FRAME histology scanner first. */
export const Default: Story = {};
