import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Fade from '@mui/material/Fade';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useColorScheme, type Theme } from '@mui/material/styles';
import ThreeSixtyIcon from '@mui/icons-material/ThreeSixty';
import { benchBeams, benchParts, benchPlate } from '../../demo/benchAssembly';
import type { FeatureHighlight } from '../../demo/landingContent';
import { benchColors } from '../../theme/tokens';
import { TagChip } from '../primitives/TagChip';
import { PillButton } from './PillButton';
import type { BenchPin, BenchScene, BenchStep } from './bench3d/benchScene';

export interface BenchPreviewProps {
  /** The four steps, in order: sketch, mount, assemble, build. */
  features: FeatureHighlight[];
  /** Advance to the next step every this many ms until the visitor interacts; 0 turns it off. */
  autoAdvanceMs?: number;
  /** The pill that straddles the stage's bottom edge ("Start your own bench"). */
  onStart?: () => void;
  /** Section title, set large in the stage's notch. */
  title?: string;
}

/** How long each step stays up when advancing on its own, relative to `autoAdvanceMs`. */
const DWELL: Record<BenchStep, number> = { sketch: 1, simulate: 1.3, cubify: 1.3, build: 1 };

const stageRadius = (t: Theme) => `${t.radius.stage}px`;

/**
 * An inverted corner: a square of the page colour with a quarter circle cut
 * out, so the notch's edges curve into the stage like the stage's own corners.
 */
function InvertedCorner({ sx }: { sx: object }) {
  return (
    <Box
      aria-hidden
      sx={(t) => ({
        position: 'absolute',
        width: stageRadius(t),
        height: stageRadius(t),
        background: `radial-gradient(circle at 100% 100%, transparent ${t.radius.stage - 0.5}px, ${(t.vars ?? t).palette.background.default} ${t.radius.stage}px)`,
        ...sx,
      })}
    />
  );
}

/**
 * The features as a live 3D bench: a small laser microscope built from real
 * openUC2 modules. The steps move the camera and the parts (a top-down
 * sketch, a lens dropping into its cube, the assembled instrument turning,
 * an exploded build view). Drag to turn it; click a part to see what it is.
 * three.js loads only when the stage comes near the viewport.
 */
export function BenchPreview({ features, autoAdvanceMs = 6500, onStart, title }: BenchPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<BenchScene | null>(null);
  const [index, setIndex] = useState(0);
  const [engaged, setEngaged] = useState(false);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [loaded, setLoaded] = useState(0);
  const [pins, setPins] = useState<BenchPin[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { mode, systemMode } = useColorScheme();
  const scheme = (mode === 'system' ? systemMode : mode) === 'dark' ? 'dark' : 'light';
  const colors = benchColors[scheme];

  const feature = features[index];
  const step: BenchStep = feature.id;

  // Watch visibility: start loading once near the viewport, pause rendering off screen.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Create the scene the first time the stage is near the viewport.
  useEffect(() => {
    if (!visible || status !== 'idle' || !canvasRef.current) return;
    setStatus('loading');
    let cancelled = false;
    import('./bench3d/benchScene')
      .then(({ createBenchScene }) => {
        if (cancelled || !canvasRef.current) return;
        sceneRef.current = createBenchScene(canvasRef.current, {
          parts: benchParts,
          beams: benchBeams,
          plate: benchPlate,
          colors,
          initialStep: step,
          motion: !reducedMotion,
          onPins: setPins,
          onSelect: (id) => {
            setSelected(id);
            setEngaged(true);
          },
          onPartLoaded: () => setLoaded((n) => n + 1),
        });
        setStatus('ready');
      })
      .catch(() => setStatus('failed'));
    return () => {
      cancelled = true;
    };
    // Created once; later changes go through the effects below.
  }, [visible]);

  useEffect(() => () => sceneRef.current?.dispose(), []);
  useEffect(() => sceneRef.current?.setActive(visible), [visible]);
  useEffect(() => sceneRef.current?.setStep(step), [step, status]);
  useEffect(() => sceneRef.current?.setColors(colors), [scheme, status]);

  // Step through on its own until the visitor touches the stage or the steps.
  useEffect(() => {
    if (engaged || !visible || autoAdvanceMs <= 0 || status !== 'ready') return;
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % features.length), autoAdvanceMs * DWELL[step]);
    return () => window.clearTimeout(timer);
  }, [engaged, visible, autoAdvanceMs, index, status, features.length, step]);

  const choose = (i: number) => {
    setEngaged(true);
    setIndex(i);
  };
  const pick = (id: string | null) => {
    setEngaged(true);
    setSelected(id);
    sceneRef.current?.select(id);
  };

  const info = benchParts.find((p) => p.id === selected) ?? null;
  const selectedPin = pins.find((p) => p.id === selected && p.visible);
  const allLoaded = loaded >= benchParts.length;

  return (
    <Stack spacing={2}>
      <Box sx={{ position: 'relative' }}>
      <Box
        ref={containerRef}
        onPointerDown={() => setEngaged(true)}
        sx={(t) => ({
          position: 'relative',
          // On wide screens the stage bleeds a little past the text column.
          mx: { lg: -4 },
          height: { xs: t.spacing(t.layout.benchStageHeightCompact), md: `min(${t.spacing(t.layout.benchStageHeight)}, 88vh)` },
          borderRadius: stageRadius(t),
          // The notch covers this corner; squaring it keeps the notch's text from being clipped.
          borderTopLeftRadius: 0,
          overflow: 'hidden',
          background: `linear-gradient(180deg, ${colors.stageTop}, ${colors.stageBottom})`,
        })}
      >
        <Box
          component="canvas"
          ref={canvasRef}
          aria-label="3D preview of a fluorescence microscope built from openUC2 cubes: a green laser excites the sample, and its orange light is imaged onto a camera. Drag to turn it."
          role="img"
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
        />

        {/* Hotspots on the parts. In the build step every part is labelled, like a parts list. */}
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {/* While the light runs, the hotspots step aside so the beam reads clearly. */}
          {step !== 'simulate' &&
            pins
            .filter((p) => p.visible)
            .map((p) => {
              const part = benchParts.find((b) => b.id === p.id);
              const on = p.id === selected;
              return (
                <Box key={p.id} sx={{ position: 'absolute', left: p.x, top: p.y, transform: 'translate(-50%, -50%)' }}>
                  <ButtonBase
                    aria-label={part?.label}
                    aria-pressed={on}
                    onClick={() => pick(on ? null : p.id)}
                    sx={(t) => ({
                      pointerEvents: 'auto',
                      width: t.spacing(3),
                      height: t.spacing(3),
                      borderRadius: '50%',
                      bgcolor: 'common.white',
                      boxShadow: `0 0 0 ${t.spacing(0.75)} color-mix(in srgb, ${t.palette.common.white} 45%, transparent)`,
                      '&::after': {
                        content: '""',
                        width: t.spacing(1.25),
                        height: t.spacing(1.25),
                        borderRadius: '50%',
                        bgcolor: on ? colors.selection : (t.vars ?? t).palette.grey[800],
                      },
                    })}
                  />
                  {(step === 'build' || step === 'sketch') && part && part.optic.kind !== 'spacer' && !on && (
                    <Typography
                      variant="meta"
                      sx={{
                        position: 'absolute',
                        // Centred above the dot, so neighbours on a row don't collide.
                        left: '50%',
                        bottom: '100%',
                        transform: 'translateX(-50%)',
                        mb: 0.75,
                        px: 1,
                        borderRadius: (t) => `${t.radius.pill}px`,
                        bgcolor: 'background.paper',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {part.label}
                    </Typography>
                  )}
                </Box>
              );
            })}
        </Box>

        {/* Callout for the selected part. */}
        {info && selectedPin && (
          <Paper
            variant="outlined"
            sx={(t) => ({
              position: 'absolute',
              // Beside the pin, kept inside the stage.
              left: `min(${selectedPin.x}px + ${t.spacing(3)}, 100% - ${t.spacing(38)})`,
              top: `max(${selectedPin.y}px - ${t.spacing(6)}, ${t.spacing(2)})`,
              width: t.spacing(34),
              p: 1.75,
              borderRadius: `${t.radius.tile * 2}px`,
              pointerEvents: 'auto',
            })}
          >
            <Typography variant="subtitle1">{info.label}</Typography>
            <Typography variant="meta" color="text.meta" component="div">
              {info.source}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              {info.role}
            </Typography>
            {(step === 'cubify' || step === 'build') && <TagChip label="In a cube" tone="success" dot size="small" sx={{ mt: 1 }} />}
          </Paper>
        )}

        {/* The notch: the section's title and the current step sit in a cut-out of the stage's top-left corner. */}
        <Box
          sx={(t) => ({
            position: 'absolute',
            top: 0,
            left: 0,
            width: { xs: '86%', sm: t.spacing(title ? 92 : 56) },
            pl: { lg: 4 }, // line the title up with the page text despite the bleed
            pr: { xs: 2.5, md: 5 },
            pb: { xs: 2.5, md: 4 },
            bgcolor: 'background.default',
            borderBottomRightRadius: stageRadius(t),
          })}
        >
          {title && (
            <Typography variant="headline" component="h2" sx={{ pt: 0.5, mb: { xs: 2, md: 3 } }}>
              {title}
            </Typography>
          )}
          <Fade in key={feature.id} timeout={reducedMotion ? 0 : 300}>
            <Box sx={(t) => ({ pt: title ? 0 : 0.5, minHeight: { md: t.spacing(12) } })}>
              <Typography variant={title ? 'h1' : 'headline'} component="h3">
                {feature.title}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: title ? 0.5 : 1, maxWidth: (t) => t.spacing(56) }}>
                {feature.text}
              </Typography>
            </Box>
          </Fade>
          <InvertedCorner sx={{ top: 0, left: '100%' }} />
          <InvertedCorner sx={{ top: '100%', left: 0 }} />
        </Box>

        {/* Step timeline, right edge (desktop). */}
        <Stack
          component="nav"
          aria-label="Steps"
          sx={{ display: { xs: 'none', md: 'flex' }, position: 'absolute', right: (t) => t.spacing(4), top: '50%', transform: 'translateY(-50%)' }}
        >
          {features.map((f, i) => {
            const on = i === index;
            return (
              <ButtonBase
                key={f.id}
                onClick={() => choose(i)}
                aria-current={on ? 'step' : undefined}
                sx={(t) => ({
                  position: 'relative',
                  justifyContent: 'flex-start',
                  gap: 1.5,
                  py: 1.25,
                  pl: 0,
                  pr: 1,
                  borderRadius: `${t.radius.pill}px`,
                  color: on ? 'text.primary' : 'text.secondary',
                  // the thread between the dots
                  '&:not(:last-of-type)::after': {
                    content: '""',
                    position: 'absolute',
                    left: t.spacing(0.625),
                    top: `calc(50% + ${t.spacing(1)})`,
                    height: `calc(100% - ${t.spacing(2)})`,
                    width: `${t.layout.hairline}px`,
                    bgcolor: 'text.meta',
                    opacity: 0.5,
                  },
                })}
              >
                <Box
                  sx={(t) => ({
                    width: t.spacing(1.25),
                    height: t.spacing(1.25),
                    borderRadius: '50%',
                    border: `${t.layout.hairline}px solid`,
                    borderColor: on ? 'text.primary' : 'text.meta',
                    bgcolor: on ? 'text.primary' : 'transparent',
                  })}
                />
                <Typography variant="subtitle2" color="inherit" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {f.title}
                </Typography>
              </ButtonBase>
            );
          })}
        </Stack>

        {/* Bottom edge: what this is, and how to use it. */}
        <Stack
          direction="row"
          spacing={1}
          sx={{ position: 'absolute', left: (t) => t.spacing(3), right: (t) => t.spacing(3), bottom: (t) => t.spacing(2.5), alignItems: 'center', pointerEvents: 'none' }}
        >
          <Typography variant="meta" color="text.secondary" sx={{ flex: 1 }}>
            {status === 'failed'
              ? 'The 3D preview needs WebGL, which this browser does not offer.'
              : status === 'ready' && allLoaded
                ? `Real parts from the openUC2 library · ${benchParts.length} modules on a ${benchPlate[0]} × ${benchPlate[1]} plate`
                : status === 'idle'
                  ? 'Real parts from the openUC2 library'
                  : `Loading real parts from the openUC2 library · ${loaded} of ${benchParts.length}`}
          </Typography>
          {status === 'ready' && (
            <Stack
              direction="row"
              spacing={0.75}
              sx={(t) => ({ alignItems: 'center', px: 1.5, py: 0.5, borderRadius: `${t.radius.pill}px`, bgcolor: 'background.paper', color: 'text.secondary' })}
            >
              <ThreeSixtyIcon sx={{ fontSize: '1rem' }} />
              <Typography variant="meta">Drag to turn · click a part</Typography>
            </Stack>
          )}
        </Stack>
      </Box>

      {/* A pill that sits across the stage's bottom edge and leads on down the page. */}
      {onStart && (
        <Box sx={{ position: 'absolute', left: '50%', bottom: 0, transform: 'translate(-50%, 50%)', zIndex: 1 }}>
          <PillButton size="large" onClick={onStart} sx={(t) => ({ boxShadow: `0 0 0 ${t.spacing(0.75)} ${(t.vars ?? t).palette.background.default}` })}>
            Start your own bench
          </PillButton>
        </Box>
      )}
      </Box>

      {/* Step pills (phones and tablets). */}
      <Stack direction="row" useFlexGap spacing={0.75} sx={{ display: { xs: 'flex', md: 'none' }, flexWrap: 'wrap', pt: onStart ? 3 : 0 }}>
        {features.map((f, i) => (
          <ButtonBase
            key={f.id}
            onClick={() => choose(i)}
            aria-current={i === index ? 'step' : undefined}
            sx={(t) => ({
              px: 1.75,
              py: 0.75,
              borderRadius: `${t.radius.pill}px`,
              border: `${t.layout.hairline}px solid`,
              borderColor: i === index ? 'text.primary' : 'divider',
              bgcolor: i === index ? 'text.primary' : 'transparent',
              color: i === index ? 'background.paper' : 'text.secondary',
              typography: 'subtitle2',
            })}
          >
            {f.title}
          </ButtonBase>
        ))}
      </Stack>
    </Stack>
  );
}
