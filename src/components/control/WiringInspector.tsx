/**
 * Beside the wiring canvas: what is selected, and every connection as a
 * field, so all the wiring can also be done from the keyboard. A part: its
 * NewSwitch id, each device's connection and each motor's input. A board: its
 * id, how the computer reaches it, and what is on each output. The computer:
 * what it reaches. An input: the motors that move it. A cable: its two ends
 * and its settings. Nothing: what is left to do.
 */
import { useEffect, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { Inventory } from '../../ports/electronics';
import type { WiringSelection } from './WiringCanvas';
import {
  BAUD_RATES,
  boardOutputs,
  CAN_INTERFACES,
  deviceName,
  KIND_LABELS,
  moversOf,
  reachedBy,
  ROOT,
  type Board,
  type BoardOutput,
  type Carrier,
  type Connection,
  type ConnectionKind,
  type ConnectionSettings,
  type DeviceState,
  type WiringView,
} from './wiring';

export interface WiringInspectorProps {
  view: WiringView;
  /** What the instrument said it has, after a check. */
  inventory?: Inventory;
  selection: WiringSelection;
  onSelect: (s: WiringSelection) => void;
  onDeviceId: (partId: string, deviceId: string) => void;
  /** Put a device on a controller; for a board's output, with its `id` and `subid`. `null`: off. */
  onConnectDevice: (partId: string, deviceKey: string, to: { board: string; output: BoardOutput | null } | null) => void;
  /** The computer reaches a board, or not. */
  onConnectBoard: (boardId: string, on: boolean) => void;
  onSettings: (partId: string, device: string | null, settings: ConnectionSettings) => void;
  onKind: (partId: string, device: string | null, kind: ConnectionKind) => void;
  onDisconnect: (partId: string, device: string | null) => void;
  onInput: (partId: string, axis: string, input: string | undefined) => void;
  /** A new input for this axis, moved by it. */
  onNewInput: (partId: string, axis: string) => void;
  /** Take a control part (not one on the grid) out of the design. */
  onRemovePart: (id: string) => void;
  onRenameInput: (name: string, to: string) => void;
  onRemoveInput: (name: string) => void;
  /** Is this part one of the design's control parts? */
  isControlPart: (id: string) => boolean;
}

const NONE = '';
const NEW = '__new__';
const ID_HELP = 'newswitch-device-id. Empty: made from the name.';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" component="h3" sx={{ display: 'block', mb: 1 }}>
        {title}
      </Typography>
      <Stack sx={{ gap: 1.5 }}>{children}</Stack>
    </Box>
  );
}

/** A field that is kept while typing, and set on leaving it or Enter; in mono when it names something. */
function CommitField({ label, helperText, value, onCommit, mono, type }: { label: string; helperText?: string; value: string; onCommit: (v: string) => void; mono?: boolean; type?: 'number' }) {
  const [text, setText] = useState(value);
  // A value changed from elsewhere (an undo, the canvas) replaces what the field shows.
  useEffect(() => setText(value), [value]);
  const commit = () => {
    if (text !== value) onCommit(text);
  };
  return (
    <TextField
      label={label}
      size="small"
      type={type}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
      helperText={helperText}
      slotProps={{ htmlInput: { spellCheck: false, ...(type === 'number' && { min: 0 }) } }}
      sx={mono ? (t) => ({ '& input': { fontFamily: t.typography.mono.fontFamily } }) : undefined}
    />
  );
}

function Head({ title, meta }: { title: string; meta: string }) {
  return (
    <Box>
      <Typography variant="h3" component="h2">
        {title}
      </Typography>
      <Typography variant="meta" color="text.meta">
        {meta}
      </Typography>
    </Box>
  );
}

/** A connection's settings, as the inputs of its design. */
function ConnectionFields({ connection, protocols, onSettings, onKind }: { connection: Connection; protocols?: ConnectionKind[]; onSettings: (s: ConnectionSettings) => void; onKind: (k: ConnectionKind) => void }) {
  const s = connection.settings;
  /** A whole number at least 0; anything else changes nothing. */
  const whole = (key: string) => (text: string) => {
    const n = Number(text);
    if (text.trim() !== '' && Number.isInteger(n) && n >= 0) onSettings({ [key]: n });
  };
  return (
    <Stack sx={{ gap: 1.5 }}>
      {protocols && protocols.length > 1 && (
        <TextField select label="Connection" size="small" value={connection.kind} onChange={(e) => onKind(e.target.value as ConnectionKind)}>
          {protocols.map((k) => (
            <MenuItem key={k} value={k}>
              {KIND_LABELS[k]}
            </MenuItem>
          ))}
        </TextField>
      )}
      {connection.kind === 'direct' && (
        <Stack direction="row" sx={{ gap: 1 }}>
          <CommitField label="Id" type="number" value={String(s.id)} onCommit={whole('id')} />
          <CommitField label="Sub-id" type="number" value={String(s.subid)} onCommit={whole('subid')} />
        </Stack>
      )}
      {connection.kind === 'uc2-rest-serial' && (
        <>
          <CommitField label="Port pattern" mono value={String(s['port-pattern'])} onCommit={(v) => onSettings({ 'port-pattern': v })} helperText="Two boards need two patterns, or NewSwitch cannot tell them apart." />
          <TextField select label="Baud rate" size="small" value={s.baudrate} onChange={(e) => onSettings({ baudrate: Number(e.target.value) })}>
            {BAUD_RATES.map((b) => (
              <MenuItem key={b} value={b}>
                {b}
              </MenuItem>
            ))}
          </TextField>
        </>
      )}
      {connection.kind === 'canopen-canbus' && (
        <>
          <TextField select label="Interface" size="small" value={s.interface} onChange={(e) => onSettings({ interface: e.target.value })}>
            {CAN_INTERFACES.map((i) => (
              <MenuItem key={i} value={i}>
                {i}
              </MenuItem>
            ))}
          </TextField>
          <CommitField label="Channel" mono value={String(s.channel)} onCommit={(v) => onSettings({ channel: v })} />
          <CommitField label="Bit rate" type="number" value={String(s.bitrate)} onCommit={whole('bitrate')} />
        </>
      )}
      {connection.kind === 'usb3-vision' && <CommitField label="Camera name" mono value={String(s.name)} onCommit={(v) => onSettings({ name: v })} helperText="The name stored in the camera, which selects it. Empty: any camera." />}
    </Stack>
  );
}

/** Where a device goes: the outputs of the boards that take it; for a camera, the computer. */
function deviceTargets(view: WiringView, d: DeviceState) {
  if (d.device.type === 'detector') return [{ value: ROOT, label: 'Computer · USB3 Vision', board: ROOT, output: null as BoardOutput | null, other: null as string | null }];
  return view.boards.flatMap((b) =>
    boardOutputs(view, b)
      .filter(({ output }) => output.takes === d.device.type)
      .map(({ output, users }) => {
        const other = users.find((u) => u.d !== d);
        return { value: `${b.id}/${output.name}`, label: `${b.label} · ${output.label}`, board: b.id, output, other: other ? deviceName(other.carrier, other.d) : null };
      }),
  );
}

function DeviceFields({ carrier, d, view, props }: { carrier: Carrier; d: DeviceState; view: WiringView; props: WiringInspectorProps }) {
  const targets = deviceTargets(view, d);
  const custom = d.connection?.kind === 'direct' && !d.output;
  const value = !d.connection ? NONE : d.device.type === 'detector' ? ROOT : d.output ? `${d.parent?.id}/${d.output.name}` : NEW;
  return (
    <Stack sx={{ gap: 1, pb: 1.5, borderBottom: 1, borderColor: 'divider', '&:last-of-type': { borderBottom: 0, pb: 0 } }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <Typography variant="subtitle2" sx={{ flex: 1 }}>
          {d.device.label}
        </Typography>
        <Typography variant="mono" sx={{ color: 'text.meta', fontSize: 11 }}>
          {d.deviceId}
        </Typography>
      </Box>
      <TextField
        select
        label="Connected to"
        size="small"
        value={value}
        onChange={(e) => {
          const t = targets.find((x) => x.value === e.target.value);
          props.onConnectDevice(carrier.id, d.device.key, t ? { board: t.board, output: t.output } : null);
        }}
        helperText={targets.length === 0 ? 'No board here takes this device. Add one.' : undefined}
      >
        <MenuItem value={NONE}>
          <em>None</em>
        </MenuItem>
        {custom && <MenuItem value={NEW}>{d.parent?.label} · custom</MenuItem>}
        {targets.map((t) => (
          <MenuItem key={t.value} value={t.value} disabled={Boolean(t.other)}>
            {t.label}
            {t.other && (
              <Typography component="span" variant="meta" color="text.meta" sx={{ ml: 1 }}>
                {t.other}
              </Typography>
            )}
          </MenuItem>
        ))}
      </TextField>
      {d.connection && <ConnectionFields connection={d.connection} onSettings={(s) => props.onSettings(carrier.id, d.device.key, s)} onKind={(k) => props.onKind(carrier.id, d.device.key, k)} />}
      {d.device.axis && (
        <TextField
          select
          label="Moves the design input"
          size="small"
          value={d.input ?? NONE}
          onChange={(e) => {
            const axis = d.device.axis?.name ?? '';
            if (e.target.value === NEW) props.onNewInput(carrier.id, axis);
            else props.onInput(carrier.id, axis, e.target.value || undefined);
          }}
          helperText={`It drives the part’s own ${d.device.axis.input}: the poses that read the input follow.`}
        >
          <MenuItem value={NONE}>
            <em>None</em>
          </MenuItem>
          {view.inputs.map((i) => (
            <MenuItem key={i.name} value={i.name}>
              <Box component="span" sx={{ fontFamily: (t) => t.typography.mono.fontFamily }}>
                {i.name}
              </Box>
            </MenuItem>
          ))}
          <MenuItem value={NEW}>New input…</MenuItem>
        </TextField>
      )}
    </Stack>
  );
}

function CarrierInspector({ carrier, view, props }: { carrier: Carrier; view: WiringView; props: WiringInspectorProps }) {
  return (
    <Stack sx={{ gap: 3 }}>
      <Head title={carrier.label} meta={carrier.onGrid ? carrier.module : `${carrier.module} · not on the optical grid`} />
      <Section title="On the instrument">
        <CommitField key={carrier.id} label="NewSwitch id" mono helperText={ID_HELP} value={carrier.deviceId} onCommit={(v) => props.onDeviceId(carrier.id, v)} />
      </Section>
      <Section title={carrier.devices.length > 1 ? `Devices · ${carrier.devices.length}` : 'Device'}>
        {carrier.devices.map((d) => (
          <DeviceFields key={d.device.key} carrier={carrier} d={d} view={view} props={props} />
        ))}
      </Section>
      {props.isControlPart(carrier.id) && (
        <Button color="error" onClick={() => props.onRemovePart(carrier.id)} sx={{ alignSelf: 'flex-start' }}>
          Remove from the design
        </Button>
      )}
    </Stack>
  );
}

function RootInspector({ board, view, props }: { board: Board; view: WiringView; props: WiringInspectorProps }) {
  const reached = reachedBy(view, board);
  return (
    <Stack sx={{ gap: 3 }}>
      <Head title={board.label} meta="The root of the device tree. Every design has it." />
      <Section title={`Reaches · ${reached.length}`}>
        {reached.length ? (
          reached.map((r) => (
            <Stack key={r.id + r.name} sx={{ alignItems: 'flex-start' }}>
              <Link component="button" variant="body2" onClick={() => props.onSelect({ kind: 'part', id: r.id })} sx={{ textAlign: 'left' }}>
                {r.name}
              </Link>
              <Typography variant="meta" color="text.meta">
                {KIND_LABELS[r.connection.kind]}
              </Typography>
            </Stack>
          ))
        ) : (
          <Typography variant="body2" color="text.meta">
            Nothing yet. Join a board or a camera to the computer’s port.
          </Typography>
        )}
      </Section>
    </Stack>
  );
}

function BoardInspector({ board, view, props }: { board: Board; view: WiringView; props: WiringInspectorProps }) {
  const outputs = boardOutputs(view, board);
  const free = outputs.filter((s) => s.users.length === 0).length;
  // Direct connections to a place that is no output: a value typed by hand.
  const custom = reachedBy(view, board).filter((r) => r.connection.kind === 'direct' && !outputs.some(({ users }) => users.some((u) => u.d.connection === r.connection)));
  return (
    <Stack sx={{ gap: 3 }}>
      <Head title={board.label} meta={board.module} />
      <Section title="On the instrument">
        <CommitField key={board.id} label="NewSwitch id" mono helperText={ID_HELP} value={board.deviceId} onCommit={(v) => props.onDeviceId(board.id, v)} />
      </Section>
      <Section title="From the computer">
        {board.connection ? (
          <>
            <ConnectionFields connection={board.connection} protocols={board.protocols} onSettings={(s) => props.onSettings(board.id, null, s)} onKind={(k) => props.onKind(board.id, null, k)} />
            <Button color="error" onClick={() => props.onConnectBoard(board.id, false)} sx={{ alignSelf: 'flex-start' }}>
              Disconnect
            </Button>
          </>
        ) : (
          <Button variant="outlined" onClick={() => props.onConnectBoard(board.id, true)} sx={{ alignSelf: 'flex-start' }}>
            Connect to the computer
          </Button>
        )}
      </Section>
      <Section title={`Outputs · ${free} free`}>
        <Stack component="ul" sx={{ m: 0, p: 0, listStyle: 'none', gap: 0.75 }}>
          {outputs.map(({ output, users }) => (
            <Stack component="li" key={output.name} direction="row" sx={{ gap: 1, alignItems: 'baseline' }}>
              <Typography variant="body2" sx={{ width: 84, flexShrink: 0 }}>
                {output.label}
              </Typography>
              {users.length ? (
                <Link component="button" variant="body2" onClick={() => props.onSelect({ kind: 'part', id: users[0].carrier.id })} sx={{ textAlign: 'left' }}>
                  {users.map((u) => deviceName(u.carrier, u.d)).join(', ')}
                </Link>
              ) : (
                <Typography variant="body2" color="text.meta">
                  free
                </Typography>
              )}
            </Stack>
          ))}
          {custom.map((r) => (
            <Stack component="li" key={r.id + r.name} direction="row" sx={{ gap: 1, alignItems: 'baseline' }}>
              <Typography variant="body2" sx={{ width: 84, flexShrink: 0 }}>
                Id {r.connection.settings.id}/{r.connection.settings.subid}
              </Typography>
              <Link component="button" variant="body2" onClick={() => props.onSelect({ kind: 'part', id: r.id })} sx={{ textAlign: 'left' }}>
                {r.name}
              </Link>
            </Stack>
          ))}
        </Stack>
      </Section>
      <Button color="error" onClick={() => props.onRemovePart(board.id)} sx={{ alignSelf: 'flex-start' }}>
        Remove from the design
      </Button>
    </Stack>
  );
}

function InputInspector({ name, view, props }: { name: string; view: WiringView; props: WiringInspectorProps }) {
  const input = view.inputs.find((i) => i.name === name);
  if (!input) return null;
  const movers = moversOf(view, name);
  return (
    <Stack sx={{ gap: 3 }}>
      <Head title={input.name} meta={`A design input, in ${input.unit}`} />
      <CommitField key={input.name} label="Name" mono helperText="Lower case, with dashes. A name in use is not taken." value={input.name} onCommit={(v) => props.onRenameInput(input.name, v)} />
      <Typography variant="body2" color="text.secondary">
        A motor that moves this input moves every part whose pose reads it. In the design file each one is <code>~ inputs['{input.name}'].value</code>.
      </Typography>
      <Section title={`Moved by · ${movers.length}`}>
        {movers.length ? (
          movers.map((m) => (
            <Link key={`${m.carrier.id}/${m.d.device.key}`} component="button" variant="body2" onClick={() => props.onSelect({ kind: 'part', id: m.carrier.id })} sx={{ textAlign: 'left' }}>
              {deviceName(m.carrier, m.d)}
            </Link>
          ))
        ) : (
          <Typography variant="body2" color="text.meta">
            No motor yet. Join one to it from a motor’s right port.
          </Typography>
        )}
      </Section>
      <Button color="error" onClick={() => props.onRemoveInput(name)} sx={{ alignSelf: 'flex-start' }}>
        Remove the input
      </Button>
    </Stack>
  );
}

function CableInspector({ cableKey, view, props }: { cableKey: string; view: WiringView; props: WiringInspectorProps }) {
  const isInput = cableKey[0] === 'i';
  const [partId, deviceKey] = cableKey.slice(2).split('/');
  const device = deviceKey || null;
  const board = device === null ? view.boards.find((b) => b.id === partId) : undefined;
  const carrier = view.carriers.find((c) => c.id === partId);
  const d = carrier?.devices.find((x) => x.device.key === device);
  const connection = board?.connection ?? d?.connection;
  const end = carrier && d ? deviceName(carrier, d) : (board?.label ?? '');

  if (isInput) {
    if (!carrier || !d) return null;
    return (
      <Stack sx={{ gap: 3 }}>
        <Head title="Motion" meta="A motor on a design input" />
        <Stack sx={{ gap: 0.5 }}>
          <Typography variant="body2">{end}</Typography>
          <Typography variant="meta" color="text.meta">
            moves
          </Typography>
          <Typography variant="body2">{d.input}</Typography>
        </Stack>
        <Stack direction="row" sx={{ gap: 1 }}>
          <Button variant="outlined" color="error" onClick={() => props.onInput(partId, d.device.axis?.name ?? '', undefined)}>
            Disconnect
          </Button>
          <Button onClick={() => props.onSelect({ kind: 'part', id: partId })}>Show the part</Button>
        </Stack>
      </Stack>
    );
  }
  if (!connection) return null;
  const parent = view.boards.find((b) => b.id === connection.controller);
  return (
    <Stack sx={{ gap: 3 }}>
      <Head title="Connection" meta={KIND_LABELS[connection.kind]} />
      <Stack sx={{ gap: 0.5 }}>
        <Typography variant="body2">{d?.output ? `${d.output.label} of ${parent?.label}` : parent?.label}</Typography>
        <Typography variant="meta" color="text.meta">
          to
        </Typography>
        <Typography variant="body2">{end}</Typography>
      </Stack>
      <ConnectionFields connection={connection} protocols={board?.protocols} onSettings={(s) => props.onSettings(partId, device, s)} onKind={(k) => props.onKind(partId, device, k)} />
      <Stack direction="row" sx={{ gap: 1 }}>
        <Button variant="outlined" color="error" onClick={() => props.onDisconnect(partId, device)}>
          Disconnect
        </Button>
        <Button onClick={() => props.onSelect({ kind: 'part', id: partId })}>Show the part</Button>
      </Stack>
      <Typography variant="meta" color="text.meta">
        Delete or Backspace disconnects it too.
      </Typography>
    </Stack>
  );
}

/** After a check: the design's connected devices the instrument does not have or that do not answer. */
function OnInstrument({ inventory, view, props }: { inventory: Inventory; view: WiringView; props: WiringInspectorProps }) {
  const wrong = view.carriers.flatMap((c) =>
    c.devices.flatMap((d) => {
      if (!d.connection) return [];
      const said = inventory.devices[d.deviceId];
      return said?.state === 'ready' ? [] : [{ c, d, why: said ? said.reason : 'Not on the instrument.' }];
    }),
  );
  return (
    <Section title={`On ${inventory.instrument}${wrong.length ? ` · ${wrong.length} to look at` : ''}`}>
      {wrong.length ? (
        wrong.map(({ c, d, why }) => (
          <Stack key={`${c.id}/${d.device.key}`} direction="row" sx={{ gap: 1 }}>
            <ErrorOutlineIcon fontSize="small" color="error" />
            <Link component="button" variant="body2" color="text.primary" onClick={() => props.onSelect({ kind: 'part', id: c.id })} sx={{ textAlign: 'left' }}>
              {deviceName(c, d)}: {why}
            </Link>
          </Stack>
        ))
      ) : (
        <Typography variant="body2" color="text.secondary">
          Every connected device is ready.
        </Typography>
      )}
    </Section>
  );
}

function Overview({ view, props }: { view: WiringView; props: WiringInspectorProps }) {
  const left = view.carriers.flatMap((c) => c.devices.filter((d) => d.status !== 'wired').map((d) => ({ c, d })));
  const boards = view.boards.filter((b) => !b.isRoot && !b.connection);
  const count = left.length + boards.length;
  const selectFrom = (id: string) => props.onSelect(id.startsWith('input:') ? { kind: 'input', name: id.slice('input:'.length) } : { kind: 'part', id });
  return (
    <Stack sx={{ gap: 3 }}>
      <Head title="Wiring" meta={`${view.count.wired} of ${view.count.devices} wired`} />
      {view.problems.length > 0 && (
        <Section title={`To look at · ${view.problems.length}`}>
          {view.problems.map((p) => (
            <Stack key={p.text} direction="row" sx={{ gap: 1 }}>
              {p.level === 'error' ? <ErrorOutlineIcon fontSize="small" color="error" /> : <WarningAmberIcon fontSize="small" color="warning" />}
              <Link component="button" variant="body2" color="text.primary" onClick={() => p.ids[0] && selectFrom(p.ids[0])} sx={{ textAlign: 'left' }}>
                {p.text}
              </Link>
            </Stack>
          ))}
        </Section>
      )}
      {props.inventory && <OnInstrument inventory={props.inventory} view={view} props={props} />}
      <Section title={count ? `Not wired yet · ${count}` : 'Not wired yet'}>
        {count ? (
          <>
            {boards.map((b) => (
              <Link key={b.id} component="button" variant="body2" onClick={() => props.onSelect({ kind: 'part', id: b.id })} sx={{ textAlign: 'left' }}>
                {b.label}: no connection to the computer
              </Link>
            ))}
            {left.map(({ c, d }) => (
              <Link key={`${c.id}/${d.device.key}`} component="button" variant="body2" onClick={() => props.onSelect({ kind: 'part', id: c.id })} sx={{ textAlign: 'left' }}>
                {deviceName(c, d)}: {d.status === 'no-input' ? 'moves no input' : 'no connection'}
              </Link>
            ))}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {view.count.devices ? 'Everything is wired.' : 'No part in this design has electronics.'}
          </Typography>
        )}
      </Section>
      <Divider />
      <Typography variant="body2" color="text.secondary">
        To join two ports, drag from one to the other, or click one and then the other. The ports that fit light up. Esc stops. Drag a card to move it.
      </Typography>
    </Stack>
  );
}

export function WiringInspector(props: WiringInspectorProps) {
  const { view, selection } = props;
  let body: ReactNode = <Overview view={view} props={props} />;
  if (selection?.kind === 'part') {
    const board = view.boards.find((b) => b.id === selection.id);
    const carrier = view.carriers.find((c) => c.id === selection.id);
    if (board?.isRoot) body = <RootInspector board={board} view={view} props={props} />;
    else if (board) body = <BoardInspector board={board} view={view} props={props} />;
    else if (carrier) body = <CarrierInspector carrier={carrier} view={view} props={props} />;
  } else if (selection?.kind === 'input') body = <InputInspector name={selection.name} view={view} props={props} />;
  else if (selection?.kind === 'cable') body = <CableInspector cableKey={selection.key} view={view} props={props} />;
  return (
    <Box component="aside" aria-label="Wiring details" sx={{ p: 2.5, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      {body}
    </Box>
  );
}
