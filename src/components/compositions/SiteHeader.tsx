import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import GitHubIcon from '@mui/icons-material/GitHub';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import SearchIcon from '@mui/icons-material/Search';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import { ColorSchemeToggle } from '../primitives/ColorSchemeToggle';
import { AccountMenu, type AccountUser } from './AccountMenu';

export interface SiteHeaderProps {
  /** Line under the wordmark: a greeting or the product pitch. */
  tagline?: ReactNode;
  /** Signed-in account, or `null` when signed out. */
  user?: AccountUser | null;
  githubUrl?: string;
  helpUrl?: string;
  onHome?: () => void;
  onSearch?: () => void;
  onLogIn?: () => void;
  onSignUp?: () => void;
  onProjects?: () => void;
  onAccount?: () => void;
  onLogOut?: () => void;
}

/** Round utility button used in the landing header (search, GitHub, help). */
function RoundButton({ label, children, href, onClick }: { label: string; children: ReactNode; href?: string; onClick?: () => void }) {
  const external = href?.startsWith('http');
  return (
    <Tooltip title={label}>
      <IconButton
        aria-label={label}
        component={href ? 'a' : 'button'}
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        onClick={onClick}
        sx={{
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          color: 'text.primary',
          width: (theme) => theme.spacing(5.5),
          height: (theme) => theme.spacing(5.5),
          '&:hover': { bgcolor: 'background.sunken' },
        }}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}

/** Wordmark in brand anchor (light mode only, per Bench). */
const wordmarkSx = (theme: Theme) => ({
  color: (theme.vars ?? theme).palette.text.primary,
  ...theme.applyStyles('light', { color: (theme.vars ?? theme).palette.brand.anchor }),
});

/**
 * Landing-page header: large wordmark with a tagline on the left, utilities
 * and account on the right. Sits on the page, not in a bar.
 */
export function SiteHeader({
  tagline,
  user = null,
  githubUrl = 'https://github.com/openUC2',
  helpUrl = '#help',
  onHome,
  onSearch,
  onLogIn,
  onSignUp,
  onProjects,
  onAccount,
  onLogOut,
}: SiteHeaderProps) {
  return (
    <Box component="header" sx={{ flexShrink: 0 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
      >
        <ButtonBase onClick={onHome} aria-label="Optikit home" sx={{ borderRadius: 1, textAlign: 'left', display: 'block' }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <ViewInArOutlinedIcon sx={{ color: 'brand.lime', fontSize: (theme) => theme.spacing(4.5) }} />
            <Typography component="span" sx={[{ typography: 'h1', fontSize: '2rem', lineHeight: 1 }, wordmarkSx]}>
              Optikit
            </Typography>
            <Typography variant="overline" component="span" color="text.secondary" sx={{ alignSelf: 'flex-end' }}>
              by openUC2
            </Typography>
          </Stack>
          {tagline && (
            <Typography variant="body1" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
              {tagline}
            </Typography>
          )}
        </ButtonBase>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <ColorSchemeToggle variant="switch" />
          <RoundButton label="Search" onClick={onSearch}>
            <SearchIcon fontSize="small" />
          </RoundButton>
          <RoundButton label="Optikit on GitHub" href={githubUrl}>
            <GitHubIcon fontSize="small" />
          </RoundButton>
          <RoundButton label="Help" href={helpUrl}>
            <QuestionMarkIcon fontSize="small" />
          </RoundButton>
          <Box sx={{ pl: 0.5 }}>
            <AccountMenu
              user={user}
              size={7}
              onLogIn={onLogIn}
              onSignUp={onSignUp}
              onProjects={onProjects}
              onAccount={onAccount}
              onLogOut={onLogOut}
            />
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
}
