/**
 * Optimize, beside the canvas (the canvas splits, as for the close-up). The
 * objective first: what to make small or what to hit, and where. Then the
 * variables the path's parts offer, each ticked to vary between bounds of
 * its own. Run, see the proposal against the beam as it is (the beam drawn
 * over it, the spots side by side), and apply it: an edit like any other.
 *
 * The lab's own optimizer (standins/kernel/simulate/optimize) stands in for Optiland's.
 */
import { useMemo, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import FormControlLabel from '@mui/material/FormControlLabel';
import { BeamLayout } from '../../analysis/BeamLayout';
import { SpotDiagram } from '../../analysis/Plots';
import { ACCENT, Figure, INK } from '../../analysis/plot/Chart';
import { lengthText, spotReach } from '../../analysis/plot/scale';
import { NumberInput } from '../../primitives/NumberInput';
import type { CatalogRecord } from '../holders/optic';
import type { Light } from '../../../ports/light';
import type { Schematic, SchematicSymbol } from '../model';
import { beamOf, DEFAULT_BEAM_MM, targetsOf, type Beam, type Target } from '../../../standins/kernel/simulate/beam';
import { MERIT_RAYS, measure, OBJECTIVES, planeZ, run, toDesign, variablesOf, withValues, type Objective, type Plane, type Run, type Variable } from '../../../standins/kernel/simulate/optimize';
import { results, startRay, trace } from '../../../standins/kernel/simulate/paraxial';
import { pupilOf, realTrace, rmsAt, spotAt } from '../../../standins/kernel/simulate/realtrace';

export interface OptimizePaneProps {
  design: Schematic;
  light: Light;
  recordFor: (s: SchematicSymbol) => CatalogRecord | undefined;
  /** The run applied: the design with its variables at their new values. */
  onApply: (design: Schematic) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}

/** The parts whose focal length can be a target. */
const lensesOf = (beam: Beam) => beam.elements.filter((e) => e.role === 'lens' && (e.surfaces || e.focalMm));

/** RMS spot at a detector or the sample; collimation where the light runs out. */
const defaultObjective = (t: Target): Objective => (t.part === 'end' ? { kind: 'collimation' } : { kind: 'rms-spot', plane: { part: t.part, offsetMm: 0 } });

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

/** A change as a share of where it started: "−99.9 %". */
const change = (from: number, to: number) => (Math.abs(from) < 1e-12 ? '—' : `${to >= from ? '+' : '−'}${Math.abs(((to - from) / from) * 100).toFixed(1)} %`);

const fmt = (v: number, unit: string) => {
  // Spots of a millimetre or more read in mm.
  if (unit === 'µm' && Math.abs(v) >= 1000) return `${(v / 1000).toFixed(2)} mm`;
  return `${Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)} ${unit}`;
};

export function OptimizePane({ design, light, recordFor, onApply, onSelect, onClose }: OptimizePaneProps) {
  const beams = useMemo(() => light.paths.flatMap((p) => beamOf(design, p, recordFor) ?? []), [design, light, recordFor]);
  // Where the objective is read: picking a detector picks the light that reaches it.
  const targets = useMemo(() => targetsOf(beams), [beams]);
  const [targetKey, setTargetKey] = useState<string | null>(null);
  const target = targets.find((t) => t.key === targetKey) ?? targets[0];
  const beam = target?.beam;
  const [objectiveByTarget, setObjectiveByTarget] = useState<Record<string, Objective>>({});
  /** The ticked variables, by id, with their bounds. */
  const [chosenByTarget, setChosenByTarget] = useState<Record<string, Record<string, { min: number; max: number }>>>({});
  const [result, setResult] = useState<{ design: Schematic; key: string; run: Run } | null>(null);
  const [sameScale, setSameScale] = useState(false);

  const header = (
    <Stack
      direction="row"
      sx={(t) => ({ alignItems: 'center', gap: 1, minHeight: t.spacing(t.layout.panelHeaderHeight), pl: 2, pr: 0.5, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' })}
    >
      <Typography variant="subtitle2" sx={{ flex: 1 }}>
        Optimize
      </Typography>
      <Tooltip title="Close Optimize">
        <IconButton aria-label="Close Optimize" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  if (!beam) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, bgcolor: 'canvas.ground' }}>
        {header}
        <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
          No detector to optimize for.
        </Typography>
      </Box>
    );
  }

  const objective = objectiveByTarget[target.key] ?? defaultObjective(target);
  const setObjective = (o: Objective) => setObjectiveByTarget((m) => ({ ...m, [target.key]: o }));
  const unit = OBJECTIVES.find((o) => o.kind === objective.kind)!.unit;
  const pupil = pupilOf(beam, DEFAULT_BEAM_MM);
  const groups = variablesOf(beam);
  const all = groups.flatMap((g) => g.variables);
  const chosenMap = chosenByTarget[target.key] ?? {};
  const chosen: Variable[] = all.filter((v) => chosenMap[v.id]).map((v) => ({ ...v, ...chosenMap[v.id] }));
  const setChosen = (next: Record<string, { min: number; max: number }>) => setChosenByTarget((m) => ({ ...m, [target.key]: next }));
  const now = measure(beam, objective, pupil);
  const key = JSON.stringify([target.key, objective, chosen]);
  const current = result && result.design === design && result.key === key ? result.run : null;
  const proposed = current ? withValues(beam, chosen, current.values) : null;
  const plane: Plane | null = objective.kind === 'rms-spot' || objective.kind === 'beam-diameter' ? objective.plane : null;
  const spotPlane = plane ?? { part: target.part, offsetMm: 0 };

  const t = trace(beam, startRay(beam, DEFAULT_BEAM_MM));
  const r = results(beam, t, DEFAULT_BEAM_MM);
  const proposalDraw = proposed ? { beam: proposed, trace: trace(proposed, startRay(proposed, DEFAULT_BEAM_MM)) } : null;
  const spotNow = realTrace(beam, pupil, MERIT_RAYS);
  const spotNext = proposed ? realTrace(proposed, pupil, MERIT_RAYS) : null;
  const zNow = planeZ(beam, spotPlane);
  const rmsNow = rmsAt(spotNow, zNow);
  const zNext = proposed ? planeZ(proposed, spotPlane) : 0;
  const pointsNext = spotNext ? spotAt(spotNext, zNext) : null;
  const rmsNext = spotNext ? rmsAt(spotNext, zNext) : null;
  const sharedReach = Math.max(spotReach(spotAt(spotNow, zNow), rmsNow), pointsNext && rmsNext !== null ? spotReach(pointsNext, rmsNext) : 0);
  const spotLabel = spotPlane.part === 'end' ? 'the end' : (beam.elements.find((e) => e.id === spotPlane.part)?.label ?? target.label);

  const pickKind = (kind: Objective['kind']) => {
    const p = { part: target.part, offsetMm: 0 };
    const lens = lensesOf(beam)[0];
    setObjective(
      kind === 'rms-spot'
        ? { kind, plane: p }
        : kind === 'beam-diameter'
          ? { kind, plane: p, targetMm: 5 }
          : kind === 'magnification'
            ? { kind, target: Math.round(Math.abs(r.magnification ?? r.expansion ?? 1)) || 1 }
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
        <Stack sx={{ flex: 1, minWidth: 0, p: 1.5, gap: 1.5, overflow: 'auto', scrollbarWidth: 'thin' }}>
          <Figure title={`Beam envelope · ${beam.ray.label}`} meta={proposed ? 'current solid · proposed dashed' : undefined}>
            <BeamLayout beam={beam} trace={t} result={r} proposal={proposalDraw} color={`var(--mui-palette-rays-${beam.ray.color})`} />
          </Figure>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: proposed ? 'repeat(auto-fit, minmax(200px, 1fr))' : 'minmax(200px, 420px)' }}>
            <Figure title="Spot · current" meta={`RMS ${lengthText(rmsNow)}`}>
              <SpotDiagram points={spotAt(spotNow, zNow)} rmsMm={rmsNow} reachMm={sameScale ? sharedReach : undefined} color={INK} height={250} legend={!proposed} />
            </Figure>
            {spotNext && proposed && (
              <Figure title="Spot · proposed" meta={`RMS ${lengthText(rmsNext!)}`}>
                <SpotDiagram points={pointsNext!} rmsMm={rmsNext!} reachMm={sameScale ? sharedReach : undefined} color={ACCENT} height={250} legend={false} />
              </Figure>
            )}
          </Box>
          {proposed && (
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <FormControlLabel
                control={<Checkbox size="small" checked={sameScale} onChange={(_, c) => setSameScale(c)} />}
                label={<Typography variant="caption">{`Same scale for both spots · at ${spotLabel} · dashed circle: RMS radius`}</Typography>}
                sx={{ ml: 0 }}
              />
            </Stack>
          )}
          {current && proposed && (
            <Figure title="Current and proposed">
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& th, & td': { py: 0.5, px: 1, borderTop: 1, borderColor: 'divider', typography: 'caption' }, '& td': { typography: 'mono', fontSize: 11, textAlign: 'right' }, '& th': { textAlign: 'left', fontWeight: 'fontWeightRegular', color: 'text.secondary' } }}>
                <thead>
                  <tr>
                    <Box component="th" sx={{ borderTop: '0 !important' }} />
                    {['Current', 'Proposed', 'Change'].map((h) => (
                      <Box component="th" key={h} sx={{ borderTop: '0 !important', textAlign: 'right !important' }}>
                        {h}
                      </Box>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: OBJECTIVES.find((o) => o.kind === objective.kind)!.label, now: fmt(current.before, unit), next: fmt(current.after, unit), change: change(current.before, current.after) },
                    ...(objective.kind === 'rms-spot' ? [] : [{ label: `RMS spot radius at ${spotLabel}`, now: lengthText(rmsNow), next: lengthText(rmsNext!), change: change(rmsNow, rmsNext!) }]),
                    ...chosen.map((v) => ({ label: `${beam.elements.find((e) => e.id === v.part)?.label} · ${v.label}`, now: `${v.value.toFixed(2)} mm`, next: `${current.values[v.id].toFixed(2)} mm`, change: `${current.values[v.id] - v.value >= 0 ? '+' : '−'}${Math.abs(current.values[v.id] - v.value).toFixed(2)} mm` })),
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
            </Figure>
          )}
        </Stack>

        <Stack component="aside" aria-label="Optimize" sx={{ width: 360, flexShrink: 0, minHeight: 0, bgcolor: 'background.paper', borderLeft: 1, borderColor: 'divider' }}>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', scrollbarWidth: 'thin' }}>
            <Section title="Objective" aside={<Typography variant="mono" color="text.secondary">{`now ${fmt(now, unit)}`}</Typography>}>
              <Stack spacing={1}>
                <Select size="small" fullWidth value={objective.kind} onChange={(e) => pickKind(e.target.value as Objective['kind'])} aria-label="Objective" sx={{ typography: 'body2' }}>
                  {OBJECTIVES.map((o) => (
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
                      {lensesOf(beam).map((e) => (
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

            {current && (
              <Section title="Result" aside={<Typography variant="mono">{`${fmt(current.before, unit)} → ${fmt(current.after, unit)}`}</Typography>}>
                <Stack spacing={0.5}>
                  {chosen.map((v) => (
                    <Stack key={v.id} direction="row" sx={{ justifyContent: 'space-between' }}>
                      <Typography variant="body2">{`${beam.elements.find((e) => e.id === v.part)?.label} · ${v.label}`}</Typography>
                      <Typography variant="mono">{`${v.value.toFixed(2)} → ${current.values[v.id].toFixed(2)}`}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Section>
            )}
          </Box>

          <Stack direction="row" spacing={1} sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
            {current ? (
              <>
                <Button
                  variant="contained"
                  sx={{ flex: 1 }}
                  onClick={() => {
                    onApply(toDesign(design, beam, chosen, current.values));
                    setResult(null);
                  }}
                >
                  Apply
                </Button>
                <Button onClick={() => setResult(null)}>Drop</Button>
              </>
            ) : (
              <Button variant="contained" sx={{ flex: 1 }} disabled={!chosen.length} onClick={() => setResult({ design, key, run: run(beam, chosen, objective, pupil) })}>
                {chosen.length ? `Run · ${chosen.length} variable${chosen.length === 1 ? '' : 's'}` : 'Tick a variable to run'}
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
