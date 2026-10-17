import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { demoSchematic } from '../../demo/editorContent';
import { demoModules, demoPalette } from '../../standins/library/modules';
import { AddPartSearch, type PartEntry } from './AddPartSearch';
import { CommandPalette, type Command } from './CommandPalette';
import { LayerPreview } from './LayerPreview';
import type { SchematicSymbol } from './model';
import { SelectionActions } from './SelectionActions';
import { DEFAULT_VIEW_OPTIONS, type CanvasTool, type EditorView } from './viewOptions';
import { ViewDock, type Flyout } from './ViewDock';

// The pieces that float over the View tab's canvas, each on its own.
const meta = {
  title: 'Editor/Canvas Overlays',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const PARTS: PartEntry[] = demoPalette.flatMap((g) => g.entries.map((e) => ({ ...e, mount: g.mount, source: g.label })));
const LAYERS = [0, 1, 2];

/** Where the current layer sits in the whole design. Click a plate, or use the arrows. */
export const LayerPreviewOpen: Story = {
  name: 'Layer preview',
  render: function Render() {
    const [layer, setLayer] = useState(1);
    return <LayerPreview schematic={demoSchematic} layers={LAYERS} layer={layer} onLayer={setLayer} selectedIds={['S3']} />;
  },
};

/** With the right panel out, the preview folds to a button (unless pinned). */
export const LayerPreviewFolded: Story = {
  name: 'Layer preview, folded',
  render: function Render() {
    const [layer, setLayer] = useState(1);
    return <LayerPreview schematic={demoSchematic} layers={LAYERS} layer={layer} onLayer={setLayer} crowded />;
  },
};

function Dock({ view }: { view: EditorView }) {
  const [flyout, setFlyout] = useState<Flyout | null>(null);
  const [tool, setTool] = useState<CanvasTool>('select');
  const [options, setOptions] = useState(DEFAULT_VIEW_OPTIONS);
  return (
    // Room above for the option lists, which open upwards.
    <Box sx={{ pt: 52 }}>
      <ViewDock
        view={view}
        flyout={flyout}
        onFlyout={setFlyout}
        addPanel={<AddPartSearch parts={PARTS} onPick={() => setFlyout(null)} />}
        canUndo
        canRedo={false}
        onUndo={() => {}}
        onRedo={() => {}}
        tool={tool}
        onTool={setTool}
        options={options}
        onOptions={setOptions}
        zoom={1}
        onZoom={() => {}}
        onCamera={() => {}}
        unmounted={[{ id: 'S5', label: 'Tube lens' }]}
        onShowPart={() => setFlyout(null)}
        onMountAll={() => setFlyout(null)}
      />
    </Box>
  );
}

/** The dock at the bottom of the canvas, in 2D: add, undo, tools, what to show, zoom, and whether it is buildable. */
export const Dock2D: Story = { name: 'Dock, 2D', render: () => <Dock view="2d" /> };

/** In 3D the dock adds the camera views. */
export const Dock3D: Story = { name: 'Dock, 3D', render: () => <Dock view="3d" /> };

/** Quick add: search first, mounted (in a cube) or not; pick one, or drag it out onto the canvas. */
export const AddPart: Story = {
  name: 'Add a part',
  render: () => <AddPartSearch parts={PARTS} recent={['mirror', 'lens50']} onPick={() => {}} />,
};

function Actions({ ids }: { ids: string[] }) {
  const [parts, setParts] = useState<SchematicSymbol[]>(demoSchematic.symbols.filter((s) => ids.includes(s.id)));
  return (
    <SelectionActions
      parts={parts}
      realizeOptions={parts.length === 1 ? demoModules[parts[0].kind] : []}
      onUpdate={(patch) => setParts(parts.map((s) => ({ ...s, ...patch(s) })))}
      onProperties={() => {}}
      onDuplicate={() => {}}
      onDelete={() => {}}
    />
  );
}

/** Over the selected part: turn, change layer, lock, take it out of its cube, duplicate, delete. */
export const SelectionOne: Story = { name: 'Selection actions, one part', render: () => <Actions ids={['S3']} /> };

/** An unmounted part instead offers to realize it as a module, or freeze a holder for it. */
export const SelectionUnmounted: Story = { name: 'Selection actions, part not mounted', render: () => <Actions ids={['S5']} /> };

export const SelectionMany: Story = { name: 'Selection actions, several parts', render: () => <Actions ids={['S1', 'S2', 'S3']} /> };

const COMMANDS: Command[] = [
  ...PARTS.slice(0, 4).map((p) => ({ id: `add-${p.id}`, group: 'Add part', label: p.label, run: () => {} })),
  { id: 'view-3d', group: 'View', label: 'Show the 3D view', shortcut: '3', run: () => {} },
  { id: 'layer-up', group: 'Layers', label: 'Go to the layer above', shortcut: 'Page Up', run: () => {} },
  { id: 'panel-bom', group: 'Panels', label: 'Open the bill of materials', run: () => {} },
];

/** Ctrl K: every command, part and layer, by typing. */
export const Palette: Story = {
  name: 'Command palette',
  render: function Render() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button variant="outlined" onClick={() => setOpen(true)}>
          Open (Ctrl K)
        </Button>
        <CommandPalette open={open} onClose={() => setOpen(false)} commands={COMMANDS} />
      </>
    );
  },
};
