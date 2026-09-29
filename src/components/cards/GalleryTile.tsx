import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import type { GalleryItem } from '../../demo/homeContent';
import { CubeThumbnail } from './CubeThumbnail';

export interface GalleryTileProps {
  item: GalleryItem;
  onOpen?: () => void;
}

/** A gallery design: cube thumbnail, title, and who made it. */
export function GalleryTile({ item, onOpen }: GalleryTileProps) {
  return (
    <ButtonBase
      onClick={onOpen}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        textAlign: 'left',
        border: 1,
        borderColor: 'divider',
        borderRadius: (t) => `${t.radius.tile}px`,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        '&:hover': { borderColor: 'text.secondary' },
      }}
    >
      <CubeThumbnail cubes={item.cubes} layout={item.kind === 'Collection' ? 'mosaic' : 'row'} size="tile" />
      <Box sx={{ p: 1.25, minWidth: 0 }}>
        <Typography variant="subtitle2" noWrap>
          {item.title}
        </Typography>
        {item.source === 'optikit' ? (
          <Typography variant="caption" color="primary">
            Shipped with Optikit
          </Typography>
        ) : (
          <Typography variant="meta" color="text.meta" noWrap component="div">
            @{item.author}
          </Typography>
        )}
      </Box>
    </ButtonBase>
  );
}
