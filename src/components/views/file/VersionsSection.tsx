import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { HistoryPanel, type VersionEntryData } from '../../editor/panels/HistoryPanel';
import { PillButton } from '../../landing/PillButton';
import { cardSx } from '../card';
import { Titled } from '../Titled';

export interface VersionsSectionProps {
  versions: VersionEntryData[];
  /** Save the design as it is now, with a message. */
  onSave: (message: string) => void;
  /** Make an older version the current one, as a new version on top. */
  onRestore: (entry: VersionEntryData) => void;
}

/** The design's versions, newest first: save one, see what changed in each, and restore an older one. */
export function VersionsSection({ versions, onSave, onRestore }: VersionsSectionProps) {
  const [message, setMessage] = useState('');
  const [picked, setPicked] = useState(versions[0]?.hash);
  const entry = versions.find((v) => v.hash === picked) ?? versions[0];
  const current = entry === versions[0];
  const save = () => {
    if (!message.trim()) return;
    onSave(message.trim());
    setMessage('');
  };

  return (
    <Stack sx={{ gap: 3 }}>
      <Titled title="Save a version">
        <Stack direction="row" sx={(t) => ({ ...cardSx(t), gap: 1.5, alignItems: 'center' })}>
          <TextField
            label="What changed"
            placeholder="e.g. Swap the tube lens for f = 100"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            size="small"
            sx={{ flex: 1 }}
          />
          <PillButton arrow={false} disabled={!message.trim()} onClick={save}>
            Save version
          </PillButton>
        </Stack>
      </Titled>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, alignItems: 'start' }}>
        <Titled title="All versions">
          <Box sx={(t) => ({ ...cardSx(t), p: 0, py: 1 })}>
            <HistoryPanel entries={versions} selected={entry?.hash} onSelect={setPicked} />
          </Box>
        </Titled>
        {entry && (
          <Titled title="What changed">
            <Box sx={cardSx}>
              <Typography variant="subtitle1">{entry.message}</Typography>
              <Typography variant="meta" color="text.meta" sx={{ display: 'block', mt: 0.5 }}>
                {entry.version ? `v${entry.version}` : entry.hash} · @{entry.author} · {entry.when}
              </Typography>
              <Box component="ul" sx={{ pl: 2.5, my: 1.5 }}>
                {(entry.changes ?? ['No details for this version.']).map((c) => (
                  <Typography component="li" key={c} variant="body2" color="text.secondary">
                    {c}
                  </Typography>
                ))}
              </Box>
              <Button variant="outlined" disabled={current} onClick={() => onRestore(entry)}>
                {current ? 'This is the current version' : 'Restore this version'}
              </Button>
            </Box>
          </Titled>
        )}
      </Box>
    </Stack>
  );
}
