import type { Meta, StoryObj } from '@storybook/react-vite';
import { exampleAssemblies } from '../../demo/assemblies';
import { exploreDesigns } from '../../demo/exploreContent';
import { AssemblyView } from '../landing/AssemblyView';
import { DesignPage } from './DesignPage';

const [fluor] = exploreDesigns;
const mirror = exploreDesigns.find((d) => d.id === 'p-mirror')!;

const meta = {
  title: 'Views/Design Page',
  component: DesignPage,
  parameters: { layout: 'fullscreen' },
  args: { design: fluor, onBack: () => {}, onEdit: () => {} },
  argTypes: { design: { control: false }, preview: { control: false } },
} satisfies Meta<typeof DesignPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An instrument with its 3D assembly. */
export const Instrument: Story = {
  args: {
    preview: <AssemblyView assembly={exampleAssemblies['ex-fluor']} turntable label="3D view" sx={{ width: '100%', height: '100%' }} />,
  },
};

/** A part with no 3D view yet: the cube thumbnail stands in. */
export const Part: Story = { args: { design: mirror } };
