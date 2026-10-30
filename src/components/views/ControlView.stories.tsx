import type { Meta, StoryObj } from '@storybook/react-vite';
import { demoSchematic } from '../../demo/editorContent';
import { connect, KIND_DEFAULTS, setInput } from '../control/wiring';
import { ControlView } from './ControlView';

/** The demo design with the camera on the computer and the sample stage's z motor on its input: all of Ethan's stage-demo. */
const wired = setInput(connect(demoSchematic, { kind: 'usb3-vision', controller: 'root', part: 'S6', device: 'drivers', settings: KIND_DEFAULTS['usb3-vision'] }), 'C4', 'z', 'sample-z');

const meta = {
  title: 'Views/Control',
  component: ControlView,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
  args: { designName: 'BF+Fluor FRAME Optical Core', version: '0.4.2', design: demoSchematic },
  argTypes: { design: { control: false } },
} satisfies Meta<typeof ControlView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Half wired: the camera has no connection, and the sample stage's z motor moves no input. Drag from a port to another to join them, or click one and then the other. Drag a card to move it. */
export const HalfWired: Story = {};

/** Everything connected, every motor on an input. Check the instrument: one Motor Z driver does not answer. */
export const Wired: Story = { args: { design: wired } };

/** A design with optics only: nothing to wire until a board is added. */
export const NoElectronics: Story = { args: { design: { ...demoSchematic, symbols: demoSchematic.symbols.filter((s) => s.kind !== 'laser' && s.kind !== 'camera'), wiring: undefined } } };
