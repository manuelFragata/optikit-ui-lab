/**
 * Optimize, beside the canvas (the canvas splits, as for the close-up). The
 * objective first: what to make small or what to hit, and where. Then the
 * variables the path's parts offer, each ticked to vary between bounds of
 * its own. Run, see the proposal against the beam as it is (the beam drawn
 * over it, the spots side by side), and apply it: an edit like any other.
 *
 * The optimizer is the analysis port's (src/ports/analysis.ts): oc-wasm's in
 * the app, the lab's own in the lab, both in the page. The light as it is
 * reads at once. A run takes time, in a worker: the pane shows the best so
 * far as it goes (the proposal drawn live, the objective falling), and Stop
 * keeps it. A change to the design or the question stops the run.
 *
 * What a proposal is worth, said with it: spots below the diffraction limit
 * are not told apart (the Airy radius drawn with them), and a variable that
 * ends at its bound says the best may lie beyond it.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { BeamLayout } from '../../analysis/BeamLayout';
import { SpotDiagram } from '../../analysis/Plots';
import { ACCENT, Figure, INK } from '../../analysis/plot/Chart';
import { lengthText, spotReach } from '../../analysis/plot/scale';
import { EmptyState } from '../../primitives/EmptyState';
import { NumberInput } from '../../primitives/NumberInput';
import { Failed } from '../../primitives/RequestState';
import { useAnalysis, type Objective, type OptimizeAsk, type OptimizeJob, type OptimizeRun, type Plane, type Variable } from '../../../ports/analysis';
import type { Light } from '../../../ports/light';
import { answer, errorText, NO_ANSWER } from '../../../ports/request';
import type { Schematic } from '../model';
import { DEFAULT_SETTINGS } from '../simulate/checks';

export interface OptimizePaneProps {
  design: Schematic;
  light: Light;
  /** The run applied: the design with its variables at their new values. */
  onApply: (design: Schematic) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider' }}>
      <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10, lineHeight: 2 }}>
          {title}
        </Typography>
        {aside}
      </Stack>
      {children}
    </Box>
  );
}

const roundTo2 = (v: number) => Number(v.toPrecision(2)).toLocaleString('en');

/** A change as a share of where it started: "−42.0 %"; past a factor of 100 as the factor ("8,000× smaller"), not a false "−100.0 %". */
function change(from: number, to: number): string {
  if (Math.abs(from) < 1e-12) return '—';
  const ratio = Math.abs(to / from);
  if (ratio > 0 && ratio < 0.01) return `${roundTo2(1 / ratio)}× smaller`;
  if (ratio > 100) return `${roundTo2(ratio)}× larger`;
  return `${to >= from ? '+' : '−'}${Math.abs(((to - from) / from) * 100).toFixed(1)} %`;
}

const fmt = (v: number, unit: string) => {
  // Spots of a millimetre or more read in mm.
  if (unit === 'µm' && Math.abs(v) >= 1000) return `${(v / 1000).toFixed(2)} mm`;
  return `${Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)} ${unit}`;
};

/** A run as the pane holds it: for which question, and how it goes. While it runs, `best` is the best so far. */
type Ran =
  | { key: string; design: Schematic; status: 'running'; job: OptimizeJob; best: OptimizeRun | null }
  | { key: string; design: Schematic; status: 'done'; run: OptimizeRun }
  | { key: string; design: Schematic; status: 'error'; error: string };

/** The objective after each step, as a small line: it falls as the run goes. */
function Progress({ history, running }: { history: number[]; running: boolean }) {
  const w = 120;
  const h = 28;
  const lo = Math.min(...history);
  const hi = Math.max(...history);
  const n = Math.max(1, history.length - 1);
  const y = (v: number) => (hi - lo < 1e-12 ? h / 2 : 2 + ((hi - v) / (hi - lo)) * (h - 4));
  const points = history.map((v, i) => `${((i / n) * w).toFixed(1)},${(h - y(v)).toFixed(1)}`).join(' ');
  return (
    <Box component="svg" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden sx={{ display: 'block', color: running ? 'primary.main' : 'text.secondary' }}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
    </Box>
  );
}

export function OptimizePane({ design, light, onApply, onSelect, onClose }: OptimizePaneProps) {
  const analysis = useAnalysis();
  // Where the objective is read: picking a detector picks the light that reaches it.
  const placesAsk = useMemo(() => ({ design, light, settings: DEFAULT_SETTINGS }), [design, light]);
  const places = useMemo(() => answer(() => analysis.places(placesAsk)), [analysis, placesAsk]);
  const targets = places.data ?? [];
  const [targetKey, setTargetKey] = useState<string | null>(null);
  const target = targets.find((t) => t.key === targetKey) ?? targets[0];
  const placeKey = target?.key ?? null;
  // What the place offers: its objectives and variables. Another place's would mislead, so none is kept.
  const setupAsk = useMemo(() => (placeKey ? { design, light, place: placeKey } : null), [design, light, placeKey]);
  const setup = useMemo(() => (setupAsk ? answer(() => analysis.setup(setupAsk)) : NO_ANSWER), [analysis, setupAsk]);
  const [objectiveByTarget, setObjectiveByTarget] = useState<Record<string, Objective>>({});
  /** The ticked variables, by id, with their bounds. */
  const [chosenByTarget, setChosenByTarget] = useState<Record<string, Record<string, { min: number; max: number }>>>({});
  const [ran, setRan] = useState<Ran | null>(null);
  const [sameScale, setSameScale] = useState(false);

  const objective: Objective | null = placeKey && setup.data ? (objectiveByTarget[placeKey] ?? setup.data.objective) : null;
  // The light at the place as it is, read for the objective.
  const viewAsk = useMemo<OptimizeAsk | null>(() => (placeKey && objective ? { design, light, place: placeKey, objective } : null), [design, light, placeKey, objective]);
  const view = useMemo(() => (viewAsk ? answer(() => analysis.view(viewAsk)) : NO_ANSWER), [analysis, viewAsk]);

  // A run is for one design and one question: when either changes, or the pane closes, it stops.
  const asking = useRef<string | null>(null);
  asking.current = null;
  useEffect(() => {
    if (ran?.status === 'running' && (ran.design !== design || ran.key !== asking.current)) ran.job.stop();
  });
  const job = ran?.status === 'running' ? ran.job : null;
  useEffect(() => () => job?.stop(), [job]);

  const header = (
    <Stack
      direction="row"
      sx={(t) => ({ alignItems: 'center', gap: 1, minHeight: t.spacing(t.layout.panelHeaderHeight), pl: 2, pr: 0.5, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' })}
    >
      <Typography variant="subtitle2">Optimize</Typography>
      <Typography variant="caption" color="text.meta" sx={{ flex: 1 }}>
        Geometric · on axis · one wavelength
      </Typography>
      <Tooltip title="Close Optimize">
        <IconButton aria-label="Close Optimize" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
  const frame = (body: ReactNode) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, bgcolor: 'canvas.ground' }}>
      {header}
      {body}
    </Box>
  );

  // The light could not be read: say why; no place at all: say what Optimize needs.
  const failed = places.error ?? setup.error;
  if (failed) {
    return frame(
      <Box sx={{ p: 2 }}>
        <Failed message={failed} />
      </Box>,
    );
  }
  if (!target || !setup.data || !objective) {
    return frame(
      <EmptyState icon={<AutoFixHighOutlinedIcon />} title="Nothing to optimize for yet">
        Optimize needs light that reaches a detector, or runs out past the last part. Add a source and a detector, with the parts between them on the light’s path.
      </EmptyState>,
    );
  }

  const offer = setup.data;
  const setObjective = (o: Objective) => setObjectiveByTarget((m) => ({ ...m, [target.key]: o }));
  const unit = offer.objectives.find((o) => o.kind === objective.kind)!.unit;
  const groups = offer.groups;
  const all = groups.flatMap((g) => g.variables);
  const partLabel = (id: string) => groups.find((g) => g.part.id === id)?.part.label ?? id;
  const chosenMap = chosenByTarget[target.key] ?? {};
  const chosen: Variable[] = all.filter((v) => chosenMap[v.id]).map((v) => ({ ...v, ...chosenMap[v.id] }));
  const setChosen = (next: Record<string, { min: number; max: number }>) => setChosenByTarget((m) => ({ ...m, [target.key]: next }));
  const key = JSON.stringify([target.key, objective, chosen]);
  asking.current = key;
  const mine = ran && ran.design === design && ran.key === key ? ran : null;
  const current = mine?.status === 'done' ? mine.run : null;
  const running = mine?.status === 'running' ? mine : null;
  /** The run shown: done, or the best so far while it goes. */
  const shownRun = current ?? running?.best ?? null;
  const plane: Plane | null = objective.kind === 'rms-spot' || objective.kind === 'beam-diameter' ? objective.plane : null;

  const go = () => {
    const asked = { key, design };
    const ours = (r: Ran | null) => r !== null && r.key === asked.key && r.design === asked.design;
    const started = analysis.run({ design, light, place: target.key, objective, variables: chosen }, (best) => setRan((r) => (ours(r) && r!.status === 'running' ? { ...r!, best } : r)));
    setRan({ ...asked, status: 'running', job: started, best: null });
    started.done.then(
      (run) => setRan((r) => (ours(r) ? { ...asked, status: 'done', run } : r)),
      (e: unknown) => setRan((r) => (ours(r) ? { ...asked, status: 'error', error: errorText(e) } : r)),
    );
  };

  const now = view.data;
  const proposed = shownRun?.proposed ?? null;
  const rmsNow = now?.spot.rmsMm ?? 0;
  const rmsNext = proposed?.spot.rmsMm ?? null;
  const sharedReach = Math.max(now ? spotReach(now.spot.points, rmsNow) : 0, proposed ? spotReach(proposed.spot.points, proposed.spot.rmsMm) : 0);
  // The diffraction limit at the plane, now and as proposed: spots below it look the same.
  const airyNow = now?.spot.airyMm ?? null;
  const airyNext = proposed?.spot.airyMm ?? null;
  const nextLimited = airyNext !== null && rmsNext !== null && rmsNext <= airyNext;
  const bothLimited = nextLimited && airyNow !== null && rmsNow <= airyNow;
  const spotChange = (from: number, to: number) => (bothLimited ? 'both diffraction-limited' : change(from, to));
  // A variable that ends at a bound: the best may lie past it (said once the run is over).
  const atBound = current ? chosen.filter((v) => Math.min(Math.abs(current.values[v.id] - v.min), Math.abs(current.values[v.id] - v.max)) <= Math.max(1e-6, (v.max - v.min) * 1e-3)) : [];
  const spotLabel = now?.spot.at ?? target.label;
  const color = `var(--mui-palette-rays-${target.ray.color})`;

  const pickKind = (kind: Objective['kind']) => {
    const p = { part: target.part, offsetMm: 0 };
    const lens = offer.lenses[0];
    setObjective(
      kind === 'rms-spot'
        ? { kind, plane: p }
        : kind === 'beam-diameter'
          ? { kind, plane: p, targetMm: 5 }
          : kind === 'magnification'
            ? { kind, target: Math.round(Math.abs(offer.magnification ?? 1)) || 1 }
            : kind === 'focal-length'
              ? { kind, part: lens?.id ?? '', targetMm: Math.round(lens?.focalMm ?? 50) }
              : { kind },
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, bgcolor: 'canvas.ground' }}>
      {header}
      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* What the run does: the beam envelope with the proposal dashed over it, the spots before and after, and the numbers side by side. */}
        <Stack sx={{ position: 'relative', flex: 1, minWidth: 0, p: 1.5, gap: 1.5, overflow: 'auto', scrollbarWidth: 'thin' }}>
          {view.error && <Failed message={view.error} />}
          {now && (
          <Stack sx={{ gap: 1.5 }}>
          <Figure title={`Beam envelope · ${target.ray.label}`} meta={proposed ? `current solid · ${running ? 'best so far' : 'proposed'} dashed` : undefined}>
            <BeamLayout envelope={now.envelope} name={target.ray.label} proposal={proposed?.envelope} color={color} />
          </Figure>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: proposed ? 'repeat(auto-fit, minmax(200px, 1fr))' : 'minmax(200px, 420px)' }}>
            <Figure title="Spot · current" meta={`RMS ${lengthText(rmsNow)}${airyNow && !proposed ? ` · Airy ${lengthText(airyNow)}` : ''}`}>
              <SpotDiagram points={now.spot.points} rmsMm={rmsNow} airyMm={airyNow} reachMm={sameScale ? sharedReach : undefined} color={INK} height={250} legend={!proposed} />
            </Figure>
            {proposed && rmsNext !== null && (
              <Figure title={running ? 'Spot · best so far' : 'Spot · proposed'} meta={`RMS ${lengthText(rmsNext!)}`}>
                <SpotDiagram points={proposed.spot.points} rmsMm={rmsNext} airyMm={airyNext} reachMm={sameScale ? sharedReach : undefined} color={ACCENT} height={250} legend={false} />
              </Figure>
            )}
          </Box>
          {proposed && (
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <FormControlLabel
                control={<Checkbox size="small" checked={sameScale} onChange={(_, c) => setSameScale(c)} />}
                label={<Typography variant="caption">{`Same scale for both spots · at ${spotLabel} · dashed circle: RMS radius${airyNow ? ' · solid: Airy radius' : ''}`}</Typography>}
                sx={{ ml: 0 }}
              />
            </Stack>
          )}
          {shownRun && proposed && (
            <Figure title={running ? 'Current and best so far' : 'Current and proposed'}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& th, & td': { py: 0.5, px: 1, borderTop: 1, borderColor: 'divider', typography: 'caption' }, '& td': { typography: 'mono', fontSize: 11, textAlign: 'right' }, '& th': { textAlign: 'left', fontWeight: 'fontWeightRegular', color: 'text.secondary' } }}>
                <thead>
                  <tr>
                    <Box component="th" sx={{ borderTop: '0 !important' }} />
                    {['Current', running ? 'Best so far' : 'Proposed', 'Change'].map((h) => (
                      <Box component="th" key={h} sx={{ borderTop: '0 !important', textAlign: 'right !important' }}>
                        {h}
                      </Box>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: offer.objectives.find((o) => o.kind === objective.kind)!.label, now: fmt(shownRun.before, unit), next: fmt(shownRun.after, unit), change: objective.kind === 'rms-spot' ? spotChange(shownRun.before, shownRun.after) : change(shownRun.before, shownRun.after) },
                    ...(objective.kind === 'rms-spot' ? [] : [{ label: `RMS spot radius at ${spotLabel}`, now: lengthText(rmsNow), next: lengthText(rmsNext!), change: spotChange(rmsNow, rmsNext!) }]),
                    ...chosen.map((v) => ({ label: `${partLabel(v.part)} · ${v.label}`, now: `${v.value.toFixed(2)} mm`, next: `${shownRun.values[v.id].toFixed(2)} mm`, change: `${shownRun.values[v.id] - v.value >= 0 ? '+' : '−'}${Math.abs(shownRun.values[v.id] - v.value).toFixed(2)} mm` })),
                  ].map((row) => (
                    <tr key={row.label}>
                      <th>{row.label}</th>
                      <td>{row.now}</td>
                      <Box component="td" sx={{ color: 'primary.main' }}>
                        {row.next}
                      </Box>
                      <td>{row.change}</td>
                    </tr>
                  ))}
                </tbody>
              </Box>
              {current && (atBound.length > 0 || nextLimited) && (
                <Stack spacing={0.5} sx={{ mt: 1, px: 1 }}>
                  {atBound.map((v) => (
                    <Typography key={v.id} variant="caption" color="warning.main" component="div">
                      {`${partLabel(v.part)} · ${v.label} stopped at its bound (${current.values[v.id].toFixed(2)} mm): the best may lie beyond it. Widen the bounds and run again.`}
                    </Typography>
                  ))}
                  {nextLimited && (
                    <Typography variant="caption" color="text.secondary" component="div">
                      {bothLimited
                        ? `Both spots are inside the Airy disc (radius ${lengthText(airyNext!)}): they look the same, whatever their RMS.`
                        : `The proposed spot is inside the Airy disc (radius ${lengthText(airyNext!)}): it is diffraction-limited, and a smaller RMS makes it no sharper.`}
                    </Typography>
                  )}
                </Stack>
              )}
            </Figure>
          )}
          </Stack>
          )}
        </Stack>

        <Stack component="aside" aria-label="Optimize" sx={{ width: 360, flexShrink: 0, minHeight: 0, bgcolor: 'background.paper', borderLeft: 1, borderColor: 'divider' }}>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', scrollbarWidth: 'thin' }}>
            <Section title="Objective" aside={now && <Typography variant="mono" color="text.secondary">{`now ${fmt(now.value, unit)}`}</Typography>}>
              <Stack spacing={1}>
                <Select size="small" fullWidth value={objective.kind} onChange={(e) => pickKind(e.target.value as Objective['kind'])} aria-label="Objective" sx={{ typography: 'body2' }}>
                  {offer.objectives.map((o) => (
                    <MenuItem key={o.kind} value={o.kind}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  {targets.length > 1 ? (
                    <Select size="small" value={target.key} onChange={(e) => setTargetKey(e.target.value)} aria-label="At" sx={{ typography: 'body2', flex: 1 }}>
                      {targets.map((t) => (
                        <MenuItem key={t.key} value={t.key}>
                          {`at ${t.label}`}
                        </MenuItem>
                      ))}
                    </Select>
                  ) : (
                    <Typography variant="body2" sx={{ flex: 1 }}>{`at ${target.label}`}</Typography>
                  )}
                  {plane && (
                    <NumberInput
                      label="Shift"
                      value={plane.offsetMm}
                      onChange={(v) => setObjective({ ...objective, plane: { ...plane, offsetMm: v } } as Objective)}
                      step={0.5}
                      precision={1}
                      unit="mm"
                      size="small"
                      sx={{ width: 110 }}
                    />
                  )}
                </Stack>
                {objective.kind === 'beam-diameter' && (
                  <NumberInput
                    label="Target"
                    value={objective.targetMm}
                    onChange={(v) => v > 0 && setObjective({ ...objective, targetMm: v })}
                    min={0.1}
                    step={0.5}
                    precision={1}
                    unit="mm"
                    size="small"
                  />
                )}
                {objective.kind === 'magnification' && (
                  <NumberInput label="Target" value={objective.target} onChange={(v) => v > 0 && setObjective({ ...objective, target: v })} min={0.01} step={0.5} precision={2} unit="×" size="small" />
                )}
                {objective.kind === 'focal-length' && (
                  <Stack direction="row" spacing={1}>
                    <Select size="small" value={objective.part} onChange={(e) => setObjective({ ...objective, part: e.target.value })} aria-label="Of" sx={{ typography: 'body2', flex: 1 }}>
                      {offer.lenses.map((e) => (
                        <MenuItem key={e.id} value={e.id}>
                          {e.label}
                        </MenuItem>
                      ))}
                    </Select>
                    <NumberInput
                      label="Target"
                      value={objective.targetMm}
                      onChange={(v) => setObjective({ ...objective, targetMm: v })}
                      step={5}
                      precision={1}
                      unit="mm"
                      size="small"
                      sx={{ width: 120 }}
                    />
                  </Stack>
                )}
              </Stack>
            </Section>

            <Section title="Variables" aside={<Typography variant="caption" color="text.secondary">{`${chosen.length} of ${all.length}`}</Typography>}>
              <Stack spacing={1.25}>
                {groups.map((g) => (
                  <Box key={g.part.id}>
                    <Typography variant="body2" sx={{ fontWeight: 500, cursor: 'pointer' }} onClick={() => onSelect(g.part.id)}>
                      {g.part.label}
                      {g.fixed && (
                        <Typography component="span" variant="caption" color="text.meta" sx={{ fontWeight: 400, ml: 1 }}>
                          {g.fixed}
                        </Typography>
                      )}
                    </Typography>
                    {g.variables.map((v) => {
                      const on = chosenMap[v.id];
                      return (
                        <Box key={v.id} sx={{ ml: -1 }}>
                          <Stack direction="row" sx={{ alignItems: 'center' }}>
                            <Checkbox
                              size="small"
                              checked={Boolean(on)}
                              onChange={(_, c) => {
                                const next = { ...chosenMap };
                                if (c) next[v.id] = { min: v.min, max: v.max };
                                else delete next[v.id];
                                setChosen(next);
                              }}
                              inputProps={{ 'aria-label': `Vary ${g.part.label} ${v.label}` }}
                            />
                            <Typography variant="body2" sx={{ flex: 1 }}>
                              {v.label}
                            </Typography>
                            <Typography variant="mono" color="text.secondary">
                              {fmt(v.value, 'mm')}
                            </Typography>
                          </Stack>
                          {on && (
                            <Stack direction="row" spacing={1} sx={{ pl: 4.5, pb: 0.75 }}>
                              <NumberInput
                                label="Min"
                                value={on.min}
                                onChange={(m) => setChosen({ ...chosenMap, [v.id]: { ...on, min: Math.min(m, on.max) } })}
                                step={1}
                                precision={2}
                                unit="mm"
                                size="small"
                              />
                              <NumberInput
                                label="Max"
                                value={on.max}
                                onChange={(m) => setChosen({ ...chosenMap, [v.id]: { ...on, max: Math.max(m, on.min) } })}
                                step={1}
                                precision={2}
                                unit="mm"
                                size="small"
                              />
                            </Stack>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                ))}
                {!groups.length && (
                  <Typography variant="body2" color="text.secondary">
                    No optic on this path.
                  </Typography>
                )}
              </Stack>
            </Section>

            {(shownRun || running) && (
              <Section title={running ? 'Running' : 'Result'} aside={shownRun && <Typography variant="mono">{`${fmt(shownRun.before, unit)} → ${fmt(shownRun.after, unit)}`}</Typography>}>
                <Stack spacing={0.5}>
                  {shownRun && (
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {running ? `Step ${shownRun.steps} · the best so far` : shownRun.stopped ? `Stopped at step ${shownRun.steps}: the best it had` : `Done in ${shownRun.steps} ${shownRun.steps === 1 ? 'step' : 'steps'}`}
                      </Typography>
                      <Progress history={shownRun.history} running={Boolean(running)} />
                    </Stack>
                  )}
                  {!shownRun && (
                    <Typography variant="caption" color="text.secondary">
                      Starting…
                    </Typography>
                  )}
                  {shownRun &&
                    chosen.map((v) => (
                      <Stack key={v.id} direction="row" sx={{ justifyContent: 'space-between' }}>
                        <Typography variant="body2">{`${partLabel(v.part)} · ${v.label}`}</Typography>
                        <Typography variant="mono">{`${v.value.toFixed(2)} → ${shownRun.values[v.id].toFixed(2)}`}</Typography>
                      </Stack>
                    ))}
                </Stack>
              </Section>
            )}
          </Box>

          {mine?.status === 'error' && <Failed message={mine.error} onRetry={go} sx={{ mx: 1.5, mt: 1.5 }} />}
          <Stack direction="row" spacing={1} sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
            {current ? (
              <>
                <Button
                  variant="contained"
                  sx={{ flex: 1 }}
                  onClick={() => {
                    onApply(current.design);
                    setRan(null);
                  }}
                >
                  Apply
                </Button>
                <Button onClick={() => setRan(null)}>Drop</Button>
              </>
            ) : running ? (
              <Button variant="outlined" sx={{ flex: 1 }} onClick={() => running.job.stop()}>
                Stop · keep the best so far
              </Button>
            ) : (
              <Button variant="contained" sx={{ flex: 1 }} disabled={!chosen.length} onClick={go}>
                {chosen.length ? `Run · ${chosen.length} variable${chosen.length === 1 ? '' : 's'}` : 'Tick a variable to run'}
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
