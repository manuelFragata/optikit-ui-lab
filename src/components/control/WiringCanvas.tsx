/**
 * The wiring as a 2D block canvas (UI-V4 §2, Control; optikit-v2 WP-378): the
 * computer, the boards, the parts with devices and the design inputs, each a
 * card, with a cable for each connection. Drag a card to move it: the cables
 * follow, and it stays where it is left. Press a port and a new cable follows
 * the pointer: the ports that fit light up, the others fade, and near one that
 * fits it snaps on. Let go there, or click one port and then the other; let go
 * or click anywhere else and the cable is gone. Click a card or a cable to
 * select it. Not the 3D scene: where the parts are in the instrument does
 * not matter here, only what is joined to what.
 */
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import type { Theme } from '@mui/material/styles';
import type { Inventory } from '../../ports/electronics';
import { canJoin, nearestFit, portKey, portPoints, pullEnds, type Port } from './connections';
import { cablePath, HEAD_H, ROW_H, snap, type Cable, type Point, type Rect, type WiringLayout } from './layout';
import { deviceName, inputCard, ROOT, type DeviceState, type WiringView } from './wiring';

/** What is selected on the canvas. */
export type WiringSelection = { kind: 'part'; id: string } | { kind: 'input'; name: string } | { kind: 'cable'; key: string } | null;

export interface WiringCanvasProps {
  view: WiringView;
  layout: WiringLayout;
  selection: WiringSelection;
  onSelect: (s: WiringSelection) => void;
  /** The port a cable is being joined from. */
  pending: Port | null;
  onPort: (p: Port) => void;
  /** The cable on its way is dropped. */
  onCancel: () => void;
  /** A card on its way somewhere, and where it stopped. */
  onDrag: (key: string, at: Point) => void;
  onDrop: (key: string, at: Point) => void;
  /** The card being dragged, on top of the others. */
  dragging?: string;
  /** What the instrument said it has, after a check. */
  inventory?: Inventory;
}

const PORT = 12;
/** A press that moves less than this, px, is a click. */
const DRAG_FROM = 4;
/** A cable let go this near its own port stays on the pointer, px: the press was a click that shook. */
const STILL_REACH = 14;

const paletteOf = (t: Theme) => (t.vars ?? t).palette;

/** A device's row light: wired, a motor with no input yet, or with no connection. */
const STATUS_COLOR = { wired: 'success.main', 'no-input': 'warning.main', unwired: 'text.disabled' } as const;
const STATUS_TEXT = { wired: 'Wired', 'no-input': 'Connected; it moves no input yet', unwired: 'No connection' } as const;

/** What the instrument says of a device, after a check. */
function OnInstrument({ inventory, deviceId }: { inventory?: Inventory; deviceId: string }) {
  if (!inventory) return null;
  const said = inventory.devices[deviceId];
  const [title, icon] = !said
    ? ['Not on the instrument', <RemoveCircleOutlineIcon key="i" sx={{ fontSize: 14, color: 'text.meta' }} />]
    : said.state === 'ready'
      ? [`Ready on ${inventory.instrument}`, <CheckCircleIcon key="i" sx={{ fontSize: 14, color: 'success.main' }} />]
      : [said.reason, <ErrorIcon key="i" sx={{ fontSize: 14, color: 'error.main' }} />];
  return (
    <Tooltip title={title}>
      <Box component="span" role="img" aria-label={title} sx={{ display: 'inline-flex', ml: 0.5 }}>
        {icon}
      </Box>
    </Tooltip>
  );
}

type PortLook = 'idle' | 'from' | 'fits' | 'target' | 'faded';

/** A port on a card's edge: a ring, filled when something is joined to it. */
function PortDot({ at, joined, look, label, onClick, onPress }: { at: Point; joined: boolean; look: PortLook; label: string; onClick: () => void; onPress: (e: PointerEvent) => void }) {
  return (
    <ButtonBase
      data-port
      aria-label={label}
      aria-pressed={look === 'from'}
      onPointerDown={onPress}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      sx={(t) => ({
        position: 'absolute',
        left: at.x - PORT / 2,
        top: at.y - PORT / 2,
        width: PORT,
        height: PORT,
        borderRadius: '50%',
        border: `2px solid ${look === 'idle' || look === 'faded' ? paletteOf(t).text.secondary : paletteOf(t).primary.main}`,
        bgcolor: look === 'from' || look === 'target' ? 'primary.main' : joined ? 'text.secondary' : 'background.paper',
        touchAction: 'none',
        opacity: look === 'faded' ? 0.25 : 1,
        zIndex: 3,
        transition: 'transform 120ms, opacity 120ms',
        ...(look === 'fits' && { transform: 'scale(1.35)', boxShadow: `0 0 0 4px ${paletteOf(t).primary.soft}` }),
        ...(look === 'target' && { transform: 'scale(1.6)', boxShadow: `0 0 0 6px ${paletteOf(t).primary.soft}` }),
        '&:hover, &.Mui-focusVisible': { transform: 'scale(1.35)' },
        // A bigger target than the dot.
        '&::after': { content: '""', position: 'absolute', inset: -8 },
      })}
    />
  );
}

/** A card: a controller, a part or an input. Drag it to move it; a press with no drag selects it. */
function Card({
  rect,
  selected,
  lifted,
  locked,
  onClick,
  onDrag,
  onDrop,
  title,
  meta,
  tag,
  status,
  children,
}: {
  rect: Rect;
  selected: boolean;
  lifted: boolean;
  /** A cable is on its way: the card stays where it is. */
  locked: boolean;
  onClick: () => void;
  onDrag: (at: Point) => void;
  onDrop: (at: Point) => void;
  title: string;
  meta?: string;
  tag?: string;
  status?: ReactNode;
  children?: ReactNode;
}) {
  // Where the press started, and whether it became a drag: refs, so the moves do not wait for a render.
  const press = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const wasDrag = useRef(false);
  const target = (e: PointerEvent) => {
    const p = press.current;
    return p ? { x: snap(p.left + e.clientX - p.x), y: snap(p.top + e.clientY - p.y) } : null;
  };
  return (
    <Box
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${title}. Drag to move it, or select it and use the arrow keys.`}
      onPointerDown={(e: PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0 || locked) return;
        press.current = { x: e.clientX, y: e.clientY, left: rect.x, top: rect.y, moved: false };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e: PointerEvent) => {
        const p = press.current;
        if (!p) return;
        if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_FROM) return;
        p.moved = true;
        const at = target(e);
        if (at) onDrag(at);
      }}
      onPointerUp={(e: PointerEvent) => {
        const p = press.current;
        const at = target(e);
        press.current = null;
        wasDrag.current = Boolean(p?.moved);
        if (p?.moved && at) onDrop(at);
      }}
      onPointerCancel={() => {
        press.current = null;
      }}
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
        // The click that ends a drag is not a selection.
        if (wasDrag.current) wasDrag.current = false;
        else onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      sx={(t) => ({
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        boxSizing: 'border-box',
        borderRadius: `${t.radius.card / 2}px`,
        border: `${selected ? 2 : t.layout.hairline}px solid ${selected ? paletteOf(t).canvas.selection : paletteOf(t).divider}`,
        bgcolor: 'background.paper',
        cursor: locked ? 'crosshair' : lifted ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
        outline: 'none',
        zIndex: lifted ? 2 : 1,
        boxShadow: lifted ? t.shadows[6] : 'none',
        '&:focus-visible': { boxShadow: `0 0 0 3px ${paletteOf(t).primary.soft}` },
      })}
    >
      <Box sx={{ height: HEAD_H, px: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderBottom: children ? 1 : 0, borderColor: 'divider', minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap sx={{ flex: 1, minWidth: 0 }}>
            {title}
          </Typography>
          {status}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, minWidth: 0 }}>
          {meta && (
            <Typography variant="meta" noWrap sx={{ color: 'text.meta', flex: 1, minWidth: 0 }}>
              {meta}
            </Typography>
          )}
          {tag && (
            <Typography variant="mono" noWrap sx={{ color: 'text.meta', fontSize: 11, flexShrink: 0, maxWidth: '60%' }}>
              {tag}
            </Typography>
          )}
        </Box>
      </Box>
      {children}
    </Box>
  );
}

/** A row inside a card, the height the layout gives it. */
function Row({ children }: { children: ReactNode }) {
  return <Box sx={{ height: ROW_H, px: 1.5, display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>{children}</Box>;
}

/** Where a device's connection lands, in a few words. */
const reachText = (d: DeviceState) =>
  !d.connection ? 'not connected' : d.output ? d.output.label : d.connection.kind === 'direct' ? `id ${d.connection.settings.id}` : d.parent?.label;

function DeviceRow({ d, inventory }: { d: DeviceState; inventory?: Inventory }) {
  return (
    <Row>
      <Tooltip title={STATUS_TEXT[d.status]}>
        <Box component="span" role="img" aria-label={STATUS_TEXT[d.status]} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: STATUS_COLOR[d.status], flexShrink: 0 }} />
      </Tooltip>
      <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
        {d.device.label}
      </Typography>
      <Typography variant="mono" noWrap sx={{ color: 'text.meta', fontSize: 11 }}>
        {reachText(d)}
      </Typography>
      <OnInstrument inventory={inventory} deviceId={d.deviceId} />
    </Row>
  );
}

export function WiringCanvas({ view, layout, selection, onSelect, pending, onPort, onCancel, onDrag, onDrop, dragging, inventory }: WiringCanvasProps) {
  const canvas = useRef<HTMLDivElement>(null);
  // Where the pointer is on the canvas, while a cable is on its way.
  const [cursor, setCursor] = useState<Point | null>(null);
  useEffect(() => {
    if (!pending) setCursor(null);
  }, [pending]);
  // A press on a port that started a cable; and the click that ends a press, which is no second click on a port.
  const press = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const swallowClick = useRef(false);

  const onCanvas = (e: { clientX: number; clientY: number }): Point => {
    const r = canvas.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  };
  const anchor = pending ? portPoints(layout).find((p) => portKey(p.port) === portKey(pending))?.at : undefined;
  const target = pending && cursor ? nearestFit(view, layout, pending, cursor) : null;

  /** A press on a port with no cable on its way starts one, which follows the pointer wherever it goes. */
  const pressPort = (p: Port) => (e: PointerEvent) => {
    if (e.button !== 0 || pending) return;
    onPort(p);
    setCursor(onCanvas(e));
    press.current = { x: e.clientX, y: e.clientY, moved: false };
    swallowClick.current = true;
    canvas.current?.setPointerCapture(e.pointerId);
  };

  /** How a port looks while a cable is being joined. */
  const look = (p: Port): PortLook => {
    if (!pending) return 'idle';
    if (portKey(p) === portKey(pending)) return 'from';
    if (target && portKey(p) === portKey(target.port)) return 'target';
    return canJoin(view, pending, p) ? 'fits' : 'faded';
  };
  const cableSelected = (c: Cable) => selection?.kind === 'cable' && selection.key === c.key;
  const partSelected = (id: string) => selection?.kind === 'part' && selection.id === id;
  const touches = (c: Cable) => (selection?.kind === 'part' && (c.part === selection.id || (c.kind === 'connection' && c.controller === selection.id))) || (selection?.kind === 'input' && c.kind === 'input' && c.input === selection.name);
  const card = (key: string) => ({ lifted: dragging === key, locked: Boolean(pending), onDrag: (at: Point) => onDrag(key, at), onDrop: (at: Point) => onDrop(key, at) });

  return (
    <Box
      ref={canvas}
      onPointerDownCapture={() => {
        swallowClick.current = false;
      }}
      onPointerMove={(e: PointerEvent) => {
        if (!pending) return;
        setCursor(onCanvas(e));
        const p = press.current;
        if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) >= DRAG_FROM) p.moved = true;
      }}
      onPointerUp={(e: PointerEvent) => {
        const p = press.current;
        press.current = null;
        if (!p?.moved || !pending) return;
        // Let go on a port that fits: joined. Anywhere else: dropped.
        const at = onCanvas(e);
        const hit = nearestFit(view, layout, pending, at);
        if (hit) onPort(hit.port);
        else if (!anchor || Math.hypot(at.x - anchor.x, at.y - anchor.y) >= STILL_REACH) onCancel();
      }}
      onClickCapture={(e: MouseEvent) => {
        if (swallowClick.current) {
          swallowClick.current = false;
          e.stopPropagation();
          return;
        }
        if (!pending || (e.target instanceof Element && e.target.closest('[data-port]'))) return;
        // A cable on its way, and a click beside the ports: near one that fits it joins, anywhere else it is dropped.
        e.stopPropagation();
        if (target) onPort(target.port);
        else onCancel();
      }}
      onClick={() => onSelect(null)}
      sx={(t) => ({
        position: 'relative',
        cursor: pending ? 'crosshair' : undefined,
        width: layout.width,
        height: layout.height,
        minWidth: '100%',
        minHeight: '100%',
        backgroundImage: `radial-gradient(${paletteOf(t).canvas.grid} 1px, transparent 1px)`,
        backgroundSize: '16px 16px',
      })}
    >
      {/* The cable on its way, over the cards. */}
      {pending && anchor && cursor && (
        <Box component="svg" aria-hidden width={layout.width} height={layout.height} sx={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 4 }}>
          <Box
            component="path"
            data-cable-on-its-way
            d={cablePath(pullEnds(pending, anchor, target?.at ?? cursor))}
            sx={(t) => ({ fill: 'none', stroke: paletteOf(t).primary.main, strokeWidth: target ? 2.5 : 2, strokeLinecap: 'round', strokeDasharray: pending.kind === 'axis' || pending.kind === 'input' ? '5 4' : undefined })}
          />
          {!target && <Box component="circle" cx={cursor.x} cy={cursor.y} r={3.5} sx={(t) => ({ fill: paletteOf(t).primary.main })} />}
        </Box>
      )}

      <Box component="svg" aria-hidden width={layout.width} height={layout.height} sx={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
        {layout.cables.map((c) => {
          const on = cableSelected(c) || touches(c);
          return (
            <g key={c.key}>
              {/* A wide, clear path under the cable, so it is easy to hit. */}
              <Box
                component="path"
                d={cablePath(c)}
                onClick={(e: MouseEvent) => {
                  e.stopPropagation();
                  onSelect({ kind: 'cable', key: c.key });
                }}
                sx={{ fill: 'none', stroke: 'transparent', strokeWidth: 14, cursor: 'pointer', pointerEvents: pending ? 'none' : 'stroke' }}
              />
              <Box
                component="path"
                d={cablePath(c)}
                sx={(t) => ({
                  fill: 'none',
                  pointerEvents: 'none',
                  stroke: on ? paletteOf(t).canvas.selection : c.kind === 'connection' ? paletteOf(t).text.secondary : paletteOf(t).primary.main,
                  strokeWidth: cableSelected(c) ? 3 : on ? 2.25 : 1.5,
                  strokeDasharray: c.kind === 'input' ? '5 4' : undefined,
                  opacity: pending ? 0.35 : 1,
                })}
              />
            </g>
          );
        })}
      </Box>

      {layout.boards.map(({ board, rect }) => (
        <Card
          key={board.id}
          {...card(board.id)}
          rect={rect}
          selected={partSelected(board.id)}
          onClick={() => onSelect({ kind: 'part', id: board.id })}
          title={board.label}
          meta={board.module}
          tag={board.deviceId}
          status={<OnInstrument inventory={inventory} deviceId={board.deviceId} />}
        >
          {board.isRoot ? (
            <Row>
              <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                Boards and cameras
              </Typography>
            </Row>
          ) : (
            board.outputs.map((o) => (
              <Row key={o.name}>
                <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                  {o.label}
                </Typography>
                <Typography variant="mono" noWrap sx={{ color: 'text.meta', fontSize: 11 }}>
                  id {o.id}
                </Typography>
              </Row>
            ))
          )}
        </Card>
      ))}
      {layout.boards.flatMap(({ board, rect, rows }) => {
        const dots = rows.map((r) => {
          const p: Port = { kind: 'out', board: board.id, output: r.output };
          const output = board.outputs.find((o) => o.name === r.output);
          const joined = board.isRoot ? view.connections.some((c) => c.controller === ROOT) : view.carriers.some((c) => c.devices.some((d) => d.parent?.id === board.id && d.output === output));
          return <PortDot key={portKey(p)} at={{ x: rect.x + rect.w, y: r.y }} joined={joined} look={look(p)} label={board.isRoot ? 'The computer: join a board or a camera' : `${output?.label} of ${board.label}`} onClick={() => onPort(p)} onPress={pressPort(p)} />;
        });
        if (board.isRoot) return dots;
        const own: Port = { kind: 'in', part: board.id, device: null };
        return [...dots, <PortDot key={portKey(own)} at={{ x: rect.x, y: rect.y + HEAD_H / 2 }} joined={Boolean(board.connection)} look={look(own)} label={`${board.label}: its connection to the computer`} onClick={() => onPort(own)} onPress={pressPort(own)} />];
      })}

      {layout.carriers.map(({ carrier, rect, rows }) => (
        <Card
          key={carrier.id}
          {...card(carrier.id)}
          rect={rect}
          selected={partSelected(carrier.id)}
          onClick={() => onSelect({ kind: 'part', id: carrier.id })}
          title={carrier.label}
          meta={carrier.module}
          tag={carrier.deviceId}
        >
          {rows.map(({ d }) => (
            <DeviceRow key={d.device.key} d={d} inventory={inventory} />
          ))}
        </Card>
      ))}

      {/* The ports sit on the edges, over the cards. */}
      {layout.carriers.flatMap(({ carrier, rect, rows }) =>
        rows.flatMap(({ d, y }) => {
          const dev: Port = { kind: 'in', part: carrier.id, device: d.device.key };
          const dots = [<PortDot key={portKey(dev)} at={{ x: rect.x, y }} joined={Boolean(d.connection)} look={look(dev)} label={`${deviceName(carrier, d)}: its connection`} onClick={() => onPort(dev)} onPress={pressPort(dev)} />];
          if (d.device.axis) {
            const axis: Port = { kind: 'axis', part: carrier.id, device: d.device.key, axis: d.device.axis.name };
            dots.push(<PortDot key={portKey(axis)} at={{ x: rect.x + rect.w, y }} joined={Boolean(d.input)} look={look(axis)} label={`${deviceName(carrier, d)}: the input it moves`} onClick={() => onPort(axis)} onPress={pressPort(axis)} />);
          }
          return dots;
        }),
      )}

      {layout.inputs.map(({ input, rect }) => {
        const p: Port = { kind: 'input', name: input.name };
        const movers = view.carriers.flatMap((c) => c.devices.filter((d) => d.input === input.name)).length;
        return (
          <Box key={input.name}>
            <Card
              {...card(inputCard(input.name))}
              rect={rect}
              selected={selection?.kind === 'input' && selection.name === input.name}
              onClick={() => onSelect({ kind: 'input', name: input.name })}
              title={input.name}
              meta={`${input.unit} · ${movers ? `${movers} motor${movers > 1 ? 's' : ''}` : 'no motor'}`}
            />
            <PortDot at={{ x: rect.x, y: rect.y + rect.h / 2 }} joined={movers > 0} look={look(p)} label={`Input ${input.name}`} onClick={() => onPort(p)} onPress={pressPort(p)} />
          </Box>
        );
      })}
    </Box>
  );
}
