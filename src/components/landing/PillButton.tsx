import Box from '@mui/material/Box';
import Button, { type ButtonProps } from '@mui/material/Button';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import { pressDown, pressUp } from './motion';

export interface PillButtonProps extends Omit<ButtonProps, 'variant' | 'endIcon'> {
  /** `solid`: brand-blue fill, for the one main action. `outline`: hairline. `paper`: for use on a blue or ink surface. */
  tone?: 'solid' | 'outline' | 'paper';
  /** Show the round ↗ arrow at the end. */
  arrow?: boolean;
}

/** Diameter of the round arrow, spacing units. */
const ARROW = 3.5;
/** Its inset from the pill's end, spacing units. */
const ARROW_INSET = 0.75;

/** Room between the label and the arrow, spacing units. */
const ARROW_GAP = 1.5;
/** Room before the label, spacing units: the arrow's inset plus its gap, so both ends of the pill read alike. */
const LEAD = 2.25;

/**
 * Landing-page call to action: a pill, optionally with a round ↗ arrow at the
 * end. The label starts close to the pill's start; the arrow keeps the room it
 * needs at the other end.
 */
export function PillButton({ tone = 'solid', arrow = true, children, sx, onPointerDown, onPointerUp, onPointerLeave, ...rest }: PillButtonProps) {
  const solid = tone === 'solid';
  const paper = tone === 'paper';
  return (
    <Button
      {...rest}
      onPointerDown={(e) => {
        pressDown(e.currentTarget);
        onPointerDown?.(e);
      }}
      onPointerUp={(e) => {
        pressUp(e.currentTarget);
        onPointerUp?.(e);
      }}
      onPointerLeave={(e) => {
        pressUp(e.currentTarget);
        onPointerLeave?.(e);
      }}
      variant={solid || paper ? 'contained' : 'outlined'}
      sx={[
        (t) => ({
          position: 'relative',
          borderRadius: `${t.radius.pill}px`,
          pl: LEAD,
          pr: arrow ? ARROW + ARROW_INSET + ARROW_GAP : LEAD,
          py: 0.75,
          minHeight: arrow ? t.spacing(ARROW + 2 * ARROW_INSET) : undefined,
          '& .pill-arrow svg': { transition: 'transform 250ms cubic-bezier(0.22, 1, 0.36, 1)' },
          '&:hover .pill-arrow svg, &:focus-visible .pill-arrow svg': { transform: 'translate(1.5px, -1.5px)' },
          ...(solid
            ? { bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } }
            : paper
              ? { bgcolor: 'background.paper', color: 'text.primary', '&:hover': { bgcolor: 'background.paper', opacity: 0.9 } }
              : { borderColor: 'text.primary', color: 'text.primary' }),
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
      {arrow && (
        <Box
          component="span"
          className="pill-arrow"
          aria-hidden
          sx={(t) => ({
            position: 'absolute',
            right: t.spacing(ARROW_INSET),
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'grid',
            placeItems: 'center',
            width: t.spacing(ARROW),
            height: t.spacing(ARROW),
            borderRadius: '50%',
            bgcolor: solid ? 'primary.contrastText' : 'text.primary',
            color: solid ? 'primary.main' : 'background.paper',
          })}
        >
          <NorthEastIcon sx={{ fontSize: '0.875rem' }} />
        </Box>
      )}
    </Button>
  );
}
