import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import type { SchematicGroup, SchematicSymbol } from '../model';

export interface LayersPanelProps {
  symbols: SchematicSymbol[];
  groups: SchematicGroup[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function Toggle({ on, label, onIcon, offIcon, onClick }: { on: boolean; label: string; onIcon: ReactNode; offIcon: ReactNode; onClick: () => void }) {
  return (
    <Tooltip title={label}>
      <IconButton size="small" aria-label={label} aria-pressed={on} onClick={onClick} sx={{ color: on ? 'text.secondary' : 'text.meta' }}>
        {on ? onIcon : offIcon}
      </IconButton>
    </Tooltip>
  );
}

/** Layers (z levels) with their groups and symbols; visibility and lock per group. */
export function LayersPanel({ symbols, groups, selectedId, onSelect }: LayersPanelProps) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [locked, setLocked] = useState<string[]>([]);
  const toggle = (list: string[], set: (next: string[]) => void, id: string) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const layers = [...new Set(symbols.map((s) => s.z))].sort((a, b) => a - b);

  return (
    <Box sx={{ py: 1 }}>
      {layers.map((z) => (
        <Box key={z} sx={{ mb: 1 }}>
          <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', px: 2, py: 0.75 }}>
            <Typography variant="overline" color="text.secondary">
              Layer z = {z}
            </Typography>
            <Typography variant="mono" color="text.meta">
              {symbols.filter((s) => s.z === z).length} symbols
            </Typography>
          </Stack>
          {groups.map((g) => {
            const members = symbols.filter((s) => s.z === z && s.group === g.id);
            if (members.length === 0) return null;
            const isHidden = hidden.includes(g.id);
            return (
              <Box key={g.id}>
                <Stack direction="row" sx={{ alignItems: 'center', pl: 2, pr: 1 }}>
                  <Box sx={{ width: (t) => t.spacing(1.75), height: (t) => t.spacing(1.25), border: 1, borderStyle: 'dashed', borderColor: 'text.meta', mr: 1 }} />
                  <Typography variant="subtitle2" sx={{ flex: 1, opacity: isHidden ? 0.5 : 1 }}>
                    {g.label}
                  </Typography>
                  <Toggle
                    on={!isHidden}
                    label={isHidden ? `Show ${g.label}` : `Hide ${g.label}`}
                    onIcon={<VisibilityOutlinedIcon sx={{ fontSize: '1rem' }} />}
                    offIcon={<VisibilityOffOutlinedIcon sx={{ fontSize: '1rem' }} />}
                    onClick={() => toggle(hidden, setHidden, g.id)}
                  />
                  <Toggle
                    on={!locked.includes(g.id)}
                    label={locked.includes(g.id) ? `Unlock ${g.label}` : `Lock ${g.label}`}
                    onIcon={<LockOpenOutlinedIcon sx={{ fontSize: '1rem' }} />}
                    offIcon={<LockOutlinedIcon sx={{ fontSize: '1rem' }} />}
                    onClick={() => toggle(locked, setLocked, g.id)}
                  />
                </Stack>
                <List disablePadding>
                  {members.map((s) => (
                    <ListItemButton key={s.id} selected={s.id === selectedId} onClick={() => onSelect(s.id)} sx={{ pl: 5, py: 0.25, gap: 1.5, opacity: isHidden ? 0.5 : 1 }}>
                      <Typography variant="mono" color="text.meta" sx={{ width: (t) => t.spacing(3) }}>
                        {s.id}
                      </Typography>
                      <Typography variant="body2" noWrap>
                        {s.label}
                      </Typography>
                    </ListItemButton>
                  ))}
                </List>
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
