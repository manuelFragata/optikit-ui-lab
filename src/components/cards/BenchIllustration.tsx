import Box from '@mui/material/Box';

export interface BenchIllustrationProps {
  /** Accessible description; omit for purely decorative use. */
  label?: string;
}

// Isometric cube outline in a 40 × 44 cell (viewBox units, not px).
const CUBE = 'M0 10 L20 0 L40 10 L20 20 Z M0 10 V34 L20 44 V20 M40 10 V34 L20 44';

/**
 * Line-art optical bench: a laser, three cubes and a folded ray on a dot grid.
 * Fills leftover space (e.g. under a short project list) so the page never looks empty.
 */
export function BenchIllustration({ label }: BenchIllustrationProps) {
  return (
    <Box
      sx={{
        position: 'relative',
        flex: 1,
        minHeight: (theme) => theme.spacing(26),
        borderRadius: (theme) => `${theme.radius.card}px`,
        border: 1,
        borderColor: 'divider',
        borderStyle: 'dashed',
        overflow: 'hidden',
        color: 'text.meta',
        backgroundImage: (theme) =>
          `radial-gradient(${(theme.vars ?? theme).palette.divider} ${theme.layout.hairline}px, transparent ${theme.layout.hairline}px)`,
        backgroundSize: (theme) => `${theme.spacing(2)} ${theme.spacing(2)}`,
      }}
    >
      <Box sx={{ position: 'absolute', inset: (theme) => theme.spacing(3) }}>
        <Box
          component="svg"
          viewBox="0 0 260 150"
          preserveAspectRatio="xMidYMid meet"
          role={label ? 'img' : undefined}
          aria-label={label}
          aria-hidden={label ? undefined : true}
          sx={{ display: 'block', width: '100%', height: '100%' }}
        >
          <g fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinejoin="round" vectorEffect="non-scaling-stroke">
            {/* laser */}
            <rect x={6} y={38} width={34} height={18} rx={2} />
            <path d="M14 52 L30 42" />
            {/* cubes */}
            <path d={CUBE} transform="translate(92 30)" />
            <path d={CUBE} transform="translate(160 30)" />
            <path d={CUBE} transform="translate(160 94)" />
            {/* 45° mirror and detector */}
            <path d="M172 48 L192 68" strokeWidth={2} />
            <rect x={214} y={106} width={30} height={22} rx={2} />
            <path d="M214 112 L206 108 V126 L214 122" />
          </g>
          {/* ray */}
          <Box component="g" sx={{ color: 'primary.main' }}>
            <path
              d="M40 47 H182 V112 H204"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <path d="M200 108 L208 112 L200 116 Z" fill="currentColor" />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
