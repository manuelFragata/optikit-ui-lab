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
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { demoInputs, demoModules, demoPalette, demoSchematic } from '../../demo/editorContent';
import { meshForPart } from '../../demo/meshes';
import { demoUser } from '../../demo/user';
import { usePreferences } from '../../settings/preferences';
import { useLightFor } from '../editor/light';
import { AddPartSearch, type PartEntry } from '../editor/AddPartSearch';
import { CanvasToolbar, DEFAULT_VIEW_OPTIONS, type CanvasTool, type EditorView, type ViewOptions } from '../editor/CanvasToolbar';
import { CommandPalette } from '../editor/CommandPalette';
import { LayerPreview } from '../editor/LayerPreview';
import type { Move, Schematic, SchematicSymbol } from '../editor/model';
import { SchematicCanvas, type Camera } from '../editor/SchematicCanvas';
import type { CameraCommand, CameraMove } from '../editor/scene3d/Camera';
import { SelectionActions } from '../editor/SelectionActions';
import { useHistory } from '../editor/useHistory';
import { ViewDock, type Detail, type Flyout, type ZoomCommand } from '../editor/ViewDock';
import { SidePanel, type SidePanelState } from '../panels/SidePanel';
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

// three.js and its helpers load only when the 3D view is first opened.
const DesignScene3D = lazy(() => import('../editor/scene3d/DesignScene3D').then((m) => ({ default: m.DesignScene3D })));

/** Every part the library offers, in one list for the Add search and the command palette. */
const LIBRARY: PartEntry[] = demoPalette.flatMap((g) => g.entries.map((e) => ({ ...e, mount: g.mount, source: g.label })));

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
  const [paletteOpen, setPaletteOpen] = useState(false);

  const { selected } = selection;
  const unmounted = design.symbols.filter((s) => s.placement.state === 'unmounted');
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
      edit((d) => mountAll(d, (kind) => demoModules[kind]));
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
  const misses = useLightFor()(design).misses.map((m) => `${m.ray.label} misses ${m.label}`);

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
      realizeOptions={demoModules[selected.kind]}
      onUpdate={(patch) => edit((d) => updateParts(d, ids, patch))}
      onProperties={actions.openProperties}
      onDuplicate={actions.duplicateSelection}
      onDelete={actions.deleteSelection}
    />
  );

  const hint2d = !placing.entry
    ? HINTS[tool]
    : placing.dragging
      ? `Let go to place ${placing.entry.label} on z${layer} · Shift: off the grid`
      : `Click to place ${placing.entry.label} on z${layer} · Shift: off the grid · Ctrl-click to place more · Esc to stop`;

  // The right panel floats over the canvas when expanded: the dock and the layer preview step aside for it.
  const panelOut = rightState === 'expanded';

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
          onShowHistory={() => openRight('history')}
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
            selectedId,
            onSelect: actions.selectPart,
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
                meshFor={meshForPart}
                onSelect={onCanvasSelect}
                onSelectMany={onCanvasSelectMany}
                onInspect={inspect}
                command={camera3d}
                toolbar={toolbar}
                hint={HINT_3D}
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
              view={view}
              layer={layer}
              options={options}
              prefs={prefs}
              hint={hint2d}
              hintAt="top"
              toolbar={toolbar}
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

          {/* The dock floats at the bottom of the canvas, CAD style, centred in the canvas the panel leaves free. */}
          <Box
            sx={(t) => ({
              position: 'absolute',
              left: panelOut ? `calc(50% - (${t.spacing(t.layout.sidePanelWidth)} + ${t.spacing(1)}) / 2)` : '50%',
              bottom: t.spacing(2),
              transform: 'translateX(-50%)',
              zIndex: 2,
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
              unmounted={unmounted.map((s) => ({ id: s.id, label: s.label }))}
              onShowPart={(id) => {
                setFlyout(null);
                select([id]);
              }}
              onMountAll={actions.mountAll}
            />
          </Box>

          {/* Where the current layer sits in the whole design, in the corner. */}
          <Box
            sx={(t) => ({
              position: 'absolute',
              right: panelOut ? `calc(${t.spacing(t.layout.sidePanelWidth)} + ${t.spacing(3)})` : t.spacing(2),
              bottom: t.spacing(2),
              zIndex: 1,
              transition: `right ${STEP_ASIDE}`,
            })}
          >
            <LayerPreview schematic={design} layers={layers} layer={layer} onLayer={setLayer} selectedIds={ids} crowded={panelOut} />
          </Box>
        </Box>

        <SidePanel
          side="right"
          aria-label="Inspector"
          state={rightState}
          onStateChange={setRightState}
          activeId={rightPanel}
          onActiveChange={(id) => setRightPanel(id as RightPanelId)}
          items={rightPanels({
            design,
            selected,
            selectedParts: selection.parts,
            realizeOptions: selected ? demoModules[selected.kind] : [],
            onChange: (patch: Partial<SchematicSymbol>) => selected && edit((d) => updateParts(d, [selected.id], () => patch)),
            onSelect: actions.selectPart,
            onStep: step,
            onDelete: actions.deleteSelection,
            unmounted: unmounted.length,
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
