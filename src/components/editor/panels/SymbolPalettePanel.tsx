import { useState } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Collapse from '@mui/material/Collapse';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import BlurOnIcon from '@mui/icons-material/BlurOn';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';

export interface PaletteGroupData {
  id: string;
  label: string;
  count: number;
  /** `mounted`: modules that come in a cube. `unmounted`: bare optics (catalogue, imports), placed without a holder. */
  mount: 'mounted' | 'unmounted';
  entries: { id: string; label: string }[];
}

const SECTIONS = [
  { mount: 'mounted', title: 'Add mounted part', hint: 'Modules, in a cube' },
  { mount: 'unmounted', title: 'Add unmounted part', hint: 'Optics from the catalogue, no holder yet' },
] as const;

export interface SymbolPalettePanelProps {
  groups: PaletteGroupData[];
  /** Highlighted entry, e.g. the module of the selected part. */
  activeEntryId?: string;
  onPick?: (entryId: string) => void;
  /** Groups open at start; defaults to all but the last. */
  defaultOpen?: string[];
}

/** Parts to add, in two sections (mounted modules, unmounted optics), grouped by kit or source, with a filter. */
export function SymbolPalettePanel({ groups, activeEntryId, onPick, defaultOpen }: SymbolPalettePanelProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string[]>(defaultOpen ?? groups.slice(0, -1).map((g) => g.id));
  const q = query.trim().toLowerCase();

  return (
    <Box sx={{ py: 1.5 }}>
      <Box sx={{ px: 1.5, pb: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Filter parts"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            htmlInput: { 'aria-label': 'Filter parts' },
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
      {SECTIONS.map((section) => {
        const sectionGroups = groups.filter((g) => g.mount === section.mount);
        if (sectionGroups.length === 0) return null;
        return (
          <Box key={section.mount} component="section" aria-label={section.title} sx={{ pt: 1.5 }}>
            <Box sx={{ px: 1.5, pb: 0.5 }}>
              <Typography variant="overline" color="text.secondary" component="h3" sx={{ display: 'block', lineHeight: 1.8 }}>
                {section.title}
              </Typography>
              <Typography variant="caption" color="text.meta" component="div">
                {section.hint}
              </Typography>
            </Box>
      {sectionGroups.map((group) => {
        const entries = q ? group.entries.filter((e) => e.label.toLowerCase().includes(q)) : group.entries;
        if (q && entries.length === 0) return null;
        const isOpen = q ? true : open.includes(group.id);
        return (
          <Box key={group.id}>
            <ButtonBase
              onClick={() => setOpen((prev) => (prev.includes(group.id) ? prev.filter((id) => id !== group.id) : [...prev, group.id]))}
              aria-expanded={isOpen}
              sx={{ width: '100%', justifyContent: 'flex-start', gap: 1, px: 1.5, py: 0.75 }}
            >
              <ExpandMoreIcon
                fontSize="small"
                sx={{ color: 'text.secondary', transform: isOpen ? 'none' : 'rotate(-90deg)', transition: (t) => t.transitions.create('transform') }}
              />
              <Typography variant="subtitle2" sx={{ flex: 1, textAlign: 'left' }}>
                {group.label}
              </Typography>
              <Typography variant="meta" color="text.meta">
                {group.count}
              </Typography>
            </ButtonBase>
            <Collapse in={isOpen}>
              <List disablePadding>
                {entries.map((entry) => (
                  <ListItemButton
                    key={entry.id}
                    selected={entry.id === activeEntryId}
                    onClick={() => onPick?.(entry.id)}
                    sx={{ gap: 1, pl: 4.5, py: 0.5 }}
                  >
                    {group.mount === 'mounted' ? (
                      <ViewInArOutlinedIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                    ) : (
                      <BlurOnIcon sx={{ fontSize: '1rem', color: 'text.meta' }} />
                    )}
                    <Typography variant="body2" noWrap>
                      {entry.label}
                    </Typography>
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </Box>
        );
      })}
          </Box>
        );
      })}
    </Box>
  );
}
