import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import type { Schematic } from '../editor/model';
import { SchematicCanvas } from '../editor/SchematicCanvas';
import { SliderField } from '../primitives/SliderField';
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

function setParam(schematic: Schematic, symbolId: string, value: number): Schematic {
  return {
    ...schematic,
    symbols: schematic.symbols.map((s) => (s.id === symbolId && s.param ? { ...s, param: { ...s.param, value } } : s)),
  };
}

/**
 * Slideshow of live example designs. Each slide is a working schematic: the
 * visitor can select parts and change their main setting, then carry on in the
 * editor. Changes are kept per example while they flip through the slides.
 * Advances on its own until the first click or key press inside it.
 */
export function ExampleShowcase({ examples, autoAdvanceMs = 9000, onOpen, onLocked }: ExampleShowcaseProps) {
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Schematic>>({});
  const [hovered, setHovered] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const count = examples.length;
  const example = examples[index];
  const schematic = edits[example.id] ?? example.schematic;
  const selected = schematic.symbols.find((s) => s.id === selectedId) ?? null;
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

  return (
    <Box
      component="section"
      aria-roledescription="carousel"
      aria-label="Example designs"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onPointerDown={() => setEngaged(true)}
      onKeyDown={() => setEngaged(true)}
    >
      {/* Slide tabs, with the running timer drawn under the active one. */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
        <Stack direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: 'wrap', flex: 1 }} role="tablist" aria-label="Examples">
          {examples.map((ex, i) => {
            const current = i === index;
            return (
              <ButtonBase
                key={ex.id}
                role="tab"
                aria-selected={current}
                onClick={() => go(i)}
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  px: 1.75,
                  py: 0.75,
                  borderRadius: 999,
                  border: 1,
                  borderColor: current ? 'primary.main' : 'divider',
                  bgcolor: current ? 'primary.soft' : 'background.paper',
                  color: current ? 'primary.onSoft' : 'text.secondary',
                  typography: 'subtitle2',
                  '&:hover': { color: 'text.primary' },
                }}
              >
                {ex.title}
                {current && running && (
                  <Box
                    key={index}
                    aria-hidden
                    sx={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: (t) => `${t.layout.hairline * 2}px`,
                      bgcolor: 'primary.main',
                      transformOrigin: 'left',
                      ...(reducedMotion
                        ? {}
                        : {
                            animation: `exampleProgress ${autoAdvanceMs}ms linear forwards`,
                            '@keyframes exampleProgress': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
                          }),
                    }}
                  />
                )}
              </ButtonBase>
            );
          })}
        </Stack>
        <Typography variant="mono" color="text.meta" sx={{ display: { xs: 'none', sm: 'block' } }}>
          {index + 1}/{count}
        </Typography>
        <IconButton aria-label="Previous example" onClick={() => go(index - 1)} sx={{ border: 1, borderColor: 'divider' }}>
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <IconButton aria-label="Next example" onClick={() => go(index + 1)} sx={{ border: 1, borderColor: 'divider' }}>
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Paper
        variant="outlined"
        role="tabpanel"
        aria-roledescription="slide"
        aria-label={`${index + 1} of ${count}: ${example.title}`}
        sx={(t) => ({
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: `minmax(0, 1fr) ${t.spacing(46)}` },
          borderRadius: `${t.radius.card}px`,
          overflow: 'hidden',
        })}
      >
        <Box sx={(t) => ({ display: 'flex', minHeight: { xs: t.spacing(t.layout.exampleStageHeightCompact), md: t.spacing(t.layout.exampleStageHeight) } })}>
          <SchematicCanvas
            key={example.id}
            fit
            schematic={schematic}
            selectedId={selectedId}
            onSelect={setSelectedId}
            options={{ showRayLabels: true }}
            hint="Click a part to change it"
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
            <Typography variant="mono" color="text.meta">
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
                  <Typography variant="mono" color="text.meta">
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
                    onChange={(value) => setEdits({ ...edits, [example.id]: setParam(schematic, selected.id, value) })}
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
            <Button variant="contained" size="large" endIcon={<ArrowForwardIcon />} onClick={() => onOpen?.(example.id, schematic)}>
              Open in the editor
            </Button>
            <Button variant="outlined" startIcon={<LockOutlinedIcon />} onClick={onLocked}>
              Save a copy
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
              No account needed to play. Saving, sharing and STEP export need a free account.
            </Typography>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
