import Chip, { type ChipProps } from '@mui/material/Chip';

export type TagTone = 'neutral' | 'primary' | 'success' | 'warning' | 'error';

export interface TagChipProps extends Omit<ChipProps, 'color' | 'variant'> {
  tone?: TagTone;
  /** `subtle`: tinted fill (tags, status badges). `solid`: full-colour fill, for rare emphasis. */
  emphasis?: 'subtle' | 'solid';
  /** Leading dot, as on status badges ("● Linked"). */
  dot?: boolean;
}

/** Tag or status badge. Flat fills, no outline: tags are sunken, statuses are tinted. */
export function TagChip({ tone = 'neutral', emphasis = 'subtle', dot, sx, ...rest }: TagChipProps) {
  const toneSx =
    tone === 'neutral'
      ? emphasis === 'solid'
        ? { bgcolor: 'text.secondary', color: 'background.paper' }
        : { bgcolor: 'background.sunken', color: 'text.secondary' }
      : emphasis === 'solid'
        ? { bgcolor: `${tone}.main`, color: `${tone}.contrastText` }
        : { bgcolor: `${tone}.soft`, color: `${tone}.onSoft` };

  const dotSx = dot
    ? {
        '&::before': {
          content: '""',
          width: (theme: { spacing: (n: number) => string }) => theme.spacing(0.75),
          height: (theme: { spacing: (n: number) => string }) => theme.spacing(0.75),
          borderRadius: '50%',
          bgcolor: tone === 'neutral' ? 'text.secondary' : `${tone}.main`,
          ml: 1,
          mr: -0.25,
          flexShrink: 0,
        },
      }
    : {};

  return (
    <Chip
      variant="filled"
      sx={[toneSx, dotSx, { fontWeight: 'fontWeightMedium' }, ...(Array.isArray(sx) ? sx : [sx])]}
      {...rest}
    />
  );
}
