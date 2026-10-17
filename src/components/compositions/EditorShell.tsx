/**
 * The editor: the open design in 2D or 3D, with its panels, dock and keys.
 * This file holds the editor's state and lays the pieces out; the pieces
 * live in ./editor/:
 *
 * - designEdits.ts     every change to the design, as pure functions (tested);
 * - useSelection.ts    which parts are selected;
 * - usePlacing.ts      a new part on its way onto the canvas;
 * - actions.ts         the editor's verbs, implemented below, used by
 * - useShortcuts.ts    the keys, and
 * - paletteCommands.ts the command palette (Ctrl K);
 * - panels.tsx         what the left and right panels hold;
 * - EditorHeader.tsx, EditorStatusBar.tsx, SearchButton.tsx.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined';
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined';
import CenterFocusStrongOutlinedIcon from '@mui/icons-material/CenterFocusStrongOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import { useTheme, type Theme } from '@mui/material/styles';
import { demoInputs, demoSchematic, demoSketch } from '../../demo/editorContent';
import { useLibrary, type PaletteGroup } from '../../ports/library';
import { snappedValues } from '../editor/holders/optic';
import type { MakeReal } from '../editor/scene3d/SnapPanel';
import { toggled, type VaryMap, type Varying } from '../editor/optimize/vary';
import { NEW_SESSION, type OptimizeSession } from '../editor/optimize/session';
import type { PartVariables } from '../../ports/analysis';
import { useRequest } from '../../ports/request';
import { useService } from '../../ports/service';
import { STORE_MESHES } from '../../demo/assemblies';
import { demoUser } from '../../demo/user';
import { usePreferences } from '../../settings/preferences';
import { useLight } from '../../ports/light';
import { AddPartSearch, type PartEntry } from '../editor/AddPartSearch';
import { CanvasToolbar } from '../editor/CanvasToolbar';
import { DEFAULT_VIEW_OPTIONS, type CanvasTool, type EditorView, type HintPlace, type ViewOptions } from '../editor/viewOptions';
import { CommandPalette } from '../editor/CommandPalette';
import { LayerPreview } from '../editor/LayerPreview';
import { designed, frozen, realize, snapped, type Move, type Schematic, type SchematicSymbol } from '../editor/model';
import { designedValues, recordOf } from '../editor/holders/designs';
import type { CameraCommand, CameraMove } from '../editor/scene3d/Camera';
import { SelectionActions } from '../editor/SelectionActions';
import { useHistory } from '../editor/useHistory';
import { ViewDock, type Flyout, type ZoomCommand } from '../editor/ViewDock';
import { SidePanel, type SidePanelState } from '../panels/SidePanel';
import { SplitPane } from '../panels/SplitPane';
import type { AccountUser } from './AccountMenu';
import type { HeaderVariant } from './AppHeader';
import type { EditorActions, PanelId } from './editor/actions';
import { addParts, copyParts, mountAll, moveParts, newPart, nextIds, removeParts, turnParts, updateParts } from './editor/designEdits';
import { EditorHeader } from './editor/EditorHeader';
import { EditorStatusBar } from './editor/EditorStatusBar';
import { paletteCommands } from './editor/paletteCommands';
import { leftPanels, rightPanels } from './editor/panels';
import { SearchButton } from './editor/SearchButton';
import { useControllable } from './editor/useControllable';
import { usePlacing } from './editor/usePlacing';
import { useSelection } from './editor/useSelection';
import { useShortcuts } from './editor/useShortcuts';

export type { PanelId };

// three.js and its helpers load only when the 3D view (or the close-up) is first opened.
const DesignScene3D = lazy(() => import('../editor/scene3d/DesignScene3D').then((m) => ({ default: m.DesignScene3D })));
const Closeup = lazy(() => import('../editor/scene3d/Closeup').then((m) => ({ default: m.Closeup })));
const OptimizePane = lazy(() => import('../editor/optimize/OptimizePane').then((m) => ({ default: m.OptimizePane })));
const ChoosePane = lazy(() => import('../editor/choose/ChoosePane').then((m) => ({ default: m.ChoosePane })));
const SimulatePane = lazy(() => import('../editor/simulate/SimulatePane').then((m) => ({ default: m.SimulatePane })));

/** What the split's second pane can hold, beside the canvas. */
export type EditorPane = 'closeup' | 'optimize' | 'choose' | 'simulate';

/** The sketch's entries, as parts to place. */
const SKETCH: PartEntry[] = demoSketch.flatMap((g) =>
  g.entries.map((e) => ({ id: e.id, kind: e.kind, inputs: e.inputs, label: `Ideal ${e.label.toLowerCase()}`, mount: 'ideal' as const, source: 'Sketch' })),
);

/** Every part there is to place, in one list for the Add search and the command palette: the sketch's, then the library's. */
const partsOf = (palette: readonly PaletteGroup[]): PartEntry[] => [...SKETCH, ...palette.flatMap((g) => g.entries.map((e) => ({ ...e, mount: g.mount, source: g.label })))];

const HINTS: Record<CanvasTool, string> = {
  select: 'Click a part to select it, double-click for its properties · A to add one · Ctrl K for everything',
  pan: 'Drag to move around · the wheel zooms',
  zoom: 'Click to zoom in · Alt-click to zoom out',
  measure: 'Click two points to measure between them',
};
const HINT_3D = 'Click a part to select it, double-click for its properties · right drag orbits, middle drag pans, the wheel zooms';

/** The sidebar's panels, top to bottom: making first, then the part, then the design's lists. */
const PANEL_ORDER: PanelId[] = ['sketch', 'palette', 'properties', 'layers', 'parts', 'bom', 'info'];

/** How a panel's slide-in is eased, for the dock and the layer preview stepping aside. */
const STEP_ASIDE = '260ms cubic-bezier(0.22, 1, 0.36, 1)';

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
  /** The design after each edit (and undo), so the other tabs can show it. */
  onDesignChange?: (design: Schematic) => void;

  /**
   * The sidebar: every panel (sketch, parts, properties, layers, lists, info), one open at a time,
   * and the split views beside the canvas. On the edge Settings names. Controlled if set; otherwise `defaultPanelState`.
   */
  panelState?: SidePanelState;
  defaultPanelState?: SidePanelState;
  onPanelStateChange?: (state: SidePanelState) => void;
  panel?: PanelId;
  defaultPanel?: PanelId;
  onPanelChange?: (id: PanelId) => void;

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
  /** A pane to open beside the canvas: on opening, and whenever this changes (a link to Simulate). */
  openPane?: EditorPane;
  /** Tell the person something the editor cannot show itself (a hand-off to another app). */
  onNotice?: (text: string) => void;
  /**
   * The workspace tab the editor is: View, or Optimize (the optimizer beside
   * the canvas, the V on Properties rows). With `onModeChange`, opening or
   * closing Optimize changes the tab; without it, Optimize is a pane of View.
   */
  mode?: 'view' | 'optimize';
  onModeChange?: (mode: 'view' | 'optimize') => void;
}

export function EditorShell({
  showHeader = true,
  headerVariant = 'light',
  projectName = 'BF+Fluor FRAME Optical Core',
  version = '0.4.2',
  user = demoUser,
  schematic: initialDesign = demoSchematic,
  onDesignChange,
  panelState: panelStateProp,
  defaultPanelState = 'collapsed',
  onPanelStateChange,
  panel: panelProp,
  defaultPanel = 'palette',
  onPanelChange,
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
  openPane,
  onNotice,
  mode = 'view',
  onModeChange,
}: EditorShellProps) {
  /* ---------------------------------------------------------------- */
  /* State                                                             */
  /* ---------------------------------------------------------------- */

  // Panels, view and selection can be controlled from outside (stories, the workspace).
  const [panelState, setPanelState] = useControllable(panelStateProp, defaultPanelState, onPanelStateChange);
  const [panel, setPanel] = useControllable(panelProp, defaultPanel, onPanelChange);
  const [selectedId, setSelectedId] = useControllable<string | null>(selectedIdProp, defaultSelectedId, onSelectedIdChange);
  const [view, setView] = useControllable(viewProp, defaultView, onViewChange);

  // The design, where every edit is a step that can be undone.
  const history = useHistory(initialDesign);
  const design = history.value;
  const edit = history.set;
  // Every edit and undo, also an undo back to the start; not the design it opened with.
  const opening = useRef(true);
  useEffect(() => {
    if (opening.current) opening.current = false;
    else onDesignChange?.(design);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new design is news; the callback may be new each render
  }, [design]);

  const selection = useSelection(design.symbols, selectedId, setSelectedId);
  const placing = usePlacing();

  // How the design is looked at: editor state only, never in the design file.
  const [tool, setTool] = useState<CanvasTool>('select');
  const [options, setOptions] = useState<ViewOptions>(DEFAULT_VIEW_OPTIONS);
  // How the person likes to work (Settings), kept between sessions.
  const { prefs, update: updatePrefs, setSettingsOpen } = usePreferences();
  // One layer is worked on at a time; the design opens on the lowest layer with parts.
  const [layer, setLayer] = useState(() => Math.min(...initialDesign.symbols.map((s) => s.z), 1));
  // The 2D zoom, as the camera says it, 1 = 100 %.
  const [zoom, setZoom] = useState(1);
  // The camera moves on commands (2D and 3D); `n` counts them, so the same one can repeat.
  const [camera3d, setCamera3d] = useState<CameraCommand>();
  const [flyout, setFlyout] = useState<Flyout | null>(null);
  // On a narrow canvas the dock and the layer preview overlap: the one the pointer or focus is on comes to the front.
  const [front, setFront] = useState<'dock' | 'layers'>('dock');
  const [paletteOpen, setPaletteOpen] = useState(false);
  // The close-up: the canvas split, the selected part beside it; the component picked in it, for that part.
  // What the split's second pane holds: the close-up, Optimize, Choose parts, Simulate, or nothing (the canvas alone).
  const [pane, setPane] = useState<EditorPane | null>(openPane ?? (mode === 'optimize' ? 'optimize' : null));
  // The light path Simulate looks at: the canvas draws it stronger.
  const [focusRay, setFocusRay] = useState<string | null>(null);
  const closeup = pane === 'closeup';
  const setCloseup = (on: boolean) => setPane(on ? 'closeup' : null);
  const [split, setSplit] = useState(0.55);
  const [closeupFocus, setCloseupFocus] = useState<{ partId: string; key: string | null } | null>(null);

  const { selected } = selection;
  // The parts library and the service, as the app provides them.
  const library = useLibrary();
  const service = useService();
  const { modulesFor } = library;
  const LIBRARY = useMemo(() => partsOf(library.palette), [library.palette]);
  /** A part's optic: designed here, or the library's record behind its name. */
  const recordForPart = useCallback((s: SchematicSymbol) => recordOf(s, library.record), [library]);
  /** A lens or mirror's real glass. One function per library, so the views' layouts keep. */
  const glassOf = useCallback((s: SchematicSymbol) => recordOf(s, library.record)?.fragmentSurfaces, [library]);
  // What to buy, from the service: the last answer stays while a newer one comes.
  const bom = useRequest(design, service.bom, { keep: true });
  // The design's sources' wavelengths, for the close-up's Optical side.
  const wavelengths = [...new Set(design.symbols.flatMap((s) => (s.kind === 'laser' ? (s.inputs ?? []).filter((i) => i.label === 'Wavelength').map((i) => i.value) : [])))].sort((a, b) => a - b);
  // Every part not in a cube yet: the ideal ones (sketched) and the unmounted ones (no holder).
  const unmounted = design.symbols.filter((s) => s.placement.state !== 'in-cube');
  // Every layer from the ground to one above the highest part, so there is always a free layer to stack into.
  const layers = Array.from({ length: Math.max(0, ...design.symbols.map((s) => s.z)) + 2 }, (_, z) => z);

  // The selected part went to another layer (picked from a list, moved, undone): the view goes with it.
  const selectedZ = selected?.z;
  useEffect(() => {
    if (selectedZ !== undefined) setLayer(selectedZ);
  }, [selectedZ]);

  // Measuring is 2D only.
  useEffect(() => {
    if (view === '3d' && tool === 'measure') setTool('select');
  }, [view, tool]);

  /* ---------------------------------------------------------------- */
  /* Doing things                                                      */
  /* ---------------------------------------------------------------- */

  const openPanel = (id: PanelId) => {
    if (panel !== id) setPanel(id);
    if (panelState === 'collapsed') setPanelState('expanded');
  };
  /** A split view opens beside the canvas, on the sidebar's side when it is on the right: a floating panel there would cover it, so it steps back. */
  const stepAside = () => {
    if (prefs.sidebar === 'right' && panelState === 'expanded') setPanelState('collapsed');
  };

  /** The close-up opens beside the canvas. */
  const toggleCloseup = () => {
    if (!closeup) stepAside();
    setCloseup(!closeup);
  };
  /** Optimize takes the same place beside the canvas, with Properties open for the V on its rows. */
  const openOptimize = () => {
    stepAside();
    setSplit((f) => Math.min(f, 0.45));
    setPane('optimize');
    if (prefs.sidebar !== 'right') openPanel('properties');
  };
  /** Optimize on or off: in the workspace, the Optimize tab; on its own, a pane of the editor. */
  const toggleOptimize = () => {
    const on = pane !== 'optimize';
    if (onModeChange) onModeChange(on ? 'optimize' : 'view');
    else if (on) openOptimize();
    else setPane(null);
  };
  /** Choose parts takes the same place: from the sketch to real parts, one after the other. */
  const toggleChoose = () => {
    if (pane !== 'choose') stepAside();
    if (pane !== 'choose') setSplit((f) => Math.min(f, 0.5));
    setPane(pane === 'choose' ? null : 'choose');
  };
  const openChoose = () => pane !== 'choose' && toggleChoose();
  /** Simulate takes the same place: the light's checks, and the analyses behind them. */
  const toggleSimulate = () => {
    if (pane !== 'simulate') stepAside();
    if (pane !== 'simulate') setSplit((f) => Math.min(f, 0.55));
    setPane(pane === 'simulate' ? null : 'simulate');
  };
  // A link asks for a pane (the old Simulate tab): open it.
  useEffect(() => {
    if (openPane) setPane(openPane);
  }, [openPane]);
  // The Optimize tab opens the optimizer beside the canvas; View closes it.
  useEffect(() => {
    if (mode === 'optimize' && pane !== 'optimize') openOptimize();
    if (mode === 'view' && pane === 'optimize') setPane(null);
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps -- when the tab changes
  // In the Optimize tab, another pane in its place (or none) is a step back to View.
  const lastPane = useRef(pane);
  useEffect(() => {
    const was = lastPane.current;
    lastPane.current = pane;
    if (mode === 'optimize' && was === 'optimize' && pane !== 'optimize') onModeChange?.('view');
  }, [pane]); // eslint-disable-line react-hooks/exhaustive-deps -- when the pane changes
  /** An ideal part in the close-up: made real from the catalogue, or designed. */
  const [makeReal, setMakeReal] = useState<MakeReal>('catalogue');
  /** Optimize mode: the free variables (the pane's ticks and the V on Properties rows), and what the path being optimized offers. */
  const [free, setFree] = useState<VaryMap>({});
  const [optimizeGroups, setOptimizeGroups] = useState<PartVariables[]>([]);
  const [proposed, setProposed] = useState<Readonly<Record<string, number>> | null>(null);
  /** The Optimize tab's path, targets and runs: kept while the design is open. */
  const [optimizeSession, setOptimizeSession] = useState<OptimizeSession>(NEW_SESSION);
  const varying: Varying | undefined =
    pane === 'optimize' && optimizeGroups.length ? { groups: optimizeGroups, free, toggle: (v) => setFree((f) => toggled(f, v)), proposed: proposed ?? undefined } : undefined;
  /** Freeze: the holder is designed in the close-up, on the selected part (an ideal part: made real there, from the catalogue first). */
  const designHolder = (way: MakeReal = 'catalogue') => {
    setMakeReal(way);
    stepAside();
    setCloseup(true);
    // The designer takes a column of the close-up: give it room.
    setSplit((f) => Math.min(f, 0.42));
  };

  /** Select exactly these parts. Deselecting closes the properties, unless the panel is pinned. */
  const select = (ids: string[]) => {
    selection.set(ids);
    if (ids.length === 0 && panelState === 'expanded' && panel === 'properties') setPanelState('collapsed');
  };
  /** A double-click (or Enter) also opens the properties; inside a multi-selection it keeps the selection. */
  const inspect = (id: string) => {
    if (!selection.ids.includes(id)) select([id]);
    openPanel('properties');
  };
  /** The previous or next part, from the properties panel. */
  const step = (delta: -1 | 1) => {
    const all = design.symbols;
    const at = all.findIndex((s) => s.id === selectedId);
    if (all.length) select([all[(Math.max(at, 0) + delta + all.length) % all.length].id]);
  };

  /** Copies of some parts, `by` away, then selected. */
  const copy = (ids: string[], by?: { x?: number; y?: number; z?: number }) => {
    const result = copyParts(design, ids, by);
    edit(result.design);
    select(result.ids);
  };

  /** Parts dragged on a canvas (2D or 3D): moved along their free axes, or (Alt) copied there. One undo step. */
  const applyMove = ({ ids: moved, by, copy: asCopy }: Move) => (asCopy ? copy(moved, by) : edit((d) => moveParts(d, moved, by)));

  /** A library part on its way onto the canvas: picked (a click places it) or dragged out of a list. */
  const beginPlacing = (entry: PartEntry, drag: boolean) => {
    // A picked part closes the Add list; a dragged one leaves it to sink away and come back if the part is not dropped.
    if (!drag) setFlyout(null);
    select([]);
    setTool('select');
    setView('2d');
    placing.start(entry, drag);
  };
  const libraryEntry = (id: string) => LIBRARY.find((p) => p.id === id);
  /** The part being placed lands at `at` on the current layer; Ctrl keeps placing more of it. */
  const place = (at: { x: number; y: number }, more: boolean) => {
    const entry = placing.entry;
    if (!entry) return;
    const [id] = nextIds(design, 1);
    edit((d) => addParts(d, [newPart(entry, at, layer, id, demoInputs[entry.kind])]));
    placing.placed(more);
    setFlyout(null);
    if (!more) select([id]);
  };

  const move3d = (move: CameraMove) => setCamera3d((c) => ({ move, n: (c?.n ?? 0) + 1 }));
  const zoom2d = (command: ZoomCommand) => move3d(command);

  const ids = selection.ids;
  const actions: EditorActions = {
    undo: history.undo,
    redo: history.redo,
    deleteSelection: () => {
      edit((d) => removeParts(d, ids));
      select([]);
    },
    duplicateSelection: () => copy(ids),
    turnSelection: () => edit((d) => turnParts(d, ids)),
    nudgeSelection: (x, y) => edit((d) => moveParts(d, ids, { x, y })),
    layerSelection: (dz) => edit((d) => moveParts(d, ids, { z: dz })),
    mountAll: () => {
      edit((d) => mountAll(d, modulesFor));
      setFlyout(null);
    },

    selectPart: (id) => select([id]),
    selectAllOnLayer: () => select(design.symbols.filter((s) => s.z === layer).map((s) => s.id)),
    openProperties: () => openPanel('properties'),

    openAdd: () => setFlyout('add'),
    addPart: (entry) => beginPlacing(entry, false),

    setTool,
    setView,
    goToLayer: setLayer,
    toggleOption: (option) => setOptions({ ...options, [option]: options[option] === false }),
    setLabelSize: (labelSize) => updatePrefs({ labelSize }),
    fit: () => move3d('fit'),
    fitSelection: () => move3d('fitSelection'),
    zoomIn: () => move3d('in'),
    zoomOut: () => move3d('out'),
    actualSize: () => view === '2d' && move3d('actual'),

    openPanel,
    toggleCloseup,
    toggleOptimize,
    toggleChoose,
    toggleSimulate,
    openPalette: () => setPaletteOpen(true),
    openSettings: () => setSettingsOpen(true),

    escape: () => {
      if (placing.entry) placing.stop();
      else if (flyout) setFlyout(null);
      else if (tool !== 'select') setTool('select');
      else select([]);
    },
  };

  useShortcuts(actions, { view, hasSelection: ids.length > 0, paused: paletteOpen });
  // The design's light, traced at once; the paths that miss a part, for the status bar.
  const trace = useLight(design);
  const { light } = trace;
  const misses = light.misses.map((m) => `No light reaches ${m.label}`);

  const commands = paletteCommands(actions, { library: LIBRARY, symbols: design.symbols, layers, unmounted: unmounted.length, options });

  /* ---------------------------------------------------------------- */
  /* Layout                                                            */
  /* ---------------------------------------------------------------- */

  // Canvas callbacks, the same for 2D and 3D: a click (Shift or Ctrl toggles), a box, a double-click.
  const onCanvasSelect = (id: string | null, toggle?: boolean) => select(id ? (toggle ? selection.toggled(id) : [id]) : []);
  const onCanvasSelectMany = (picked: string[], add: boolean) => select(add ? selection.plus(picked) : picked);

  // Top left of the canvas: the 2D/3D switch and search. The tools and view options live in the dock.
  const toolbar = (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <CanvasToolbar view={view} onViewChange={setView} />
      <SearchButton onClick={actions.openPalette} />
    </Stack>
  );

  // The selection's floating actions, the same in 2D and 3D.
  const selectionActions = selected && (
    <SelectionActions
      parts={selection.parts}
      realizeOptions={modulesFor(selected.kind)}
      onUpdate={(patch) => edit((d) => updateParts(d, ids, patch))}
      onProperties={actions.openProperties}
      onDuplicate={actions.duplicateSelection}
      onDelete={actions.deleteSelection}
      onFreeze={() => designHolder()}
      onSnap={() => designHolder()}
    />
  );

  const hint2d = !placing.entry
    ? tool === 'select' && design.symbols.length === 0
      ? 'Drag a part from the sidebar onto the grid, or click one and then the grid · A to add one by name'
      : HINTS[tool]
    : placing.dragging
      ? `Let go to place ${placing.entry.label} on z${layer} · Shift: off the grid`
      : `Click to place ${placing.entry.label} on z${layer} · Shift: off the grid · Ctrl-click to place more · Esc to stop`;

  // An expanded sidebar panel floats over the canvas: the toolbar, the dock and the layer preview step aside for it.
  // On the right with a split view open, it floats over the split view, not the canvas.
  const sidebarRight = prefs.sidebar === 'right';
  const leftOut = !sidebarRight && panelState === 'expanded';
  const rightOut = sidebarRight && panelState === 'expanded' && !pane;
  /** How far an expanded panel reaches into the canvas, with its margin. */
  const panelReach = (t: Theme) => `(${t.spacing(t.layout.sidePanelWidth)} + ${t.spacing(1)})`;
  /** The middle of the canvas the panels leave free. */
  const freeCentre = (t: Theme) => `calc(50% + ${leftOut ? panelReach(t) : '0px'} / 2 - ${rightOut ? panelReach(t) : '0px'} / 2)`;
  // The hint, centred in the free canvas; a row lower when the left panel is out or the close-up narrows the canvas, so it clears the toolbar.
  const theme = useTheme();
  const hintPlace: HintPlace = {
    left: freeCentre(theme),
    top: theme.spacing(leftOut || pane ? 8.5 : 2.5),
    maxWidth: `calc(100% - ${leftOut ? panelReach(theme) : '0px'} - ${rightOut ? panelReach(theme) : '0px'} - ${theme.spacing(4)})`,
  };

  // The one sidebar: every panel, then the split views. On the edge Settings names.
  const panels = [
    ...leftPanels({
      design,
      name: projectName,
      palette: library.palette,
      libraryStatus: library.status,
      onReloadLibrary: library.reload,
      bom,
      selectedId,
      selectedIds: ids,
      onSelect: actions.selectPart,
      onSelectParts: (picked) => select(picked),
      placingId: placing.entry?.id,
      onPick: (id) => {
        const entry = libraryEntry(id);
        if (entry) beginPlacing(entry, false);
      },
      onDragStart: (id) => {
        const entry = libraryEntry(id);
        if (entry) beginPlacing(entry, true);
      },
      onDragEnd: placing.stop,
    }),
    ...rightPanels({
      design,
      selected,
      selectedParts: selection.parts,
      realizeOptions: selected ? modulesFor(selected.kind) : [],
      onChange: (patch: Partial<SchematicSymbol>) => selected && edit((d) => updateParts(d, [selected.id], () => patch)),
      onSelect: actions.selectPart,
      onStep: step,
      onDelete: actions.deleteSelection,
      unmounted: unmounted.length,
      onFreeze: () => designHolder(),
      onSnap: openChoose,
      onDesign: () => designHolder('design'),
      varying,
    }),
  ];
  const sidebar = (
    <SidePanel
      side={prefs.sidebar}
      aria-label="Sidebar"
      state={panelState}
      onStateChange={setPanelState}
      activeId={panel}
      onActiveChange={(id) => setPanel(id as PanelId)}
      items={PANEL_ORDER.flatMap((id) => panels.find((item) => item.id === id) ?? [])}
      railToggles={[
        { id: 'closeup', label: closeup ? 'Close the close-up' : 'Close-up: split the canvas to look at a part', icon: <CenterFocusStrongOutlinedIcon />, on: closeup, onToggle: toggleCloseup },
        {
          id: 'choose',
          label: pane === 'choose' ? 'Close Choose parts' : 'Choose parts: from the sketch to real parts',
          icon: <ChecklistOutlinedIcon />,
          on: pane === 'choose',
          onToggle: toggleChoose,
        },
        {
          id: 'simulate',
          label: pane === 'simulate' ? 'Close Simulate' : 'Simulate: check the light, split the canvas',
          icon: <InsightsOutlinedIcon />,
          on: pane === 'simulate',
          onToggle: toggleSimulate,
        },
        {
          id: 'optimize',
          label: pane === 'optimize' ? (onModeChange ? 'Back to View' : 'Close Optimize') : onModeChange ? 'Optimize: the Optimize tab' : 'Optimize: split the canvas',
          icon: <AutoFixHighOutlinedIcon />,
          on: pane === 'optimize',
          onToggle: toggleOptimize,
        },
      ]}
    />
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
      {showHeader && (
        <EditorHeader
          variant={headerVariant}
          projectName={projectName}
          version={version}
          user={user}
          onHome={onHome}
          onLogIn={onLogIn}
          onAccount={onAccount}
          onLogOut={onLogOut}
          onShowInfo={() => openPanel('info')}
          actions={headerActions}
        />
      )}

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {!sidebarRight && sidebar}

        <SplitPane
          aria-label="Resize the canvas and the close-up"
          fraction={split}
          onFraction={setSplit}
          first={
            <Box sx={{ position: 'relative', display: 'flex', flex: 1, minWidth: 0 }}>
              {/* One scene for both views: 2D is the same parts from the top, without perspective. */}
              <Suspense fallback={<Box sx={{ flex: 1, bgcolor: 'canvas.ground' }} />}>
                <DesignScene3D
                  schematic={design}
                  flat={view === '2d'}
                  layer={layer}
                  options={options}
                  prefs={prefs}
                  selectedIds={ids}
                  tool={tool}
                  snap={options.snapToGrid}
                  onMove={applyMove}
                  meshFor={library.meshFor}
                  glassFor={glassOf}
                  onSelect={onCanvasSelect}
                  onSelectMany={onCanvasSelectMany}
                  onInspect={inspect}
                  onPickComponent={(partId, key) => setCloseupFocus({ partId, key })}
                  command={camera3d}
                  hint={view === '3d' && !placing.entry ? HINT_3D : hint2d}
                  hintPlace={hintPlace}
                  selectionActions={selectionActions}
                  placing={placing.entry && { kind: placing.entry.kind, drag: placing.dragging }}
                  onPlace={place}
                  focusRay={pane === 'simulate' ? focusRay : null}
                  onZoom={setZoom}
                />
              </Suspense>

              {/* 2D or 3D, and search: top left, beside the left panel when it is out. */}
              <Box
                sx={(t) => ({
                  position: 'absolute',
                  top: t.spacing(1.5),
                  left: leftOut ? `calc(${t.spacing(t.layout.sidePanelWidth)} + ${t.spacing(3)})` : t.spacing(1.5),
                  zIndex: 3,
                  transition: `left ${STEP_ASIDE}`,
                })}
              >
                {toolbar}
              </Box>

              {/* The dock floats at the bottom of the canvas, CAD style, centred in the canvas the panels leave free. */}
              <Box
                onPointerEnter={() => setFront('dock')}
                onFocus={() => setFront('dock')}
                sx={(t) => ({
                  position: 'absolute',
                  left: freeCentre(t),
                  bottom: t.spacing(2),
                  transform: 'translateX(-50%)',
                  zIndex: front === 'dock' ? 2 : 1,
                  transition: `left ${STEP_ASIDE}`,
                })}
              >
                <ViewDock
                  view={view}
                  flyout={flyout}
                  onFlyout={setFlyout}
                  addPanel={<AddPartSearch parts={LIBRARY} recent={placing.recent} onPick={actions.addPart} onDragStart={(entry) => beginPlacing(entry, true)} onDragEnd={placing.stop} />}
                  dragging={placing.dragging}
                  canUndo={history.canUndo}
                  canRedo={history.canRedo}
                  onUndo={history.undo}
                  onRedo={history.redo}
                  tool={tool}
                  onTool={setTool}
                  options={options}
                  onOptions={setOptions}
                  zoom={zoom}
                  onZoom={zoom2d}
                  onCamera={move3d}
                  empty={design.symbols.length === 0}
                  unmounted={unmounted.map((s) => ({ id: s.id, label: s.placement.state === 'ideal' ? `${s.label} · ideal` : s.label }))}
                  onShowPart={(id) => {
                    setFlyout(null);
                    select([id]);
                  }}
                  onMountAll={actions.mountAll}
                />
              </Box>

              {/* Where the current layer sits in the whole design, in the corner. */}
              <Box
                onPointerEnter={() => setFront('layers')}
                onFocus={() => setFront('layers')}
                sx={(t) => ({
                  position: 'absolute',
                  right: rightOut ? `calc(${t.spacing(t.layout.sidePanelWidth)} + ${t.spacing(3)})` : t.spacing(2),
                  bottom: t.spacing(2),
                  zIndex: front === 'layers' ? 2 : 1,
                  transition: `right ${STEP_ASIDE}`,
                })}
              >
                <LayerPreview schematic={design} layers={layers} layer={layer} onLayer={setLayer} selectedIds={ids} crowded={rightOut || Boolean(pane)} />
              </Box>
            </Box>
          }
          second={
            pane === 'simulate' ? (
              <Suspense fallback={<Box sx={{ flex: 1, bgcolor: 'canvas.ground' }} />}>
                <SimulatePane
                  design={design}
                  light={light}
                  trace={trace}
                  selectedId={selected?.id ?? null}
                  onSelect={actions.selectPart}
                  onFocusRay={setFocusRay}
                  onOptimize={toggleOptimize}
                  onSendToOptiland={() => onNotice?.('In the app this opens the beam as an Optiland system, in its lens data editor (WP-354).')}
                  onClose={() => setPane(null)}
                />
              </Suspense>
            ) : pane === 'choose' ? (
              <Suspense fallback={<Box sx={{ flex: 1, bgcolor: 'canvas.ground' }} />}>
                <ChoosePane
                  design={design}
                  light={light}
                  choicesFor={service.choicesFor}
                  selectedId={selected?.id ?? null}
                  onSelect={actions.selectPart}
                  onChoose={(id, patch) => edit((d) => updateParts(d, [id], () => patch))}
                  onDesignHolder={(id) => {
                    select([id]);
                    designHolder();
                  }}
                  onDesignOwn={(id) => {
                    select([id]);
                    designHolder('design');
                  }}
                  onClose={() => setPane(null)}
                />
              </Suspense>
            ) : pane === 'optimize' ? (
              <Suspense fallback={<Box sx={{ flex: 1, bgcolor: 'canvas.ground' }} />}>
                <OptimizePane
                  design={design}
                  light={light}
                  onApply={(next) => edit(() => next)}
                  onSelect={actions.selectPart}
                  onClose={() => setPane(null)}
                  free={free}
                  onFree={setFree}
                  onGroups={setOptimizeGroups}
                  onProposed={setProposed}
                  session={optimizeSession}
                  onSession={setOptimizeSession}
                />
              </Suspense>
            ) : (
              closeup && (
                <Suspense fallback={<Box sx={{ flex: 1, bgcolor: 'canvas.ground' }} />}>
                  <Closeup
                    part={selected}
                    mesh={selected ? library.meshFor(selected) : undefined}
                    focus={selected && closeupFocus?.partId === selected.id ? closeupFocus.key : null}
                    onFocus={(key) => selected && setCloseupFocus({ partId: selected.id, key })}
                    onClose={() => setCloseup(false)}
                    opticFor={recordForPart}
                    cubeMesh={STORE_MESHES.empty}
                    onHolder={(spec) => selected && edit((d) => updateParts(d, [selected.id], (s) => ({ placement: frozen(s.placement, spec) })))}
                    candidatesFor={service.snapCandidates}
                    onSnap={({ record }) =>
                      selected && edit((d) => updateParts(d, [selected.id], (s) => snapped(s, record.vendor?.mpn ?? record.id, `${record.vendor?.name ?? 'Catalogue'} parts`, snappedValues(record))))
                    }
                    modules={selected ? modulesFor(selected.kind) : []}
                    onRealize={(option) => selected && edit((d) => updateParts(d, [selected.id], (s) => realize(s, option)))}
                    onDesign={(prescription) => selected && edit((d) => updateParts(d, [selected.id], (s) => designed(s, prescription, designedValues(prescription))))}
                    makeReal={makeReal}
                    wavelengths={wavelengths}
                    onPrescription={(prescription) => selected && edit((d) => updateParts(d, [selected.id], () => ({ prescription })))}
                  />
                </Suspense>
              )
            )
          }
        />

        {sidebarRight && sidebar}
      </Box>

      <EditorStatusBar
        design={design}
        selected={selected}
        selectedCount={ids.length}
        unmounted={unmounted.length}
        view={view}
        layer={layer}
        snap={options.snapToGrid}
        zoom={zoom}
        lightPaths={light.paths.length}
        misses={misses}
        trace={trace}
        onShowParts={() => openPanel('parts')}
      />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </Box>
  );
}
