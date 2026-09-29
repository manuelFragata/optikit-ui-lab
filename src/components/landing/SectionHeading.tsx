import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export interface SectionHeadingProps {
  /** Small outlined tag above the title. */
  eyebrow?: string;
  title: ReactNode;
  /** Lead paragraph; sits in the right column on wide screens. */
  children?: ReactNode;
}

/** Small outlined pill that names a section without fencing it off. */
export function SectionTag({ children }: { children: ReactNode }) {
  return (
    <Box
      component="span"
      sx={(t) => ({
        display: 'inline-block',
        px: 1.5,
        py: 0.375,
        borderRadius: `${t.radius.pill}px`,
        border: `${t.layout.hairline}px solid ${(t.vars ?? t).palette.divider}`,
        typography: 'meta',
        color: 'text.secondary',
      })}
    >
      {children}
    </Box>
  );
}

/**
 * Section title in the flow of the page: a small tag, a large regular-weight
 * title on the left and the lead on the right. No rule; whitespace and the
 * page's guide lines carry the separation.
 */
export function SectionHeading({ eyebrow, title, children }: SectionHeadingProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 2, md: 6 },
        alignItems: 'end',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: children ? 'minmax(0, 3fr) minmax(0, 2fr)' : 'minmax(0, 1fr)' },
      }}
    >
      <Box>
        {eyebrow && (
          <Box sx={{ mb: { xs: 2, md: 2.5 } }}>
            <SectionTag>{eyebrow}</SectionTag>
          </Box>
        )}
        <Typography variant="headline" component="h2">
          {title}
        </Typography>
      </Box>
      {children && (
        <Typography variant="subtitle1" component="p" color="text.secondary" sx={{ fontWeight: 'fontWeightRegular', maxWidth: (t) => t.spacing(70) }}>
          {children}
        </Typography>
      )}
    </Box>
  );
}
