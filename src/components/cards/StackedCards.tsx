import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Fade from '@mui/material/Fade';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import useMediaQuery from '@mui/material/useMediaQuery';

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

/**
 * Cards stacked on top of each other: tabs pick the front card, and the stack
 * advances on its own, pausing while the user hovers or focuses inside it.
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
  const index = (indexProp ?? innerIndex) % Math.max(1, items.length);
  // Reduced motion keeps the timer (the content still rotates) but drops the fade and progress animation.
  const running = autoAdvanceMs > 0 && !paused && items.length > 1;

  const select = (next: number) => {
    const wrapped = (next + items.length) % items.length;
    setInnerIndex(wrapped);
    onIndexChange?.(wrapped);
  };

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => select(index + 1), autoAdvanceMs);
    return () => window.clearTimeout(timer);
    // `select` is recreated each render; index and running are what matter.
  }, [running, index, autoAdvanceMs]);

  const ghosts = Math.min(MAX_GHOSTS, items.length - 1);
  const active = items[index];

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
      sx={{ position: 'relative', pb: ghosts }}
    >
      {/* Ghost cards peeking out below; clicking one brings the next card forward. */}
      {Array.from({ length: ghosts }, (_, i) => {
        const depth = i + 1;
        return (
          <ButtonBase
            key={depth}
            aria-label={`Show ${items[(index + depth) % items.length].label}`}
            tabIndex={-1}
            onClick={() => select(index + depth)}
            sx={{
              position: 'absolute',
              top: (theme) => theme.spacing(depth),
              bottom: (theme) => theme.spacing(ghosts - depth),
              left: (theme) => theme.spacing(depth * 1.5),
              right: (theme) => theme.spacing(depth * 1.5),
              zIndex: MAX_GHOSTS - depth,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: depth === 1 ? 'background.paper' : 'background.sunken',
            }}
          />
        );
      })}

      <Paper variant="outlined" sx={{ position: 'relative', zIndex: MAX_GHOSTS, overflow: 'hidden' }}>
        <Stack direction="row" sx={{ alignItems: 'center', borderBottom: 1, borderColor: 'divider', px: 1 }}>
          <Tabs
            value={index}
            onChange={(_, next: number) => select(next)}
            variant="scrollable"
            scrollButtons={false}
            sx={{ flex: 1, minHeight: 0 }}
          >
            {items.map((item, i) => (
              <Tab
                key={item.id}
                value={i}
                label={item.label}
                icon={item.icon}
                iconPosition="start"
                id={`stacked-tab-${item.id}`}
                aria-controls={`stacked-panel-${item.id}`}
                sx={{ minHeight: (theme) => theme.spacing(theme.layout.panelHeaderHeight), textTransform: 'none' }}
              />
            ))}
          </Tabs>
        </Stack>

        {/* Progress bar for the auto-advance timer; restarts whenever the card changes. */}
        <Box sx={{ height: (theme) => `${theme.layout.hairline * 2}px`, bgcolor: 'transparent' }}>
          {running && !reducedMotion && (
            <Box
              key={index}
              sx={{
                height: '100%',
                bgcolor: 'primary.main',
                transformOrigin: 'left',
                animation: `stackedCardsProgress ${autoAdvanceMs}ms linear forwards`,
                '@keyframes stackedCardsProgress': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
              }}
            />
          )}
        </Box>

        <Fade in key={active.id} timeout={{ enter: reducedMotion ? 0 : 250 }}>
          <Box
            role="tabpanel"
            id={`stacked-panel-${active.id}`}
            aria-labelledby={`stacked-tab-${active.id}`}
            sx={{ height: (theme) => theme.spacing(theme.layout.stackedCardHeight), overflow: 'auto' }}
          >
            {active.content}
          </Box>
        </Fade>
      </Paper>
    </Box>
  );
}
