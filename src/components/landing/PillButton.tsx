import Box from '@mui/material/Box';
import Button, { type ButtonProps } from '@mui/material/Button';
import NorthEastIcon from '@mui/icons-material/NorthEast';

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

/**
 * Landing-page call to action: a pill, optionally with a round ↗ arrow. The
 * label is centred on the whole pill: the arrow sits over the end, with the
 * same room kept free on both sides.
 */
export function PillButton({ tone = 'solid', arrow = true, children, sx, ...rest }: PillButtonProps) {
  const solid = tone === 'solid';
  const paper = tone === 'paper';
  const side = arrow ? ARROW + ARROW_INSET + 1.25 : 2.25;
  return (
    <Button
      {...rest}
      variant={solid || paper ? 'contained' : 'outlined'}
      sx={[
        (t) => ({
          position: 'relative',
          borderRadius: `${t.radius.pill}px`,
          px: side,
          py: 0.75,
          minHeight: arrow ? t.spacing(ARROW + 2 * ARROW_INSET) : undefined,
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
