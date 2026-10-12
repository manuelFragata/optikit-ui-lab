import { useState } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { DesignSummary } from '../../../api/types';
import type { Schematic } from '../../editor/model';
import { Pill } from '../../primitives/Pill';
import { DesignPicture } from './DesignTile';

export interface MakerDeckProps {
  maker: string;
  /** The maker's designs, newest first; two or more. */
  designs: DesignSummary[];
  drawings: Record<string, Schematic>;
  /** Open one design. */
  onOpen: (id: string) => void;
  /** Spread all of this maker's designs out in the gallery. */
  onShowAll: () => void;
}

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
/** Padding (spacing units) around a deck for the cards behind it; single tiles in the same grid use it too. */
export const DECK_ROOM = 3.5;
/** Cards that show; the rest wait, hidden, behind the third. */
const SHOWN = 3;

/** A small seeded random generator (mulberry32), so a maker's deck looks the same on every visit. */
function seeded(text: string) {
  let a = [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761), 1779033703);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Where each card rests by its depth (0 = front) and where it goes when the
 * deck fans out. Each maker's deck leans its own way: which side the cards
 * stick out to, how far, and how much they turn come from the maker's name.
 */
function deckPoses(maker: string) {
  const random = seeded(maker);
  const side = random() < 0.5 ? -1 : 1;
  const rest = ['none'];
  const fanned = [`translate(${-side * 4}px, 2px) rotate(${-side * (1 + random())}deg)`];
  // Kept small, so even fanned out a deck stays inside its own padding and never reaches the next one.
  for (let depth = 1; depth < SHOWN; depth++) {
    const x = side * depth * (4 + random() * 4);
    const y = -depth * (4 + random() * 4);
    const turn = side * depth * (0.8 + random() * 1.2);
    // Cards further back are a touch smaller, so they tuck in behind the front one.
    const scale = 1 - depth * 0.03;
    rest.push(`translate(${x}px, ${y}px) rotate(${turn}deg) scale(${scale})`);
    fanned.push(`translate(${x * 1.8}px, ${y * 1.3}px) rotate(${turn * 1.6}deg) scale(${scale})`);
  }
  return { rest, fanned, origin: side > 0 ? 'bottom left' : 'bottom right' };
}

/**
 * A maker with several designs, as a deck of cards. The arrows deal the next
 * design to the front; clicking the front card opens it. Hovering fans the
 * deck out a little, to show there is more underneath.
 */
export function MakerDeck({ maker, designs, drawings, onOpen, onShowAll }: MakerDeckProps) {
  const [front, setFront] = useState(0);
  const { rest, fanned, origin } = deckPoses(maker);
  const count = designs.length;
  const current = designs[front];
  const step = (delta: number) => setFront((front + delta + count) % count);

  return (
    <Box
      sx={{
        // Room for the cards behind, which stick out up and to one side.
        pt: DECK_ROOM,
        px: DECK_ROOM,
        // A fanned deck rises above its neighbours rather than tangling with them.
        position: 'relative',
        '&:hover, &:focus-within': { zIndex: 1 },
        ...Object.fromEntries(fanned.map((t, depth) => [`&:hover .deck-depth-${depth}`, { transform: t }])),
      }}
    >
      {/* Isolated, so the cards' z-indexes stay inside the deck and never rise over the filter pop-ups. */}
      <Box sx={{ position: 'relative', aspectRatio: '4 / 3', isolation: 'isolate' }}>
        {designs.map((design, i) => {
          const depth = (i - front + count) % count;
          return (
            <Box
              key={design.id}
              aria-hidden={depth > 0}
              className={`deck-depth-${depth}`}
              sx={(t) => ({
                position: 'absolute',
                inset: 0,
                zIndex: count - depth,
                borderRadius: `${t.radius.stage}px`,
                overflow: 'hidden',
                border: `${t.layout.hairline}px solid`,
                borderColor: 'divider',
                transform: rest[Math.min(depth, SHOWN - 1)],
                transformOrigin: origin,
                opacity: depth < SHOWN ? 1 : 0,
                filter: depth === 0 ? 'none' : `brightness(${1 - depth * 0.06})`,
                boxShadow: depth === 0 ? t.shadows[2] : 'none',
                transition: `transform 450ms ${EASE}, opacity 300ms, filter 300ms`,
              })}
            >
              <DesignPicture design={design} drawing={drawings[design.id]} />
            </Box>
          );
        })}

        {/* The front card is the link; the controls sit over it, not inside it. */}
        <ButtonBase
          onClick={() => onOpen(current.id)}
          aria-label={`Open ${current.name}`}
          sx={(t) => ({ position: 'absolute', inset: 0, zIndex: count + 1, borderRadius: `${t.radius.stage}px` })}
        />
        <Box sx={{ position: 'absolute', zIndex: count + 2, top: (t) => t.spacing(1.5), left: (t) => t.spacing(1.5) }}>
          <Pill overlay>
            {front + 1} / {count}
          </Pill>
        </Box>
        <Stack direction="row" spacing={0.75} sx={{ position: 'absolute', zIndex: count + 2, right: (t) => t.spacing(1.5), bottom: (t) => t.spacing(1.5) }}>
          {[
            { delta: -1, label: 'Previous design', icon: <ChevronLeftIcon fontSize="small" /> },
            { delta: 1, label: 'Next design', icon: <ChevronRightIcon fontSize="small" /> },
          ].map((b) => (
            <IconButton
              key={b.delta}
              size="small"
              aria-label={`${b.label} by @${maker}`}
              onClick={() => step(b.delta)}
              sx={{ bgcolor: 'background.paper', color: 'text.primary', '&:hover': { bgcolor: 'background.paper', opacity: 0.85 } }}
            >
              {b.icon}
            </IconButton>
          ))}
        </Stack>
      </Box>

      <Box sx={{ px: 0.5, pt: 1.25 }}>
        <Typography variant="subtitle1" noWrap>
          {current.name}
        </Typography>
        <Typography variant="meta" color="text.meta" component="div" noWrap>
          @{maker} ·{' '}
          <ButtonBase onClick={onShowAll} sx={{ typography: 'meta', color: 'text.primary', verticalAlign: 'baseline', '&:hover': { textDecoration: 'underline' } }}>
            all {count} designs →
          </ButtonBase>
        </Typography>
      </Box>
    </Box>
  );
}
