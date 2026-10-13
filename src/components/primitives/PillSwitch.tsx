import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

export interface PillSwitchProps<T extends string> {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  'aria-label'?: string;
}

/**
 * One of a few options, as on the landing page (its Schematic ⇄ Assembly
 * switch): a hairline pill with an ink highlight that slides under the
 * chosen one. The options share the width equally.
 */
export function PillSwitch<T extends string>({ value, options, onChange, 'aria-label': ariaLabel }: PillSwitchProps<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <Box
      role="radiogroup"
      aria-label={ariaLabel}
      sx={(t) => ({
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
        p: 0.5,
        borderRadius: `${t.radius.pill}px`,
        bgcolor: 'background.paper',
        border: `${t.layout.hairline}px solid ${(t.vars ?? t).palette.divider}`,
      })}
    >
      <Box
        aria-hidden
        sx={(t) => ({
          position: 'absolute',
          top: t.spacing(0.5),
          bottom: t.spacing(0.5),
          left: t.spacing(0.5),
          width: `calc((100% - ${t.spacing(1)}) / ${options.length})`,
          borderRadius: `${t.radius.pill}px`,
          bgcolor: 'text.primary',
          transform: `translateX(${index * 100}%)`,
          transition: `transform 400ms ${EASE}`,
        })}
      />
      {options.map((o) => {
        const on = o.value === value;
        return (
          <ButtonBase
            key={o.value}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            sx={(t) => ({
              position: 'relative',
              px: 1.75,
              py: 0.625,
              borderRadius: `${t.radius.pill}px`,
              typography: 'subtitle2',
              whiteSpace: 'nowrap',
              color: on ? 'background.paper' : 'text.secondary',
              transition: `color 300ms ${EASE}`,
              '&:hover': { color: on ? 'background.paper' : 'text.primary' },
            })}
          >
            {o.label}
          </ButtonBase>
        );
      })}
    </Box>
  );
}
