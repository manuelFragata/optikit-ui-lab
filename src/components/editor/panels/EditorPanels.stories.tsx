import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Box from '@mui/material/Box';
import { demoDesignInfo, demoFiles, demoHistory, demoPalette, demoSchematic } from '../../../demo/editorContent';
import type { SchematicSymbol } from '../model';
import { DesignInfoPanel } from './DesignInfoPanel';
import { FilesPanel } from './FilesPanel';
import { HistoryPanel } from './HistoryPanel';
import { LayersPanel } from './LayersPanel';
import { PartsListPanel } from './PartsListPanel';
import { PropertiesFooter, PropertiesPanel } from './PropertiesPanel';
import { SymbolPalettePanel } from './SymbolPalettePanel';

// Each sidebar panel on its own, at the side panel's width.
const meta = {
  title: 'Editor/Sidebar Panels',
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <Box
        sx={{
          width: (t) => t.spacing(t.layout.sidePanelWidth),
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <Story />
      </Box>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function WithSelection({ children }: { children: (selected: string | null, select: (id: string) => void) => ReactNode }) {
  const [selected, setSelected] = useState<string | null>('S3');
  return <>{children(selected, setSelected)}</>;
}

export const SymbolPalette: Story = { render: () => <SymbolPalettePanel groups={demoPalette} /> };

export const Layers: Story = {
  render: () => (
    <WithSelection>
      {(selected, select) => <LayersPanel symbols={demoSchematic.symbols} groups={demoSchematic.groups} selectedId={selected} onSelect={select} />}
    </WithSelection>
  ),
};

export const PartsList: Story = {
  name: 'Parts list',
  render: () => <WithSelection>{(selected, select) => <PartsListPanel symbols={demoSchematic.symbols} selectedId={selected} onSelect={select} />}</WithSelection>,
};

export const ProjectFiles: Story = { name: 'Project files', render: () => <FilesPanel files={demoFiles} /> };

export const Properties: Story = {
  render: function Render() {
    const [symbol, setSymbol] = useState<SchematicSymbol>(demoSchematic.symbols[2]);
    return (
      <>
        <PropertiesPanel symbol={symbol} onChange={(patch) => setSymbol({ ...symbol, ...patch })} />
        <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
          <PropertiesFooter symbolId={symbol.id} total={6} onPrev={() => {}} onNext={() => {}} onDelete={() => {}} />
        </Box>
      </>
    );
  },
};

export const PropertiesEmpty: Story = {
  name: 'Properties (nothing selected)',
  render: () => <PropertiesPanel symbol={null} onChange={() => {}} />,
};

export const VersionHistory: Story = { name: 'Version history', render: () => <HistoryPanel entries={demoHistory} /> };

export const DesignInfo: Story = {
  name: 'Design info',
  render: () => (
    <DesignInfoPanel
      {...demoDesignInfo}
      stats={[
        { label: 'symbols', value: 6 },
        { label: 'rays', value: 2 },
        { label: 'groups', value: 2 },
      ]}
    />
  ),
};
