import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Fade from '@mui/material/Fade';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

export interface StackedCardItem {
  id: string;
  label: string;
  icon?: ReactElement;
  content: ReactNode;
}

export interface StackedCardsProps {
  items: StackedCardItem[];
  /** Auto-advance interval in ms. 0 turns it off. */
  autoAdvanceMs?: number;
  /** Controlled active index. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  'aria-label'?: string;
}

const MAX_GHOSTS = 2;
const PEEK = 1.5; // spacing units each ghost card sticks out to the right

/**
 * A deck of cards: the front card shows one item, the next ones peek out to
 * the right, and a pager (◀ dots ▶) moves through them. It advances on its
 * own, pausing while the user hovers or focuses inside it.
 */
export function StackedCards({
  items,
  autoAdvanceMs = 7000,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  'aria-label': ariaLabel = 'Updates',
}: StackedCardsProps) {
  const [innerIndex, setInnerIndex] = useState(defaultIndex);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const count = items.length;
  const index = (indexProp ?? innerIndex) % Math.max(1, count);
  // Reduced motion keeps the timer (the content still rotates) but drops the fade and progress animation.
  const running = autoAdvanceMs > 0 && !paused && count > 1;

  const select = (next: number) => {
    const wrapped = (next + count) % count;
    setInnerIndex(wrapped);
    onIndexChange?.(wrapped);
  };

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => select(index + 1), autoAdvanceMs);
    return () => window.clearTimeout(timer);
    // `select` is recreated each render; index and running are what matter.
  }, [running, index, autoAdvanceMs]);

  const ghosts = Math.min(MAX_GHOSTS, count - 1);
  const active = items[index];
  const cardRadius = (theme: { radius: { card: number } }) => `${theme.radius.card}px`;

  return (
    <Box
      component="section"
      aria-label={ariaLabel}
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
      sx={{ position: 'relative', pr: ghosts * PEEK }}
    >
      {/* Ghost cards peeking out to the right; clicking one brings it forward. */}
      {Array.from({ length: ghosts }, (_, i) => {
        const depth = i + 1;
        return (
          <ButtonBase
            key={depth}
            aria-label={`Show ${items[(index + depth) % count].label}`}
            tabIndex={-1}
            onClick={() => select(index + depth)}
            sx={{
              position: 'absolute',
              top: (theme) => theme.spacing(depth),
              bottom: (theme) => theme.spacing(depth),
              left: (theme) => theme.spacing(depth * PEEK),
              right: (theme) => theme.spacing((ghosts - depth) * PEEK),
              zIndex: MAX_GHOSTS - depth,
              border: 1,
              borderColor: 'divider',
              borderRadius: cardRadius,
              bgcolor: depth === 1 ? 'background.paper' : 'background.sunken',
              opacity: depth === 1 ? 1 : 0.7,
            }}
          />
        );
      })}

      <Paper
        variant="outlined"
        role="group"
        aria-roledescription="slide"
        aria-label={`${index + 1} of ${count}: ${active.label}`}
        sx={{
          position: 'relative',
          zIndex: MAX_GHOSTS,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: cardRadius,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 2.5, pt: 2, pb: 1 }}>
          {active.icon && <Box sx={{ display: 'flex', color: 'primary.main' }}>{active.icon}</Box>}
          <Typography variant="subtitle1" component="h3" sx={{ flex: 1 }}>
            {active.label}
          </Typography>
          <Typography variant="mono" color="text.meta">
            {index + 1}/{count}
          </Typography>
        </Stack>

        <Fade in key={active.id} timeout={{ enter: reducedMotion ? 0 : 250 }}>
          <Box sx={{ height: (theme) => theme.spacing(theme.layout.stackedCardHeight), overflow: 'auto' }}>
            {active.content}
          </Box>
        </Fade>

        {/* Pager: ◀ dots ▶. The active dot is a pill that fills up as the timer runs. */}
        <Stack sx={{ alignItems: 'center', pb: 1.5, pt: 1 }}>
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              alignItems: 'center',
              px: 0.5,
              borderRadius: 999,
              border: 1,
              borderColor: 'divider',
              bgcolor: 'background.sunken',
            }}
          >
            <IconButton size="small" aria-label="Previous" onClick={() => select(index - 1)}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            {items.map((item, i) => {
              const current = i === index;
              return (
                <ButtonBase
                  key={item.id}
                  aria-label={`Show ${item.label}`}
                  aria-current={current ? 'true' : undefined}
                  onClick={() => select(i)}
                  sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    width: (theme) => theme.spacing(current ? 3 : 1.25),
                    height: (theme) => theme.spacing(1.25),
                    borderRadius: 999,
                    bgcolor: current ? 'divider' : 'text.meta',
                    opacity: current ? 1 : 0.5,
                    transition: (theme) => theme.transitions.create(['width', 'opacity'], { duration: theme.transitions.duration.shorter }),
                    '&:hover': { opacity: 1 },
                  }}
                >
                  {current && (
                    <Box
                      key={`${index}-${running}`}
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        bgcolor: 'primary.main',
                        transformOrigin: 'left',
                        ...(running && !reducedMotion
                          ? {
                              animation: `stackedCardsProgress ${autoAdvanceMs}ms linear forwards`,
                              '@keyframes stackedCardsProgress': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
                            }
                          : {}),
                      }}
                    />
                  )}
                </ButtonBase>
              );
            })}
            <IconButton size="small" aria-label="Next" onClick={() => select(index + 1)}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
