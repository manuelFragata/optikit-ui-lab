import type { PartEntry } from '../../editor/AddPartSearch';
import type { ViewOptions } from '../../editor/viewOptions';
import type { Command } from '../../editor/CommandPalette';
import type { SchematicSymbol } from '../../editor/model';
import type { EditorActions } from './actions';

export interface PaletteData {
  /** Everything the library offers. */
  library: PartEntry[];
  symbols: SchematicSymbol[];
  layers: number[];
  unmounted: number;
  options: ViewOptions;
}

/** Everything the command palette (Ctrl K) lists, grouped, each calling one of the editor's actions. */
export function paletteCommands(a: EditorActions, { library, symbols, layers, unmounted, options }: PaletteData): Command[] {
  const onOff = (on: boolean | undefined, what: string) => `${on === false ? 'Show' : 'Hide'} ${what}`;
  return [
    ...library.map((p) => ({ id: `add-${p.id}`, group: 'Add part', label: `Add ${p.label}`, run: () => a.addPart(p) })),
    ...symbols.map((s) => ({ id: `go-${s.id}`, group: 'Go to part', label: `${s.label} · ${s.id} · z${s.z}`, run: () => a.selectPart(s.id) })),
    ...layers.map((z) => ({ id: `layer-${z}`, group: 'Go to layer', label: `Layer z${z}`, run: () => a.goToLayer(z) })),

    { id: 'undo', group: 'Edit', label: 'Undo', shortcut: 'Ctrl Z', run: a.undo },
    { id: 'redo', group: 'Edit', label: 'Redo', shortcut: 'Ctrl Shift Z', run: a.redo },
    ...(unmounted ? [{ id: 'mount-all', group: 'Edit', label: `Mount all ${unmounted} unmounted parts`, run: a.mountAll }] : []),

    { id: 'tool-select', group: 'Tools', label: 'Select', shortcut: 'V', run: () => a.setTool('select') },
    { id: 'tool-pan', group: 'Tools', label: 'Pan', shortcut: 'H', run: () => a.setTool('pan') },
    { id: 'tool-zoom', group: 'Tools', label: 'Zoom', shortcut: 'Z', run: () => a.setTool('zoom') },
    { id: 'tool-measure', group: 'Tools', label: 'Measure (2D)', shortcut: 'M', run: () => a.setTool('measure') },

    { id: 'view-2d', group: 'View', label: 'Switch to 2D', run: () => a.setView('2d') },
    { id: 'view-3d', group: 'View', label: 'Switch to 3D', run: () => a.setView('3d') },
    { id: 'fit', group: 'View', label: 'Fit the design', shortcut: 'F', run: a.fit },
    { id: 'fit-selection', group: 'View', label: 'Fit the selection', shortcut: 'Shift F', run: a.fitSelection },
    { id: 'zoom-in', group: 'View', label: 'Zoom in', shortcut: '+', run: a.zoomIn },
    { id: 'zoom-out', group: 'View', label: 'Zoom out', shortcut: '−', run: a.zoomOut },
    { id: 'part-labels', group: 'View', label: onOff(options.showPartLabels, 'part labels'), run: () => a.toggleOption('showPartLabels') },
    ...(['small', 'medium', 'large'] as const).map((size) => ({ id: `labels-${size}`, group: 'View', label: `Labels: ${size}`, run: () => a.setLabelSize(size) })),
    { id: 'rays', group: 'View', label: onOff(options.showRays, 'rays'), run: () => a.toggleOption('showRays') },
    { id: 'labels', group: 'View', label: onOff(options.showRayLabels, 'ray labels'), run: () => a.toggleOption('showRayLabels') },
    { id: 'cages', group: 'View', label: onOff(options.showCages, 'cube cages'), run: () => a.toggleOption('showCages') },
    { id: 'onion', group: 'View', label: onOff(options.onionSkin, 'the other layers'), run: () => a.toggleOption('onionSkin') },
    { id: 'snap', group: 'View', label: options.snapToGrid ? 'Turn snap to grid off' : 'Turn snap to grid on', run: () => a.toggleOption('snapToGrid') },

    { id: 'panel-palette', group: 'Panels', label: 'Open the parts library', run: () => a.openPanel('palette') },
    { id: 'panel-layers', group: 'Panels', label: 'Open layers', run: () => a.openPanel('layers') },
    { id: 'panel-parts', group: 'Panels', label: 'Open the parts list', run: () => a.openPanel('parts') },
    { id: 'panel-bom', group: 'Panels', label: 'Open the bill of materials', run: () => a.openPanel('bom') },
    { id: 'panel-info', group: 'Panels', label: 'Open design info', run: () => a.openPanel('info') },
    { id: 'closeup', group: 'Panels', label: 'Look at a part up close (split the canvas)', run: a.toggleCloseup },
    { id: 'choose', group: 'Panels', label: 'Choose real parts for the sketch (split the canvas)', run: a.toggleChoose },
    { id: 'simulate', group: 'Panels', label: 'Simulate: check the light (split the canvas)', run: a.toggleSimulate },
    { id: 'optimize', group: 'Panels', label: 'Optimize (split the canvas)', run: a.toggleOptimize },
    { id: 'settings', group: 'Panels', label: 'Open settings', shortcut: 'Ctrl ,', run: a.openSettings },
  ];
}
