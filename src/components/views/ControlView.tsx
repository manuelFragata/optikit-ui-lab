/**
 * Control (UI-V4 §2; optikit-v2 WP-378): the electronics of the open design.
 * The device tree from the computer to each device, and which design input
 * each motor moves, so that "Z plus" in NewSwitch moves the right motor. The
 * canvas shows it as cards and cables, and the cards can be moved
 * (control/WiringCanvas). The panel beside it shows it as fields
 * (control/WiringInspector).
 *
 * From here the design goes to the instrument: the NewSwitch config it makes,
 * and a check of what the running instrument has (WP-401c, WP-317).
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import RedoIcon from '@mui/icons-material/Redo';
import UndoIcon from '@mui/icons-material/Undo';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useElectronics, type ControlEntry, type Inventory } from '../../ports/electronics';
import { useRequest } from '../../ports/request';
import { canJoin, join, portKey, type Port } from '../control/connections';
import { connectionKey, inputKey, layoutWiring, positionsOf, snap, SNAP, type Point } from '../control/layout';
import { WiringCanvas, type WiringSelection } from '../control/WiringCanvas';
import { WiringInspector } from '../control/WiringInspector';
import {
  addControlPart,
  addInput,
  connect,
  disconnect,
  inputCard,
  KIND_DEFAULTS,
  moveCard,
  nextControlId,
  pinCards,
  removeControlPart,
  removeInput,
  renameInput,
  ROOT,
  setDeviceId,
  setInput,
  setKind,
  setSettings,
  tidyCards,
  wiringOf,
  wiringView,
} from '../control/wiring';
import type { Schematic } from '../editor/model';
import { useHistory } from '../editor/useHistory';
import { download } from '../primitives/download';
import { Failed, Waiting } from '../primitives/RequestState';

export interface ControlViewProps {
  designName: string;
  version?: string;
  design: Schematic;
  /** The design after each change (and undo), so the other tabs show it. */
  onDesignChange?: (design: Schematic) => void;
  /** Tell the person what happened. */
  onNotice?: (text: string) => void;
}

const INSPECTOR_W = 340;

/** What the instrument said, in a line: ready, not answering, not in the design. */
function inventoryLine(inv: Inventory, ids: Set<string>) {
  const said = Object.entries(inv.devices);
  const ours = said.filter(([id]) => ids.has(id));
  const ready = ours.filter(([, s]) => s.state === 'ready').length;
  const failing = ours.filter(([, s]) => s.state === 'error').length;
  const extra = said.filter(([id]) => !ids.has(id)).map(([id]) => id);
  const missing = [...ids].filter((id) => !inv.devices[id]).length;
  return [
    `${inv.instrument}: ${ready} ready`,
    failing && `${failing} not answering`,
    missing && `${missing} of the design’s not there`,
    extra.length && `on it, not in the design: ${extra.join(', ')}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** A keyboard event from a field the person types in: the canvas keys leave it alone. */
const typing = (e: KeyboardEvent) => e.target instanceof HTMLElement && (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName));

export function ControlView({ designName, version, design: initialDesign, onDesignChange, onNotice }: ControlViewProps) {
  const electronics = useElectronics();
  const history = useHistory(initialDesign);
  const design = history.value;
  const edit = history.set;
  // Every change and undo is news; the design it opened with is not.
  const opening = useRef(true);
  useEffect(() => {
    if (opening.current) opening.current = false;
    else onDesignChange?.(design);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new design is news; the callback may be new each render
  }, [design]);

  const view = useMemo(() => wiringView(design, electronics.modelOf), [design, electronics.modelOf]);
  const placed = useMemo(() => layoutWiring(view, wiringOf(design).positions), [view, design]);
  // A card on its way: the cables follow it, and the undo step comes when it stops.
  const [drag, setDrag] = useState<{ key: string; at: Point } | null>(null);
  const layout = useMemo(() => (drag ? layoutWiring(view, { ...positionsOf(placed), [drag.key]: drag.at }) : placed), [view, placed, drag]);
  /** One undo step. Every card stays where it is now, so that an edit moves none of them. */
  const change = (fn: (d: Schematic) => Schematic) => edit((d) => fn(pinCards(d, positionsOf(placed))));
  const [selection, setSelection] = useState<WiringSelection>(null);
  const [pending, setPending] = useState<Port | null>(null);
  const [addAt, setAddAt] = useState<HTMLElement | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  // The instrument is asked when the person says so, about the design as it was then.
  const [checked, setChecked] = useState<Schematic | null>(null);
  const inventory = useRequest(checked, electronics.inventory);
  const config = useRequest(configOpen ? design : null, electronics.config);

  const deviceIds = new Set([...view.boards.map((b) => b.deviceId), ...view.carriers.flatMap((c) => c.devices.map((d) => d.deviceId))]);

  /** A port clicked: the first end of a cable, or the second; a port that does not fit starts over from it. */
  const onPort = (p: Port) => {
    if (!pending) return setPending(p);
    if (portKey(p) === portKey(pending)) return setPending(null);
    if (!canJoin(view, pending, p)) return setPending(p);
    change((d) => join(d, view, pending, p));
    setPending(null);
  };

  /** Where a cable's key points. */
  const cableEnds = (key: string) => {
    const [part, device] = key.slice(2).split('/');
    return { part, device: device || null };
  };
  const disconnectSelected = () => {
    if (selection?.kind !== 'cable') return;
    const { part, device } = cableEnds(selection.key);
    const axis = view.carriers.find((c) => c.id === part)?.devices.find((d) => d.device.key === device)?.device.axis;
    if (selection.key === connectionKey(part, device)) change((d) => disconnect(d, part, device));
    else if (device && selection.key === inputKey(part, device) && axis) change((d) => setInput(d, part, axis.name, undefined));
    setSelection(null);
  };

  const add = (entry: ControlEntry) => {
    setAddAt(null);
    const id = nextControlId(design);
    const same = wiringOf(design).parts.filter((p) => p.module === entry.module).length;
    change((d) => addControlPart(d, { id, label: same ? `${entry.module} ${same + 1}` : entry.module, module: entry.module, source: entry.source }));
    setSelection({ kind: 'part', id });
  };
  const addNewInput = (name = 'input', bindTo?: { partId: string; axis: string }) => {
    const made = addInput(pinCards(design, positionsOf(placed)), { name, unit: 'mm' });
    edit(bindTo ? setInput(made.design, bindTo.partId, bindTo.axis, made.name) : made.design);
    if (!bindTo) setSelection({ kind: 'input', name: made.name });
    return made.name;
  };

  /** The selected card moved by the arrow keys, from where it is now. */
  const nudge = (dx: number, dy: number) => {
    const key = selection?.kind === 'part' ? selection.id : selection?.kind === 'input' ? inputCard(selection.name) : null;
    const at = key ? positionsOf(placed)[key] : undefined;
    if (key && at) change((d) => moveCard(d, key, { x: snap(at.x + dx), y: snap(at.y + dy) }));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (typing(e)) return;
    const mod = e.ctrlKey || e.metaKey;
    const arrow = ({ ArrowLeft: [-SNAP, 0], ArrowRight: [SNAP, 0], ArrowUp: [0, -SNAP], ArrowDown: [0, SNAP] } as Record<string, number[]>)[e.key];
    if (e.key === 'Escape') {
      if (pending) setPending(null);
      else setSelection(null);
    } else if (arrow && selection && selection.kind !== 'cable') {
      e.preventDefault();
      nudge(arrow[0], arrow[1]);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && selection?.kind === 'cable') {
      e.preventDefault();
      disconnectSelected();
    } else if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) history.redo();
      else history.undo();
    } else if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      history.redo();
    }
  };

  const controllers = electronics.catalogue.filter((c) => c.role === 'controller');
  const motion = electronics.catalogue.filter((c) => c.role === 'devices');
  const problems = view.problems.filter((p) => p.level === 'error').length;

  return (
    <Box onKeyDown={onKeyDown} sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Stack
        direction="row"
        useFlexGap
        sx={{ flexShrink: 0, alignItems: 'center', gap: 1.5, flexWrap: 'wrap', px: 2, py: 1, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}
      >
        <Box sx={{ minWidth: 0, mr: 'auto' }}>
          <Typography variant="h2" component="h1" noWrap>
            Wiring{' '}
            <Typography component="span" variant="meta" color="text.meta">
              {designName}
              {version ? ` v${version}` : ''}
            </Typography>
          </Typography>
          <Typography variant="meta" color={problems ? 'error.main' : 'text.meta'}>
            {view.count.wired} of {view.count.devices} wired
            {problems ? ` · ${problems} to fix` : ''}
            {inventory.data && checked ? ` · checked ${inventoryLine(inventory.data, deviceIds)}` : ''}
          </Typography>
        </Box>
        <Tooltip title="Undo (Ctrl Z)">
          <span>
            <IconButton size="small" aria-label="Undo" disabled={!history.canUndo} onClick={history.undo}>
              <UndoIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Redo (Ctrl Shift Z)">
          <span>
            <IconButton size="small" aria-label="Redo" disabled={!history.canRedo} onClick={history.redo}>
              <RedoIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Put the cards back in tree order">
          <span>
            <Button disabled={!wiringOf(design).positions} onClick={() => edit(tidyCards)}>
              Tidy
            </Button>
          </span>
        </Tooltip>
        <Button startIcon={<AddIcon />} onClick={(e) => setAddAt(e.currentTarget)} aria-haspopup="menu">
          Add
        </Button>
        <Menu anchorEl={addAt} open={Boolean(addAt)} onClose={() => setAddAt(null)}>
          <ListSubheader>Boards</ListSubheader>
          {controllers.map((c) => (
            <MenuItem key={c.module} onClick={() => add(c)}>
              <ListItemText primary={c.module} secondary={c.detail} />
            </MenuItem>
          ))}
          <ListSubheader>Motion and light</ListSubheader>
          {motion.map((c) => (
            <MenuItem key={c.module} onClick={() => add(c)}>
              <ListItemText primary={c.module} secondary={c.detail} />
            </MenuItem>
          ))}
          <ListSubheader>The design</ListSubheader>
          <MenuItem
            onClick={() => {
              setAddAt(null);
              addNewInput();
            }}
          >
            <ListItemText primary="Design input" secondary="A value a motor moves, read by the parts’ poses" />
          </MenuItem>
        </Menu>
        <Button variant="outlined" disabled={inventory.status === 'loading' && checked !== null} onClick={() => setChecked({ ...design })}>
          {inventory.status === 'loading' && checked ? 'Asking the instrument…' : 'Check the instrument'}
        </Button>
        <Button variant="contained" onClick={() => setConfigOpen(true)}>
          NewSwitch config
        </Button>
      </Stack>

      {inventory.status === 'error' && checked && <Failed message={inventory.error ?? ''} onRetry={inventory.retry} sx={{ m: 1.5, mb: 0 }} />}

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Box
          sx={{ flex: 1, minWidth: 0, overflow: 'auto', bgcolor: 'canvas.ground', outline: 'none' }}
          tabIndex={-1}
          aria-label={pending ? 'Wiring: choose the port to join to' : 'Wiring'}
        >
          {view.count.devices === 0 ? (
            <Stack sx={{ alignItems: 'center', justifyContent: 'center', height: '100%', p: 4, gap: 1, textAlign: 'center' }}>
              <Typography variant="h3">No electronics yet</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
                Add a board, then a stage or a light. Lasers and cameras from the library come with their devices.
              </Typography>
              <Button startIcon={<AddIcon />} onClick={(e) => setAddAt(e.currentTarget)} sx={{ mt: 1 }}>
                Add
              </Button>
            </Stack>
          ) : (
            <WiringCanvas
              view={view}
              layout={layout}
              selection={selection}
              onSelect={setSelection}
              pending={pending}
              onPort={onPort}
              onCancel={() => setPending(null)}
              dragging={drag?.key}
              onDrag={(key, at) => setDrag({ key, at })}
              onDrop={(key, at) => {
                setDrag(null);
                change((d) => moveCard(d, key, at));
              }}
              inventory={checked ? inventory.data : undefined}
            />
          )}
        </Box>
        <Box sx={{ width: INSPECTOR_W, flexShrink: 0, borderLeft: 1, borderColor: 'divider', bgcolor: 'background.paper', minHeight: 0 }}>
          <WiringInspector
            view={view}
            inventory={checked ? inventory.data : undefined}
            selection={selection}
            onSelect={setSelection}
            isControlPart={(id) => wiringOf(design).parts.some((p) => p.id === id)}
            onDeviceId={(id, v) => change((d) => setDeviceId(d, id, v))}
            onConnectDevice={(part, device, to) =>
              change((d) =>
                !to
                  ? disconnect(d, part, device)
                  : connect(d, { kind: to.output ? 'direct' : 'usb3-vision', controller: to.board, part, device, settings: to.output ? { id: to.output.id, subid: to.output.subid } : KIND_DEFAULTS['usb3-vision'] }),
              )
            }
            onConnectBoard={(id, on) => {
              const board = view.boards.find((b) => b.id === id);
              if (!on) change((d) => disconnect(d, id, null));
              else if (board) change((d) => connect(d, { kind: board.protocols[0], controller: ROOT, part: id, device: null, settings: board.defaults ?? KIND_DEFAULTS[board.protocols[0]] }));
            }}
            onSettings={(part, device, s) => change((d) => setSettings(d, part, device, s))}
            onKind={(part, device, k) => change((d) => setKind(d, part, device, k))}
            onDisconnect={(part, device) => {
              change((d) => disconnect(d, part, device));
              setSelection(null);
            }}
            onInput={(id, axis, input) => change((d) => setInput(d, id, axis, input))}
            onNewInput={(id, axis) => {
              const carrier = view.carriers.find((c) => c.id === id);
              const name = addNewInput(`${carrier?.deviceId ?? 'input'}-${axis}`, { partId: id, axis });
              onNotice?.(`New input ${name}: the ${axis} motor moves it.`);
            }}
            onRemovePart={(id) => {
              const label = wiringOf(design).parts.find((p) => p.id === id)?.label;
              change((d) => removeControlPart(d, id));
              setSelection(null);
              onNotice?.(`${label ?? 'The part'} removed. Ctrl Z brings it back.`);
            }}
            onRenameInput={(name, to) => {
              const renamed = renameInput(pinCards(design, positionsOf(placed)), name, to);
              if (renamed.name === name) return onNotice?.(`${to} is not free: the input is still ${name}.`);
              edit(renamed.design);
              setSelection({ kind: 'input', name: renamed.name });
            }}
            onRemoveInput={(name) => {
              change((d) => removeInput(d, name));
              setSelection(null);
            }}
          />
        </Box>
      </Box>

      <Dialog open={configOpen} onClose={() => setConfigOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>NewSwitch config</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            NewSwitch reads this file at start-up. A device with no connection is in the file, but no controller reaches it.
          </Typography>
          {config.status === 'error' ? (
            <Failed message={config.error ?? ''} onRetry={config.retry} />
          ) : config.data === undefined ? (
            config.slow && <Waiting label="Making the config" rows={6} height={20} />
          ) : (
            <Box
              component="pre"
              sx={(t) => ({ m: 0, p: 2, maxHeight: 420, overflow: 'auto', bgcolor: 'background.sunken', borderRadius: 1, typography: 'mono', fontFamily: t.typography.mono.fontFamily, fontSize: 12 })}
            >
              {config.data}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigOpen(false)}>Close</Button>
          <Button
            disabled={!config.data}
            onClick={() => {
              navigator.clipboard?.writeText(config.data ?? '').catch(() => {});
              onNotice?.('Config copied.');
            }}
          >
            Copy
          </Button>
          <Button variant="contained" disabled={!config.data} onClick={() => config.data && download('_newswitch-config.yml', config.data, 'text/yaml')}>
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
