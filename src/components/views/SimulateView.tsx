/**
 * Simulate (UI-V4 §2): analyses of the design's light, one at a time. Pick
 * the analysis, the detector it is read at (shifted if wanted; the light is
 * whatever reaches it) and its settings; the plot fills the page. The system
 * itself is drawn in View, not here.
 *
 * In the lab the numbers come from its own traces (editor/simulate): real
 * rays on axis through the real prescriptions, paraxial where that is
 * enough. The product traces with the optics engine; the page stays.
 */
import { useMemo, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ListItemButton from '@mui/material/ListItemButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ApertureFill, RayFan, RmsFocusPlot, SpectrumPlot, SpotDiagram } from '../analysis/Plots';
import type { CatalogRecord } from '../editor/holders/optic';
import type { Light } from '../editor/light';
import type { Schematic, SchematicSymbol } from '../editor/model';
import { spectrum } from '../editor/simulate/analysis';
import { beamOf, DEFAULT_BEAM_MM, targetsOf } from '../editor/simulate/beam';
import { planeZ, type Plane } from '../editor/simulate/optimize';
import { results, startRay, trace } from '../editor/simulate/paraxial';
import { bestFocus, heightsAt, pupilOf, realTrace, rmsAt, rmsThroughFocus, spotAt } from '../editor/simulate/realtrace';
import { PageContainer } from '../compositions/PageContainer';
import { NumberInput } from '../primitives/NumberInput';
import { Pill } from '../primitives/Pill';
import { cardSx } from './card';

export interface SimulateViewProps {
  designName: string;
  design: Schematic;
  /** Where the design's light goes, from the app's light source. */
  light: Light;
  /** The optic behind a part: designed here, or its catalogue record. */
  recordFor: (s: SchematicSymbol) => CatalogRecord | undefined;
  onSendToOptiland: () => void;
}

type AnalysisId = 'spot' | 'fan' | 'focus' | 'fill' | 'transmission';

const ANALYSES: { id: AnalysisId; label: string; rays: boolean; plane: boolean }[] = [
  { id: 'spot', label: 'Spot diagram', rays: true, plane: true },
  { id: 'fan', label: 'Ray fan', rays: true, plane: true },
  { id: 'focus', label: 'RMS through focus', rays: true, plane: true },
  { id: 'fill', label: 'Aperture fill', rays: false, plane: false },
  { id: 'transmission', label: 'Transmission', rays: false, plane: false },
];

/** A length as it reads: µm when small, mm from a millimetre. */
const um = (mm: number) => (mm >= 1 ? `${mm.toFixed(2)} mm` : `${(mm * 1000).toFixed(mm * 1000 >= 100 ? 0 : 1)} µm`);

function Setting({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <Box>
      <Typography variant="h5" component="div" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
      <Typography variant="meta" color="text.meta">
        {label}
      </Typography>
    </Box>
  );
}

export function SimulateView({ designName, design, light, recordFor, onSendToOptiland }: SimulateViewProps) {
  const beams = useMemo(() => light.paths.flatMap((p) => beamOf(design, p, recordFor) ?? []), [design, light, recordFor]);
  const [analysis, setAnalysis] = useState<AnalysisId>('spot');
  const targets = useMemo(() => targetsOf(beams), [beams]);
  const [targetKey, setTargetKey] = useState<string | null>(null);
  const target = targets.find((t) => t.key === targetKey) ?? targets[0];
  const beam = target?.beam;
  const [shiftByTarget, setShiftByTarget] = useState<Record<string, number>>({});
  const [beamMm, setBeamMm] = useState(DEFAULT_BEAM_MM);
  const [na, setNa] = useState<number | null>(null);
  const [rays, setRays] = useState(41);
  const [wavelength, setWavelength] = useState<number | null>(null);

  if (!beam) {
    return (
      <PageContainer sx={{ pt: 3, pb: 8 }}>
        <Typography variant="display" component="h1">
          Simulate
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          {`No light reaches a detector in ${designName} yet.`}
        </Typography>
      </PageContainer>
    );
  }

  const plane: Plane = { part: target.part, offsetMm: shiftByTarget[target.key] ?? 0 };
  const z = planeZ(beam, plane);
  const pupil = pupilOf(beam, beamMm, na ?? undefined);
  const spec = ANALYSES.find((a) => a.id === analysis)!;
  const planeLabel = target.label;
  const nm = wavelength ?? beam.wavelengthNm;

  let plot: ReactNode;
  let figures: { value: string; label: string }[] = [];
  if (spec.rays) {
    const t = realTrace(beam, pupil, rays);
    const rms = rmsAt(t, z);
    const heights = heightsAt(t, z);
    const geo = Math.max(0, ...heights.map((h) => Math.abs(h.y)));
    const best = bestFocus(t, z, Math.max(5, 2 * Math.abs(heights[0]?.y ?? 1) + 20));
    if (analysis === 'spot') {
      plot = <SpotDiagram points={spotAt(t, z)} rmsMm={rms} size={360} />;
      figures = [
        { value: um(rms), label: 'RMS radius' },
        { value: um(geo), label: 'GEO radius' },
        { value: `${t.vignetted}/${rays}`, label: 'rays stopped' },
      ];
    } else if (analysis === 'fan') {
      plot = <RayFan fan={heights} />;
      figures = [{ value: um(geo), label: 'largest error' }];
    } else {
      const reach = Math.max(2, Math.abs(best - z) * 1.6, 5);
      plot = <RmsFocusPlot samples={rmsThroughFocus(t, z, reach)} bestDz={best - z} plane={planeLabel} />;
      figures = [
        { value: `${best - z >= 0 ? '+' : '−'}${Math.abs(best - z).toFixed(2)} mm`, label: 'best focus' },
        { value: um(rmsAt(t, best)), label: 'RMS there' },
        { value: um(rms), label: `RMS at ${planeLabel}` },
      ];
    }
  } else if (analysis === 'fill') {
    const r = results(beam, trace(beam, startRay(beam, beamMm)), beamMm);
    plot = <ApertureFill beam={beam} result={r} />;
    const fills = beam.elements.flatMap((e, i) => (e.apertureMm ? [r.elements[i].beamMm / e.apertureMm] : []));
    figures = fills.length ? [{ value: `${Math.round(Math.max(...fills) * 100)}%`, label: 'fullest' }] : [];
  } else {
    const curve = spectrum(beam);
    plot = <SpectrumPlot curve={curve} wavelengthNm={nm} />;
    const at = curve && nm ? curve.reduce((a, b) => (Math.abs(b.nm - nm) < Math.abs(a.nm - nm) ? b : a)) : null;
    figures = at ? [{ value: `${(at.t * 100).toFixed(1)}%`, label: `at ${nm} nm` }] : [];
  }

  return (
    <PageContainer sx={{ pt: 3, pb: 8 }}>
      <Stack direction="row" sx={{ alignItems: 'flex-end', justifyContent: 'space-between', mb: 3, gap: 2 }}>
        <Box>
          <Pill>On axis · lab stand-in</Pill>
          <Typography variant="display" component="h1" sx={{ mt: 1 }}>
            Simulate
          </Typography>
        </Box>
        <Button variant="outlined" onClick={onSendToOptiland}>
          Send to Optiland
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '280px 1fr' }, alignItems: 'start' }}>
        <Stack sx={(t) => ({ ...cardSx(t), p: 2, gap: 2 })}>
          <Setting label="Analysis">
            <Box component="nav" aria-label="Analysis" sx={{ mx: -1 }}>
              {ANALYSES.map((a) => (
                <ListItemButton key={a.id} selected={a.id === analysis} onClick={() => setAnalysis(a.id)} sx={{ borderRadius: 1, py: 0.5, px: 1, typography: 'body2' }}>
                  {a.label}
                </ListItemButton>
              ))}
            </Box>
          </Setting>

          <Setting label="Detector">
            {targets.length > 1 ? (
              <Select size="small" fullWidth value={target.key} onChange={(e) => setTargetKey(e.target.value)} aria-label="Detector" sx={{ typography: 'body2' }}>
                {targets.map((t) => (
                  <MenuItem key={t.key} value={t.key}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            ) : (
              <Typography variant="body2">{target.label}</Typography>
            )}
            {spec.plane && (
              <NumberInput
                label="Shifted by"
                value={plane.offsetMm}
                onChange={(v) => setShiftByTarget((m) => ({ ...m, [target.key]: v }))}
                step={0.5}
                precision={2}
                unit="mm"
                size="small"
                sx={{ mt: 1 }}
              />
            )}
          </Setting>

          {(spec.rays || analysis === 'fill') && (
            <Setting label={pupil.kind === 'collimated' ? 'Beam' : 'Cone'}>
              {pupil.kind === 'collimated' ? (
                <NumberInput label="Diameter" value={beamMm} onChange={(v) => v > 0 && setBeamMm(v)} min={0.1} step={0.5} precision={1} unit="mm" size="small" />
              ) : (
                <NumberInput label="NA" value={pupil.na} onChange={(v) => v > 0 && v < 1 && setNa(v)} min={0.01} max={0.95} step={0.01} precision={2} size="small" />
              )}
            </Setting>
          )}

          {spec.rays && (
            <Setting label="Rays">
              <NumberInput label="Across the pupil" value={rays} onChange={(v) => setRays(Math.max(3, Math.min(201, Math.round(v))))} min={3} max={201} step={10} precision={0} size="small" />
            </Setting>
          )}

          {analysis === 'transmission' && (
            <Setting label="Wavelength">
              <NumberInput label="Marked" value={nm ?? 550} onChange={(v) => setWavelength(v)} min={350} max={1100} step={1} precision={0} unit="nm" size="small" />
            </Setting>
          )}

          <Setting label="Field">
            <Typography variant="body2">On axis</Typography>
          </Setting>
        </Stack>

        <Box sx={(t) => ({ ...cardSx(t), minWidth: 0 })}>
          <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 2, gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="h6">{spec.label}</Typography>
            <Typography variant="meta" color="text.meta">
              {`at ${planeLabel}${spec.plane && plane.offsetMm ? ` ${plane.offsetMm > 0 ? '+' : '−'}${Math.abs(plane.offsetMm)} mm` : ''}`}
            </Typography>
          </Stack>
          {figures.length > 0 && (
            <Stack direction="row" useFlexGap sx={{ gap: 4, mb: 2, flexWrap: 'wrap' }}>
              {figures.map((f) => (
                <Figure key={f.label} {...f} />
              ))}
            </Stack>
          )}
          <Box sx={{ maxWidth: 760 }}>{plot}</Box>
        </Box>
      </Box>
    </PageContainer>
  );
}
