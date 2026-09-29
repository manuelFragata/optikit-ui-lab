import { useEffect, useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import GitHubIcon from '@mui/icons-material/GitHub';
import { OpenUC2Mark } from '../primitives/OpenUC2Mark';

export type AuthMode = 'login' | 'signup';

export interface AuthDialogProps {
  open: boolean;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
  /** Called with what the user typed; the prototype signs in whatever is entered. */
  onSubmit: (values: { mode: AuthMode; name: string; email: string }) => void;
  /** Pre-filled email, so the prototype can be clicked through. */
  defaultEmail?: string;
}

/** Log in / sign up dialog. Prototype only: no real authentication happens. */
export function AuthDialog({ open, mode, onModeChange, onClose, onSubmit, defaultEmail = 'manu@openuc2.com' }: AuthDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('optikit');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setBusy(false);
  }, [open]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    // A short pause so the prototype feels like a round trip.
    window.setTimeout(() => onSubmit({ mode, name: name.trim(), email: email.trim() }), 500);
  };

  const login = mode === 'login';

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: (t) => `${t.radius.card}px` } } }}
    >
      <Box component="form" onSubmit={submit} sx={{ p: 3 }}>
        <Stack direction="row" sx={{ alignItems: 'flex-start', mb: 2 }}>
          <Stack spacing={0.5} sx={{ flex: 1 }}>
            <OpenUC2Mark sx={{ height: (theme) => theme.spacing(4), mb: 1, alignSelf: 'flex-start' }} />
            <Typography variant="h2" component="h2">
              {login ? 'Log in to Optikit' : 'Create your Optikit account'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {login ? 'Pick up your designs where you left them.' : 'Save designs, share them and join the community.'}
            </Typography>
          </Stack>
          <IconButton aria-label="Close" onClick={onClose} disabled={busy} sx={{ mt: -1, mr: -1 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Tabs value={mode} onChange={(_, next: AuthMode) => onModeChange(next)} sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}>
          <Tab value="login" label="Log in" />
          <Tab value="signup" label="Sign up" />
        </Tabs>

        <Stack spacing={2}>
          {!login && (
            <TextField label="Name" placeholder="Manu" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" fullWidth />
          )}
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required fullWidth />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={login ? 'current-password' : 'new-password'}
            required
            fullWidth
          />
          {login && (
            <Link component="button" type="button" variant="body2" sx={{ alignSelf: 'flex-start' }}>
              Forgot password?
            </Link>
          )}
          <Button type="submit" variant="contained" size="large" disabled={busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {login ? 'Log in' : 'Create account'}
          </Button>
          <Divider>
            <Typography variant="caption" color="text.meta">
              or
            </Typography>
          </Divider>
          <Button variant="outlined" size="large" startIcon={<GitHubIcon />} disabled={busy} onClick={() => onSubmit({ mode, name: '', email: '' })}>
            Continue with GitHub
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            Prototype: any details sign you in as the demo user.
          </Typography>
        </Stack>
      </Box>
    </Dialog>
  );
}
