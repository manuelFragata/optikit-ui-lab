import { useLayoutEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import type { DesignKind, DesignSummary } from '../../api/types';
import type { Schematic } from '../editor/model';
import { EASE_OUT, gsap, reducedMotion, useRiseIn } from '../landing/motion';
import { PageContainer } from '../compositions/PageContainer';
import { Pill } from '../primitives/Pill';
import { DesignTile } from './explore/DesignTile';
import { FilterButtons } from './explore/FilterButtons';
import { DECK_ROOM, MakerDeck } from './explore/MakerDeck';

const KINDS: { value: DesignKind | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'instrument', label: 'Instruments' },
  { value: 'assembly', label: 'Assemblies' },
  { value: 'part', label: 'Parts' },
  { value: 'collection', label: 'Collections' },
];

/** A single tile gets the same padding as a deck, so pictures line up across the grid. */
const TILE_CELL = { pt: DECK_ROOM, px: DECK_ROOM } as const;

export interface ExploreViewProps {
  /** Newest first. */
  designs: DesignSummary[];
  /** Schematic drawings by design id, for the pictures. */
  drawings?: Record<string, Schematic>;
  onOpen: (id: string) => void;
  /** Back to the Home dashboard. */
  onBack?: () => void;
}

/** Designs grouped by maker, in the order the makers first appear. */
function byMaker(designs: DesignSummary[]) {
  const groups = new Map<string, DesignSummary[]>();
  for (const d of designs) groups.set(d.maintainer, [...(groups.get(d.maintainer) ?? []), d]);
  return [...groups];
}

/**
 * The Explore gallery: every design, filtered by kind, and through the pop-up
 * buttons by maker and tags. A maker with several designs shows as one deck
 * to flip through; "all designs" (or the maker filter) spreads it out.
 */
export function ExploreView({ designs, drawings = {}, onOpen, onBack }: ExploreViewProps) {
  const [kind, setKind] = useState<DesignKind | 'all'>('all');
  const [maker, setMaker] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const titleRef = useRiseIn<HTMLHeadingElement>({ immediate: true });
  const gridRef = useRef<HTMLDivElement>(null);

  const ofKind = designs.filter((d) => kind === 'all' || d.kind === kind);
  const makers = byMaker(ofKind).map(([m]) => m);
  const ofMaker = ofKind.filter((d) => !maker || d.maintainer === maker);
  // Offer only the tags that can still narrow the list.
  const allTags = [...new Set(ofMaker.flatMap((d) => d.tags))].sort();
  const shown = ofMaker.filter((d) => tags.every((t) => d.tags.includes(t)));
  const filtered = kind !== 'all' || maker !== null || tags.length > 0;

  const toggleTag = (tag: string) => setTags(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]);
  const clear = () => {
    setKind('all');
    setMaker(null);
    setTags([]);
  };

  // Each time the filters change, the gallery deals its cards in again.
  const filterKey = `${kind}|${maker}|${tags.join(',')}`;
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid || reducedMotion()) return;
    const tween = gsap.from(grid.children, { opacity: 0, y: 24, duration: 0.6, ease: EASE_OUT, stagger: 0.05, clearProps: 'transform,opacity' });
    return () => {
      tween.progress(1).kill();
    };
  }, [filterKey]);

  return (
    <PageContainer sx={{ pt: 3, pb: 8 }}>
      {onBack && (
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ ml: -1, mb: 2 }}>
          Home
        </Button>
      )}

      {/* Editorial header, as on the landing page: the title on the left, the lead on the right. */}
      <Box sx={{ display: 'grid', gap: { xs: 2, md: 6 }, alignItems: 'end', gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' }, mb: { xs: 4, md: 6 } }}>
        <Typography ref={titleRef} variant="display" component="h1">
          Explore
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Every design here is open: parts, assemblies, whole instruments and collections, from openUC2 and the people who build with it. Open one, change
          what doesn&apos;t fit your bench, and share your version back.
        </Typography>
      </Box>

      {/* The filters stay in reach while the gallery scrolls under them. */}
      <Stack
        spacing={1}
        sx={(t) => ({
          position: 'sticky',
          top: 0,
          zIndex: t.zIndex.appBar,
          mx: { xs: -2, md: -5, xl: -8 },
          px: { xs: 2, md: 5, xl: 8 },
          py: 1.5,
          mb: 3,
          bgcolor: `color-mix(in srgb, ${(t.vars ?? t).palette.background.default} 82%, transparent)`,
          backdropFilter: 'blur(12px)',
          borderBottom: `${t.layout.hairline}px solid`,
          borderColor: 'divider',
        })}
      >
        <Stack direction="row" spacing={2} useFlexGap sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Stack direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: 'wrap' }} role="group" aria-label="Kind">
            {KINDS.map((k) => (
              <Pill key={k.value} active={kind === k.value} onClick={() => setKind(k.value)}>
                {k.label}
              </Pill>
            ))}
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Typography variant="meta" color="text.meta">
              {shown.length} {shown.length === 1 ? 'design' : 'designs'}
            </Typography>
            {filtered && (
              <Button size="small" onClick={clear}>
                Clear
              </Button>
            )}
            <FilterButtons
              makers={makers.map((m) => ({ name: m, count: ofKind.filter((d) => d.maintainer === m).length }))}
              maker={maker}
              onMaker={setMaker}
              tags={allTags}
              selectedTags={tags}
              onToggleTag={toggleTag}
            />
          </Stack>
        </Stack>
      </Stack>

      {shown.length > 0 ? (
        <Box ref={gridRef} sx={{ display: 'grid', columnGap: 6, rowGap: 6, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', alignItems: 'end' }}>
          {maker
            ? // One maker picked: their designs side by side.
              shown.map((d) => (
                <Box key={d.id} sx={TILE_CELL}>
                  <DesignTile design={d} drawing={drawings[d.id]} onOpen={() => onOpen(d.id)} />
                </Box>
              ))
            : // Everyone: one deck per maker with several designs.
              byMaker(shown).map(([m, group]) =>
                group.length > 1 ? (
                  <MakerDeck key={m} maker={m} designs={group} drawings={drawings} onOpen={onOpen} onShowAll={() => setMaker(m)} />
                ) : (
                  <Box key={group[0].id} sx={TILE_CELL}>
                    <DesignTile design={group[0]} drawing={drawings[group[0].id]} onOpen={() => onOpen(group[0].id)} />
                  </Box>
                ),
              )}
        </Box>
      ) : (
        <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
          Nothing matches these filters.
        </Typography>
      )}
    </PageContainer>
  );
}
