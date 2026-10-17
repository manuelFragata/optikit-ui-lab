/**
 * Simulate, beside the canvas (the canvas splits, as for Optimize). First the
 * places light is read (each detector, with the light that reaches it), each
 * with its checks at a glance; then, for the one picked, the checks as
 * numbers, and the analysis behind one of them in full. The canvas shows the
 * light picked here; a part picked in a plot is selected on the canvas, and
 * every edit shows here at once.
 *
 * The numbers come from the kernel stand-ins (standins/kernel/simulate); in
 * the app they come from oc-wasm. The pane says so, once, in its header.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { ApertureFill, RayFan, RmsFocusPlot, SpectrumPlot, SpotDiagram } from '../../analysis/Plots';
import { NumberInput } from '../../primitives/NumberInput';
import type { CatalogRecord } from '../holders/optic';
import type { Light } from '../../../ports/light';
import type { Schematic, SchematicSymbol } from '../model';
import { spectrum } from '../../../standins/kernel/simulate/analysis';
import { beamOf, DEFAULT_BEAM_MM, targetsOf, type Target } from '../../../standins/kernel/simulate/beam';
import { planeZ, type Plane } from '../../../standins/kernel/simulate/optimize';
import { results, startRay, trace } from '../../../standins/kernel/simulate/paraxial';
import { bestFocus, heightsAt, pupilOf, realTrace, rmsAt, rmsThroughFocus, spotAt } from '../../../standins/kernel/simulate/realtrace';
import { ANALYSES, assumptionsOf, checksAt, focusReach, length, worst, type AnalysisId, type Check, type Tone } from './checks';

export interface SimulatePaneProps {
  design: Schematic;
  light: Light;
  /** The optic behind a part: designed here, or its catalogue record. */
  recordFor: (s: SchematicSymbol) => CatalogRecord | undefined;
  /** The part selected on the canvas. */
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** The light path looked at, for the canvas to draw stronger; `null` when the pane closes. */
  onFocusRay: (rayId: string | null) => void;
  onOptimize: () => void;
  onSendToOptiland: () => void;
  onClose: () => void;
}

const TONE_COLOR: Record<Tone, string> = { ok: 'success.main', warn: 'warning.main', bad: 'error.main', none: 'text.disabled' };
const TONE_WORD: Record<Tone, string> = { ok: 'Works', warn: 'Worth a look', bad: 'Needs a fix', none: 'Not known' };

const Dot = ({ tone, size = 8 }: { tone: Tone; size?: number }) => (
  <Box component="span" sx={{ width: size, height: size, borderRadius: '50%', bgcolor: TONE_COLOR[tone], flexShrink: 0, display: 'inline-block' }} />
);

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider', '&:first-of-type': { borderTop: 0 } }}>
      <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 1, gap: 1 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10, lineHeight: 2 }}>
          {title}
        </Typography>
        {aside}
      </Stack>
      {children}
    </Box>
  );
}

/** One check as a tile: its number, what it means, its tone. A click shows the analysis behind it. */
function CheckTile({ check, on, onClick }: { check: Check; on: boolean; onClick: () => void }) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={on}
      sx={(t) => ({
        display: 'block',
        textAlign: 'left',
        flex: '1 1 0',
        minWidth: 140,
        p: 1.25,
        borderRadius: 1.5,
        bgcolor: 'background.paper',
        border: `${t.layout.hairline}px solid ${on ? (t.vars ?? t).palette.primary.main : (t.vars ?? t).palette.divider}`,
        boxShadow: on ? `inset 0 0 0 1px ${(t.vars ?? t).palette.primary.main}` : 'none',
        '&:hover': { borderColor: 'primary.main' },
      })}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
        <Dot tone={check.tone} />
        <Typography variant="caption" color="text.secondary">
          {check.label}
        </Typography>
      </Stack>
      <Typography variant="h6" component="div" sx={{ fontVariantNumeric: 'tabular-nums', mt: 0.25 }}>
        {check.value}
      </Typography>
      <Typography variant="caption" color={check.tone === 'bad' ? 'error.main' : check.tone === 'warn' ? 'warning.main' : 'text.secondary'} component="div" sx={{ lineHeight: 1.35 }}>
        {check.note}
      </Typography>
    </ButtonBase>
  );
}

export function SimulatePane({ design, light, recordFor, selectedId, onSelect, onFocusRay, onOptimize, onSendToOptiland, onClose }: SimulatePaneProps) {
  const beams = useMemo(() => light.paths.flatMap((p) => beamOf(design, p, recordFor) ?? []), [design, light, recordFor]);
  const targets = useMemo(() => targetsOf(beams), [beams]);
  const [targetKey, setTargetKey] = useState<string | null>(null);
  const target: Target | undefined = targets.find((t) => t.key === targetKey) ?? targets[0];
  const [analysis, setAnalysis] = useState<AnalysisId | null>(null);
  const [shiftByTarget, setShiftByTarget] = useState<Record<string, number>>({});
  const [beamMm, setBeamMm] = useState(DEFAULT_BEAM_MM);
  const [na, setNa] = useState<number | null>(null);
  const [rays, setRays] = useState(41);
  const [wavelength, setWavelength] = useState<number | null>(null);
  const [menu, setMenu] = useState<HTMLElement | null>(null);

  // A detector selected on the canvas is the place read here.
  useEffect(() => {
    const picked = targets.find((t) => t.part === selectedId);
    if (picked) setTargetKey(picked.key);
  }, [selectedId, targets]);

  // The canvas draws the light looked at stronger, while the pane is open.
  const rayId = target?.beam.ray.id ?? null;
  useEffect(() => onFocusRay(rayId), [rayId, onFocusRay]);
  useEffect(() => () => onFocusRay(null), [onFocusRay]);

  // Every target's checks, for the list; the picked one's with this pane's settings.
  const summaries = useMemo(
    () =>
      targets.map((t) => {
        const pupil = pupilOf(t.beam, beamMm, na ?? undefined);
        const plane = { part: t.part, offsetMm: shiftByTarget[t.key] ?? 0 };
        return { target: t, checks: checksAt(t, pupil, beamMm, plane, wavelength ?? t.beam.wavelengthNm, rays) };
      }),
    [targets, beamMm, na, shiftByTarget, wavelength, rays],
  );

  const header = (
    <Stack
      direction="row"
      sx={(t) => ({ alignItems: 'center', gap: 1, minHeight: t.spacing(t.layout.panelHeaderHeight), pl: 2, pr: 0.5, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' })}
    >
      <Typography variant="subtitle2">Simulate</Typography>
      <Tooltip title="The lab's own trace: on axis, one wavelength, no diffraction. The app traces with the optics engine.">
        <Typography variant="caption" color="text.meta" sx={{ cursor: 'help' }}>
          On axis · lab trace
        </Typography>
      </Tooltip>
      <Box sx={{ flex: 1 }} />
      <Tooltip title="More">
        <IconButton aria-label="More" aria-haspopup="menu" onClick={(e) => setMenu(e.currentTarget)}>
          <MoreHorizIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            setMenu(null);
            onOptimize();
          }}
        >
          Optimize…
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenu(null);
            onSendToOptiland();
          }}
        >
          Send to Optiland
        </MenuItem>
      </Menu>
      <Tooltip title="Close Simulate">
        <IconButton aria-label="Close Simulate" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  const frame = (body: ReactNode) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, bgcolor: 'canvas.ground' }}>
      {header}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', scrollbarWidth: 'thin' }}>{body}</Box>
    </Box>
  );

  if (!target) {
    return frame(
      <Stack sx={{ p: 3, gap: 0.5 }}>
        <Typography variant="body2">No light reaches a detector yet.</Typography>
        <Typography variant="body2" color="text.secondary">
          Add a source and a detector, and put the parts between them on the light’s path. The checks show here as soon as light gets through.
        </Typography>
      </Stack>,
    );
  }

  const beam = target.beam;
  const checks = summaries.find((s) => s.target.key === target.key)!.checks;
  // The analysis shown: the one picked, else the one behind the first check that is not fine.
  const shown = analysis ?? (checks.find((c) => c.tone === 'bad' || c.tone === 'warn') ?? checks[0]).analysis;
  const spec = ANALYSES.find((a) => a.id === shown)!;
  const plane: Plane = { part: target.part, offsetMm: shiftByTarget[target.key] ?? 0 };
  const z = planeZ(beam, plane);
  const pupil = pupilOf(beam, beamMm, na ?? undefined);
  const nm = wavelength ?? beam.wavelengthNm;
  const assumed = assumptionsOf(beam);

  let plot: ReactNode;
  let caption = '';
  if (spec.rays) {
    const t = realTrace(beam, pupil, rays);
    const heights = heightsAt(t, z);
    const geo = Math.max(0, ...heights.map((h) => Math.abs(h.y)));
    if (shown === 'spot') {
      plot = <SpotDiagram points={spotAt(t, z)} rmsMm={rmsAt(t, z)} size={320} />;
      caption = `RMS ${length(rmsAt(t, z))} · GEO ${length(geo)} · ${t.vignetted} of ${rays} rays stopped`;
    } else if (shown === 'fan') {
      plot = <RayFan fan={heights} />;
      caption = `Largest error ${length(geo)} · across the pupil, −1 to 1`;
    } else {
      const best = bestFocus(t, z, focusReach(t, z));
      const reach = Math.max(2, Math.abs(best - z) * 1.6, 5);
      plot = <RmsFocusPlot samples={rmsThroughFocus(t, z, reach)} bestDz={best - z} plane={target.label} />;
      caption = `Best focus ${best - z >= 0 ? '+' : '−'}${Math.abs(best - z).toFixed(2)} mm from ${target.label} · ${length(rmsAt(t, best))} RMS there`;
    }
  } else if (shown === 'fill') {
    const r = results(beam, trace(beam, startRay(beam, beamMm)), beamMm);
    plot = <ApertureFill beam={beam} result={r} selectedId={selectedId} onSelect={onSelect} />;
    caption = 'Click a part to select it on the canvas';
  } else {
    plot = <SpectrumPlot curve={spectrum(beam)} wavelengthNm={nm} />;
  }

  const offTarget = (t: Target) => t.key !== target.key;

  return frame(
    <>
      <Section title="Where light is read" aside={<Typography variant="caption" color="text.secondary">{`${targets.length} ${targets.length === 1 ? 'place' : 'places'}`}</Typography>}>
        <Stack sx={{ mx: -1 }}>
          {summaries.map(({ target: t, checks: cs }) => {
            const tone = worst(cs);
            return (
              <ButtonBase
                key={t.key}
                onClick={() => setTargetKey(t.key)}
                aria-current={!offTarget(t)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  px: 1,
                  py: 0.75,
                  borderRadius: 1,
                  textAlign: 'left',
                  bgcolor: offTarget(t) ? 'transparent' : 'primary.soft',
                  '&:hover': { bgcolor: offTarget(t) ? 'action.hover' : 'primary.soft' },
                }}
              >
                <Box sx={{ width: 3, alignSelf: 'stretch', borderRadius: 1, bgcolor: `rays.${t.beam.ray.color}` }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: offTarget(t) ? 400 : 600 }}>
                    {t.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div" noWrap>
                    {t.beam.ray.label}
                  </Typography>
                </Box>
                <Tooltip title={cs.map((c) => `${c.label}: ${c.value} · ${c.note}`).join('\n')} slotProps={{ tooltip: { sx: { whiteSpace: 'pre-line' } } }}>
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
                    {cs.map((c) => (
                      <Dot key={c.id} tone={c.tone} size={7} />
                    ))}
                    <Typography variant="caption" sx={{ ml: 0.5, color: TONE_COLOR[tone], minWidth: 72, textAlign: 'right' }}>
                      {TONE_WORD[tone]}
                    </Typography>
                  </Stack>
                </Tooltip>
              </ButtonBase>
            );
          })}
        </Stack>
      </Section>

      <Section title={`At ${target.label}`}>
        <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: 'wrap' }}>
          {checks.map((c) => (
            <CheckTile key={c.id} check={c} on={c.analysis === shown} onClick={() => setAnalysis(c.analysis)} />
          ))}
        </Stack>
      </Section>

      <Section title="Analysis">
        <ToggleButtonGroup exclusive size="small" value={shown} onChange={(_, v: AnalysisId | null) => v && setAnalysis(v)} aria-label="Analysis" sx={{ flexWrap: 'wrap', mb: 1.5 }}>
          {ANALYSES.map((a) => (
            <ToggleButton key={a.id} value={a.id} sx={{ textTransform: 'none', py: 0.25, px: 1.25 }}>
              {a.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider', p: 2 }}>
          <Box sx={{ maxWidth: 520, mx: 'auto' }}>{plot}</Box>
          {caption && (
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1, textAlign: 'center' }}>
              {caption}
            </Typography>
          )}
        </Box>

        {/* The settings the analysis shown takes, in one row. */}
        <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
          {spec.plane && target.part !== 'end' && (
            <NumberInput
              label={`Shift from ${target.label}`}
              value={plane.offsetMm}
              onChange={(v) => setShiftByTarget((m) => ({ ...m, [target.key]: v }))}
              step={0.5}
              precision={2}
              unit="mm"
              size="small"
              sx={{ width: 170 }}
            />
          )}
          {(spec.rays || shown === 'fill') &&
            (pupil.kind === 'collimated' ? (
              <NumberInput label="Beam Ø" value={beamMm} onChange={(v) => v > 0 && setBeamMm(v)} min={0.1} step={0.5} precision={1} unit="mm" size="small" sx={{ width: 120 }} />
            ) : (
              <NumberInput label="Cone NA" value={pupil.na} onChange={(v) => v > 0 && v < 1 && setNa(v)} min={0.01} max={0.95} step={0.01} precision={2} size="small" sx={{ width: 110 }} />
            ))}
          {spec.rays && (
            <NumberInput label="Rays" value={rays} onChange={(v) => setRays(Math.max(3, Math.min(201, Math.round(v))))} min={3} max={201} step={10} precision={0} size="small" sx={{ width: 90 }} />
          )}
          {shown === 'transmission' && (
            <NumberInput label="Wavelength" value={nm ?? 550} onChange={(v) => setWavelength(v)} min={350} max={1100} step={1} precision={0} unit="nm" size="small" sx={{ width: 130 }} />
          )}
        </Stack>
      </Section>

      {assumed.length > 0 && (
        <Section title="Assumed where the design does not say">
          <Stack spacing={0.5}>
            {assumed.map((a) => (
              <Typography key={a.id} variant="caption" color="text.secondary" component="div">
                <Box
                  component="span"
                  onClick={a.id !== 'sample' ? () => onSelect(a.id) : undefined}
                  sx={{ color: 'text.primary', fontWeight: 600, cursor: a.id !== 'sample' ? 'pointer' : 'default', '&:hover': a.id !== 'sample' ? { textDecoration: 'underline' } : undefined }}
                >
                  {a.label}
                </Box>
                {` · ${a.assumed.join(' · ')}`}
              </Typography>
            ))}
          </Stack>
        </Section>
      )}
    </>,
  );
}
