import { useState, type KeyboardEvent, type ReactNode } from 'react';
import InputAdornment from '@mui/material/InputAdornment';
import TextField, { type TextFieldProps } from '@mui/material/TextField';

export interface NumberInputProps
  extends Omit<TextFieldProps, 'value' | 'onChange' | 'type' | 'slotProps' | 'defaultValue'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Decimal places shown when the field is not being edited. */
  precision?: number;
  /** Short label inside the field, e.g. an axis letter. */
  startLabel?: ReactNode;
  unit?: string;
  /** Accessible name when there is no visible label. */
  ariaLabel?: string;
}

/**
 * Text field for numbers. Edits are committed on blur or Enter, Escape
 * reverts, and ArrowUp/ArrowDown step the value (Shift for ×10).
 */
export function NumberInput({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  precision,
  startLabel,
  unit,
  ariaLabel,
  sx,
  ...rest
}: NumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const format = (v: number) => (precision === undefined ? String(v) : v.toFixed(precision));
  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  const commit = () => {
    if (draft === null) return;
    const parsed = Number(draft);
    if (draft.trim() !== '' && Number.isFinite(parsed)) onChange(clamp(parsed));
    setDraft(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      commit();
    } else if (event.key === 'Escape') {
      setDraft(null);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const delta = (event.key === 'ArrowUp' ? step : -step) * (event.shiftKey ? 10 : 1);
      const next = clamp(value + delta);
      onChange(next);
      setDraft(format(next));
    }
  };

  return (
    <TextField
      {...rest}
      value={draft ?? format(value)}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={(event) => {
        setDraft(format(value));
        event.target.select();
      }}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      sx={[{ '& .MuiInputBase-input': { typography: 'mono' } }, ...(Array.isArray(sx) ? sx : [sx])]}
      slotProps={{
        htmlInput: { inputMode: 'decimal', 'aria-label': ariaLabel },
        input: {
          startAdornment: startLabel ? <InputAdornment position="start">{startLabel}</InputAdornment> : undefined,
          endAdornment: unit ? <InputAdornment position="end">{unit}</InputAdornment> : undefined,
        },
      }}
    />
  );
}
