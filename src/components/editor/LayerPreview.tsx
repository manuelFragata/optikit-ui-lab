import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import { floatingCardSx } from '../panels/floatingCard';
import { useLightFor, type Light } from '../../ports/light';
import { samplePoint, type Schematic } from './model';

export interface LayerPreviewProps {
  schematic: Schematic;
  /** The layers there are, lowest first. */
  layers: number[];
  layer: number;
  onLayer: (z: number) => void;
  /** The selected parts, drawn in the accent colour. */
  selectedIds?: string[];
  /** The right panel floats over this corner: the preview folds away until it closes, unless pinned. */
  crowded?: boolean;
}

// The view: the ground turned a little and tilted away, layers stacked upwards.
const TURN = (25 * Math.PI) / 180;
const TILT = 0.45;
const MARGIN = 2; // grid units of plate around the parts
const FADED = 0.28;
const SIZE = { w: 320, h: 240, minW: 200, minH: 150, maxW: 720, maxH: 560 };

type P = { x: number; y: number; z: number };

/** Every layer's outline and contents, from a schematic, in screen units. */
function projection(schematic: Schematic, light: Light, layers: number[]) {
  const { symbols } = schematic;
  const objective = symbols.find((s) => s.kind === 'objective');
  const sample = objective ? [samplePoint(objective)] : [];
  const xs = symbols.map((s) => s.x).concat(sample.map((p) => p.x));
  const ys = symbols.map((s) => s.y).concat(sample.map((p) => p.y));
  const [x0, x1] = [Math.min(0, ...xs) - MARGIN, Math.max(4, ...xs) + MARGIN];
  const [y0, y1] = [Math.min(0, ...ys) - MARGIN, Math.max(4, ...ys) + MARGIN];
  const gap = Math.max(3, Math.max(x1 - x0, y1 - y0) * 0.22);

  const project = ({ x, y, z }: P) => {
    const rx = x * Math.cos(TURN) - y * Math.sin(TURN);
    const ry = x * Math.sin(TURN) + y * Math.cos(TURN);
    return { x: rx, y: -ry * TILT - z * gap };
  };
  const path = (points: P[], close = false) =>
    points.map((p, i) => `${i ? 'L' : 'M'}${project(p).x.toFixed(2)} ${project(p).y.toFixed(2)}`).join('') + (close ? 'Z' : '');

  const plate = (z: number) =>
    path(
      [
        { x: x0, y: y0, z },
        { x: x1, y: y0, z },
        { x: x1, y: y1, z },
        { x: x0, y: y1, z },
      ],
      true,
    );

  // Where the light goes, on its layer.
  const rayPaths = light.paths.map(({ ray, z, points }) => ({ ray, points: points.map((p): P => ({ x: p.x, y: p.y + ray.offset, z })) }));

  const corners = layers.flatMap((z) => [x0, x1].flatMap((x) => [y0, y1].map((y) => project({ x, y, z }))));
  const pad = 1;
  const minX = Math.min(...corners.map((c) => c.x)) - pad;
  const minY = Math.min(...corners.map((c) => c.y)) - pad;
  const viewBox = `${minX} ${minY} ${Math.max(...corners.map((c) => c.x)) - minX + pad} ${Math.max(...corners.map((c) => c.y)) - minY + pad}`;

  return { project, path, plate, rayPaths, viewBox, labelAt: (z: number) => project({ x: x1, y: y0, z }) };
}

/**
 * The whole system in 2.5D, one plate per layer, the layer being drawn
 * highlighted and the others faded. Click a plate to go to that layer.
 * Sits in the canvas's bottom-right corner; it folds to a button, and the
 * top-left corner resizes it. While the right panel is out it folds away and
 * comes back as it was when the panel closes; pinned, it stays.
 */
export function LayerPreview({ schematic, layers, layer, onLayer, selectedIds = [], crowded = false }: LayerPreviewProps) {
  // `open` is the user's choice; the panel only hides it for a while.
  const [open, setOpen] = useState(true);
  const [pinned, setPinned] = useState(false);
  // Opened by hand while the panel is out: shown until the panel comes or goes.
  const [peek, setPeek] = useState(false);
  useEffect(() => setPeek(false), [crowded]);
  const shown = open && (!crowded || pinned || peek);
  const [size, setSize] = useState({ w: SIZE.w, h: SIZE.h });
  const drag = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const lightFor = useLightFor();
  const { project, path, plate, rayPaths, viewBox, labelAt } = projection(schematic, lightFor(schematic), layers);
  const at = layers.indexOf(layer);

  // Anchored bottom-right, so dragging the top-left corner up and left grows it.
  const startResize = (e: ReactPointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ...size };
  };
  const resize = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    setSize({ w: clamp(d.w - (e.clientX - d.x), SIZE.minW, SIZE.maxW), h: clamp(d.h - (e.clientY - d.y), SIZE.minH, SIZE.maxH) });
  };

  if (!shown) {
    return (
      <Tooltip title="Layer preview" placement="top">
        <ButtonBase
          aria-label={`Layer ${layer}. Show the layer preview`}
          onClick={() => {
            setOpen(true);
            if (crowded) setPeek(true);
          }}
          sx={(t) => ({ ...floatingCardSx(t, 'bottom'), flexDirection: 'row', gap: 0.75, height: 44, px: 1.5, color: 'text.secondary', '&:hover': { color: 'text.primary' } })}
        >
          <LayersOutlinedIcon fontSize="small" />
          <Typography variant="mono" sx={{ color: 'text.primary' }}>
            z{layer}
          </Typography>
        </ButtonBase>
      </Tooltip>
    );
  }

  return (
    <Box role="group" aria-label="Layer preview" sx={(t) => ({ ...floatingCardSx(t, 'bottom'), position: 'relative', width: size.w, height: size.h })}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.25, pl: 1.5, pr: 0.5, pt: 0.5 }}>
        <Typography variant="meta" color="text.meta" sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', mr: 1 }}>
          Layer
        </Typography>
        <Typography variant="mono" sx={{ color: 'text.primary', minWidth: 24 }}>
          z{layer}
        </Typography>
        <IconButton size="small" aria-label="Layer below" disabled={at <= 0} onClick={() => onLayer(layers[at - 1])}>
          <ExpandMoreIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" aria-label="Layer above" disabled={at >= layers.length - 1} onClick={() => onLayer(layers[at + 1])}>
          <ExpandLessIcon fontSize="small" />
        </IconButton>
        <Tooltip title={pinned ? 'Unpin: fold away while the right panel is out' : 'Pin: stay open beside the right panel'} placement="top">
          <IconButton size="small" aria-label="Pin the layer preview" aria-pressed={pinned} onClick={() => setPinned(!pinned)} sx={{ ml: 'auto', color: pinned ? 'primary.main' : undefined }}>
            {pinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <IconButton
          size="small"
          aria-label="Hide the layer preview"
          onClick={() => {
            setOpen(false);
            setPeek(false);
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Box component="svg" viewBox={viewBox} sx={{ flex: 1, minHeight: 0, width: '100%', display: 'block', p: 1 }}>
        {layers.map((z) => {
          const here = z === layer;
          const label = labelAt(z);
          return (
            <Box
              component="g"
              key={z}
              role="button"
              tabIndex={0}
              aria-label={`Layer ${z}`}
              aria-pressed={here}
              onClick={() => onLayer(z)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onLayer(z))}
              opacity={here ? 1 : FADED}
              sx={(t) => {
                const v = t.vars ?? t;
                return {
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'opacity 200ms',
                  '&:hover, &:focus-visible': { opacity: here ? 1 : 0.6 },
                  '& .plate': {
                    fill: here ? `color-mix(in srgb, ${v.palette.primary.main} 14%, transparent)` : `color-mix(in srgb, ${v.palette.text.primary} 5%, transparent)`,
                    stroke: here ? v.palette.primary.main : v.palette.text.secondary,
                  },
                };
              }}
            >
              <path className="plate" d={plate(z)} strokeWidth={1} vectorEffect="non-scaling-stroke" />
              {schematic.symbols
                .filter((s) => s.z === z)
                .map((s) => {
                  const mounted = s.placement.state === 'in-cube';
                  const r = 0.6;
                  return (
                    <Box
                      component="path"
                      key={s.id}
                      d={path(
                        [
                          { x: s.x - r, y: s.y - r, z },
                          { x: s.x + r, y: s.y - r, z },
                          { x: s.x + r, y: s.y + r, z },
                          { x: s.x - r, y: s.y + r, z },
                        ],
                        true,
                      )}
                      vectorEffect="non-scaling-stroke"
                      strokeWidth={1}
                      strokeDasharray={mounted ? undefined : '2 2'}
                      sx={(t) => {
                        const v = t.vars ?? t;
                        const ink = selectedIds.includes(s.id) ? v.palette.primary.main : v.palette.text.primary;
                        return { stroke: ink, fill: mounted ? ink : 'transparent' };
                      }}
                    />
                  );
                })}
              <Box component="text" x={label.x + 0.6} y={label.y} fontSize={1.6} dominantBaseline="middle" sx={{ fill: 'currentColor', color: here ? 'primary.main' : 'text.secondary', fontFamily: (t) => t.typography.mono.fontFamily }}>
                z{z}
              </Box>
            </Box>
          );
        })}

        {/* The beams on top, with their layer: full on the current one, faded on the others. */}
        {rayPaths.map(({ ray, points }) => {
          const start = project(points[0]);
          return (
            <Box component="g" key={ray.id} opacity={points[0].z === layer ? 1 : FADED} sx={{ color: `rays.${ray.color}`, pointerEvents: 'none' }}>
              <path d={path(points)} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              <circle cx={start.x} cy={start.y} r={0.35} fill="currentColor" />
            </Box>
          );
        })}
      </Box>

      {/* The resize grip, top-left, since the card grows up and to the left. */}
      <Box
        aria-hidden
        onPointerDown={startResize}
        onPointerMove={resize}
        onPointerUp={() => (drag.current = null)}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 16,
          height: 16,
          cursor: 'nwse-resize',
          touchAction: 'none',
          '&::before': { content: '""', position: 'absolute', top: 4, left: 4, width: 7, height: 7, borderTop: 1.5, borderLeft: 1.5, borderColor: 'text.disabled', borderTopLeftRadius: 3 },
          '&:hover::before': { borderColor: 'text.secondary' },
        }}
      />
    </Box>
  );
}
