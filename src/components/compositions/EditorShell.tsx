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
import { useTheme, type Theme } from '@mui/material/styles';
import { demoInputs, demoSchematic, demoSketch } from '../../demo/editorContent';
import { useLibrary, type PaletteGroup } from '../../ports/library';
import { snappedValues } from '../editor/holders/optic';
import { useService } from '../../ports/service';
import { STORE_MESHES } from '../../demo/assemblies';
import { demoUser } from '../../demo/user';
import { usePreferences } from '../../settings/preferences';
import { useLightFor } from '../../ports/light';
import { AddPartSearch, type PartEntry } from '../editor/AddPartSearch';
import { CanvasToolbar } from '../editor/CanvasToolbar';
import { DEFAULT_VIEW_OPTIONS, type CanvasTool, type EditorView, type HintPlace, type ViewOptions } from '../editor/viewOptions';
import { CommandPalette } from '../editor/CommandPalette';
import { LayerPreview } from '../editor/LayerPreview';
import { designed, frozen, realize, snapped, type Move, type Schematic, type SchematicSymbol } from '../editor/model';
import { designedValues, recordOf } from '../editor/holders/designs';
import { SchematicCanvas, type Camera } from '../editor/SchematicCanvas';
import type { CameraCommand, CameraMove } from '../editor/scene3d/Camera';
import { SelectionActions } from '../editor/SelectionActions';
import { useHistory } from '../editor/useHistory';
import { ViewDock, type Detail, type Flyout, type ZoomCommand } from '../editor/ViewDock';
import { SidePanel, type SidePanelState } from '../panels/SidePanel';
import { SplitPane } from '../panels/SplitPane';
import type { AccountUser } from './AccountMenu';
import type { HeaderVariant } from './AppHeader';
import type { EditorActions, LeftPanelId, RightPanelId } from './editor/actions';
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

export type { LeftPanelId, RightPanelId };

// three.js and its helpers load only when the 3D view (or the close-up) is first opened.
const DesignScene3D = lazy(() => import('../editor/scene3d/DesignScene3D').then((m) => ({ default: m.DesignScene3D })));
const Closeup = lazy(() => import('../editor/scene3d/Closeup').then((m) => ({ default: m.Closeup })));
const OptimizePane = lazy(() => import('../editor/optimize/OptimizePane').then((m) => ({ default: m.OptimizePane })));
const ChoosePane = lazy(() => import('../editor/choose/ChoosePane').then((m) => ({ default: m.ChoosePane })));

/** The sketch's entries, as parts to place. */
const SKETCH: PartEntry[] = demoSketch.flatMap((g) =>
  g.entries.map((e) => {
    const mount = e.mount ?? ('ideal' as const);
    const label = mount === 'ideal' && !/^Ideal /.test(e.label) ? `Ideal ${e.label.toLowerCase()}` : e.label;
    return { id: e.id, kind: e.kind, inputs: e.inputs, prescription: e.prescription, label, mount, source: 'Sketch' };
  }),
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

/** How the right panel's slide-in is eased, for the dock and the layer preview stepping aside. */
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

  /** Left panel (library, layers, parts, files). Controlled if set; otherwise `defaultLeftState`. */
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

export function EditorShell({
  showHeader = true,
  headerVariant = 'light',
  projectName = 'BF+Fluor FRAME Optical Core',
  version = '0.4.2',
  user = demoUser,
  schematic: initialDesign = demoSchematic,
  onDesignChange,
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
  /* ---------------------------------------------------------------- */
  /* State                                                             */
  /* ---------------------------------------------------------------- */

  // Panels, view and selection can be controlled from outside (stories, the workspace).
  const [leftState, setLeftState] = useControllable(leftStateProp, defaultLeftState, onLeftStateChange);
  const [leftPanel, setLeftPanel] = useControllable(leftPanelProp, defaultLeftPanel, onLeftPanelChange);
  const [rightState, setRightState] = useControllable(rightStateProp, defaultRightState, onRightStateChange);
  const [rightPanel, setRightPanel] = useControllable(rightPanelProp, defaultRightPanel, onRightPanelChange);
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
  const [detail, setDetail] = useState<Detail>('solids');
  const [camera2d, setCamera2d] = useState<Camera | 'fit'>('fit');
  // The 3D camera moves on commands; `n` counts them, so the same one can repeat.
  const [camera3d, setCamera3d] = useState<CameraCommand>();
  const [flyout, setFlyout] = useState<Flyout | null>(null);
  // On a narrow canvas the dock and the layer preview overlap: the one the pointer or focus is on comes to the front.
  const [front, setFront] = useState<'dock' | 'layers'>('dock');
  const [paletteOpen, setPaletteOpen] = useState(false);
  // The close-up: the canvas split, the selected part beside it; the component picked in it, for that part.
  // What the split's second pane holds: the close-up, Optimize, Choose parts, or nothing (the canvas alone).
  const [pane, setPane] = useState<'closeup' | 'optimize' | 'choose' | null>(null);
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
  const bom = useMemo(() => service.bom(design), [service, design]);
  // The design's sources' wavelengths, for the close-up's Optical side.
  const wavelengths = [...new Set(design.symbols.flatMap((s) => (s.kind === 'laser' ? (s.inputs ?? []).filter((i) => i.label === 'Wavelength').map((i) => i.value) : [])))].sort((a, b) => a - b);
  // Every part not in a cube yet: the ideal ones (sketched) and the unmounted ones (no holder).
  const unmounted = design.symbols.filter((s) => s.placement.state !== 'in-cube');
  // Every layer from the ground to one above the highest part, so there is always a free layer to stack into.
  const layers = Array.from({ length: Math.max(0, ...design.symbols.map((s) => s.z)) + 2 }, (_, z) => z);
  const zoom = typeof camera2d === 'object' ? camera2d.zoom : 1;

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

  const openLeft = (id: LeftPanelId) => {
    setLeftPanel(id);
    if (leftState === 'collapsed') setLeftState('expanded');
  };
  const openRight = (id: RightPanelId) => {
    if (rightPanel !== id) setRightPanel(id);
    if (rightState === 'collapsed') setRightState('expanded');
  };

  /** The close-up opens beside the canvas; the floating inspector would cover it, so it steps back. */
  const toggleCloseup = () => {
    if (!closeup && rightState === 'expanded') setRightState('collapsed');
    setCloseup(!closeup);
  };
  /** Optimize takes the same place beside the canvas. */
  const toggleOptimize = () => {
    if (pane !== 'optimize' && rightState === 'expanded') setRightState('collapsed');
    if (pane !== 'optimize') setSplit((f) => Math.min(f, 0.45));
    setPane(pane === 'optimize' ? null : 'optimize');
  };
  /** Choose parts takes the same place: from the sketch to real parts, one after the other. */
  const toggleChoose = () => {
    if (pane !== 'choose' && rightState === 'expanded') setRightState('collapsed');
    if (pane !== 'choose') setSplit((f) => Math.min(f, 0.5));
    setPane(pane === 'choose' ? null : 'choose');
  };
  const openChoose = () => pane !== 'choose' && toggleChoose();
  /** Freeze: the holder is designed in the close-up, on the selected part. */
  const designHolder = () => {
    if (rightState === 'expanded') setRightState('collapsed');
    setCloseup(true);
    // The designer takes a column of the close-up: give it room.
    setSplit((f) => Math.min(f, 0.42));
  };

  /** Select exactly these parts. Deselecting closes the properties, unless the panel is pinned. */
  const select = (ids: string[]) => {
    selection.set(ids);
    if (ids.length === 0 && rightState === 'expanded' && rightPanel === 'properties') setRightState('collapsed');
  };
  /** A double-click (or Enter) also opens the properties; inside a multi-selection it keeps the selection. */
  const inspect = (id: string) => {
    if (!selection.ids.includes(id)) select([id]);
    openRight('properties');
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

  const zoom2d = (command: ZoomCommand) => {
    if (command === 'fit' || typeof camera2d !== 'object') return setCamera2d('fit');
    const next = command === 'actual' ? 1 : command === 'in' ? zoom * 1.25 : zoom / 1.25;
    setCamera2d({ ...camera2d, zoom: Math.min(5, Math.max(0.2, next)) });
  };
  const move3d = (move: CameraMove) => setCamera3d((c) => ({ move, n: (c?.n ?? 0) + 1 }));

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
    openProperties: () => openRight('properties'),

    openAdd: () => setFlyout('add'),
    addPart: (entry) => beginPlacing(entry, false),

    setTool,
    setView,
    goToLayer: setLayer,
    toggleOption: (option) => setOptions({ ...options, [option]: options[option] === false }),
    setLabelSize: (labelSize) => updatePrefs({ labelSize }),
    fit: () => (view === '3d' ? move3d('fit') : zoom2d('fit')),
    fitSelection: () => (view === '3d' ? move3d('fitSelection') : zoom2d('fit')),
    zoomIn: () => (view === '3d' ? move3d('in') : zoom2d('in')),
    zoomOut: () => (view === '3d' ? move3d('out') : zoom2d('out')),
    actualSize: () => view === '2d' && zoom2d('actual'),

    openLeft,
    openRight,
    toggleCloseup,
    toggleOptimize,
    toggleChoose,
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
  // Light paths that miss a part, for the status bar.
  const lightFor = useLightFor();
  const light = useMemo(() => lightFor(design), [lightFor, design]);
  const misses = light.misses.map((m) => `${m.ray.label} misses ${m.label}`);

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
      onFreeze={designHolder}
      onSnap={designHolder}
    />
  );

  const hint2d = !placing.entry
    ? HINTS[tool]
    : placing.dragging
      ? `Let go to place ${placing.entry.label} on z${layer} · Shift: off the grid`
      : `Click to place ${placing.entry.label} on z${layer} · Shift: off the grid · Ctrl-click to place more · Esc to stop`;

  // An expanded side panel floats over the canvas: the toolbar, the dock and the layer preview step aside for it.
  const leftOut = leftState === 'expanded';
  // With the close-up open, the right panel floats over the close-up, not the canvas.
  const rightOut = rightState === 'expanded' && !pane;
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
          onShowInfo={() => openRight('info')}
          actions={headerActions}
        />
      )}

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <SidePanel
          aria-label="Design tools"
          state={leftState}
          onStateChange={setLeftState}
          activeId={leftPanel}
          onActiveChange={(id) => setLeftPanel(id as LeftPanelId)}
          items={leftPanels({
            design,
            name: projectName,
            palette: library.palette,
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
          })}
        />

        <SplitPane
          aria-label="Resize the canvas and the close-up"
          fraction={split}
          onFraction={setSplit}
          first={
            <Box sx={{ position: 'relative', display: 'flex', flex: 1, minWidth: 0 }}>
              {view === '3d' ? (
                <Suspense fallback={<Box sx={{ flex: 1, bgcolor: 'canvas.ground' }} />}>
                  <DesignScene3D
                    schematic={design}
                    layer={layer}
                    options={options}
                    prefs={prefs}
                    fidelity={detail}
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
                    hint={HINT_3D}
                    hintPlace={hintPlace}
                    selectionActions={selectionActions}
                  />
                </Suspense>
              ) : (
                <SchematicCanvas
                  schematic={design}
                  selectedId={selectedId}
                  selectedIds={ids}
                  onSelect={onCanvasSelect}
                  onSelectMany={onCanvasSelectMany}
                  onInspect={inspect}
                  opticFor={glassOf}
                  view={view}
                  layer={layer}
                  options={options}
                  prefs={prefs}
                  hint={hint2d}
                  hintAt="top"
                  hintPlace={hintPlace}
                  camera={camera2d}
                  onCamera={setCamera2d}
                  tool={tool}
                  placing={placing.entry && { kind: placing.entry.kind, drag: placing.dragging }}
                  onPlace={place}
                  onMove={applyMove}
                  snap={options.snapToGrid}
                  selectionActions={selectionActions}
                />
              )}

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
                  detail={detail}
                  onDetail={setDetail}
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
            pane === 'choose' ? (
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
                  onClose={() => setPane(null)}
                />
              </Suspense>
            ) : pane === 'optimize' ? (
              <Suspense fallback={<Box sx={{ flex: 1, bgcolor: 'canvas.ground' }} />}>
                <OptimizePane design={design} light={light} recordFor={recordForPart} onApply={(next) => edit(() => next)} onSelect={actions.selectPart} onClose={() => setPane(null)} />
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
                  onSnap={({ record }) => selected && edit((d) => updateParts(d, [selected.id], (s) => snapped(s, record.vendor?.mpn ?? record.id, `${record.vendor?.name ?? 'Catalogue'} parts`, snappedValues(record))))}
                  modules={selected ? modulesFor(selected.kind) : []}
                  onRealize={(option) => selected && edit((d) => updateParts(d, [selected.id], (s) => realize(s, option)))}
                  onDesign={(prescription) => selected && edit((d) => updateParts(d, [selected.id], (s) => designed(s, prescription, designedValues(prescription))))}
                  wavelengths={wavelengths}
                  onPrescription={(prescription) => selected && edit((d) => updateParts(d, [selected.id], () => ({ prescription })))}
                />
              </Suspense>
            )
            )
          }
        />

        <SidePanel
          side="right"
          aria-label="Inspector"
          state={rightState}
          onStateChange={setRightState}
          activeId={rightPanel}
          onActiveChange={(id) => setRightPanel(id as RightPanelId)}
          railToggles={[
            { id: 'closeup', label: closeup ? 'Close the close-up' : 'Close-up: split the canvas to look at a part', icon: <CenterFocusStrongOutlinedIcon />, on: closeup, onToggle: toggleCloseup },
            {
              id: 'choose',
              label: pane === 'choose' ? 'Close Choose parts' : 'Choose parts: from the sketch to real parts',
              icon: <ChecklistOutlinedIcon />,
              on: pane === 'choose',
              onToggle: toggleChoose,
            },
            { id: 'optimize', label: pane === 'optimize' ? 'Close Optimize' : 'Optimize: split the canvas', icon: <AutoFixHighOutlinedIcon />, on: pane === 'optimize', onToggle: toggleOptimize },
          ]}
          items={rightPanels({
            design,
            selected,
            selectedParts: selection.parts,
            realizeOptions: selected ? modulesFor(selected.kind) : [],
            onChange: (patch: Partial<SchematicSymbol>) => selected && edit((d) => updateParts(d, [selected.id], () => patch)),
            onSelect: actions.selectPart,
            onStep: step,
            onDelete: actions.deleteSelection,
            unmounted: unmounted.length,
            onFreeze: designHolder,
            onSnap: openChoose,
          })}
        />
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
        misses={misses}
        onShowParts={() => openLeft('parts')}
      />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </Box>
  );
}
