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
import DrawOutlinedIcon from '@mui/icons-material/DrawOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import { demoDesignInfo, demoSketch } from '../../../demo/editorContent';
import type { PaletteGroup } from '../../../ports/library';
import type { LibraryStatus } from '../../../ports/library';
import type { Request } from '../../../ports/request';
import type { Bom } from '../../../ports/service';
import { Failed, Waiting } from '../../primitives/RequestState';
import { bomCsv, bomFileName } from '../../editor/bomCsv';
import type { ModuleOption, Schematic, SchematicSymbol } from '../../editor/model';
import { BomPanel } from '../../editor/panels/BomPanel';
import { DesignInfoPanel } from '../../editor/panels/DesignInfoPanel';
import { LayersPanel } from '../../editor/panels/LayersPanel';
import { PartsListPanel } from '../../editor/panels/PartsListPanel';
import { SketchPanel } from '../../editor/panels/SketchPanel';
import { PropertiesFooter, PropertiesPanel, PropertiesTitle, SelectionSummary } from '../../editor/panels/PropertiesPanel';
import { SymbolPalettePanel } from '../../editor/panels/SymbolPalettePanel';
import type { SidePanelItem } from '../../panels/SidePanel';
import type { Varying } from '../../editor/optimize/vary';
import { download } from '../../primitives/download';

/** A button pinned under a panel's content. */
const footerButton = (label: string, icon: ReactNode, onClick?: () => void, disabled = false) => (
  <Box sx={{ p: 1.5 }}>
    <Button variant="outlined" startIcon={icon} onClick={onClick} disabled={disabled}>
      {label}
    </Button>
  </Box>
);

export interface LeftPanelsProps {
  design: Schematic;
  /** The design's name, for the files it downloads. */
  name: string;
  /** What the library offers to place, by box or vendor. */
  palette: readonly PaletteGroup[];
  /** Where the library's loading is: the palette waits for it. */
  libraryStatus: LibraryStatus;
  onReloadLibrary: () => void;
  /** The design's bill of materials, as the service answers it. */
  bom: Request<Bom>;
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

export function leftPanels({ design, name, palette, libraryStatus, onReloadLibrary, bom, selectedId, selectedIds, onSelect, onSelectParts, placingId, onPick, onDragStart, onDragEnd }: LeftPanelsProps): SidePanelItem[] {
  return [
    {
      id: 'sketch',
      label: 'Sketch',
      title: 'Sketch',
      icon: <DrawOutlinedIcon />,
      content: <SketchPanel groups={demoSketch} activeEntryId={placingId} onPick={onPick} onDragStart={onDragStart} onDragEnd={onDragEnd} />,
    },
    {
      id: 'palette',
      label: 'Add parts',
      icon: <ViewInArOutlinedIcon />,
      content:
        libraryStatus.state === 'ready' ? (
          <SymbolPalettePanel groups={palette} activeEntryId={placingId} onPick={onPick} onDragStart={onDragStart} onDragEnd={onDragEnd} />
        ) : libraryStatus.state === 'error' ? (
          <Failed message={libraryStatus.error} onRetry={onReloadLibrary} sx={{ m: 2 }} />
        ) : (
          <Waiting label="Loading the parts library" rows={6} height={36} sx={{ p: 2 }} />
        ),
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
      footer: footerButton('Download CSV', <DownloadIcon />, () => bom.data && download(bomFileName(name), bomCsv(bom.data), 'text/csv'), !bom.data),
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
  /** Freeze opens the holder designer. */
  onFreeze?: () => void;
  /** Opens Choose parts, for an ideal part. */
  onSnap?: () => void;
  /** Opens the close-up to design an ideal lens or mirror. */
  onDesign?: () => void;
  /** Optimize mode: the rows the optimizer may change show a V. */
  varying?: Varying;
}

export function rightPanels({ design, selected, selectedParts, realizeOptions, onChange, onSelect, onStep, onDelete, unmounted, onFreeze, onSnap, onDesign, varying }: RightPanelsProps): SidePanelItem[] {
  const several = selectedParts.length > 1;
  return [
    {
      id: 'properties',
      label: 'Properties',
      title: several ? `${selectedParts.length} parts selected` : selected ? <PropertiesTitle symbol={selected} onChange={onChange} /> : 'Properties',
      icon: <TuneIcon />,
      // Several parts: which ones (pick one to see it alone). One part: its properties.
      content: several ? (
        <SelectionSummary parts={selectedParts} onPick={onSelect} />
      ) : (
        <PropertiesPanel symbol={selected} realizeOptions={realizeOptions} onChange={onChange} varying={varying} />
      ),
      footer: !several && selected && (
        <PropertiesFooter
          symbol={selected}
          total={design.symbols.length}
          onPrev={() => onStep(-1)}
          onNext={() => onStep(1)}
          onDelete={onDelete}
          onChange={onChange}
          realizeOptions={realizeOptions}
          onFreeze={onFreeze}
          onSnap={onSnap}
          onDesign={onDesign}
        />
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
            { label: 'not mounted', value: unmounted },
            { label: 'groups', value: design.groups.length },
          ]}
        />
      ),
    },
  ];
}
