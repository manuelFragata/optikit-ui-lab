import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import GitHubIcon from '@mui/icons-material/GitHub';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import SearchIcon from '@mui/icons-material/Search';
import { ColorSchemeToggle } from '../primitives/ColorSchemeToggle';
import { OpenUC2Mark } from '../primitives/OpenUC2Mark';
import { AccountMenu, type AccountUser } from './AccountMenu';
import { PageContainer } from './PageContainer';

export interface SiteNavItem {
  label: string;
  onClick: () => void;
}

export interface SiteHeaderProps {
  /** Signed-in account, or `null` when signed out. */
  user?: AccountUser | null;
  /** Section links in the middle of the bar (e.g. Examples, Community, Pricing). */
  nav?: SiteNavItem[];
  githubUrl?: string;
  helpUrl?: string;
  /** The help button; the signed-out landing page leaves it out. */
  showHelp?: boolean;
  onHome?: () => void;
  onSearch?: () => void;
  onLogIn?: () => void;
  onSignUp?: () => void;
  onProjects?: () => void;
  onAccount?: () => void;
  onLogOut?: () => void;
}

/** Plain icon button used in the top bar (search, GitHub, help). */
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
        sx={{ color: 'text.primary' }}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}

/** Wordmark in openUC2 blue (light mode only; ink on dark). */
const wordmarkSx = (theme: Theme) => ({
  color: (theme.vars ?? theme).palette.text.primary,
  ...theme.applyStyles('light', { color: (theme.vars ?? theme).palette.brand.anchor }),
});

/** Translucent bar: the page shows through, blurred, so it reads as a layer above the content. */
const barSx = (theme: Theme) => ({
  backgroundColor: `color-mix(in srgb, ${(theme.vars ?? theme).palette.background.paper} ${theme.layout.topbarTint}%, transparent)`,
  backdropFilter: `blur(${theme.spacing(theme.layout.topbarBlur)})`,
});

/**
 * Site top bar for document-style pages: wordmark on the left, optional
 * section links, utilities and account on the right. Sticks to the top while
 * the page scrolls under it.
 */
export function SiteHeader({
  user = null,
  nav,
  githubUrl = 'https://github.com/openUC2',
  helpUrl = '#help',
  showHelp = true,
  onHome,
  onSearch,
  onLogIn,
  onSignUp,
  onProjects,
  onAccount,
  onLogOut,
}: SiteHeaderProps) {
  return (
    <Box
      component="header"
      sx={[
        { position: 'sticky', top: 0, zIndex: 'appBar', flexShrink: 0, borderBottom: 1, borderColor: 'divider' },
        barSx,
      ]}
    >
      <PageContainer sx={{ display: 'flex', alignItems: 'center', gap: 3, minHeight: (t) => t.spacing(t.layout.topbarHeight) }}>
        <ButtonBase onClick={onHome} aria-label="Optikit home" sx={{ borderRadius: 1, flexShrink: 0 }}>
          {/* Clear space between mark and wordmark: about the height of a capital, per the brand guide. */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <OpenUC2Mark sx={{ height: (theme) => theme.spacing(4) }} />
            <Typography component="span" sx={[{ typography: 'h2', fontWeight: 'fontWeightBold', lineHeight: 1 }, wordmarkSx]}>
              Optikit
            </Typography>
            <Typography variant="overline" component="span" color="text.secondary" sx={{ display: { xs: 'none', sm: 'inline' }, alignSelf: 'flex-end', lineHeight: 1.4, textTransform: 'none', letterSpacing: '0.02em' }}>
              by openUC2
            </Typography>
          </Stack>
        </ButtonBase>

        {nav && nav.length > 0 && (
          <Stack component="nav" aria-label="Page sections" direction="row" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
            {nav.map((item) => (
              <Button key={item.label} variant="text" onClick={item.onClick} sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
                {item.label}
              </Button>
            ))}
          </Stack>
        )}

        <Box sx={{ flex: 1 }} />

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <ColorSchemeToggle variant="switch" />
          </Box>
          <Stack direction="row" spacing={0.25} sx={{ display: { xs: 'none', md: 'flex' } }}>
            <RoundButton label="Search" onClick={onSearch}>
              <SearchIcon fontSize="small" />
            </RoundButton>
            <RoundButton label="Optikit on GitHub" href={githubUrl}>
              <GitHubIcon fontSize="small" />
            </RoundButton>
            {showHelp && (
              <RoundButton label="Help" href={helpUrl}>
                <QuestionMarkIcon fontSize="small" />
              </RoundButton>
            )}
          </Stack>
          <Box sx={{ pl: 1 }}>
            <AccountMenu
              user={user}
              size={5}
              onLogIn={onLogIn}
              onSignUp={onSignUp}
              onProjects={onProjects}
              onAccount={onAccount}
              onLogOut={onLogOut}
            />
          </Box>
        </Stack>
      </PageContainer>
    </Box>
  );
}
