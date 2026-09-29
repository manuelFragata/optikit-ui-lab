import { useId } from 'react';
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { NumberInput } from './NumberInput';

export interface SliderFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  unit?: string;
  disabled?: boolean;
}

/** Slider paired with a numeric input; both edit the same value. */
export function SliderField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  precision,
  unit,
  disabled,
}: SliderFieldProps) {
  const labelId = useId();

  return (
    <Box>
      <Typography id={labelId} variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Slider
          value={value}
          onChange={(_, next) => onChange(next as number)}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-labelledby={labelId}
          sx={{ flex: 1 }}
        />
        <NumberInput
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          step={step}
          precision={precision}
          unit={unit}
          disabled={disabled}
          ariaLabel={label}
          sx={{ width: (theme) => theme.spacing(13), flexShrink: 0 }}
        />
      </Stack>
    </Box>
  );
}
