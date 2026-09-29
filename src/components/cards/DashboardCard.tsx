import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export interface DashboardCardProps {
  /** Section title, shown above the card. */
  title: ReactNode;
  /** Right side of the title row: a link or a small button. */
  action?: ReactNode;
  /** Removes the body padding, for edge-to-edge lists. */
  flush?: boolean;
  /** Stretch the card to fill the rest of its column. */
  grow?: boolean;
  /** Render children without the card frame (e.g. a card stack that draws its own). */
  unframed?: boolean;
  children: ReactNode;
}

/** Landing-page section: a title above a large, rounded, hairline card. */
export function DashboardCard({ title, action, flush, grow, unframed, children }: DashboardCardProps) {
  return (
    <Stack component="section" spacing={1.5} sx={{ minWidth: 0, flex: grow ? 1 : undefined }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between', px: 0.5 }}>
        <Typography variant="h2" component="h2" sx={{ fontSize: '1.25rem' }}>
          {title}
        </Typography>
        {action}
      </Stack>
      {unframed ? (
        children
      ) : (
        <Paper
          variant="outlined"
          sx={{
            flex: grow ? 1 : undefined,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: (theme) => `${theme.radius.card}px`,
          }}
        >
          <Box sx={{ flex: 1, p: flush ? 0 : 2.5, display: 'flex', flexDirection: 'column' }}>{children}</Box>
        </Paper>
      )}
    </Stack>
  );
}
