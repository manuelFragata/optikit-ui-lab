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
import { benchBeams, benchController, benchLevels, benchParts, benchPlate } from '../../demo/benchAssembly';
import type { FeatureHighlight } from '../../demo/landingContent';
import { benchColors } from '../../theme/tokens';
import { OpenUC2Mark } from '../primitives/OpenUC2Mark';
import { TagChip } from '../primitives/TagChip';
import { PillButton } from './PillButton';
import type { BenchControlState, BenchPin, BenchScene, BenchStep } from './bench3d/benchScene';

export interface BenchPreviewProps {
  /** The four steps, in order: sketch, simulate, cubify, control. */
  features: FeatureHighlight[];
  /** Advance to the next step every this many ms until the visitor interacts; 0 turns it off. */
  autoAdvanceMs?: number;
  /** The pill that straddles the stage's bottom edge ("Start your own bench"). */
  onStart?: () => void;
  /** Section title, set large in the stage's notch. */
  title?: string;
}

/** How long each step stays up when advancing on its own, relative to `autoAdvanceMs`. */
const DWELL: Record<BenchStep, number> = { sketch: 1, simulate: 1.3, cubify: 1.3, control: 1.8 };

const stageRadius = (t: Theme) => `${t.radius.stage}px`;

/** The live view's pixels: a scanned image is coarse, and shows it. */
const LIVE_W = 96;
const LIVE_H = 64;

/**
 * A made-up fluorescence image of cells (seeded, so it is the same every
 * time): what the cameras record once the scan is done.
 */
function makeSampleImage(emission: string) {
  const img = document.createElement('canvas');
  img.width = LIVE_W;
  img.height = LIVE_H;
  const ctx = img.getContext('2d');
  if (!ctx) return img;
  // Canvas gradients take plain colours only (no color-mix).
  const hex = emission.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const tint = (a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  ctx.fillStyle = '#07090b';
  ctx.fillRect(0, 0, LIVE_W, LIVE_H);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) {
    const x = rnd() * LIVE_W;
    const y = rnd() * LIVE_H;
    const r = 5 + rnd() * 7;
    const cell = ctx.createRadialGradient(x, y, 0, x, y, r);
    cell.addColorStop(0, emission);
    cell.addColorStop(0.55, tint(0.45));
    cell.addColorStop(1, tint(0));
    ctx.globalAlpha = 0.5 + rnd() * 0.5;
    ctx.fillStyle = cell;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.6 + rnd() * 0.4), rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    // A brighter nucleus.
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#fff3e0';
    ctx.beginPath();
    ctx.arc(x + (rnd() - 0.5) * 2, y + (rnd() - 0.5) * 2, 1 + rnd() * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  return img;
}

/** Draw one frame of the live view: nothing until plugged in, a blur while focusing, then the scan. */
function drawLive(ctx: CanvasRenderingContext2D, image: HTMLCanvasElement, state: BenchControlState, scanline: string) {
  ctx.fillStyle = '#07090b';
  ctx.fillRect(0, 0, LIVE_W, LIVE_H);
  if (state.phase === 'plug') return;
  if (state.phase === 'focus') {
    ctx.filter = `blur(${Math.min(4, Math.abs(state.defocus) * 0.45).toFixed(2)}px)`;
    ctx.globalAlpha = 0.8;
    ctx.drawImage(image, 0, 0);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    return;
  }
  if (state.phase === 'done') {
    ctx.drawImage(image, 0, 0);
    return;
  }
  const rows = state.scan * state.lines;
  const line = Math.floor(rows);
  const along = rows - line;
  const lineH = LIVE_H / state.lines;
  // Lines already scanned, then the part of this line the spot has crossed.
  ctx.drawImage(image, 0, 0, LIVE_W, line * lineH, 0, 0, LIVE_W, line * lineH);
  const w = Math.max(1, along * LIVE_W);
  ctx.drawImage(image, 0, line * lineH, w, lineH, 0, line * lineH, w, lineH);
  ctx.fillStyle = scanline;
  ctx.fillRect(Math.min(LIVE_W - 1, w), line * lineH, 1, lineH);
}

function liveCaption(state: BenchControlState) {
  switch (state.phase) {
    case 'plug':
      return 'Connecting the laser, galvo, z-stage and cameras';
    case 'focus':
      return `Autofocus · ${state.defocus >= 0 ? '+' : '−'}${Math.abs(state.defocus * 10).toFixed(0)} µm`;
    case 'scan':
      return `Scanning · line ${Math.min(state.lines, Math.floor(state.scan * state.lines) + 1)} of ${state.lines}`;
    default:
      return `Frame done · ${state.lines} lines`;
  }
}

/**
 * An inverted corner: a square of the page colour with a quarter circle cut
 * out, so the notch's edges curve into the stage like the stage's own corners.
 */
function InvertedCorner({ sx, stageAt = '100% 100%' }: { sx: object; stageAt?: string }) {
  return (
    <Box
      aria-hidden
      sx={(t) => ({
        position: 'absolute',
        width: stageRadius(t),
        height: stageRadius(t),
        background: `radial-gradient(circle at ${stageAt}, transparent ${t.radius.stage - 0.5}px, ${(t.vars ?? t).palette.background.default} ${t.radius.stage}px)`,
        ...sx,
      })}
    />
  );
}

/** Diameter of the corner badge, spacing units. */
const BADGE = 12;
const BADGE_TEXT = 'openUC2 · Optikit · real cubes · ';

/**
 * Decoration for the stage's top-right corner: a disc cut from the stage, set
 * apart in its own notch, with the openUC2 mark and a line of text slowly
 * turning round it. It does nothing.
 */
function CornerBadge({ top, bottom, still }: { top: string; bottom: string; still: boolean }) {
  // The text runs on a circle just inside the disc's edge.
  const r = 37;
  return (
    <Box
      aria-hidden
      sx={(t) => ({
        position: 'relative',
        width: t.spacing(BADGE),
        height: t.spacing(BADGE),
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        background: `linear-gradient(180deg, ${top}, ${bottom})`,
      })}
    >
      <Box
        component="svg"
        viewBox="0 0 100 100"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          color: 'text.secondary',
          animation: still ? 'none' : 'badgeTurn 40s linear infinite',
          '@keyframes badgeTurn': { to: { transform: 'rotate(360deg)' } },
        }}
      >
        <defs>
          <path id="badge-ring" d={`M 50 ${50 - r} a ${r} ${r} 0 1 1 0 ${2 * r} a ${r} ${r} 0 1 1 0 ${-2 * r}`} />
        </defs>
        <text fill="currentColor" style={{ fontSize: 10.5, letterSpacing: '0.04em' }}>
          <textPath href="#badge-ring" textLength={2 * Math.PI * r - 2} lengthAdjust="spacing">
            {BADGE_TEXT}
          </textPath>
        </text>
      </Box>
      <OpenUC2Mark sx={(t) => ({ height: t.spacing(3.5) })} />
    </Box>
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
  const liveRef = useRef<HTMLCanvasElement>(null);
  const liveCaptionRef = useRef<HTMLSpanElement>(null);
  const liveImage = useRef<HTMLCanvasElement | null>(null);
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
  const colorsRef = useRef(colors);
  colorsRef.current = colors;

  // Drawn straight from the scene's frames, outside React.
  const onControl = useRef((state: BenchControlState) => {
    const ctx = liveRef.current?.getContext('2d');
    if (!ctx) return;
    liveImage.current ??= makeSampleImage(colorsRef.current.beamEmission);
    drawLive(ctx, liveImage.current, state, colorsRef.current.beam);
    if (liveCaptionRef.current) liveCaptionRef.current.textContent = liveCaption(state);
  });

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
          controller: benchController,
          colors,
          initialStep: step,
          motion: !reducedMotion,
          onPins: setPins,
          onSelect: (id) => {
            setSelected(id);
            setEngaged(true);
          },
          onPartLoaded: () => setLoaded((n) => n + 1),
          onControl: (state) => onControl.current(state),
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
          // The notches cover these corners; squaring them keeps what sits in them from being clipped.
          borderTopLeftRadius: 0,
          borderTopRightRadius: { xs: stageRadius(t), md: 0 },
          overflow: 'hidden',
          background: `linear-gradient(180deg, ${colors.stageTop}, ${colors.stageBottom})`,
        })}
      >
        <Box
          component="canvas"
          ref={canvasRef}
          aria-label="3D preview of a laser-scanning fluorescence microscope built as a tower of openUC2 cubes: a galvo sweeps a green laser spot over the sample, and its orange light is imaged onto two cameras. Drag to turn it."
          role="img"
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
        />

        {/* Hotspots on the parts. The sketch labels every symbol, under it in
            its cube; cubify puts a dot on each cube. */}
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {/* While the light runs, the hotspots step aside so the beam reads clearly. */}
          {(step === 'sketch' || step === 'cubify') &&
            pins
            // Empty cubes only hold things up: no hotspot.
            .filter((p) => p.visible && benchParts.find((b) => b.id === p.id)?.optic.kind !== 'spacer')
            .map((p) => {
              const part = benchParts.find((b) => b.id === p.id);
              const on = p.id === selected;
              const named = Boolean(part) && part?.optic.kind !== 'spacer';
              if (step === 'sketch') {
                return named ? (
                  <ButtonBase
                    key={p.id}
                    aria-pressed={on}
                    onClick={() => pick(on ? null : p.id)}
                    sx={(t) => ({
                      position: 'absolute',
                      left: p.x,
                      top: p.y,
                      transform: 'translateX(-50%)',
                      mt: 3.5,
                      px: 1,
                      pointerEvents: 'auto',
                      borderRadius: `${t.radius.pill}px`,
                      bgcolor: 'background.paper',
                      boxShadow: on ? `0 0 0 ${t.spacing(0.25)} ${colors.selection}` : 'none',
                      whiteSpace: 'nowrap',
                    })}
                  >
                    <Typography variant="meta">{part?.label}</Typography>
                  </ButtonBase>
                ) : null;
              }
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
            {(step === 'cubify' || step === 'control') && <TagChip label="In a cube" tone="success" dot size="small" sx={{ mt: 1 }} />}
          </Paper>
        )}

        {/* Control: what the cameras see while the instrument runs. */}
        <Fade in={step === 'control' && status === 'ready'} timeout={reducedMotion ? 0 : 300} unmountOnExit={false}>
          <Paper
            variant="outlined"
            aria-live="polite"
            sx={(t) => ({
              position: 'absolute',
              // Phones: bottom right, clear of the controller; wider stages: bottom left, above the status line.
              left: { xs: 'auto', md: t.spacing(3) },
              right: { xs: t.spacing(1.5), md: 'auto' },
              bottom: { xs: t.spacing(2), md: t.spacing(8) },
              width: { xs: t.spacing(19), md: t.spacing(30) },
              p: 1.25,
              borderRadius: `${t.radius.tile * 2}px`,
              pointerEvents: 'none',
            })}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', mb: 1 }}>
              <Typography variant="subtitle2">Live view</Typography>
              <Typography variant="meta" color="text.meta" sx={{ display: { xs: 'none', md: 'block' } }}>
                Camera 1
              </Typography>
            </Stack>
            {/* A plain canvas: on Box, width and height would be read as styles, not pixels. */}
            <Box sx={(t) => ({ borderRadius: `${t.radius.tile}px`, overflow: 'hidden', '& canvas': { display: 'block', width: '100%', height: 'auto', imageRendering: 'pixelated' } })}>
              <canvas ref={liveRef} width={LIVE_W} height={LIVE_H} />
            </Box>
            <Typography variant="meta" color="text.secondary" component="div" sx={{ mt: 1 }}>
              <span ref={liveCaptionRef}>Connecting the laser, galvo, z-stage and cameras</span>
            </Typography>
          </Paper>
        </Fade>

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

        {/* The badge in its own small notch, top right (desktop). */}
        <Box
          sx={(t) => ({
            display: { xs: 'none', md: 'block' },
            position: 'absolute',
            top: 0,
            right: 0,
            pl: 1.25,
            pb: 1.25,
            bgcolor: 'background.default',
            borderBottomLeftRadius: stageRadius(t),
          })}
        >
          <CornerBadge top={colors.stageTop} bottom={colors.stageBottom} still={reducedMotion} />
          <InvertedCorner stageAt="0% 100%" sx={{ top: 0, right: '100%' }} />
          <InvertedCorner stageAt="0% 100%" sx={{ top: '100%', right: 0 }} />
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
          sx={{
            // On phones the live view takes this corner in the control step.
            display: { xs: step === 'control' ? 'none' : 'flex', md: 'flex' },
            position: 'absolute',
            left: (t) => t.spacing(3),
            right: (t) => t.spacing(3),
            bottom: (t) => t.spacing(2.5),
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <Typography variant="meta" color="text.secondary" sx={{ flex: 1 }}>
            {status === 'failed'
              ? 'The 3D preview needs WebGL, which this browser does not offer.'
              : status === 'ready' && allLoaded
                ? `Real parts from the openUC2 library · ${benchParts.length} modules, ${benchLevels} levels high`
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
