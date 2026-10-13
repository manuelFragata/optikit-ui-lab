import { useState } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Dialog from '@mui/material/Dialog';
import InputBase from '@mui/material/InputBase';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';

/** One thing the palette can do. */
export interface Command {
  id: string;
  label: string;
  /** Heading it is listed under, e.g. "Add part" or "View". */
  group: string;
  shortcut?: string;
  run: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}

/**
 * Ctrl K: one search box for everything the editor can do. Type, move with
 * the arrow keys, Enter runs the highlighted command.
 */
export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = commands.filter((c) => words.every((w) => `${c.group} ${c.label}`.toLowerCase().includes(w))).slice(0, 50);
  const at = Math.min(active, Math.max(0, matches.length - 1));

  const close = () => {
    setQuery('');
    setActive(0);
    onClose();
  };
  const run = (c: Command | undefined) => {
    if (!c) return;
    close();
    c.run();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="sm"
      sx={{ '& .MuiDialog-container': { alignItems: 'flex-start' } }}
      slotProps={{ paper: { sx: (t) => ({ mt: '12vh', borderRadius: `${t.radius.card}px`, backgroundImage: 'none' }) } }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <SearchIcon sx={{ color: 'text.secondary' }} />
        <InputBase
          autoFocus
          fullWidth
          placeholder="Search commands, parts, layers…"
          value={query}
          inputProps={{ 'aria-label': 'Search commands' }}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setActive(Math.min(at + 1, matches.length - 1));
            else if (e.key === 'ArrowUp') setActive(Math.max(at - 1, 0));
            else if (e.key === 'Enter') run(matches[at]);
            else return;
            e.preventDefault();
          }}
        />
      </Stack>
      <Box role="listbox" aria-label="Commands" sx={{ maxHeight: 400, overflowY: 'auto', p: 0.75 }}>
        {matches.map((c, i) => (
          <Box key={c.id}>
            {(i === 0 || matches[i - 1].group !== c.group) && (
              <Typography variant="meta" color="text.meta" component="div" sx={{ px: 1.25, pt: 1, pb: 0.25, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {c.group}
              </Typography>
            )}
            <ButtonBase
              role="option"
              aria-selected={i === at}
              onClick={() => run(c)}
              onMouseMove={() => setActive(i)}
              sx={{ width: '100%', justifyContent: 'space-between', px: 1.25, py: 0.75, borderRadius: 1, bgcolor: i === at ? 'action.hover' : 'transparent' }}
            >
              <Typography variant="body2">{c.label}</Typography>
              {c.shortcut && (
                <Typography variant="mono" color="text.meta">
                  {c.shortcut}
                </Typography>
              )}
            </ButtonBase>
          </Box>
        ))}
        {matches.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            Nothing matches “{query}”.
          </Typography>
        )}
      </Box>
    </Dialog>
  );
}
