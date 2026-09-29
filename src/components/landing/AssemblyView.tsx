import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useColorScheme } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import type { Assembly } from '../../demo/assemblies';
import { benchColors } from '../../theme/tokens';
import type { BenchScene } from './bench3d/benchScene';

export interface AssemblyViewProps {
  assembly: Assembly;
  /** Create the scene (and start fetching the parts) once this is true. */
  load?: boolean;
  /** Rendering; off while hidden. */
  active?: boolean;
  /** Changing this plays the build-up again (cubes assembling part by part). */
  playKey?: string | number;
  /** Build up part by part; off shows the finished assembly at once. */
  animate?: boolean;
  /** Turn slowly once built. */
  turntable?: boolean;
  label: string;
  sx?: SxProps<Theme>;
}

/**
 * A picture of a cube assembly: the landing bench's scene without controls,
 * from a set camera. It loads three.js and the parts only when asked to.
 */
export function AssemblyView({ assembly, load = true, active = true, playKey, animate = true, turntable = false, label, sx }: AssemblyViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<BenchScene | null>(null);
  const [status, setStatus] = useState<'idle' | 'ready' | 'failed'>('idle');
  // Only near the viewport: load then, and render only while on screen.
  const [near, setNear] = useState(false);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setNear(entry.isIntersecting);
        if (entry.isIntersecting) setSeen(true);
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const shouldLoad = load && seen;
  const shouldRender = active && near;
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { mode, systemMode } = useColorScheme();
  const scheme = (mode === 'system' ? systemMode : mode) === 'dark' ? 'dark' : 'light';
  const colors = benchColors[scheme];

  useEffect(() => {
    if (!shouldLoad || status !== 'idle' || !canvasRef.current) return;
    let cancelled = false;
    import('./bench3d/benchScene')
      .then(({ createBenchScene }) => {
        if (cancelled || !canvasRef.current) return;
        sceneRef.current = createBenchScene(canvasRef.current, {
          parts: assembly.parts,
          beams: assembly.beams,
          plate: assembly.plate,
          colors,
          initialStep: 'cubify',
          motion: animate && !reducedMotion,
          interactive: false,
          turntable,
          frameMs: 650,
          poses: { cubify: assembly.pose },
        });
        sceneRef.current.setActive(shouldRender);
        setStatus('ready');
      })
      .catch(() => setStatus('failed'));
    return () => {
      cancelled = true;
    };
    // Created once; the effects below pass on later changes.
  }, [shouldLoad]);

  useEffect(() => () => sceneRef.current?.dispose(), []);
  useEffect(() => sceneRef.current?.setActive(shouldRender), [shouldRender, status]);
  useEffect(() => sceneRef.current?.setColors(colors), [scheme, status]);
  useEffect(() => {
    if (playKey !== undefined) sceneRef.current?.restart();
  }, [playKey]);

  return (
    <Box
      sx={[
        { position: 'relative', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.stageTop}, ${colors.stageBottom})` },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box component="canvas" ref={canvasRef} role="img" aria-label={label} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
      {status === 'failed' && (
        <Typography variant="meta" color="text.secondary" sx={{ position: 'absolute', left: 16, bottom: 12 }}>
          The 3D view needs WebGL, which this browser does not offer.
        </Typography>
      )}
    </Box>
  );
}
