import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import GitHubIcon from '@mui/icons-material/GitHub';
import { BrandMark } from '../primitives/BrandMark';
import { ColorSchemeToggle } from '../primitives/ColorSchemeToggle';

export interface SiteHeaderProps {
  signedIn?: boolean;
  /** Shown in the avatar when signed in. */
  userInitials?: string;
  githubUrl?: string;
  onHome?: () => void;
  onLogIn?: () => void;
  onSignUp?: () => void;
}

/** Top bar for document-style pages (home, browse): brand left, account and utilities right. */
export function SiteHeader({
  signedIn = false,
  userInitials = 'be',
  githubUrl = 'https://github.com/openUC2',
  onHome,
  onLogIn,
  onSignUp,
}: SiteHeaderProps) {
  return (
    <Box
      component="header"
      sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          height: (theme) => theme.spacing(theme.layout.headerHeight),
          px: { xs: 2, md: 3 },
          color: 'text.primary',
        }}
      >
        <BrandMark onClick={onHome} />
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Optikit on GitHub">
          <IconButton color="inherit" aria-label="Optikit on GitHub" href={githubUrl} target="_blank" rel="noopener noreferrer">
            <GitHubIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <ColorSchemeToggle />
        <Divider orientation="vertical" flexItem sx={{ my: 2 }} />
        {signedIn ? (
          <Avatar
            sx={{
              width: (theme) => theme.spacing(4.5),
              height: (theme) => theme.spacing(4.5),
              typography: 'caption',
              bgcolor: 'background.sunken',
              color: 'text.primary',
              border: 1,
              borderColor: 'divider',
            }}
          >
            {userInitials}
          </Avatar>
        ) : (
          <Stack direction="row" spacing={1}>
            <Button variant="text" onClick={onLogIn}>
              Log in
            </Button>
            <Button variant="contained" onClick={onSignUp}>
              Sign up
            </Button>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
