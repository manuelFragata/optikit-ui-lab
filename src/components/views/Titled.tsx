import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/** A heading over a card (or a row of cards): the title sits outside, above the box. */
export function Titled({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" component="h2" sx={{ display: 'block', mb: 1 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
