import Box from '@mui/material/Box';
import CardActionArea from '@mui/material/CardActionArea';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { TagChip } from '../primitives/TagChip';
import { CubeThumbnail } from './CubeThumbnail';

export type DesignKind = 'Part' | 'Assembly' | 'Instrument' | 'Collection';

export interface DesignCardProps {
  kind: DesignKind;
  title: string;
  description?: string;
  /** Semver without the `v`; collections have none. */
  version?: string;
  /** Collections show a count instead of a version. */
  count?: number;
  tags?: string[];
  maintainer?: string;
  cubes?: number;
  onOpen?: () => void;
}

/** Card for a part, assembly, instrument or collection. */
export function DesignCard({
  kind,
  title,
  description,
  version,
  count,
  tags = [],
  maintainer,
  cubes = 3,
  onOpen,
}: DesignCardProps) {
  const collection = kind === 'Collection';

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden', height: '100%' }}>
      <CardActionArea onClick={onOpen} sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <CubeThumbnail cubes={cubes} layout={collection ? 'mosaic' : 'row'} />
        <Stack spacing={0.75} sx={{ p: 1.5, flex: 1 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography variant="caption" color="primary">
              {collection && count !== undefined ? `Collection · ${count} designs` : kind}
            </Typography>
            {version && (
              <Typography variant="mono" color="text.secondary">
                v{version}
              </Typography>
            )}
          </Stack>
          <Typography variant="subtitle2" component="h3">
            {title}
          </Typography>
          {description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
              {description}
            </Typography>
          )}
          <Box sx={{ flex: 1 }} />
          {tags.length > 0 && (
            <Stack direction="row" useFlexGap spacing={0.5} sx={{ flexWrap: 'wrap' }}>
              {tags.map((tag) => (
                <TagChip key={tag} label={tag} />
              ))}
            </Stack>
          )}
          {maintainer && (
            <Typography variant="mono" color="text.secondary">
              @{maintainer}
            </Typography>
          )}
        </Stack>
      </CardActionArea>
    </Paper>
  );
}
