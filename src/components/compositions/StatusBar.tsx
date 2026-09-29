import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export interface StatusBarProps {
  status?: string;
  /** Left-aligned readouts (e.g. cursor position). */
  start?: ReactNode;
  /** Right-aligned readouts (e.g. zoom, units). */
  end?: ReactNode;
}

/** Thin bottom bar for status and readouts. */
export function StatusBar({ status = 'Ready', start, end }: StatusBarProps) {
  return (
    <Stack
      component="footer"
      direction="row"
      spacing={2}
      sx={{
        alignItems: 'center',
        height: (theme) => theme.spacing(theme.layout.statusBarHeight),
        px: 1.5,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        color: 'text.secondary',
        flexShrink: 0,
      }}
    >
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
        <Box
          aria-hidden
          sx={{ width: (theme) => theme.spacing(1), height: (theme) => theme.spacing(1), borderRadius: '50%', bgcolor: 'success.main' }}
        />
        <Typography variant="caption">{status}</Typography>
      </Stack>
      {start}
      <Box sx={{ flex: 1 }} />
      {end}
    </Stack>
  );
}
