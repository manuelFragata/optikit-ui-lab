/**
 * A number as one row of a spec sheet: its label, its value and its unit.
 * Drag the label left or right to change the value (Shift: ten times
 * faster, Alt: ten times finer; the label shows a dotted underline and a
 * resize cursor), or click the value and type (Enter keeps
 * it, Esc puts it back, the arrow keys step it). No slider: a row is about
 * 28 px high.
 */
import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { NumberInput } from './NumberInput';

export interface ScrubNumberProps {
  label: ReactNode;
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** Shown on the label: what the number is, or why it cannot be changed here. */
  hint?: string;
  /** Read only: shown, not changed (e.g. what follows from a designed shape). */
  readOnly?: boolean;
  /** Read only: shown as this text instead of the number ("∞ (flat)"). */
  text?: string;
  /** The label column's width; `compact`: a one-letter label, as x, y and z. */
  compact?: boolean;
  ariaLabel?: string;
}

/** Pixels of drag for one step. */
const PX_PER_STEP = 4;

const decimals = (step: number) => (Number.isInteger(step) ? 0 : Math.min(4, String(step).split('.')[1]?.length ?? 2));

export function ScrubNumber({ label, value, onChange, min = -Infinity, max = Infinity, step = 1, unit, hint, readOnly = false, text, compact = false, ariaLabel }: ScrubNumberProps) {
  const start = useRef<{ x: number; value: number } | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const precision = decimals(step);
  const editable = !readOnly && text === undefined && Boolean(onChange);
  const set = (v: number) => onChange?.(Number(Math.min(max, Math.max(min, v)).toFixed(precision)));

  const down = (e: PointerEvent<HTMLElement>) => {
    if (!editable || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, value };
    setScrubbing(true);
  };
  const move = (e: PointerEvent<HTMLElement>) => {
    if (!start.current) return;
    const k = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
    set(start.current.value + Math.round((e.clientX - start.current.x) / PX_PER_STEP) * step * k);
  };
  const up = () => {
    start.current = null;
    setScrubbing(false);
  };

  const name = (
    <Typography
      variant="body2"
      color="text.secondary"
      noWrap
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      sx={{
        cursor: editable ? 'ew-resize' : 'default',
        // A dotted underline on hover: this label can be dragged.
        ...(editable && {
          textDecorationLine: 'underline',
          textDecorationStyle: 'dotted',
          textDecorationColor: 'transparent',
          textUnderlineOffset: 3,
          '&:hover': { textDecorationColor: 'currentColor' },
        }),
        userSelect: 'none',
        touchAction: 'none',
        color: scrubbing ? 'primary.main' : undefined,
        ...(compact && { typography: 'mono', textAlign: 'center' }),
      }}
    >
      {label}
    </Typography>
  );

  const row = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: compact ? '10px minmax(0, 1fr)' : text !== undefined ? 'minmax(0, 1fr) auto' : 'minmax(0, 1fr) 76px',
        alignItems: 'center',
        columnGap: compact ? 0.5 : 1,
        minHeight: 28,
      }}
    >
      {name}
      {editable ? (
        <NumberInput
          value={value}
          onChange={set}
          min={min}
          max={max}
          step={step}
          precision={precision}
          unit={unit}
          ariaLabel={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
          variant="standard"
          size="small"
          sx={{
            '& .MuiInputBase-root': {
              px: compact ? 0.25 : 0.75,
              borderRadius: 0.75,
              fontSize: compact ? 12 : 13,
              '&:before, &:after': { display: 'none' },
              '&:hover': { bgcolor: 'action.hover' },
              '&.Mui-focused': { bgcolor: 'action.selected' },
            },
            '& .MuiInputBase-input': { textAlign: compact ? 'left' : 'right', py: 0.25 },
            '& .MuiInputAdornment-root': { ml: 0.5, '& p': { fontSize: 12, color: 'text.meta' } },
          }}
        />
      ) : (
        <Typography variant="mono" sx={{ textAlign: 'right', px: 0.75, fontSize: 13, color: 'text.secondary', whiteSpace: 'nowrap' }}>
          {text ?? Number(value.toFixed(precision))}
          {unit && text === undefined && (
            <Box component="span" sx={{ ml: 0.5, fontSize: 12, color: 'text.meta' }}>
              {unit}
            </Box>
          )}
        </Typography>
      )}
    </Box>
  );
  // The hint opens beside the row, out of the panel (over the canvas), so it never covers a value; none while dragging.
  return hint && !scrubbing ? (
    <Tooltip title={hint} placement="right" enterDelay={600} disableInteractive slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, 28] } }] } }}>
      {row}
    </Tooltip>
  ) : (
    row
  );
}
