import type { ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

/**
 * Nothing to show yet, the same way everywhere in the editor: an icon, what
 * is missing in a few words, and what to do about it. Centred in its panel or
 * pane, near the top.
 */
export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center', px: 3, py: 6, mx: 'auto', maxWidth: 360, color: 'text.secondary' }}>
      {icon}
      <Typography variant="subtitle2">{title}</Typography>
      {children && <Typography variant="body2">{children}</Typography>}
    </Stack>
  );
}
