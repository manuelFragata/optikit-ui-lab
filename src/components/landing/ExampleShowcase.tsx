import { useEffect, useState, type KeyboardEvent } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import type { Schematic } from '../editor/model';
import { SchematicCanvas } from '../editor/SchematicCanvas';
import { SliderField } from '../primitives/SliderField';
import { PillButton } from './PillButton';
import type { ExampleDesign } from '../../demo/landingContent';

export interface ExampleShowcaseProps {
  examples: ExampleDesign[];
  /** Auto-advance in ms until the visitor first interacts; 0 turns it off. */
  autoAdvanceMs?: number;
  /** Open the example, with the visitor's changes, in the full editor. */
  onOpen?: (id: string, schematic: Schematic) => void;
  /** A feature that needs an account was clicked (save, share, export). */
  onLocked?: () => void;
}

/** How far each card behind the front one sticks out to the left, spacing units. */
const PEEK = { xs: 2.5, md: 7 };
/** Each card further back is this much smaller. */
const SHRINK = 0.035;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

function setParam(schematic: Schematic, symbolId: string, value: number): Schematic {
  return {
    ...schematic,
    symbols: schematic.symbols.map((s) => (s.id === symbolId && s.param ? { ...s, param: { ...s.param, value } } : s)),
  };
}

interface CardProps {
  example: ExampleDesign;
  schematic: Schematic;
  front: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onParam: (symbolId: string, value: number) => void;
  onOpen?: () => void;
  onLocked?: () => void;
}

/** One example: its live schematic on the left, what it is and what to try on the right. */
function ExampleCard({ example, schematic, front, selectedId, onSelect, onParam, onOpen, onLocked }: CardProps) {
  const selected = front ? (schematic.symbols.find((s) => s.id === selectedId) ?? null) : null;
  return (
    <Box
      sx={(t) => ({
        display: 'grid',
        height: '100%',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: `minmax(0, 1fr) ${t.spacing(46)}` },
      })}
    >
      <Box sx={(t) => ({ display: 'flex', minHeight: { xs: t.spacing(t.layout.exampleStageHeightCompact), md: t.spacing(t.layout.exampleStageHeight) } })}>
        <SchematicCanvas
          fit
          schematic={schematic}
          selectedId={front ? selectedId : null}
          onSelect={front ? onSelect : () => undefined}
          options={{ showRayLabels: true }}
          hint={front ? 'Click a part to change it' : undefined}
        />
      </Box>

      <Stack
        spacing={2}
        sx={(t) => {
          const rule = `${t.layout.hairline}px solid ${(t.vars ?? t).palette.divider}`;
          return { p: 3, minWidth: 0, borderTop: { xs: rule, md: 'none' }, borderLeft: { xs: 'none', md: rule } };
        }}
      >
        <Box>
          <Typography variant="h1" component="h3">
            {example.title}
          </Typography>
          <Typography variant="meta" color="text.meta">
            {example.cubes} cubes · {schematic.symbols.length} parts
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          {example.summary}
        </Typography>

        {/* The part the visitor is playing with, or what to try. */}
        <Box sx={{ p: 2, borderRadius: (t) => `${t.radius.tile}px`, bgcolor: 'background.sunken', minHeight: (t) => t.spacing(15) }}>
          {selected ? (
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1">{selected.label}</Typography>
                <Typography variant="meta" color="text.meta">
                  {selected.id} · {selected.type}
                </Typography>
              </Stack>
              {selected.param ? (
                <SliderField
                  label={selected.param.label}
                  value={selected.param.value}
                  min={selected.param.min}
                  max={selected.param.max}
                  step={selected.param.step}
                  unit={selected.param.unit}
                  onChange={(value) => onParam(selected.id, value)}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  This part has no setting to change here. Open the editor to swap it or move it.
                </Typography>
              )}
            </Stack>
          ) : (
            <Stack spacing={0.5}>
              <Typography variant="overline" color="text.secondary">
                Try this
              </Typography>
              <Typography variant="body1">{example.tryThis}</Typography>
            </Stack>
          )}
        </Box>

        <Box sx={{ flex: 1 }} />

        <Stack spacing={1}>
          <PillButton size="large" onClick={onOpen}>
            Open in the editor
          </PillButton>
          <PillButton tone="outline" arrow={false} startIcon={<LockOutlinedIcon />} onClick={onLocked}>
            Save a copy
          </PillButton>
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            No account needed to play. Saving, sharing and STEP export need a free account.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

/**
 * The examples as a deck of cards. The front card is a live design: select a
 * part, change its main setting, carry on in the editor. The others stand
 * behind it and stick out to the left, each with its title on the spine;
 * picking one slides it forward and sends the front card to the back. Changes
 * are kept per example. It advances on its own (the next card's spine fills
 * up as a timer) until the first click or key press inside it.
 */
export function ExampleShowcase({ examples, autoAdvanceMs = 9000, onOpen, onLocked }: ExampleShowcaseProps) {
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Schematic>>({});
  const [hovered, setHovered] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const count = examples.length;
  const running = autoAdvanceMs > 0 && !engaged && !hovered && count > 1;

  const go = (next: number) => {
    setIndex((next + count) % count);
    setSelectedId(null);
  };

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => go(index + 1), autoAdvanceMs);
    return () => window.clearTimeout(timer);
    // `go` is recreated each render; index and running are what matter.
  }, [running, index, autoAdvanceMs]);

  // Arrow keys move through the deck, except where they already mean something (a slider).
  const onKeyDown = (e: KeyboardEvent) => {
    setEngaged(true);
    const target = e.target as HTMLElement;
    if (target.closest('input, [role="slider"], textarea')) return;
    if (e.key === 'ArrowRight') go(index + 1);
    else if (e.key === 'ArrowLeft') go(index - 1);
  };

  const peek = (t: Theme, depth: number) => ({
    xs: `translateX(${t.spacing(-depth * PEEK.xs)}) scale(${1 - depth * SHRINK})`,
    md: `translateX(${t.spacing(-depth * PEEK.md)}) scale(${1 - depth * SHRINK})`,
  });

  return (
    <Box
      component="section"
      aria-roledescription="carousel"
      aria-label="Example designs"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onPointerDown={() => setEngaged(true)}
      onKeyDown={onKeyDown}
      sx={{
        display: 'grid',
        // The cards behind stick out into this margin.
        pl: { xs: (count - 1) * PEEK.xs, md: (count - 1) * PEEK.md },
      }}
    >
      {examples.map((example, i) => {
        const depth = (i - index + count) % count;
        const front = depth === 0;
        const schematic = edits[example.id] ?? example.schematic;
        return (
          <Paper
            key={example.id}
            variant="outlined"
            role="group"
            aria-roledescription="slide"
            aria-label={`${example.title}${front ? '' : ' (behind)'}`}
            sx={(t) => ({
              gridArea: '1 / 1',
              position: 'relative',
              zIndex: count - depth,
              overflow: 'hidden',
              borderRadius: `${t.radius.stage}px`,
              transformOrigin: 'left center',
              transform: peek(t, depth),
              transition: reducedMotion ? 'none' : `transform 700ms ${EASE}, box-shadow 700ms ${EASE}`,
              boxShadow: front ? `0 ${t.spacing(3)} ${t.spacing(8)} ${t.spacing(-5)} color-mix(in srgb, ${(t.vars ?? t).palette.primary.main} 28%, transparent)` : 'none',
            })}
          >
            {/* Everything but the front card is out of reach: keyboard and screen readers skip it. */}
            <Box inert={!front} aria-hidden={front ? undefined : true} sx={{ height: '100%' }}>
              <ExampleCard
                example={example}
                schematic={schematic}
                front={front}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onParam={(symbolId, value) => setEdits({ ...edits, [example.id]: setParam(schematic, symbolId, value) })}
                onOpen={() => onOpen?.(example.id, schematic)}
                onLocked={onLocked}
              />
            </Box>

            {/* Behind: dimmed, and the whole card is the button that brings it forward. */}
            {!front && (
              <ButtonBase
                aria-label={`Show ${example.title}`}
                onClick={() => {
                  setEngaged(true);
                  go(i);
                }}
                sx={(t) => ({
                  position: 'absolute',
                  inset: 0,
                  justifyContent: 'flex-start',
                  alignItems: 'stretch',
                  // Solid enough that the spine reads as a surface, not as a busy canvas.
                  bgcolor: `color-mix(in srgb, ${(t.vars ?? t).palette.background.paper} ${depth === 1 ? 88 : 94}%, ${(t.vars ?? t).palette.background.sunken})`,
                  transition: `background-color 200ms ${EASE}`,
                  '&:hover, &:focus-visible': { bgcolor: `color-mix(in srgb, ${(t.vars ?? t).palette.background.paper} 55%, transparent)` },
                  '&:hover .spine, &:focus-visible .spine': { color: 'text.primary' },
                  '&:hover .spine-arrow, &:focus-visible .spine-arrow': { bgcolor: 'primary.main', color: 'primary.contrastText', borderColor: 'primary.main' },
                })}
              >
                {/* The spine: the strip that sticks out, with the title running up it. */}
                <Box
                  className="spine"
                  sx={(t) => ({
                    position: 'relative',
                    display: { xs: 'none', md: 'flex' },
                    width: t.spacing(PEEK.md / (1 - depth * SHRINK)),
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary',
                    transition: `color 200ms ${EASE}`,
                  })}
                >
                  <Box
                    className="spine-arrow"
                    aria-hidden
                    sx={(t) => ({
                      position: 'absolute',
                      top: t.spacing(2.5),
                      display: 'grid',
                      placeItems: 'center',
                      width: t.spacing(3.5),
                      height: t.spacing(3.5),
                      borderRadius: '50%',
                      border: `${t.layout.hairline}px solid`,
                      borderColor: 'divider',
                      transition: `all 200ms ${EASE}`,
                    })}
                  >
                    <NorthEastIcon sx={{ fontSize: '0.875rem' }} />
                  </Box>
                  <Typography
                    variant="subtitle1"
                    component="span"
                    sx={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', color: 'inherit' }}
                  >
                    {example.title}
                  </Typography>
                  {/* The next card's spine fills up while the timer runs. */}
                  {depth === 1 && running && (
                    <Box
                      key={index}
                      aria-hidden
                      sx={(t) => ({
                        position: 'absolute',
                        right: 0,
                        top: t.spacing(3),
                        bottom: t.spacing(3),
                        width: `${t.layout.hairline * 2}px`,
                        bgcolor: 'primary.main',
                        transformOrigin: 'bottom',
                        ...(reducedMotion
                          ? {}
                          : {
                              animation: `exampleProgress ${autoAdvanceMs}ms linear forwards`,
                              '@keyframes exampleProgress': { from: { transform: 'scaleY(0)' }, to: { transform: 'scaleY(1)' } },
                            }),
                      })}
                    />
                  )}
                </Box>
              </ButtonBase>
            )}
          </Paper>
        );
      })}
    </Box>
  );
}
