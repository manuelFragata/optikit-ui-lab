import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useColorScheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { PillButton } from '../components/landing/PillButton';
import { PillSwitch } from '../components/primitives/PillSwitch';
import { useBuildNotes } from '../ports/build';
import { DEFAULT_PREFERENCES, usePreferences, type Preferences } from './preferences';

export interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  value: Preferences;
  onChange: (patch: Partial<Preferences>) => void;
}

const SIZES = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
] as const;

/**
 * Settings: how the person likes to work, kept between sessions. Changes
 * apply at once. Dressed like the landing page and New project: a large
 * card, a headline, small-caps sections and pill switches.
 */
export function SettingsDialog({ open, onClose, value, onChange }: SettingsDialogProps) {
  // The colour scheme is MUI's own (it keeps it too).
  const { mode, setMode } = useColorScheme();
  const notes = useBuildNotes();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: (t) => ({ borderRadius: `${t.radius.card}px`, border: `${t.layout.hairline}px solid`, borderColor: 'divider', backgroundImage: 'none' }) } }}
    >
      <Stack spacing={3} sx={{ p: { xs: 2.5, md: 4 } }}>
        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h1" component="h2">
              Settings
            </Typography>
            <Typography color="text.secondary">How you like to work. Kept in this browser; changes apply right away.</Typography>
          </Box>
          <IconButton aria-label="Close" onClick={onClose} sx={{ mt: -1, mr: -1 }}>
            <CloseIcon />
          </IconButton>
        </Stack>

        <Box>
          <Section title="Appearance">
            <Row label="Theme">
              <PillSwitch
                aria-label="Theme"
                value={mode ?? 'system'}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'System' },
                ]}
                onChange={setMode}
              />
            </Row>
            <Row label="Density" hint="Compact fits more on screen">
              <PillSwitch
                aria-label="Density"
                value={value.density}
                options={[
                  { value: 'comfortable', label: 'Comfortable' },
                  { value: 'compact', label: 'Compact' },
                ]}
                onChange={(density) => onChange({ density })}
              />
            </Row>
          </Section>

          <Section title="Editor">
            <Row label="Sidebar" hint="The panels and the split views">
              <PillSwitch
                aria-label="Sidebar"
                value={value.sidebar}
                options={[
                  { value: 'left', label: 'Left' },
                  { value: 'right', label: 'Right' },
                ]}
                onChange={(sidebar) => onChange({ sidebar })}
              />
            </Row>
          </Section>

          <Section title="Canvas">
            <Row label="Label size" hint="Part and ray names, in 2D and 3D">
              <PillSwitch aria-label="Label size" value={value.labelSize} options={SIZES} onChange={(labelSize) => onChange({ labelSize })} />
            </Row>
            <Row label="Move arrows" hint="On the selection, in 3D">
              <PillSwitch aria-label="Move arrows" value={value.arrowSize} options={SIZES} onChange={(arrowSize) => onChange({ arrowSize })} />
            </Row>
          </Section>

          <Section title="Mouse">
            <Row label="Orbit in 3D with" hint="The other button pans">
              <PillSwitch
                aria-label="Orbit with"
                value={value.orbitButton}
                options={[
                  { value: 'right', label: 'Right button' },
                  { value: 'middle', label: 'Middle button' },
                ]}
                onChange={(orbitButton) => onChange({ orbitButton })}
              />
            </Row>
            <Row label="Wheel up" hint="In 2D and 3D">
              <PillSwitch
                aria-label="Wheel up"
                value={value.invertZoom ? 'out' : 'in'}
                options={[
                  { value: 'in', label: 'Zooms in' },
                  { value: 'out', label: 'Zooms out' },
                ]}
                onChange={(wheel) => onChange({ invertZoom: wheel === 'out' })}
              />
            </Row>
          </Section>

          {/* What this build stands in for: said here once, so the screens can speak as the product. */}
          {notes.length > 0 && (
            <Section title="This build">
              {notes.map((n) => (
                <Box key={n.topic} sx={{ py: 1.25 }}>
                  <Typography variant="subtitle1">{n.topic}</Typography>
                  <Typography variant="meta" color="text.meta" sx={{ display: 'block' }}>
                    {n.text}
                  </Typography>
                </Box>
              ))}
            </Section>
          )}
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
          <Button
            onClick={() => {
              onChange(DEFAULT_PREFERENCES);
              setMode('system');
            }}
          >
            Reset to defaults
          </Button>
          <PillButton arrow={false} onClick={onClose}>
            Done
          </PillButton>
        </Stack>
      </Stack>
    </Dialog>
  );
}

/** The header's gear: opens Settings. */
export function SettingsButton() {
  const { setSettingsOpen } = usePreferences();
  return (
    <Tooltip title="Settings (Ctrl ,)">
      <IconButton color="inherit" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
        <SettingsOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

/** The Settings dialog, wired to the app's preferences (mount once). */
export function AppSettings() {
  const { prefs, update, settingsOpen, setSettingsOpen } = usePreferences();
  return <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} value={prefs} onChange={update} />;
}

/** A group of settings: its name in small caps on the left (as the pricing cards), the rows on the right. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box
      component="section"
      sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '160px 1fr' }, columnGap: 3, py: 2, borderTop: 1, borderColor: 'divider' }}
    >
      <Typography variant="overline" sx={{ color: 'text.secondary', pt: 1.25 }}>
        {title}
      </Typography>
      <Stack sx={{ '& > * + *': { borderTop: 1, borderColor: 'divider' } }}>{children}</Stack>
    </Box>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, py: 1.25, flexWrap: 'wrap' }}>
      <Box>
        <Typography variant="subtitle1">{label}</Typography>
        {hint && (
          <Typography variant="meta" color="text.meta" sx={{ display: 'block' }}>
            {hint}
          </Typography>
        )}
      </Box>
      {children}
    </Stack>
  );
}
