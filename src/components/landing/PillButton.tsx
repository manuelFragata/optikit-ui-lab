import Box from '@mui/material/Box';
import Button, { type ButtonProps } from '@mui/material/Button';
import NorthEastIcon from '@mui/icons-material/NorthEast';

export interface PillButtonProps extends Omit<ButtonProps, 'variant' | 'endIcon'> {
  /** `solid`: ink fill, for the one main action. `outline`: hairline. */
  tone?: 'solid' | 'outline';
  /** Show the round ↗ arrow at the end. */
  arrow?: boolean;
}

/** Landing-page call to action: a pill, optionally with a round ↗ arrow. */
export function PillButton({ tone = 'solid', arrow = true, children, sx, ...rest }: PillButtonProps) {
  const solid = tone === 'solid';
  return (
    <Button
      {...rest}
      variant={solid ? 'contained' : 'outlined'}
      sx={[
        (t) => ({
          borderRadius: `${t.radius.pill}px`,
          pl: 2.25,
          pr: arrow ? 0.75 : 2.25,
          py: 0.75,
          gap: 1.25,
          ...(solid
            ? { bgcolor: 'text.primary', color: 'background.paper', '&:hover': { bgcolor: 'text.primary', opacity: 0.88 } }
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
            display: 'grid',
            placeItems: 'center',
            width: t.spacing(3.5),
            height: t.spacing(3.5),
            borderRadius: '50%',
            bgcolor: solid ? 'background.paper' : 'text.primary',
            color: solid ? 'text.primary' : 'background.paper',
          })}
        >
          <NorthEastIcon sx={{ fontSize: '0.875rem' }} />
        </Box>
      )}
    </Button>
  );
}
