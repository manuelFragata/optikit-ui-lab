import { useEffect, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import HistoryIcon from '@mui/icons-material/History';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import IosShareIcon from '@mui/icons-material/IosShare';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import { demoDesignInfo, demoFiles, demoHistory, demoInputs, demoModules, demoPalette, demoSchematic } from '../../demo/editorContent';
import { AddPartSearch, type PartEntry } from '../editor/AddPartSearch';
import { CanvasToolbar, DEFAULT_VIEW_OPTIONS, type CanvasTool, type EditorView, type ViewOptions } from '../editor/CanvasToolbar';
import { CommandPalette, type Command } from '../editor/CommandPalette';
import { LayerPreview } from '../editor/LayerPreview';
import { frozen, isLocked, realized, shifted, type Schematic, type SchematicSymbol, type Seat } from '../editor/model';
import { DesignInfoPanel } from '../editor/panels/DesignInfoPanel';
import { FilesPanel } from '../editor/panels/FilesPanel';
import { HistoryPanel } from '../editor/panels/HistoryPanel';
import { LayersPanel } from '../editor/panels/LayersPanel';
import { PartsListPanel } from '../editor/panels/PartsListPanel';
import { PropertiesFooter, PropertiesPanel, SelectionSummary } from '../editor/panels/PropertiesPanel';
import { SymbolPalettePanel } from '../editor/panels/SymbolPalettePanel';
import { SchematicCanvas, type Camera } from '../editor/SchematicCanvas';
import { SelectionActions } from '../editor/SelectionActions';
import { useHistory } from '../editor/useHistory';
import { ViewDock, type Detail, type Flyout, type ZoomCommand } from '../editor/ViewDock';
import { OverflowMenu } from '../panels/OverflowMenu';
import { SidePanel, type SidePanelState } from '../panels/SidePanel';
import { demoUser } from '../../demo/user';
import { AccountMenu, type AccountUser } from './AccountMenu';
import { AppHeader, type HeaderVariant } from './AppHeader';
import { StatusBar } from './StatusBar';

export type LeftPanelId = 'palette' | 'layers' | 'parts' | 'files';
export type RightPanelId = 'properties' | 'history' | 'info';

/** Every part the library offers, in one list for the Add search and the command palette. */
const PARTS: PartEntry[] = demoPalette.flatMap((g) => g.entries.map((e) => ({ ...e, mount: g.mount, source: g.label })));

const TOOL_KEYS: Record<string, CanvasTool> = { v: 'select', h: 'pan', z: 'zoom', m: 'measure' };

const HINTS: Record<CanvasTool, string> = {
  select: 'Click a part to select it, double-click for its properties · A to add one · Ctrl K for everything',
  pan: 'Drag to move around · the wheel zooms',
  zoom: 'Click to zoom in · Alt-click to zoom out',
  measure: 'Click two points to measure between them',
};

export interface EditorShellProps {
  /** Off inside the workspace, which has its own header. */
  showHeader?: boolean;
  headerVariant?: HeaderVariant;
  projectName?: string;
  version?: string;
  /** Signed-in account, or `null` for a guest. */
  user?: AccountUser | null;
  /** Initial design; edits are kept inside the shell. */
  schematic?: Schematic;
  /** The design in 3D, shown by the 3D switch when there is a model. */
  preview3d?: ReactNode;

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
  /** The selected part (the one the inspector shows); `null` for none. Controlled if set. Shift-click selects more. */
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

/** `n` free ids like the others: S7, S8, … */
const nextIds = (symbols: SchematicSymbol[], n: number) => {
  const top = Math.max(0, ...symbols.map((s) => Number(s.id.replace(/\D/g, '')) || 0));
  return Array.from({ length: n }, (_, i) => `S${top + 1 + i}`);
};

/** Typing in a field, so single-key shortcuts must not fire. */
const typing = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * Editor layout: header, left rail + panel, schematic canvas with floating
 * controls, right rail + contextual panel, status bar. Selecting a symbol
 * opens its properties; clicking empty canvas closes them unless pinned.
 *
 * On the canvas: the 2D/3D switch and Ctrl K search (top left), the dock
 * (bottom centre: add, undo, tools, view, zoom, build state), the layer
 * preview (bottom right) and the selected part's actions (next to it).
 */
export function EditorShell({
  showHeader = true,
  headerVariant = 'light',
  projectName = 'BF+Fluor FRAME Optical Core',
  version = '0.4.2',
  user = demoUser,
  schematic: initialSchematic = demoSchematic,
  preview3d,
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
  // Every edit to the design is a step that can be undone.
  const history = useHistory(initialSchematic);
  const schematic = history.value;
  const setSchematic = history.set;
  // The schematic shows one layer at a time; it opens on the lowest layer with parts.
  const [layer, setLayer] = useState(() => Math.min(...initialSchematic.symbols.map((s) => s.z), 1));
  const [detail, setDetail] = useState<Detail>('solids');
  const [camera, setCamera] = useState<Camera | 'fit'>('fit');
  const [flyout, setFlyout] = useState<Flyout | null>(null);
  const [placing, setPlacing] = useState<PartEntry | null>(null);
  // The part being placed was dragged in from a list (and drops where it is let go).
  const [dragging, setDragging] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // The selection: `selectedId` is the part the inspector shows, `others` the rest (Shift-click, a dragged box).
  const [others, setOthers] = useState<string[]>([]);
  const { symbols, rays } = schematic;
  const selectedIndex = symbols.findIndex((s) => s.id === selectedId);
  const selected = selectedIndex >= 0 ? symbols[selectedIndex] : null;
  const selectedIds = selected ? [...others.filter((id) => id !== selected.id && symbols.some((s) => s.id === id)), selected.id] : [];
  const selectedParts = symbols.filter((s) => selectedIds.includes(s.id));
  const unmounted = symbols.filter((s) => s.placement.state === 'unmounted');
  // Every layer from the ground to one above the highest part, so there is always a free layer to stack into.
  const top = Math.max(0, ...symbols.map((s) => s.z)) + 1;
  const layers = Array.from({ length: top + 1 }, (_, z) => z);
  const zoom = typeof camera === 'object' ? camera.zoom : 1;

  const openRight = (id: RightPanelId) => {
    if (rightPanel !== id) setRightPanel(id);
    if (rightState === 'collapsed') setRightState('expanded');
  };
  const openLeft = (id: LeftPanelId) => {
    setLeftPanel(id);
    if (leftState === 'collapsed') setLeftState('expanded');
  };

  /** Select just this part (or nothing). */
  const select = (id: string | null) => {
    setSelectedId(id);
    setOthers([]);
    // A part picked from a list may sit on another layer: go there.
    const part = symbols.find((s) => s.id === id);
    if (part && part.z !== layer) setLayer(part.z);
    // Deselecting closes the properties again, unless the user pinned the panel.
    if (!id && rightState === 'expanded' && rightPanel === 'properties') setRightState('collapsed');
  };

  /** Several parts at once (a dragged box); `add` keeps what was selected. The last one is the one the inspector shows. */
  const selectMany = (ids: string[], add = false) => {
    const all = add ? [...selectedIds, ...ids.filter((id) => !selectedIds.includes(id))] : ids;
    setOthers(all.slice(0, -1));
    setSelectedId(all[all.length - 1] ?? null);
    if (all.length === 0 && rightState === 'expanded' && rightPanel === 'properties') setRightState('collapsed');
  };

  /** Shift-click: a part into the selection, or out of it. */
  const toggle = (id: string) => selectMany(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  /** A click selects a part; a double-click (or Enter) also opens its properties. */
  const inspect = (id: string) => {
    // Inside a multi-selection, keep it: the panel then lists the selected parts.
    if (!selectedIds.includes(id)) select(id);
    openRight('properties');
  };

  const updateSymbol = (id: string, patch: Partial<SchematicSymbol>) =>
    setSchematic((prev) => ({ ...prev, symbols: prev.symbols.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  // The selected part moved to another layer (an edit, undo or redo): the view goes with it.
  const selectedZ = selected?.z;
  useEffect(() => {
    if (selectedZ !== undefined) setLayer(selectedZ);
  }, [selectedZ]);

  /** Change every selected part in one step (one undo). */
  const updateSelected = (patch: (part: SchematicSymbol) => Partial<SchematicSymbol>) =>
    setSchematic((prev) => ({ ...prev, symbols: prev.symbols.map((s) => (selectedIds.includes(s.id) ? { ...s, ...patch(s) } : s)) }));

  const deleteSelected = () => {
    setSchematic((prev) => ({ ...prev, symbols: prev.symbols.filter((s) => !selectedIds.includes(s.id)) }));
    select(null);
  };

  /** Copies of `parts`, each moved by `by` (three cubes to the right unless said), selected afterwards. */
  const copyParts = (parts: SchematicSymbol[], by = { x: 3, y: 0 }) => {
    const ids = nextIds(symbols, parts.length);
    const copies = parts.map((s, i) => ({ ...s, id: ids[i], label: `${s.label} copy`, locks: undefined, x: Math.round((s.x + by.x) * 10) / 10, y: Math.round((s.y + by.y) * 10) / 10 }));
    setSchematic((prev) => ({ ...prev, symbols: [...prev.symbols, ...copies] }));
    selectMany(ids);
  };

  /** Parts dragged on the canvas: moved (each along its free axes), or (Alt) copied there. */
  const moveParts = (ids: string[], by: { x: number; y: number }, copy: boolean) => {
    if (copy) return copyParts(symbols.filter((s) => ids.includes(s.id)), by);
    setSchematic((prev) => ({ ...prev, symbols: prev.symbols.map((s) => (ids.includes(s.id) ? { ...s, ...shifted(s, by) } : s)) }));
  };

  /** A quarter turn for every selected part that is in a cube and not locked. */
  const turnSelected = () =>
    updateSelected((s) => (s.placement.state === 'in-cube' && !isLocked(s, 'turn') ? { placement: { ...s.placement, seat: ((s.placement.seat + 1) % 4) as Seat } } : {}));

  const step = (delta: number) => {
    if (symbols.length === 0) return;
    const next = symbols[(Math.max(selectedIndex, 0) + delta + symbols.length) % symbols.length];
    select(next.id);
  };

  // Add: pick a part, then click on the canvas to drop it on the current layer.
  const startPlacing = (part: PartEntry) => {
    setFlyout(null);
    select(null);
    setTool('select');
    setView('2d');
    setPlacing(part);
  };
  // Or drag its card onto the canvas. The Add list sinks into the + meanwhile, and rises again if the part is not dropped on the canvas.
  const startDrag = (part: PartEntry) => {
    select(null);
    setTool('select');
    setView('2d');
    setPlacing(part);
    setDragging(true);
  };
  const endDrag = () => {
    setDragging(false);
    setPlacing(null);
  };
  const place = (at: { x: number; y: number }, more: boolean) => {
    if (!placing) return;
    const [id] = nextIds(symbols, 1);
    const part: SchematicSymbol = {
      id,
      label: placing.label,
      kind: placing.kind,
      type: placing.label,
      x: at.x,
      y: at.y,
      z: layer,
      placement:
        placing.mount === 'mounted'
          ? { state: 'in-cube', module: placing.label, source: placing.source, seat: 0 }
          : { state: 'unmounted', part: placing.label, source: placing.source },
      inputs: demoInputs[placing.kind],
      notes: '',
    };
    setSchematic((prev) => ({ ...prev, symbols: [...prev.symbols, part] }));
    setRecent((prev) => [placing.id, ...prev.filter((r) => r !== placing.id)]);
    setFlyout(null);
    // Ctrl-click keeps placing the same part.
    if (!more) {
      setPlacing(null);
      select(id);
    }
  };

  // Mount all: realize each unmounted part as the first module that fits, or freeze a holder for it.
  const mountAll = () => {
    setSchematic((prev) => ({
      ...prev,
      symbols: prev.symbols.map((s) => {
        if (s.placement.state !== 'unmounted') return s;
        const option = demoModules[s.kind][0];
        return { ...s, placement: option ? realized(option) : frozen(s.placement) };
      }),
    }));
    setFlyout(null);
  };

  const zoomBy = (command: ZoomCommand) => {
    if (command === 'fit' || typeof camera !== 'object') return setCamera('fit');
    const next = command === 'actual' ? 1 : command === 'in' ? zoom * 1.25 : zoom / 1.25;
    setCamera({ ...camera, zoom: Math.min(5, Math.max(0.2, next)) });
  };

  const toggleOption = (key: 'showRays' | 'showRayLabels' | 'showCages' | 'onionSkin' | 'snapToGrid') => setOptions({ ...options, [key]: options[key] === false });

  // Keyboard shortcuts, while the editor is open. Re-attached each render, so they always see the current state.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (paletteOpen || typing(e.target)) return;
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
      } else if (mod && key === 'y') {
        e.preventDefault();
        history.redo();
      } else if (mod && key === 'a' && view === '2d') {
        // Everything on this layer.
        e.preventDefault();
        selectMany(symbols.filter((s) => s.z === layer).map((s) => s.id));
      } else if (mod && key === 'd' && selectedParts.length) {
        e.preventDefault();
        copyParts(selectedParts);
      } else if (mod || e.altKey) {
        return;
      } else if (key === 'escape') {
        if (placing) endDrag();
        else if (flyout) setFlyout(null);
        else if (tool !== 'select') setTool('select');
        else select(null);
      } else if (key === 'a' || key === '/') {
        e.preventDefault();
        setFlyout('add');
      } else if (view === '2d' && TOOL_KEYS[key]) {
        setTool(TOOL_KEYS[key]);
      } else if (view === '2d' && key === 'f') {
        zoomBy('fit');
      } else if (view === '2d' && (key === '+' || key === '=')) {
        zoomBy('in');
      } else if (view === '2d' && key === '-') {
        zoomBy('out');
      } else if (view === '2d' && key === '1') {
        zoomBy('actual');
      } else if (selected && key === 'r') {
        turnSelected();
      } else if (selected && key === 'enter') {
        openRight('properties');
      } else if (selected && (key === 'delete' || key === 'backspace')) {
        deleteSelected();
      } else if (selected && key.startsWith('arrow')) {
        // Nudge a cube at a time; with Shift, a tenth. Locked axes stay.
        e.preventDefault();
        const d = e.shiftKey ? 0.1 : 1;
        const x = key === 'arrowleft' ? -d : key === 'arrowright' ? d : 0;
        const y = key === 'arrowdown' ? -d : key === 'arrowup' ? d : 0;
        updateSelected((s) => shifted(s, { x, y }));
      } else if (selected && (key === 'pageup' || key === 'pagedown')) {
        e.preventDefault();
        updateSelected((s) => ({ z: shifted(s, { z: key === 'pageup' ? 1 : -1 }).z }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Everything the command palette (Ctrl K) can do.
  const commands: Command[] = [
    ...PARTS.map((p) => ({ id: `add-${p.id}`, group: 'Add part', label: `Add ${p.label}`, run: () => startPlacing(p) })),
    ...symbols.map((s) => ({ id: `go-${s.id}`, group: 'Go to part', label: `${s.label} · ${s.id} · z${s.z}`, run: () => select(s.id) })),
    ...layers.map((z) => ({
      id: `layer-${z}`,
      group: 'Go to layer',
      label: `Layer z${z}`,
      run: () => {
        setView('2d');
        setLayer(z);
      },
    })),
    { id: 'undo', group: 'Edit', label: 'Undo', shortcut: 'Ctrl Z', run: history.undo },
    { id: 'redo', group: 'Edit', label: 'Redo', shortcut: 'Ctrl Shift Z', run: history.redo },
    ...(unmounted.length ? [{ id: 'mount-all', group: 'Edit', label: `Mount all ${unmounted.length} unmounted parts`, run: mountAll }] : []),
    { id: 'tool-select', group: 'Tools', label: 'Select', shortcut: 'V', run: () => setTool('select') },
    { id: 'tool-pan', group: 'Tools', label: 'Pan', shortcut: 'H', run: () => setTool('pan') },
    { id: 'tool-zoom', group: 'Tools', label: 'Zoom', shortcut: 'Z', run: () => setTool('zoom') },
    { id: 'tool-measure', group: 'Tools', label: 'Measure', shortcut: 'M', run: () => setTool('measure') },
    { id: 'view-2d', group: 'View', label: 'Switch to 2D', run: () => setView('2d') },
    { id: 'view-3d', group: 'View', label: 'Switch to 3D', run: () => setView('3d') },
    { id: 'fit', group: 'View', label: 'Fit the drawing', shortcut: 'F', run: () => zoomBy('fit') },
    { id: 'zoom-in', group: 'View', label: 'Zoom in', shortcut: '+', run: () => zoomBy('in') },
    { id: 'zoom-out', group: 'View', label: 'Zoom out', shortcut: '−', run: () => zoomBy('out') },
    { id: 'rays', group: 'View', label: options.showRays === false ? 'Show rays' : 'Hide rays', run: () => toggleOption('showRays') },
    { id: 'labels', group: 'View', label: options.showRayLabels ? 'Hide ray labels' : 'Show ray labels', run: () => toggleOption('showRayLabels') },
    { id: 'cages', group: 'View', label: options.showCages ? 'Hide cube cages' : 'Show cube cages', run: () => toggleOption('showCages') },
    { id: 'onion', group: 'View', label: options.onionSkin ? 'Hide the other layers' : 'Show the other layers, faintly', run: () => toggleOption('onionSkin') },
    { id: 'snap', group: 'View', label: options.snapToGrid ? 'Turn snap to grid off' : 'Turn snap to grid on', run: () => toggleOption('snapToGrid') },
    { id: 'panel-palette', group: 'Panels', label: 'Open the parts library', run: () => openLeft('palette') },
    { id: 'panel-layers', group: 'Panels', label: 'Open layers', run: () => openLeft('layers') },
    { id: 'panel-parts', group: 'Panels', label: 'Open the parts list', run: () => openLeft('parts') },
    { id: 'panel-files', group: 'Panels', label: 'Open project files', run: () => openLeft('files') },
    { id: 'panel-history', group: 'Panels', label: 'Open version history', run: () => openRight('history') },
    { id: 'panel-info', group: 'Panels', label: 'Open design info', run: () => openRight('info') },
  ];

  const hint = !placing
    ? HINTS[tool]
    : dragging
      ? `Let go to place ${placing.label} on z${layer} · Shift: off the grid`
      : `Click to place ${placing.label} on z${layer} · Shift: off the grid · Ctrl-click to place more · Esc to stop`;

  // Top left: the 2D/3D switch (the tools and view options live in the dock), and search.
  const toolbar = (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <CanvasToolbar view={view} onViewChange={setView} />
      <ButtonBase
        onClick={() => setPaletteOpen(true)}
        aria-label="Search commands and parts"
        sx={(t) => ({
          height: 40,
          gap: 1,
          pl: 1.25,
          pr: 1,
          borderRadius: `${t.radius.tile}px`,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: t.shadows[1],
          color: 'text.secondary',
          '&:hover': { color: 'text.primary' },
        })}
      >
        <SearchIcon fontSize="small" />
        <Typography variant="body2">Search</Typography>
        <Typography variant="mono" sx={{ ml: 2, px: 0.75, borderRadius: 0.75, bgcolor: 'action.hover', fontSize: 11 }}>
          Ctrl K
        </Typography>
      </ButtonBase>
    </Stack>
  );

  const footerButton = (label: string, icon: ReactNode) => (
    <Box sx={{ p: 1.5 }}>
      <Button variant="outlined" startIcon={icon}>
        {label}
      </Button>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
      {showHeader && (
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
      )}

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
              content: (
                <SymbolPalettePanel
                  groups={demoPalette}
                  activeEntryId={placing?.id}
                  onPick={(id) => {
                    const part = PARTS.find((p) => p.id === id);
                    if (part) startPlacing(part);
                  }}
                  onDragStart={(id) => {
                    const part = PARTS.find((p) => p.id === id);
                    if (part) startDrag(part);
                  }}
                  onDragEnd={endDrag}
                />
              ),
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

        <Box sx={{ position: 'relative', display: 'flex', flex: 1, minWidth: 0 }}>
          {view === '3d' && preview3d ? (
            <Box sx={{ position: 'relative', flex: 1, display: 'grid', bgcolor: 'canvas.ground' }}>
              {preview3d}
              {detail !== 'solids' && (
                <Typography
                  variant="meta"
                  color="text.secondary"
                  sx={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', bgcolor: 'background.paper', px: 1.5, py: 0.5, borderRadius: 1 }}
                >
                  {detail === 'symbols' ? 'Symbols' : 'Cubes'} in 3D come with the 3D editor; showing solids.
                </Typography>
              )}
              <Box sx={{ position: 'absolute', top: (t) => t.spacing(1.5), left: (t) => t.spacing(1.5) }}>{toolbar}</Box>
            </Box>
          ) : (
            <SchematicCanvas
              schematic={schematic}
              selectedId={selectedId}
              selectedIds={selectedIds}
              onSelect={(id, more) => (id && more ? toggle(id) : select(id))}
              onSelectMany={selectMany}
              onInspect={inspect}
              view={view}
              layer={view === '2d' ? layer : undefined}
              options={options}
              hint={hint}
              hintAt="top"
              toolbar={toolbar}
              camera={camera}
              onCamera={setCamera}
              tool={tool}
              placing={placing && { kind: placing.kind, drag: dragging }}
              onPlace={place}
              onMove={moveParts}
              snap={options.snapToGrid}
              selectionActions={
                selected && (
                  <SelectionActions
                    parts={selectedParts}
                    realizeOptions={demoModules[selected.kind]}
                    onUpdate={updateSelected}
                    onProperties={() => openRight('properties')}
                    onDuplicate={() => copyParts(selectedParts)}
                    onDelete={deleteSelected}
                  />
                )
              }
            />
          )}

          {/* The dock floats at the bottom of the canvas, CAD style, and leaves the rest to the drawing. */}
          {/* Centred in the free canvas: it moves over when the right panel floats in. */}
          <Box
            sx={(t) => ({
              position: 'absolute',
              left: rightState === 'expanded' ? `calc(50% - (${t.spacing(t.layout.sidePanelWidth)} + ${t.spacing(1)}) / 2)` : '50%',
              bottom: t.spacing(2),
              transform: 'translateX(-50%)',
              zIndex: 2,
              transition: 'left 260ms cubic-bezier(0.22, 1, 0.36, 1)',
            })}
          >
            <ViewDock
              view={view}
              flyout={flyout}
              onFlyout={setFlyout}
              addPanel={<AddPartSearch parts={PARTS} recent={recent} onPick={startPlacing} onDragStart={startDrag} onDragEnd={endDrag} />}
              dragging={dragging}
              canUndo={history.canUndo}
              canRedo={history.canRedo}
              onUndo={history.undo}
              onRedo={history.redo}
              tool={tool}
              onTool={setTool}
              options={options}
              onOptions={setOptions}
              detail={detail}
              onDetail={setDetail}
              zoom={zoom}
              onZoom={zoomBy}
              unmounted={unmounted.map((s) => ({ id: s.id, label: s.label }))}
              onShowPart={(id) => {
                setFlyout(null);
                setView('2d');
                select(id);
              }}
              onMountAll={mountAll}
            />
          </Box>

          {/* Where the drawn layer sits in the whole system, in the corner; it steps aside for the floating right panel. */}
          {view === '2d' && (
            <Box
              sx={(t) => ({
                position: 'absolute',
                right: rightState === 'expanded' ? `calc(${t.spacing(t.layout.sidePanelWidth)} + ${t.spacing(3)})` : t.spacing(2),
                bottom: t.spacing(2),
                zIndex: 1,
                transition: 'right 260ms cubic-bezier(0.22, 1, 0.36, 1)',
              })}
            >
              <LayerPreview schematic={schematic} layers={layers} layer={layer} onLayer={setLayer} selectedIds={selectedIds} crowded={rightState === 'expanded'} />
            </Box>
          )}
        </Box>

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
              title: selectedParts.length > 1 ? `${selectedParts.length} parts selected` : (selected?.label ?? 'Properties'),
              icon: <TuneIcon />,
              content:
                selectedParts.length > 1 ? (
                  <SelectionSummary parts={selectedParts} onPick={select} />
                ) : (
                  <PropertiesPanel
                    symbol={selected}
                    realizeOptions={selected ? demoModules[selected.kind] : []}
                    onChange={(patch) => selected && updateSymbol(selected.id, patch)}
                  />
                ),
              footer: selectedParts.length === 1 && selected && (
                <PropertiesFooter symbolId={selected.id} total={symbols.length} onPrev={() => step(-1)} onNext={() => step(1)} onDelete={deleteSelected} />
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
                    { label: 'not mounted yet', value: unmounted.length },
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
        tone={unmounted.length > 0 ? 'warning' : 'success'}
        status={
          <ButtonBase onClick={() => openLeft('parts')} sx={{ borderRadius: 1, px: 0.5, typography: 'caption', '&:hover': { color: 'text.primary' } }}>
            {unmounted.length > 0 ? `${unmounted.length} ${unmounted.length === 1 ? 'part' : 'parts'} not mounted yet` : 'Every part is in a cube · buildable'}
          </ButtonBase>
        }
        start={
          <>
            <Typography variant="mono">{selected ? `x ${selected.x} y ${selected.y} z ${selected.z}` : 'x – y – z –'}</Typography>
            <Typography variant="caption">{selectedParts.length > 1 ? `${selectedParts.length} of ${symbols.length} parts selected` : `${symbols.length} parts`}</Typography>
            {view === '2d' && <Typography variant="caption">layer z{layer}</Typography>}
            <Typography variant="caption">{rays.length} rays</Typography>
          </>
        }
        end={
          <>
            <Typography variant="caption">snap {options.snapToGrid ? 'on' : 'off'}</Typography>
            <Typography variant="caption">grid {schematic.unitMm} mm</Typography>
            <Typography variant="mono">{Math.round(zoom * 100)}%</Typography>
          </>
        }
      />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </Box>
  );
}
