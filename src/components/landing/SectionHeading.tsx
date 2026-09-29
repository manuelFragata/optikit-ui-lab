import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export interface SectionHeadingProps {
  title: ReactNode;
  /** Lead paragraph; sits in the right column on wide screens. */
  children?: ReactNode;
}

/**
 * Section title in the flow of the page: a large regular-weight title on the
 * left and the lead on the right. No rule and no label; whitespace does the
 * separating.
 */
export function SectionHeading({ title, children }: SectionHeadingProps) {
  return (
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
  );
}
