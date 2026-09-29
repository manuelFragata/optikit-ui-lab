import Chip, { type ChipProps } from '@mui/material/Chip';

export type TagTone = 'neutral' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';

export interface TagChipProps extends Omit<ChipProps, 'color' | 'variant'> {
  tone?: TagTone;
  /** `subtle` is outlined, `solid` is filled. */
  emphasis?: 'subtle' | 'solid';
}

/** Small tag / status chip. Tones map onto theme palette roles. */
export function TagChip({ tone = 'neutral', emphasis = 'subtle', sx, ...rest }: TagChipProps) {
  const variant = emphasis === 'solid' ? 'filled' : 'outlined';

  if (tone === 'accent') {
    const accentSx =
      emphasis === 'solid'
        ? { bgcolor: 'accent.main', color: 'accent.contrastText' }
        : { borderColor: 'accent.main', color: 'text.primary' };
    return <Chip variant={variant} sx={[accentSx, ...(Array.isArray(sx) ? sx : [sx])]} {...rest} />;
  }

  return <Chip variant={variant} color={tone === 'neutral' ? 'default' : tone} sx={sx} {...rest} />;
}
