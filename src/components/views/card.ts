import type { Theme } from '@mui/material/styles';

/** A card in the workspace views, as on the landing page: large radius, hairline. */
export const cardSx = (t: Theme) => ({
  borderRadius: `${t.radius.card}px`,
  border: `${t.layout.hairline}px solid ${(t.vars ?? t).palette.divider}`,
  bgcolor: 'background.paper',
  p: 3,
});
