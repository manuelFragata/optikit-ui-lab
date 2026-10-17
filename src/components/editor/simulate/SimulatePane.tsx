/**
 * Simulate, beside the canvas (the canvas splits, as for Optimize). First the
 * places light is read (each detector, with the light that reaches it), each
 * with its checks at a glance; then, for the one picked, the checks as
 * numbers, and the analysis behind one of them in full. The canvas shows the
 * light picked here; a part picked in a plot is selected on the canvas, and
 * every edit shows here at once.
 *
 * The numbers come from the analysis port (src/ports/analysis.ts): the lab's
 * kernel stand-in, in the app oc-wasm, in the page. They are worked out at
 * once, so they follow every edit as it is made. Each says what it stands
 * on: the header the method (geometric, on axis, one wavelength), a check
 * marked Estimate what the analysis assumed for it, ≤ a ceiling.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import { ApertureFill, RayFan, RmsFocusPlot, SpectrumPlot, SpotDiagram } from '../../analysis/Plots';
import { Figure } from '../../analysis/plot/Chart';
import { EmptyState } from '../../primitives/EmptyState';
import { NumberInput } from '../../primitives/NumberInput';
import { Segmented } from '../../primitives/Segmented';
import { Failed } from '../../primitives/RequestState';
import { useAnalysis, type AnalysisId, type Detail, type Place, type SimulateAsk, type SimulateSettings } from '../../../ports/analysis';
import type { Light, LightState } from '../../../ports/light';
import { answer, NO_ANSWER } from '../../../ports/request';
import type { Schematic } from '../model';
import { ANALYSES, checksOf, DEFAULT_SETTINGS, length, worst, type Check, type Tone } from './checks';

export interface SimulatePaneProps {
  design: Schematic;
  light: Light;
  /** The light's trace: why it failed, if it did. */
  trace?: Pick<LightState, 'error'>;
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

/** What an estimate stands on, as a tooltip's body. */
const Caveats = ({ caveats }: { caveats: string[] }) => (
  <>
    <Box sx={{ fontWeight: 500, mb: 0.25 }}>An estimate: it takes</Box>
    {caveats.map((c) => (
      <Box key={c}>{c}</Box>
    ))}
    <Box sx={{ mt: 0.5, opacity: 0.8 }}>Give these in the parts' properties, or choose real parts, to make it exact.</Box>
  </>
);

/** One check as a tile: its number, what it means, its tone. A click shows the analysis behind it. */
function CheckTile({ check, on, onClick }: { check: Check; on: boolean; onClick: () => void }) {
  const estimate = check.caveats.length > 0 && check.value !== '—';
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
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          {check.label}
        </Typography>
        {estimate && (
          <Tooltip title={<Caveats caveats={check.caveats} />}>
            <Typography variant="caption" color="text.meta" sx={{ cursor: 'help', borderBottom: '1px dotted', lineHeight: 1.2 }}>
              Estimate
            </Typography>
          </Tooltip>
        )}
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

/** The analysis shown, drawn; its caption. */
function plotOf(detail: Detail, place: Place, selectedId: string | null, onSelect: (id: string) => void): { plot: ReactNode; caption: string } {
  switch (detail.of) {
    case 'spot':
      return {
        plot: <SpotDiagram points={detail.points} rmsMm={detail.rmsMm} airyMm={detail.airyMm} height={320} />,
        caption: `RMS ${length(detail.rmsMm)} · GEO ${length(detail.geoMm)}${detail.airyMm ? ` · Airy ${length(detail.airyMm)}` : ''} · ${detail.stopped}/${detail.rays} stopped`,
      };
    case 'fan':
      return { plot: <RayFan fan={detail.fan} />, caption: `max |εy| ${length(Math.max(0, ...detail.fan.map((h) => Math.abs(h.y))))}` };
    case 'focus':
      return {
        plot: <RmsFocusPlot samples={detail.samples} bestDz={detail.bestDzMm} plane={place.label} airyMm={detail.airyMm} />,
        caption: `best Δz ${detail.bestDzMm >= 0 ? '+' : '−'}${Math.abs(detail.bestDzMm).toFixed(2)} mm · RMS ${length(detail.rmsBestMm)}`,
      };
    case 'fill':
      return { plot: <ApertureFill rows={detail.rows} selectedId={selectedId} onSelect={onSelect} />, caption: 'click a part to select it' };
    case 'transmission':
      return { plot: <SpectrumPlot curve={detail.curve} wavelengthNm={detail.nm} />, caption: '' };
  }
}

export function SimulatePane({ design, light, trace: traced, selectedId, onSelect, onFocusRay, onOptimize, onSendToOptiland, onClose }: SimulatePaneProps) {
  const analysis = useAnalysis();
  const [targetKey, setTargetKey] = useState<string | null>(null);
  const [shown, setShown] = useState<AnalysisId | null>(null);
  const [shiftMm, setShiftMm] = useState<Record<string, number>>({});
  const [beamMm, setBeamMm] = useState(DEFAULT_SETTINGS.beamMm);
  const [na, setNa] = useState<number | null>(DEFAULT_SETTINGS.na);
  const [rays, setRays] = useState(DEFAULT_SETTINGS.rays);
  const [wavelength, setWavelength] = useState<number | null>(DEFAULT_SETTINGS.nm);
  const [menu, setMenu] = useState<HTMLElement | null>(null);

  // Every place, read again on any change.
  const settings = useMemo<SimulateSettings>(() => ({ beamMm, na, rays, nm: wavelength, shiftMm }), [beamMm, na, rays, wavelength, shiftMm]);
  const ask = useMemo<SimulateAsk>(() => ({ design, light, settings }), [design, light, settings]);
  const places = useMemo(() => answer(() => analysis.places(ask)), [analysis, ask]);
  const all = useMemo(() => (places.data ?? []).map((place) => ({ place, checks: checksOf(place) })), [places.data]);
  const current = all.find((p) => p.place.key === targetKey) ?? all[0];
  const place = current?.place;

  // A detector selected on the canvas is the place read here.
  useEffect(() => {
    const picked = all.find((p) => p.place.part === selectedId);
    if (picked) setTargetKey(picked.place.key);
  }, [selectedId, all]);

  // The canvas draws the light looked at stronger, while the pane is open.
  const rayId = place?.ray.id ?? null;
  useEffect(() => onFocusRay(rayId), [rayId, onFocusRay]);
  useEffect(() => () => onFocusRay(null), [onFocusRay]);

  // The analysis shown: the one picked, else the one behind the first check that is not fine.
  const of: AnalysisId | null = current ? (shown ?? (current.checks.find((c) => c.tone === 'bad' || c.tone === 'warn') ?? current.checks[0]).analysis) : null;
  const detailAsk = useMemo(() => (ask && place && of ? { ...ask, place: place.key, of } : null), [ask, place, of]);
  const detail = useMemo(() => (detailAsk ? answer(() => analysis.detail(detailAsk)) : NO_ANSWER), [analysis, detailAsk]);

  const header = (
    <Stack
      direction="row"
      sx={(t) => ({ alignItems: 'center', gap: 1, minHeight: t.spacing(t.layout.panelHeaderHeight), pl: 2, pr: 0.5, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' })}
    >
      <Typography variant="subtitle2">Simulate</Typography>
      <Tooltip title="Rays traced through each part's surfaces, for a point on the axis at one wavelength. The diffraction limit shows as the Airy radius. Points off the axis, other wavelengths, and tolerances are not part of these numbers.">
        <Typography variant="caption" color="text.meta" sx={{ cursor: 'help' }}>
          Geometric · on axis · one wavelength
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
      <Box sx={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'auto', scrollbarWidth: 'thin' }}>
        {body}
      </Box>
    </Box>
  );

  // No answer: say why, not "no light".
  const failed = traced?.error ?? places.error;
  if (failed) return frame(
      <Box sx={{ p: 2 }}>
        <Failed message={failed} />
      </Box>,
    );

  if (!current || !place || !of) {
    return frame(
      <EmptyState icon={<InsightsOutlinedIcon />} title="No light reaches a detector yet">
        Add a source and a detector, and put the parts between them on the light’s path. The checks show here as soon as light gets through.
      </EmptyState>,
    );
  }

  const spec = ANALYSES.find((a) => a.id === of)!;
  const offsetMm = shiftMm[place.key] ?? 0;
  const nm = wavelength ?? place.wavelengthNm;
  const drawn = detail.data ? plotOf(detail.data, place, selectedId, onSelect) : null;

  return frame(
    <>
      <Section title="Where light is read" aside={<Typography variant="caption" color="text.secondary">{`${all.length} ${all.length === 1 ? 'place' : 'places'}`}</Typography>}>
        <Stack sx={{ mx: -1 }}>
          {all.map(({ place: p, checks: cs }) => {
            const tone = worst(cs);
            const off = p.key !== place.key;
            return (
              <ButtonBase
                key={p.key}
                onClick={() => setTargetKey(p.key)}
                aria-current={!off}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  px: 1,
                  py: 0.75,
                  borderRadius: 1,
                  textAlign: 'left',
                  bgcolor: off ? 'transparent' : 'primary.soft',
                  '&:hover': { bgcolor: off ? 'action.hover' : 'primary.soft' },
                }}
              >
                <Box sx={{ width: 3, alignSelf: 'stretch', borderRadius: 1, bgcolor: `rays.${p.ray.color}` }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: off ? 400 : 500 }}>
                    {p.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div" noWrap>
                    {p.ray.label}
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

      <Section title={`At ${place.label}`}>
        <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: 'wrap' }}>
          {current.checks.map((c: Check) => (
            <CheckTile key={c.id} check={c} on={c.analysis === of} onClick={() => setShown(c.analysis)} />
          ))}
        </Stack>
      </Section>

      <Section title="Analysis">
        <Box sx={{ mb: 1.5 }}>
          <Segmented value={of} onChange={setShown} aria-label="Analysis" options={ANALYSES.map((a) => ({ value: a.id, label: a.label }))} />
        </Box>

        <Figure title={`${spec.label} · ${spec.plane ? `at ${place.label}${offsetMm ? ` ${offsetMm > 0 ? '+' : '−'}${Math.abs(offsetMm)} mm` : ''}` : place.ray.label}`} meta={drawn?.caption}>
          {drawn ? drawn.plot : detail.error && <Failed message={detail.error} />}
        </Figure>

        {/* The settings the analysis shown takes, in one row. */}
        <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
          {spec.plane && place.part !== 'end' && (
            <NumberInput
              label={`Shift from ${place.label}`}
              value={offsetMm}
              onChange={(v) => setShiftMm((m) => ({ ...m, [place.key]: v }))}
              step={0.5}
              precision={2}
              unit="mm"
              size="small"
              sx={{ width: 170 }}
            />
          )}
          {(spec.rays || of === 'fill') &&
            (place.start.kind === 'collimated' ? (
              <NumberInput label="Beam Ø" value={beamMm} onChange={(v) => v > 0 && setBeamMm(v)} min={0.1} step={0.5} precision={1} unit="mm" size="small" sx={{ width: 120 }} />
            ) : (
              <NumberInput label="Cone NA" value={na ?? place.start.na} onChange={(v) => v > 0 && v < 1 && setNa(v)} min={0.01} max={0.95} step={0.01} precision={2} size="small" sx={{ width: 110 }} />
            ))}
          {spec.rays && (
            <NumberInput label="Rays" value={rays} onChange={(v) => setRays(Math.max(3, Math.min(201, Math.round(v))))} min={3} max={201} step={10} precision={0} size="small" sx={{ width: 90 }} />
          )}
          {of === 'transmission' && (
            <NumberInput label="Wavelength" value={nm ?? 550} onChange={(v) => setWavelength(v)} min={350} max={1100} step={1} precision={0} unit="nm" size="small" sx={{ width: 130 }} />
          )}
        </Stack>
      </Section>

      {place.assumed.length > 0 && (
        <Section title="Assumed where the design does not say">
          <Stack spacing={0.5}>
            {place.assumed.map((a) => (
              <Typography key={a.id} variant="caption" color="text.secondary" component="div">
                <Box
                  component="span"
                  onClick={a.id !== 'sample' ? () => onSelect(a.id) : undefined}
                  sx={{ color: 'text.primary', fontWeight: 500, cursor: a.id !== 'sample' ? 'pointer' : 'default', '&:hover': a.id !== 'sample' ? { textDecoration: 'underline' } : undefined }}
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
