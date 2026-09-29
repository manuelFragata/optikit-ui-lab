import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { TagChip } from '../../primitives/TagChip';

export interface VersionEntryData {
  /** Set for tagged releases; plain saves only have a hash. */
  version?: string;
  hash: string;
  message: string;
  when: string;
  author: string;
}

export interface HistoryPanelProps {
  entries: VersionEntryData[];
  onRestore?: (hash: string) => void;
}

/** Version timeline: tagged releases and saves, newest first. */
export function HistoryPanel({ entries, onRestore }: HistoryPanelProps) {
  return (
    <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, py: 1.5 }}>
      {entries.map((e, i) => {
        const last = i === entries.length - 1;
        return (
          <Box component="li" key={e.hash} sx={{ position: 'relative' }}>
            {/* timeline rail */}
            {!last && (
              <Box sx={{ position: 'absolute', left: (t) => t.spacing(2.9), top: (t) => t.spacing(2.5), bottom: 0, borderLeft: 1, borderColor: 'divider' }} />
            )}
            <ButtonBase
              onClick={() => onRestore?.(e.hash)}
              sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, width: '100%', textAlign: 'left', px: 2, py: 1, '&:hover': { bgcolor: 'action.hover' } }}
            >
              <Box
                sx={{
                  mt: 0.5,
                  flexShrink: 0,
                  width: (t) => t.spacing(e.version ? 1.75 : 1.25),
                  height: (t) => t.spacing(e.version ? 1.75 : 1.25),
                  ml: e.version ? 0 : 0.25,
                  borderRadius: '50%',
                  border: 2,
                  borderColor: i === 0 ? 'primary.main' : 'text.meta',
                  bgcolor: i === 0 ? 'primary.main' : 'background.paper',
                  position: 'relative',
                  zIndex: 1,
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="mono" color={e.version ? 'text.primary' : 'text.meta'}>
                    {e.version ? `v${e.version}` : e.hash}
                  </Typography>
                  {i === 0 && <TagChip label="Current" tone="success" dot />}
                  <Box sx={{ flex: 1 }} />
                  <Typography variant="caption" color="text.meta">
                    {e.when}
                  </Typography>
                </Stack>
                <Typography variant="body2">{e.message}</Typography>
                <Typography variant="meta" color="text.meta">
                  @{e.author}
                </Typography>
              </Box>
            </ButtonBase>
          </Box>
        );
      })}
    </Box>
  );
}
