import { useState, type ReactNode } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import type { GalleryItem } from '../../demo/homeContent';
import type { Schematic } from '../editor/model';
import { SchematicCanvas } from '../editor/SchematicCanvas';
import { CubeThumbnail } from '../cards/CubeThumbnail';
import { PillButton } from './PillButton';

export interface CommunitySectionProps {
  items: GalleryItem[];
  /** Drawings for designs that have one; the featured card shows it live. */
  drawings?: Record<string, Schematic>;
  facts: { value: string; label: string }[];
  /** Initials of a few makers, for the avatar stack. */
  makers?: string[];
  onOpenDesign?: (id: string) => void;
  onBrowseGallery?: () => void;
  forumUrl?: string;
}

type Filter = 'all' | GalleryItem['kind'];

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'Instrument', label: 'Instruments' },
  { value: 'Assembly', label: 'Assemblies' },
  { value: 'Collection', label: 'Collections' },
];

const tileRadius = (t: Theme) => `${t.radius.stage}px`;

/** Outlined pill used for filters and the tags laid over tiles. */
function Pill({ children, active, onClick, overlay }: { children: ReactNode; active?: boolean; onClick?: () => void; overlay?: boolean }) {
  return (
    <ButtonBase
      component={onClick ? 'button' : 'span'}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      sx={(t) => ({
        px: 1.5,
        py: 0.5,
        borderRadius: `${t.radius.pill}px`,
        border: `${t.layout.hairline}px solid`,
        borderColor: active ? 'text.primary' : overlay ? 'transparent' : 'divider',
        bgcolor: active ? 'text.primary' : overlay ? 'background.paper' : 'transparent',
        color: active ? 'background.paper' : 'text.primary',
        typography: 'meta',
        pointerEvents: onClick ? 'auto' : 'none',
        whiteSpace: 'nowrap',
      })}
    >
      {children}
    </ButtonBase>
  );
}

/** The round ↗ in a tile's corner; it turns when the tile is hovered. */
function CornerArrow({ inverted }: { inverted?: boolean }) {
  return (
    <Box
      aria-hidden
      className="corner-arrow"
      sx={(t) => ({
        position: 'absolute',
        top: t.spacing(1.5),
        right: t.spacing(1.5),
        display: 'grid',
        placeItems: 'center',
        width: t.spacing(5),
        height: t.spacing(5),
        borderRadius: '50%',
        bgcolor: inverted ? 'text.primary' : 'background.paper',
        color: inverted ? 'background.paper' : 'text.primary',
        transition: t.transitions.create('transform', { duration: t.transitions.duration.shorter }),
      })}
    >
      <NorthEastIcon fontSize="small" />
    </Box>
  );
}

const byline = (item: GalleryItem) => (item.source === 'optikit' ? 'Shipped with Optikit' : `@${item.author}`);

/**
 * The section opens on a wide panel: this week's featured design, drawn live,
 * with the section's title written over it (the title is part of the picture,
 * not a header above it).
 */
function FeaturedPanel({ item, drawing, title, lead, onOpen }: { item: GalleryItem; drawing?: Schematic; title: string; lead: string; onOpen?: () => void }) {
  return (
    <ButtonBase
      onClick={onOpen}
      aria-label={`Open ${item.title}`}
      sx={(t) => ({
        position: 'relative',
        display: 'block',
        width: '100%',
        textAlign: 'left',
        height: { xs: t.spacing(72), md: t.spacing(84) },
        borderRadius: tileRadius(t),
        overflow: 'hidden',
        bgcolor: 'canvas.ground',
        '&:hover .corner-arrow': { transform: 'rotate(45deg)' },
      })}
    >
      {/* The drawing keeps to the upper part; the words sit below it on a fade. */}
      <Box sx={(t) => ({ position: 'absolute', top: t.spacing(4), left: '18%', right: 0, bottom: { xs: t.spacing(30), md: t.spacing(26) }, display: 'flex', pointerEvents: 'none' })}>
        {drawing ? (
          <SchematicCanvas fit schematic={drawing} selectedId={null} onSelect={() => undefined} options={{ showRayLabels: false }} hint={false} />
        ) : (
          <Box sx={{ flex: 1 }}>
            <CubeThumbnail cubes={item.cubes} size="card" />
          </Box>
        )}
      </Box>

      <Box sx={{ position: 'absolute', top: (t) => t.spacing(3.5), left: (t) => t.spacing(4) }}>
        <Typography variant="meta" color="text.secondary" component="div">
          Build of the week
        </Typography>
        <Typography variant="subtitle1">{item.title}</Typography>
        <Typography variant="meta" color="text.meta" component="div">
          {byline(item)} · {item.cubes} cubes{item.forks ? ` · ${item.forks} people built their own` : ''}
        </Typography>
      </Box>
      <CornerArrow inverted />

      <Box
        sx={(t) => ({
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          px: { xs: 3, md: 5 },
          pb: { xs: 3, md: 5 },
          pt: 14,
          background: `linear-gradient(180deg, transparent, ${(t.vars ?? t).palette.canvas.ground} 42%)`,
          display: 'grid',
          gap: { xs: 2, md: 6 },
          alignItems: 'end',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 3fr) minmax(0, 2fr)' },
        })}
      >
        <Typography variant="display" component="h2">
          {title}
        </Typography>
        <Box>
          {item.blurb && (
            <Typography variant="body1" sx={{ mb: 1.5 }}>
              {item.title}: {item.blurb}
            </Typography>
          )}
          <Typography variant="body1" color="text.secondary">
            {lead}
          </Typography>
        </Box>
      </Box>
    </ButtonBase>
  );
}

function SmallTile({ item, onOpen }: { item: GalleryItem; onOpen?: () => void }) {
  return (
    <ButtonBase
      onClick={onOpen}
      aria-label={`Open ${item.title}`}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        textAlign: 'left',
        gap: 1.25,
        '&:hover .corner-arrow': { transform: 'rotate(45deg)' },
      }}
    >
      <Box sx={(t) => ({ position: 'relative', borderRadius: tileRadius(t), overflow: 'hidden' })}>
        <CubeThumbnail cubes={item.cubes} layout={item.kind === 'Collection' ? 'mosaic' : 'row'} size="card" />
        <Box sx={{ position: 'absolute', top: (t) => t.spacing(1.5), left: (t) => t.spacing(1.5) }}>
          <Pill overlay>{item.kind}</Pill>
        </Box>
        <CornerArrow />
      </Box>
      <Box sx={{ px: 0.5 }}>
        <Typography variant="subtitle1" noWrap>
          {item.title}
        </Typography>
        <Typography variant="meta" color="text.meta" component="div" noWrap>
          {byline(item)}
          {item.forks ? ` · ${item.forks} builds` : ''}
        </Typography>
      </Box>
    </ButtonBase>
  );
}

/**
 * The community gallery: a wide panel with this week's design and the
 * section's title over it, a row of the latest designs with filter pills,
 * and a strip of makers with the numbers.
 */
export function CommunitySection({ items, drawings = {}, facts, makers = [], onOpenDesign, onBrowseGallery, forumUrl = '#forum' }: CommunitySectionProps) {
  const [filter, setFilter] = useState<Filter>('all');
  // The spotlight stays put; the filters act on the row below it.
  const spotlight = items.find((i) => i.source === 'community' && drawings[i.id]) ?? items[0];
  const latest = items.filter((i) => i !== spotlight && (filter === 'all' || i.kind === filter)).slice(0, 4);

  return (
    <Stack spacing={{ xs: 5, md: 7 }}>
      {spotlight && (
        <FeaturedPanel
          item={spotlight}
          drawing={drawings[spotlight.id]}
          title="Start from someone else's microscope"
          lead="Every design in the gallery is open. Open one, change the parts that don't fit your bench, and share your version back."
          onOpen={() => onOpenDesign?.(spotlight.id)}
        />
      )}

      <Stack spacing={3}>
        {/* The row's title shares the line with its controls, as in a catalogue. */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { xs: 'flex-start', sm: 'flex-end' }, justifyContent: 'space-between' }}>
          <Typography variant="headline" component="h3">
            Latest from the gallery
          </Typography>
          <Stack direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: 'wrap' }} role="group" aria-label="Filter the gallery">
            {FILTERS.map((f) => (
              <Pill key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>
                {f.label}
              </Pill>
            ))}
          </Stack>
        </Stack>

        {latest.length > 0 ? (
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' } }}>
            {latest.map((item) => (
              <SmallTile key={item.id} item={item} onOpen={() => onOpenDesign?.(item.id)} />
            ))}
          </Box>
        ) : (
          <Typography variant="body1" color="text.secondary">
            Nothing in this group yet.
          </Typography>
        )}
      </Stack>

      {/* Who is behind it: a stack of makers, the numbers, the way in. */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 3, md: 5 }}
        sx={{ alignItems: { xs: 'flex-start', md: 'center' }, pt: { xs: 1, md: 2 } }}
      >
        {makers.length > 0 && (
          <Stack direction="row" sx={{ '& > *:not(:first-of-type)': { ml: -1.25 } }} aria-hidden>
            {makers.map((m) => (
              <Avatar
                key={m}
                sx={(t) => ({
                  width: t.spacing(5.5),
                  height: t.spacing(5.5),
                  typography: 'subtitle2',
                  bgcolor: 'background.sunken',
                  color: 'text.primary',
                  border: `${t.layout.hairline * 2}px solid ${(t.vars ?? t).palette.background.default}`,
                })}
              >
                {m}
              </Avatar>
            ))}
          </Stack>
        )}
        <Stack direction="row" useFlexGap spacing={4} sx={{ flexWrap: 'wrap', flex: 1 }}>
          {facts.map((fact) => (
            <Stack key={fact.label} direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
              <Typography variant="headline" component="span">
                {fact.value}
              </Typography>
              <Typography variant="meta" color="text.meta">
                {fact.label}
              </Typography>
            </Stack>
          ))}
        </Stack>
        <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center' }}>
          <PillButton onClick={onBrowseGallery}>Browse the gallery</PillButton>
          <Link href={forumUrl} variant="body2">
            Visit the forum
          </Link>
        </Stack>
      </Stack>
    </Stack>
  );
}
