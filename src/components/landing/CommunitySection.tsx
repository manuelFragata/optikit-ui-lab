import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { GalleryItem } from '../../demo/homeContent';
import { GalleryTile } from '../cards/GalleryTile';
import { SectionHeading } from './SectionHeading';

export interface CommunitySectionProps {
  /** Designs shown on the right; four fit the grid best. */
  items: GalleryItem[];
  facts: { value: string; label: string }[];
  onOpenDesign?: (id: string) => void;
  onBrowseGallery?: () => void;
  forumUrl?: string;
}

/** One row, two columns: why the gallery matters on the left, a handful of designs on the right. */
export function CommunitySection({ items, facts, onOpenDesign, onBrowseGallery, forumUrl = '#forum' }: CommunitySectionProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 4, md: 8 },
        alignItems: 'center',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
      }}
    >
      <Stack spacing={3} sx={{ alignItems: 'flex-start' }}>
        <SectionHeading eyebrow="Community gallery" title="Start from someone else's microscope">
          Every design in the gallery is open. Open one, change the parts that don't fit your bench, and share your version back.
          Schools, labs and hobbyists post what they have actually built.
        </SectionHeading>

        <Stack direction="row" useFlexGap spacing={4} sx={{ flexWrap: 'wrap' }}>
          {facts.map((fact) => (
            <Box key={fact.label}>
              <Typography variant="h1" component="div">
                {fact.value}
              </Typography>
              <Typography variant="meta" color="text.meta">
                {fact.label}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Button variant="outlined" onClick={onBrowseGallery}>
            Browse the gallery
          </Button>
          <Link href={forumUrl} variant="body2">
            Visit the forum
          </Link>
        </Stack>
      </Stack>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        {items.map((item) => (
          <GalleryTile key={item.id} item={item} onOpen={() => onOpenDesign?.(item.id)} />
        ))}
      </Box>
    </Box>
  );
}
