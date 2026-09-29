import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export interface SectionHeadingProps {
  /** Section number, e.g. "02". */
  index?: string;
  /** Small label next to the number. */
  eyebrow?: string;
  title: ReactNode;
  /** Lead paragraph; sits in the right column on wide screens. */
  children?: ReactNode;
}

/**
 * Editorial section header: a hairline rule with the section's number and
 * name, a large regular-weight title on the left, the lead on the right.
 */
export function SectionHeading({ index, eyebrow, title, children }: SectionHeadingProps) {
  return (
    <Box sx={{ borderTop: 1, borderColor: 'divider', pt: { xs: 2, md: 2.5 } }}>
      {(index || eyebrow) && (
        <Stack direction="row" spacing={1.5} sx={{ mb: { xs: 2.5, md: 4 } }}>
          {index && (
            <Typography variant="meta" color="text.meta">
              {index}
            </Typography>
          )}
          {eyebrow && (
            <Typography variant="meta" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {eyebrow}
            </Typography>
          )}
        </Stack>
      )}
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 2, md: 6 },
          alignItems: 'end',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: children ? 'minmax(0, 3fr) minmax(0, 2fr)' : 'minmax(0, 1fr)' },
        }}
      >
        <Typography variant="headline" component="h2">
          {title}
        </Typography>
        {children && (
          <Typography variant="subtitle1" component="p" color="text.secondary" sx={{ fontWeight: 'fontWeightRegular', maxWidth: (t) => t.spacing(70) }}>
            {children}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
