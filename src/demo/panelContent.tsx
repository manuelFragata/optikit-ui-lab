/**
 * Placeholder content for side panels in stories and the demo app.
 * Not part of the component set; replace freely.
 */
import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import AdjustIcon from '@mui/icons-material/Adjust';
import CameraIcon from '@mui/icons-material/Camera';
import FlareIcon from '@mui/icons-material/Flare';
import FlipIcon from '@mui/icons-material/Flip';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import SearchIcon from '@mui/icons-material/Search';
import SensorsIcon from '@mui/icons-material/Sensors';
import TuneIcon from '@mui/icons-material/Tune';
import WidgetsOutlinedIcon from '@mui/icons-material/WidgetsOutlined';
import { DisclosureSection } from '../components/panels/DisclosureSection';
import type { SidePanelItem } from '../components/panels/SidePanel';
import { TagChip } from '../components/primitives/TagChip';

const COMPONENTS = [
  { id: 'lens', label: 'Lens', icon: <AdjustIcon fontSize="small" />, tag: 'refractive' },
  { id: 'mirror', label: 'Mirror', icon: <FlipIcon fontSize="small" />, tag: 'reflective' },
  { id: 'aperture', label: 'Aperture stop', icon: <CameraIcon fontSize="small" />, tag: 'stop' },
  { id: 'source', label: 'Point source', icon: <FlareIcon fontSize="small" />, tag: 'source' },
  { id: 'detector', label: 'Detector', icon: <SensorsIcon fontSize="small" />, tag: 'image' },
];

function PaletteContent() {
  return (
    <>
      <Box sx={{ p: 1.5 }}>
        <TextField
          fullWidth
          placeholder="Search components"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
      <DisclosureSection title="Optics">
        <List disablePadding>
          {COMPONENTS.map((c) => (
            <ListItemButton key={c.id} sx={{ borderRadius: 1 }}>
              <ListItemIcon>{c.icon}</ListItemIcon>
              <ListItemText primary={c.label} />
              <TagChip label={c.tag} />
            </ListItemButton>
          ))}
        </List>
      </DisclosureSection>
      <DisclosureSection title="Annotations" defaultOpen={false}>
        <Stack direction="row" spacing={1}>
          <TagChip label="Dimension" />
          <TagChip label="Label" />
          <TagChip label="Ray fan" tone="accent" />
        </Stack>
      </DisclosureSection>
    </>
  );
}

function LayersContent() {
  return (
    <List>
      {['Source', 'L1 front', 'L1 back', 'Stop', 'L2 front', 'L2 back', 'Image plane'].map((name, index) => (
        <ListItemButton key={name} selected={index === 1}>
          <ListItemText primary={name} secondary={`Surface ${index}`} />
        </ListItemButton>
      ))}
    </List>
  );
}

function SettingsContent() {
  return (
    <DisclosureSection title="Units">
      <Stack direction="row" spacing={1}>
        <TagChip label="mm" tone="primary" emphasis="solid" />
        <TagChip label="nm" />
      </Stack>
    </DisclosureSection>
  );
}

export const demoPanelItems: SidePanelItem[] = [
  { id: 'palette', label: 'Components', icon: <WidgetsOutlinedIcon />, content: <PaletteContent /> },
  { id: 'layers', label: 'Layers', icon: <LayersOutlinedIcon />, content: <LayersContent /> },
  { id: 'settings', label: 'System settings', icon: <TuneIcon />, content: <SettingsContent /> },
];
