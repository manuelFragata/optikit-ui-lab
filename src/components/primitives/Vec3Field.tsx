import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { NumberInput } from './NumberInput';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Vec3FieldProps {
  label: string;
  value: Vec3;
  onChange: (value: Vec3) => void;
  unit?: string;
  step?: number;
  precision?: number;
  disabled?: boolean;
}

const AXES = ['x', 'y', 'z'] as const;

/** Three linked numeric inputs for an x / y / z vector. */
export function Vec3Field({ label, value, onChange, unit, step = 0.1, precision = 2, disabled }: Vec3FieldProps) {
  return (
    <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
      <Typography component="legend" variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
        {label}
        {unit && ` (${unit})`}
      </Typography>
      <Stack direction="row" spacing={1}>
        {AXES.map((axis) => (
          <NumberInput
            key={axis}
            value={value[axis]}
            onChange={(next) => onChange({ ...value, [axis]: next })}
            step={step}
            precision={precision}
            disabled={disabled}
            startLabel={axis.toUpperCase()}
            ariaLabel={`${label} ${axis.toUpperCase()}`}
            sx={{
              flex: 1,
              minWidth: 0,
              '& .MuiInputBase-root': { pl: 1 },
              '& .MuiInputBase-input': { pr: 1 },
              '& .MuiInputAdornment-root': { mr: 0.5 },
            }}
          />
        ))}
      </Stack>
    </Box>
  );
}
