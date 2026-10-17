import type { ReactNode } from 'react';
import Paper from '@mui/material/Paper';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';

export interface SegmentedProps<T extends string> {
  value: T;
  /** `tip` explains the option on hover, and why when it is `disabled`. */
  options: readonly { value: T; label: ReactNode; tip?: string; disabled?: boolean }[];
  onChange: (value: T) => void;
  'aria-label': string;
  /** Over the canvas: raised, with a shadow. Inside a panel: flat. */
  floating?: boolean;
}

/**
 * One of a few views of the same thing, in the editor: 2D or 3D, the
 * analysis shown. A hairline box with borderless segments; the one chosen
 * in the soft primary. (The landing page's pill switch is PillSwitch.)
 */
export function Segmented<T extends string>({ value, options, onChange, 'aria-label': ariaLabel, floating = false }: SegmentedProps<T>) {
  return (
    <Paper
      variant="outlined"
      sx={(t) => ({ display: 'inline-flex', maxWidth: '100%', p: 0.5, borderRadius: `${t.radius.tile}px`, boxShadow: floating ? t.shadows[1] : 'none', bgcolor: 'background.paper' })}
    >
      <ToggleButtonGroup
        exclusive
        size="small"
        value={value}
        onChange={(_, next: T | null) => next && onChange(next)}
        aria-label={ariaLabel}
        sx={{ flexWrap: 'wrap', gap: 0.25, '& .MuiToggleButton-root': { border: 0, borderRadius: 1, px: 1.25, py: 0.375, typography: 'subtitle2', textTransform: 'none' } }}
      >
        {options.map((o) => {
          const button = (
            <ToggleButton key={o.value} value={o.value} disabled={o.disabled} sx={{ '&.Mui-selected': { bgcolor: 'primary.soft', color: 'primary.onSoft', '&:hover': { bgcolor: 'primary.soft' } } }}>
              {o.label}
            </ToggleButton>
          );
          // A disabled button takes no hover: the tip sits on a span around it.
          return o.tip ? (
            <Tooltip key={o.value} title={o.tip}>
              <span>{button}</span>
            </Tooltip>
          ) : (
            button
          );
        })}
      </ToggleButtonGroup>
    </Paper>
  );
}
