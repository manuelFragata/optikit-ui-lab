import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import HistoryIcon from '@mui/icons-material/History';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import IosShareIcon from '@mui/icons-material/IosShare';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import { demoDesignInfo, demoFiles, demoHistory, demoModules, demoPalette, demoSchematic } from '../../demo/editorContent';
import { CanvasToolbar, DEFAULT_VIEW_OPTIONS, type CanvasTool, type EditorView, type ViewOptions } from '../editor/CanvasToolbar';
import type { Schematic, SchematicSymbol } from '../editor/model';
import { DesignInfoPanel } from '../editor/panels/DesignInfoPanel';
import { FilesPanel } from '../editor/panels/FilesPanel';
import { HistoryPanel } from '../editor/panels/HistoryPanel';
import { LayersPanel } from '../editor/panels/LayersPanel';
import { PartsListPanel } from '../editor/panels/PartsListPanel';
import { PropertiesFooter, PropertiesPanel } from '../editor/panels/PropertiesPanel';
import { SymbolPalettePanel } from '../editor/panels/SymbolPalettePanel';
import { SchematicCanvas } from '../editor/SchematicCanvas';
import { OverflowMenu } from '../panels/OverflowMenu';
import { SidePanel, type SidePanelState } from '../panels/SidePanel';
import { demoUser } from '../../demo/user';
import { AccountMenu, type AccountUser } from './AccountMenu';
import { AppHeader, type HeaderVariant } from './AppHeader';
import { StatusBar } from './StatusBar';

export type LeftPanelId = 'palette' | 'layers' | 'parts' | 'files';
export type RightPanelId = 'properties' | 'history' | 'info';

export interface EditorShellProps {
  headerVariant?: HeaderVariant;
  projectName?: string;
  version?: string;
  /** Signed-in account, or `null` for a guest. */
  user?: AccountUser | null;
  /** Initial design; edits are kept inside the shell. */
  schematic?: Schematic;

  /** Left panel (palette, layers, parts, files). Controlled if set; otherwise `defaultLeftState`. */
  leftState?: SidePanelState;
  defaultLeftState?: SidePanelState;
  onLeftStateChange?: (state: SidePanelState) => void;
  leftPanel?: LeftPanelId;
  defaultLeftPanel?: LeftPanelId;
  onLeftPanelChange?: (id: LeftPanelId) => void;

  /** Right panel (properties, history, info). Controlled if set; otherwise `defaultRightState`. */
  rightState?: SidePanelState;
  defaultRightState?: SidePanelState;
  onRightStateChange?: (state: SidePanelState) => void;
  rightPanel?: RightPanelId;
  defaultRightPanel?: RightPanelId;
  onRightPanelChange?: (id: RightPanelId) => void;

  /** Selected symbol id; `null` for none. Controlled if set. */
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelectedIdChange?: (id: string | null) => void;

  view?: EditorView;
  defaultView?: EditorView;
  onViewChange?: (view: EditorView) => void;

  /** Called when the brand mark (or "Your projects") is clicked. */
  onHome?: () => void;
  onLogIn?: () => void;
  onAccount?: () => void;
  onLogOut?: () => void;
  /** Extra header actions, placed before the built-in ones. */
  headerActions?: ReactNode;
}

/** Value that is controlled when `value` is defined, and internal state otherwise. */
function useControllable<T>(value: T | undefined, initial: T, onChange?: (next: T) => void): [T, (next: T) => void] {
  const [inner, setInner] = useState(initial);
  const current = value !== undefined ? value : inner;
  return [
    current,
    (next: T) => {
      setInner(next);
      onChange?.(next);
    },
  ];
}

/**
 * Editor layout: header, left rail + panel, schematic canvas with floating
 * controls, right rail + contextual panel, status bar. Selecting a symbol
 * opens its properties; clicking empty canvas closes them unless pinned.
 */
export function EditorShell({
  headerVariant = 'light',
  projectName = 'BF+Fluor FRAME Optical Core',
  version = '0.4.2',
  user = demoUser,
  schematic: initialSchematic = demoSchematic,
  leftState: leftStateProp,
  defaultLeftState = 'collapsed',
  onLeftStateChange,
  leftPanel: leftPanelProp,
  defaultLeftPanel = 'palette',
  onLeftPanelChange,
  rightState: rightStateProp,
  defaultRightState = 'collapsed',
  onRightStateChange,
  rightPanel: rightPanelProp,
  defaultRightPanel = 'properties',
  onRightPanelChange,
  selectedId: selectedIdProp,
  defaultSelectedId = null,
  onSelectedIdChange,
  view: viewProp,
  defaultView = '2d',
  onViewChange,
  onHome,
  onLogIn,
  onAccount,
  onLogOut,
  headerActions,
}: EditorShellProps) {
  const [leftState, setLeftState] = useControllable(leftStateProp, defaultLeftState, onLeftStateChange);
  const [leftPanel, setLeftPanel] = useControllable(leftPanelProp, defaultLeftPanel, onLeftPanelChange);
  const [rightState, setRightState] = useControllable(rightStateProp, defaultRightState, onRightStateChange);
  const [rightPanel, setRightPanel] = useControllable(rightPanelProp, defaultRightPanel, onRightPanelChange);
  const [selectedId, setSelectedId] = useControllable<string | null>(selectedIdProp, defaultSelectedId, onSelectedIdChange);
  const [view, setView] = useControllable(viewProp, defaultView, onViewChange);
  const [tool, setTool] = useState<CanvasTool>('select');
  const [options, setOptions] = useState<ViewOptions>(DEFAULT_VIEW_OPTIONS);
  const [schematic, setSchematic] = useState(initialSchematic);

  const { symbols, rays } = schematic;
  const selectedIndex = symbols.findIndex((s) => s.id === selectedId);
  const selected = selectedIndex >= 0 ? symbols[selectedIndex] : null;
  const unmounted = symbols.filter((s) => s.placement.state === 'unmounted').length;

  const openRight = (id: RightPanelId) => {
    if (rightPanel !== id) setRightPanel(id);
    if (rightState === 'collapsed') setRightState('expanded');
  };

  const select = (id: string | null) => {
    setSelectedId(id);
    if (id) {
      // Contextual: selecting opens the properties.
      openRight('properties');
    } else if (rightState === 'expanded' && rightPanel === 'properties') {
      // Deselecting closes them again, unless the user pinned the panel.
      setRightState('collapsed');
    }
  };

  const updateSymbol = (id: string, patch: Partial<SchematicSymbol>) =>
    setSchematic((prev) => ({ ...prev, symbols: prev.symbols.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  const deleteSymbol = (id: string) => {
    setSchematic((prev) => ({ ...prev, symbols: prev.symbols.filter((s) => s.id !== id) }));
    select(null);
  };

  const step = (delta: number) => {
    if (symbols.length === 0) return;
    const next = symbols[(Math.max(selectedIndex, 0) + delta + symbols.length) % symbols.length];
    select(next.id);
  };

  const footerButton = (label: string, icon: ReactNode) => (
    <Box sx={{ p: 1.5 }}>
      <Button variant="outlined" startIcon={icon}>
        {label}
      </Button>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
      <AppHeader
        variant={headerVariant}
        projectName={projectName}
        version={version}
        onHome={onHome}
        projectMenu={[
          { id: 'rename', label: 'Rename…' },
          { id: 'duplicate', label: 'Duplicate design' },
          { id: 'versions', label: 'Version history', onSelect: () => openRight('history') },
          { id: 'info', label: 'Design info', onSelect: () => openRight('info') },
        ]}
        actions={
          <>
            {headerActions}
            <Button variant="outlined" color="inherit" startIcon={<IosShareIcon />}>
              Share…
            </Button>
            <OverflowMenu
              label="Design actions"
              items={[
                { id: 'export', label: 'Export…', shortcut: 'STEP, STL, SVG' },
                { id: 'bom', label: 'Export BOM…', shortcut: 'CSV' },
                { id: 'duplicate', label: 'Duplicate design' },
                { id: 'link', label: 'Copy link' },
                { id: 'instructions', label: 'Assembly instructions' },
                { id: 'delete', label: 'Delete design', destructive: true, dividerBefore: true },
              ]}
            />
            <AccountMenu
              user={user}
              showSignUp={false}
              onLogIn={onLogIn}
              onProjects={onHome}
              onAccount={onAccount}
              onLogOut={onLogOut}
            />
          </>
        }
      />

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <SidePanel
          aria-label="Design tools"
          state={leftState}
          onStateChange={setLeftState}
          activeId={leftPanel}
          onActiveChange={(id) => setLeftPanel(id as LeftPanelId)}
          items={[
            {
              id: 'palette',
              label: 'Add parts',
              icon: <ViewInArOutlinedIcon />,
              content: <SymbolPalettePanel groups={demoPalette} />,
              footer: footerButton('Import optic…', <AddIcon />),
            },
            {
              id: 'layers',
              label: 'Layers',
              icon: <LayersOutlinedIcon />,
              content: <LayersPanel symbols={symbols} groups={schematic.groups} selectedId={selectedId} onSelect={select} />,
            },
            {
              id: 'parts',
              label: 'Parts list',
              icon: <FormatListBulletedIcon />,
              content: <PartsListPanel symbols={symbols} selectedId={selectedId} onSelect={select} />,
              footer: footerButton('Export BOM…', <IosShareIcon />),
            },
            {
              id: 'files',
              label: 'Project files',
              icon: <FolderOutlinedIcon />,
              content: <FilesPanel files={demoFiles} />,
              footer: footerButton('Upload file', <FileUploadOutlinedIcon />),
            },
          ]}
        />

        <SchematicCanvas
          schematic={schematic}
          selectedId={selectedId}
          onSelect={select}
          view={view}
          options={options}
          toolbar={
            <CanvasToolbar
              tool={tool}
              onToolChange={setTool}
              view={view}
              onViewChange={setView}
              options={options}
              onOptionsChange={setOptions}
              unitMm={schematic.unitMm}
            />
          }
        />

        <SidePanel
          side="right"
          aria-label="Inspector"
          state={rightState}
          onStateChange={setRightState}
          activeId={rightPanel}
          onActiveChange={(id) => setRightPanel(id as RightPanelId)}
          items={[
            {
              id: 'properties',
              label: 'Properties',
              title: selected?.label ?? 'Properties',
              icon: <TuneIcon />,
              content: (
                <PropertiesPanel
                  symbol={selected}
                  realizeOptions={selected ? demoModules[selected.kind] : []}
                  onChange={(patch) => selected && updateSymbol(selected.id, patch)}
                />
              ),
              footer: selected && (
                <PropertiesFooter
                  symbolId={selected.id}
                  total={symbols.length}
                  onPrev={() => step(-1)}
                  onNext={() => step(1)}
                  onDelete={() => deleteSymbol(selected.id)}
                />
              ),
            },
            {
              id: 'history',
              label: 'Version history',
              icon: <HistoryIcon />,
              content: <HistoryPanel entries={demoHistory} />,
            },
            {
              id: 'info',
              label: 'Design info',
              icon: <InfoOutlinedIcon />,
              content: (
                <DesignInfoPanel
                  {...demoDesignInfo}
                  stats={[
                    { label: 'parts', value: symbols.length },
                    { label: 'not mounted yet', value: unmounted },
                    { label: 'rays', value: rays.length },
                    { label: 'groups', value: schematic.groups.length },
                  ]}
                />
              ),
            },
          ]}
        />
      </Box>

      <StatusBar
        // UI-V4 §1.2: the status bar counts the parts that are not mounted yet; none left means buildable.
        tone={unmounted > 0 ? 'warning' : 'success'}
        status={
          <ButtonBase
            onClick={() => {
              setLeftPanel('parts');
              if (leftState === 'collapsed') setLeftState('expanded');
            }}
            sx={{ borderRadius: 1, px: 0.5, typography: 'caption', '&:hover': { color: 'text.primary' } }}
          >
            {unmounted > 0 ? `${unmounted} ${unmounted === 1 ? 'part' : 'parts'} not mounted yet` : 'Every part is in a cube · buildable'}
          </ButtonBase>
        }
        start={
          <>
            <Typography variant="mono">{selected ? `x ${selected.x} y ${selected.y} z ${selected.z}` : 'x – y – z –'}</Typography>
            <Typography variant="caption">{symbols.length} parts</Typography>
            <Typography variant="caption">{rays.length} rays</Typography>
          </>
        }
        end={
          <>
            <Typography variant="caption">snap {options.snapToGrid ? 'on' : 'off'}</Typography>
            <Typography variant="caption">grid {schematic.unitMm} mm</Typography>
            <Typography variant="mono">100%</Typography>
          </>
        }
      />
    </Box>
  );
}
