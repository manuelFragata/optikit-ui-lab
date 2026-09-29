import Box from '@mui/material/Box';

export interface CubeThumbnailProps {
  /** Number of cubes (1–6). */
  cubes?: number;
  /** `row`: cubes in a line with a ray through them. `mosaic`: 2-wide grid, no ray (collections). */
  layout?: 'row' | 'mosaic';
  /** `card`: design-card height. `tile`: half height, for gallery tiles. `compact`: list-row height. */
  size?: 'card' | 'tile' | 'compact';
  /** Accessible description; omit for purely decorative use. */
  label?: string;
}

// Isometric cube outline in a 40 × 44 cell (viewBox units, not px).
const CUBE = 'M0 10 L20 0 L40 10 L20 20 Z M0 10 V34 L20 44 V20 M40 10 V34 L20 44';
const PITCH_X = 46;
const PITCH_Y = 50;

/** Line-art thumbnail used on design cards. Never a photograph. */
export function CubeThumbnail({ cubes = 3, layout = 'row', size = 'card', label }: CubeThumbnailProps) {
  const compact = size === 'compact';
  const heightFactor = { card: 1, tile: 1 / 2, compact: 1 / 3 }[size];
  const count = Math.max(1, Math.min(6, cubes));
  const cols = layout === 'row' ? count : Math.min(2, count);
  const rows = Math.ceil(count / cols);
  const width = (cols - 1) * PITCH_X + 40;
  const height = (rows - 1) * PITCH_Y + 44;
  const pad = 16;

  return (
    <Box
      sx={{
        height: (theme) => theme.spacing(theme.layout.thumbnailHeight * heightFactor),
        position: 'relative',
        bgcolor: 'background.sunken',
        color: 'text.primary',
      }}
    >
      <Box sx={{ position: 'absolute', inset: (theme) => theme.spacing(compact ? 0.5 : size === 'tile' ? 1.25 : 2) }}>
      <Box
        component="svg"
        viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`}
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        sx={{ display: 'block', width: '100%', height: '100%' }}
      >
        {Array.from({ length: count }, (_, i) => (
          <path
            key={i}
            d={CUBE}
            transform={`translate(${(i % cols) * PITCH_X} ${Math.floor(i / cols) * PITCH_Y})`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.25}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {layout === 'row' && (
          <Box component="g" sx={{ color: 'primary.main' }}>
            <line x1={-pad + 4} y1={10} x2={width + pad - 6} y2={10} stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            <path d={`M${width + pad - 10} 6 L${width + pad - 2} 10 L${width + pad - 10} 14 Z`} fill="currentColor" />
          </Box>
        )}
      </Box>
      </Box>
    </Box>
  );
}
