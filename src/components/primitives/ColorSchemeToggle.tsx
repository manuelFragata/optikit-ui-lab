import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import { useColorScheme } from '@mui/material/styles';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';

export interface ColorSchemeToggleProps {
  /** `icon`: a single sun/moon button (dense toolbars). `switch`: sun · switch · moon (landing page). */
  variant?: 'icon' | 'switch';
}

/** Flips the MUI colour scheme between light and dark. */
export function ColorSchemeToggle({ variant = 'icon' }: ColorSchemeToggleProps) {
  const { mode, systemMode, setMode } = useColorScheme();
  const resolved = mode === 'system' ? systemMode : mode;
  const dark = resolved === 'dark';
  const next = dark ? 'light' : 'dark';
  const label = `Switch to ${next} mode`;

  if (variant === 'switch') {
    return (
      <Tooltip title={label}>
        <Stack direction="row" sx={{ alignItems: 'center', color: 'text.secondary' }}>
          <LightModeOutlinedIcon fontSize="small" aria-hidden />
          <Switch
            size="small"
            checked={dark}
            onChange={() => setMode(next)}
            slotProps={{ input: { 'aria-label': 'Dark mode' } }}
          />
          <DarkModeOutlinedIcon fontSize="small" aria-hidden />
        </Stack>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={label}>
      <IconButton color="inherit" aria-label={label} onClick={() => setMode(next)}>
        {dark ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}
