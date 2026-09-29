import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useColorScheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { demoUser } from '../../demo/user';
import { DashboardCard } from '../cards/DashboardCard';
import type { AccountUser } from '../compositions/AccountMenu';
import { PageContainer } from '../compositions/PageContainer';
import { SiteFooter } from '../compositions/SiteFooter';
import { SiteHeader } from '../compositions/SiteHeader';

export interface AccountPageProps {
  user?: AccountUser;
  onSave?: (user: AccountUser) => void;
  onHome?: () => void;
  onLogOut?: () => void;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <Box sx={(t) => ({ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: `${t.spacing(26)} 1fr` }, py: 2, borderBottom: 1, borderColor: 'divider' })}>
      <Box>
        <Typography variant="subtitle2">{label}</Typography>
        {hint && (
          <Typography variant="body2" color="text.secondary">
            {hint}
          </Typography>
        )}
      </Box>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

/** Account settings: profile and preferences. */
export function AccountPage({ user = demoUser, onSave, onHome, onLogOut }: AccountPageProps) {
  const [draft, setDraft] = useState(user);
  const [saved, setSaved] = useState(false);
  const { mode, setMode } = useColorScheme();
  const [units, setUnits] = useState('mm');
  const dirty = draft.name !== user.name || draft.email !== user.email || draft.initials !== user.initials;

  return (
    <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <SiteHeader user={user} onHome={onHome} onProjects={onHome} onLogOut={onLogOut} />

      <PageContainer component="main" sx={{ flex: 1, pt: { xs: 3, md: 5 }, pb: { xs: 6, md: 8 } }}>
        <Box sx={{ maxWidth: (t) => t.spacing(110) }}>
          <Link component="button" variant="body2" onClick={onHome} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
            <ArrowBackIcon sx={{ fontSize: '1rem' }} /> Back to projects
          </Link>
          <Typography variant="h1" sx={{ mb: 3 }}>
            Account settings
          </Typography>

          <Stack spacing={4}>
            <DashboardCard title="Profile">
              <Field label="Name">
                <TextField fullWidth value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} slotProps={{ htmlInput: { 'aria-label': 'Name' } }} />
              </Field>
              <Field label="Email">
                <TextField fullWidth type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} slotProps={{ htmlInput: { 'aria-label': 'Email' } }} />
              </Field>
              <Field label="Avatar initials" hint="Two letters.">
                <TextField
                  value={draft.initials}
                  onChange={(e) => setDraft({ ...draft, initials: e.target.value.slice(0, 2).toLowerCase() })}
                  slotProps={{ htmlInput: { 'aria-label': 'Avatar initials', maxLength: 2 } }}
                  sx={{ width: (t) => t.spacing(12) }}
                />
              </Field>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', pt: 2 }}>
                <Button
                  variant="contained"
                  disabled={!dirty}
                  onClick={() => {
                    onSave?.(draft);
                    setSaved(true);
                  }}
                >
                  Save profile
                </Button>
                {saved && !dirty && (
                  <Typography variant="body2" color="text.secondary">
                    Saved.
                  </Typography>
                )}
              </Stack>
            </DashboardCard>

            <DashboardCard title="Preferences">
              <Field label="Theme" hint="System follows your OS setting.">
                <ToggleButtonGroup exclusive size="small" value={mode ?? 'system'} onChange={(_, next) => next && setMode(next)}>
                  <ToggleButton value="light">Light</ToggleButton>
                  <ToggleButton value="dark">Dark</ToggleButton>
                  <ToggleButton value="system">System</ToggleButton>
                </ToggleButtonGroup>
              </Field>
              <Field label="Default units" hint="For new designs.">
                <ToggleButtonGroup exclusive size="small" value={units} onChange={(_, next) => next && setUnits(next)}>
                  <ToggleButton value="mm">mm</ToggleButton>
                  <ToggleButton value="in">in</ToggleButton>
                </ToggleButtonGroup>
              </Field>
              <Stack direction="row" sx={{ pt: 2 }}>
                <Button variant="outlined" color="error" onClick={onLogOut}>
                  Log out
                </Button>
              </Stack>
            </DashboardCard>
          </Stack>
        </Box>
      </PageContainer>

      <SiteFooter />
    </Box>
  );
}
