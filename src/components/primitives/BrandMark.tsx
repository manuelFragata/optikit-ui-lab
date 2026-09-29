import ButtonBase from '@mui/material/ButtonBase';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';

export interface BrandMarkProps {
  /** Product name next to the org name. */
  product?: string;
  /** Makes the mark a "go home" button. */
  onClick?: () => void;
}

/**
 * openUC2 · Optikit wordmark. The cube icon stands in for the real logo;
 * swap in the SVG here and every header follows.
 */
export function BrandMark({ product = 'Optikit', onClick }: BrandMarkProps) {
  const content = (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <ViewInArOutlinedIcon fontSize="small" sx={{ color: 'inherit' }} />
      <Typography variant="caption" component="span" sx={{ fontWeight: 'fontWeightBold', letterSpacing: '0.02em' }}>
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
