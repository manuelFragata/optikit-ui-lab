import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export type HeaderVariant = 'navy' | 'light';

export interface AppHeaderProps {
  variant?: HeaderVariant;
  title?: string;
  projectName?: string;
  /** Right-hand actions. Icon buttons should use `color="inherit"`. */
  actions?: ReactNode;
}

/** Top application bar, either a solid navy bar or a light surface bar. */
export function AppHeader({ variant = 'navy', title = 'Optikit', projectName, actions }: AppHeaderProps) {
  const navy = variant === 'navy';

  return (
    <Box
      component="header"
      sx={{
        flexShrink: 0,
        bgcolor: navy ? 'header.main' : 'background.paper',
        color: navy ? 'header.contrastText' : 'text.primary',
        borderBottom: navy ? 0 : 1,
        borderColor: 'divider',
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: 'center',
          height: (theme) => theme.spacing(theme.layout.headerHeight),
          px: 2,
        }}
      >
        <Box
          aria-hidden
          sx={{
            width: (theme) => theme.spacing(3),
            height: (theme) => theme.spacing(3),
            borderRadius: 1,
            bgcolor: 'accent.main',
          }}
        />
        <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'fontWeightBold' }}>
          {title}
        </Typography>
        {projectName && (
          <>
            <Divider orientation="vertical" flexItem sx={{ borderColor: 'currentColor', opacity: 0.3, my: 2 }} />
            <Typography variant="body2" component="span" noWrap sx={{ opacity: 0.85 }}>
              {projectName}
            </Typography>
          </>
        )}
        <Box sx={{ flex: 1 }} />
        {actions}
      </Stack>
    </Box>
  );
}
