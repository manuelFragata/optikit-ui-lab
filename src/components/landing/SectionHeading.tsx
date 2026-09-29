import type { ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export interface SectionHeadingProps {
  /** Small label above the title. */
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
  align?: 'left' | 'center';
}

/** Landing-page section title: eyebrow, headline and a short lead paragraph. */
export function SectionHeading({ eyebrow, title, children, align = 'left' }: SectionHeadingProps) {
  return (
    <Stack spacing={1.25} sx={{ textAlign: align, alignItems: align === 'center' ? 'center' : 'flex-start' }}>
      {eyebrow && (
        <Typography variant="overline" color="primary">
          {eyebrow}
        </Typography>
      )}
      <Typography variant="headline" component="h2">
        {title}
      </Typography>
      {children && (
        <Typography variant="subtitle1" component="p" color="text.secondary" sx={{ maxWidth: (t) => t.spacing(90), fontWeight: 'fontWeightRegular' }}>
          {children}
        </Typography>
      )}
    </Stack>
  );
}
