import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { TagChip } from '../../primitives/TagChip';

export interface DesignInfoPanelProps {
  maintainer: string;
  description: string;
  tags: string[];
  license: string;
  created: string;
  stats: { label: string; value: string | number }[];
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: (t) => `${t.spacing(13)} 1fr`, gap: 1, py: 1, borderBottom: 1, borderColor: 'divider' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

/** Design metadata: who maintains it, what it is, how big it is. */
export function DesignInfoPanel({ maintainer, description, tags, license, created, stats }: DesignInfoPanelProps) {
  return (
    <Box sx={{ px: 2, py: 1 }}>
      <Row label="Maintainer">
        <Typography variant="mono">@{maintainer}</Typography>
      </Row>
      <Row label="Description">
        <Typography variant="body2">{description}</Typography>
      </Row>
      <Row label="Tags">
        <Stack direction="row" useFlexGap spacing={0.5} sx={{ flexWrap: 'wrap' }}>
          {tags.map((t) => (
            <TagChip key={t} label={t} />
          ))}
        </Stack>
      </Row>
      <Row label="License">
        <Typography variant="mono">{license}</Typography>
      </Row>
      <Row label="Created">
        <Typography variant="body2">{created}</Typography>
      </Row>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, pt: 2 }}>
        {stats.map((s) => (
          <Box key={s.label} sx={{ bgcolor: 'background.sunken', borderRadius: 1, p: 1.25 }}>
            <Typography variant="h3" component="div">
              {s.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {s.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
