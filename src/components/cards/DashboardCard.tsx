import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export interface DashboardCardProps {
  title: ReactNode;
  icon?: ReactNode;
  /** One line under the title. */
  subtitle?: ReactNode;
  /** Right side of the header: a link or a button. */
  action?: ReactNode;
  /** Removes the body padding, for edge-to-edge lists. */
  flush?: boolean;
  children: ReactNode;
}

/** Hairline-bordered section card for the home page. */
export function DashboardCard({ title, icon, subtitle, action, flush, children }: DashboardCardProps) {
  return (
    <Paper
      component="section"
      variant="outlined"
      sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', px: 2.5, pt: 2, pb: 1.5 }}>
        {icon && <Box sx={{ display: 'flex', color: 'primary.main', pt: 0.25 }}>{icon}</Box>}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" component="h2">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Stack>
      <Box sx={{ flex: 1, px: flush ? 0 : 2.5, pb: flush ? 0 : 2.5 }}>{children}</Box>
    </Paper>
  );
}
