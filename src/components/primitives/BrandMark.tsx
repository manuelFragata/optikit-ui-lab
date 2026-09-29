import ButtonBase from '@mui/material/ButtonBase';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import { OpenUC2Mark } from './OpenUC2Mark';

export interface BrandMarkProps {
  /** Product name next to the org name. */
  product?: string;
  /** Makes the mark a "go home" button. */
  onClick?: () => void;
  /**
   * Brand colours (full-colour mark, blue wordmark in light mode). Turn off on
   * a coloured bar: the mark switches to the approved greyscale version and the
   * text inherits the bar's colour.
   */
  colored?: boolean;
}

/** openUC2 · Optikit wordmark: the openUC2 cube mark, the org name and the product. */
export function BrandMark({ product = 'Optikit', onClick, colored = true }: BrandMarkProps) {
  // The openUC2 blue is for the wordmark in light mode only.
  const wordmarkSx = colored
    ? (theme: Theme) => ({
        color: (theme.vars ?? theme).palette.text.primary,
        ...theme.applyStyles('light', { color: (theme.vars ?? theme).palette.brand.anchor }),
      })
    : undefined;

  const content = (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <OpenUC2Mark variant={colored ? 'auto' : 'mono'} sx={{ height: (theme) => theme.spacing(3), mr: 0.5 }} />
      <Typography
        variant="caption"
        component="span"
        sx={[{ fontWeight: 'fontWeightBold', letterSpacing: '0.02em' }, wordmarkSx ?? {}]}
      >
        openUC2
      </Typography>
      <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'fontWeightMedium' }}>
        {product}
      </Typography>
    </Stack>
  );

  if (!onClick) return content;
  return (
    <ButtonBase onClick={onClick} aria-label={`${product} home`} sx={{ borderRadius: 1, px: 0.5, mx: -0.5 }}>
      {content}
    </ButtonBase>
  );
}
