/**
 * What the editor's two side panels hold. Left: the tools to build with
 * (library, layers, parts list, bill of materials). Right: the inspector
 * (properties of the selection, design info). Versions and the project's
 * files are in the File tab.
 */
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import { demoDesignInfo, demoPalette } from '../../../demo/editorContent';
import { demoPrices } from '../../../demo/prices';
import { bomCsv, bomFileName, buildBom } from '../../editor/bom';
import type { ModuleOption, Schematic, SchematicSymbol } from '../../editor/model';
import { BomPanel } from '../../editor/panels/BomPanel';
import { DesignInfoPanel } from '../../editor/panels/DesignInfoPanel';
import { LayersPanel } from '../../editor/panels/LayersPanel';
import { PartsListPanel } from '../../editor/panels/PartsListPanel';
import { PropertiesFooter, PropertiesPanel, SelectionSummary } from '../../editor/panels/PropertiesPanel';
import { SymbolPalettePanel } from '../../editor/panels/SymbolPalettePanel';
import type { SidePanelItem } from '../../panels/SidePanel';
import { download } from '../../primitives/download';

/** A button pinned under a panel's content. */
const footerButton = (label: string, icon: ReactNode, onClick?: () => void) => (
  <Box sx={{ p: 1.5 }}>
    <Button variant="outlined" startIcon={icon} onClick={onClick}>
      {label}
    </Button>
  </Box>
);

export interface LeftPanelsProps {
  design: Schematic;
  /** The design's name, for the files it downloads. */
  name: string;
  selectedId: string | null;
  selectedIds: string[];
  onSelect: (id: string) => void;
  /** Select these parts (a line of the bill of materials). */
  onSelectParts: (ids: string[]) => void;
  /** The library entry being placed, highlighted in the list. */
  placingId?: string;
  /** A library entry picked (then placed with a click) or dragged out onto the canvas. */
  onPick: (entryId: string) => void;
  onDragStart: (entryId: string) => void;
  onDragEnd: () => void;
}

export function leftPanels({ design, name, selectedId, selectedIds, onSelect, onSelectParts, placingId, onPick, onDragStart, onDragEnd }: LeftPanelsProps): SidePanelItem[] {
  const bom = buildBom(design, demoPrices);
  return [
    {
      id: 'palette',
      label: 'Add parts',
      icon: <ViewInArOutlinedIcon />,
      content: <SymbolPalettePanel groups={demoPalette} activeEntryId={placingId} onPick={onPick} onDragStart={onDragStart} onDragEnd={onDragEnd} />,
      footer: footerButton('Import optic…', <AddIcon />),
    },
    {
      id: 'layers',
      label: 'Layers',
      icon: <LayersOutlinedIcon />,
      content: <LayersPanel symbols={design.symbols} groups={design.groups} selectedId={selectedId} onSelect={onSelect} />,
    },
    {
      id: 'parts',
      label: 'Parts list',
      icon: <FormatListBulletedIcon />,
      content: <PartsListPanel symbols={design.symbols} selectedId={selectedId} onSelect={onSelect} />,
    },
    {
      id: 'bom',
      label: 'Bill of materials',
      icon: <ReceiptLongOutlinedIcon />,
      content: <BomPanel bom={bom} selectedIds={selectedIds} onSelectParts={onSelectParts} />,
      footer: footerButton('Download CSV', <DownloadIcon />, () => download(bomFileName(name), bomCsv(bom), 'text/csv')),
    },
  ];
}

export interface RightPanelsProps {
  design: Schematic;
  /** The part the inspector shows, and every selected part. */
  selected: SchematicSymbol | null;
  selectedParts: SchematicSymbol[];
  realizeOptions: ModuleOption[];
  onChange: (patch: Partial<SchematicSymbol>) => void;
  onSelect: (id: string) => void;
  /** Step to the previous (−1) or next (1) part. */
  onStep: (delta: -1 | 1) => void;
  onDelete: () => void;
  unmounted: number;
}

export function rightPanels({ design, selected, selectedParts, realizeOptions, onChange, onSelect, onStep, onDelete, unmounted }: RightPanelsProps): SidePanelItem[] {
  const several = selectedParts.length > 1;
  return [
    {
      id: 'properties',
      label: 'Properties',
      title: several ? `${selectedParts.length} parts selected` : (selected?.label ?? 'Properties'),
      icon: <TuneIcon />,
      // Several parts: which ones (pick one to see it alone). One part: its properties.
      content: several ? (
        <SelectionSummary parts={selectedParts} onPick={onSelect} />
      ) : (
        <PropertiesPanel symbol={selected} realizeOptions={realizeOptions} onChange={onChange} />
      ),
      footer: !several && selected && (
        <PropertiesFooter symbolId={selected.id} total={design.symbols.length} onPrev={() => onStep(-1)} onNext={() => onStep(1)} onDelete={onDelete} />
      ),
    },
    {
      id: 'info',
      label: 'Design info',
      icon: <InfoOutlinedIcon />,
      content: (
        <DesignInfoPanel
          {...demoDesignInfo}
          stats={[
            { label: 'parts', value: design.symbols.length },
            { label: 'not mounted yet', value: unmounted },
            { label: 'rays', value: design.rays.length },
            { label: 'groups', value: design.groups.length },
          ]}
        />
      ),
    },
  ];
}
