import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { GalleryItem } from '../../demo/homeContent';
import { GalleryTile } from '../cards/GalleryTile';
import { PillButton } from './PillButton';
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
    <Stack spacing={{ xs: 4, md: 6 }}>
      <SectionHeading eyebrow="Community gallery" title="Start from someone else's microscope">
        Every design in the gallery is open. Open one, change the parts that don't fit your bench, and share your version back.
      </SectionHeading>
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 4, md: 0 },
        alignItems: 'stretch',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
      }}
    >
      <Stack
        spacing={4}
        sx={(t) => ({
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          pr: { md: 6 },
          borderRight: { xs: 'none', md: `${t.layout.hairline}px solid ${(t.vars ?? t).palette.divider}` },
        })}
      >
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: (t) => t.spacing(64) }}>
          Schools, labs and hobbyists post what they have actually built, with the parts list and the files to print.
        </Typography>

        <Stack direction="row" useFlexGap spacing={4} sx={{ flexWrap: 'wrap' }}>
          {facts.map((fact) => (
            <Box key={fact.label}>
              <Typography variant="headline" component="div">
                {fact.value}
              </Typography>
              <Typography variant="meta" color="text.meta">
                {fact.label}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <PillButton tone="outline" onClick={onBrowseGallery}>
            Browse the gallery
          </PillButton>
          <Link href={forumUrl} variant="body2">
            Visit the forum
          </Link>
        </Stack>
      </Stack>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', pl: { md: 6 } }}>
        {items.map((item) => (
          <GalleryTile key={item.id} item={item} onOpen={() => onOpenDesign?.(item.id)} />
        ))}
      </Box>
    </Box>
    </Stack>
  );
}
