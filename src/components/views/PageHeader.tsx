import type { ReactNode, Ref } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export interface PageHeaderProps {
  title: ReactNode;
  /** A word over the title: what kind of page, or who it is for. */
  eyebrow?: ReactNode;
  /** What the page is for, in a sentence or two. */
  lead?: ReactNode;
  /** The page's own actions, on the right (under the lead on a narrow screen). */
  actions?: ReactNode;
  titleRef?: Ref<HTMLHeadingElement>;
}

/**
 * The head of a workspace page (Projects, File, Commercial, Explore), in the
 * app's type scale as on Home and Account: the title at h1 (24 px), the lead
 * under it, the actions on the right. The landing page's display sizes stay
 * on the landing page.
 */
export function PageHeader({ title, eyebrow, lead, actions, titleRef }: PageHeaderProps) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} useFlexGap sx={{ gap: 2, alignItems: { xs: 'stretch', md: 'flex-end' }, justifyContent: 'space-between', mb: 3 }}>
      <Box sx={{ minWidth: 0, maxWidth: 720 }}>
        {eyebrow && <Box sx={{ mb: 1 }}>{eyebrow}</Box>}
        <Typography ref={titleRef} variant="h1" component="h1">
          {title}
        </Typography>
        {lead && (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            {lead}
          </Typography>
        )}
      </Box>
      {actions && (
        <Stack direction="row" useFlexGap sx={{ gap: 1.5, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}
