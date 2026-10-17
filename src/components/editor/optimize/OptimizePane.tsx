/**
 * Optimize, beside the canvas: the Optimize tab's tools. Where the light is
 * read (one path), the targets for it, each with a weight (several targets
 * count together: each relative to its value at the start, so a spot in µm
 * and a focal length in mm can be weighed), and the variables the path's
 * parts offer, each ticked to vary between bounds of its own (here, or with
 * the V on its row in Properties: vary.ts). Run, see the proposal against
 * the beam as it is (the beam drawn over it, the spots side by side, each
 * target before and after), and apply it: an edit like any other. Every run
 * is kept (session.ts): pick one from Runs to see it again and apply it.
 *
 * The optimizer is the analysis port's (src/ports/analysis.ts): oc-wasm's in
 * the app, the lab's own in the lab, both in the page. The light as it is
 * reads at once. A run takes time, in a worker: the pane shows the best so
 * far as it goes (the proposal drawn live, the merit falling), and Stop
 * keeps it. A change to the design or the question stops the run.
 *
 * What a proposal is worth, said with it: spots below the diffraction limit
 * are not told apart (the Airy radius drawn with them), and a variable that
 * ends at its bound says the best may lie beyond it.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { BeamLayout } from '../../analysis/BeamLayout';
import { SpotDiagram } from '../../analysis/Plots';
import { ACCENT, Figure, INK } from '../../analysis/plot/Chart';
import { lengthText, spotReach } from '../../analysis/plot/scale';
import { EmptyState } from '../../primitives/EmptyState';
import { NumberInput } from '../../primitives/NumberInput';
import { Failed } from '../../primitives/RequestState';
import { ScrubNumber } from '../../primitives/ScrubNumber';
import { useAnalysis, type Goal, type Objective, type OptimizeAsk, type OptimizeJob, type OptimizeRun, type OptimizeSetup, type PartVariables, type Place, type Plane } from '../../../ports/analysis';
import type { Light } from '../../../ports/light';
import { answer, errorText, NO_ANSWER } from '../../../ports/request';
import type { Schematic } from '../model';
import { DEFAULT_SETTINGS } from '../simulate/checks';
import { percent, type OptimizeSession, type SavedRun } from './session';
import { freeOf, toggled, type VaryMap } from './vary';

export interface OptimizePaneProps {
  design: Schematic;
  light: Light;
  /** The run applied: the design with its variables at their new values. */
  onApply: (design: Schematic) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
  /** The free variables, with their bounds (shared with Properties). */
  free: VaryMap;
  onFree: (free: VaryMap) => void;
  /** What the path being optimized offers, for Properties to show a V on those rows. */
  onGroups?: (groups: PartVariables[]) => void;
  /** The values the run shown proposes (`null`: none), for Properties to show beside the free rows. */
  onProposed?: (values: Readonly<Record<string, number>> | null) => void;
  /** The path, its targets and the runs made: kept by the editor, so they outlive the tab. */
  session: OptimizeSession;
  onSession: (update: (session: OptimizeSession) => OptimizeSession) => void;
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

/** The run going on: for which question, and how it goes. While it runs, `best` is the best so far. A run that ends is kept in the session. */
type Ran = { key: string; design: Schematic; status: 'running'; job: OptimizeJob; best: OptimizeRun | null } | { key: string; design: Schematic; status: 'error'; error: string };

/** The merit after each step, as a small line: it falls as the run goes. */
function Progress({ history, running, width = 120 }: { history: number[]; running: boolean; width?: number }) {
  const w = width;
  const h = width > 80 ? 28 : 16;
  const lo = Math.min(...history);
  const hi = Math.max(...history);
  const n = Math.max(1, history.length - 1);
  const y = (v: number) => (hi - lo < 1e-12 ? h / 2 : 2 + ((hi - v) / (hi - lo)) * (h - 4));
  // SVG's y runs down: the highest merit at the top, so the line falls as the run goes.
  const points = history.map((v, i) => `${((i / n) * w).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <Box component="svg" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden sx={{ display: 'block', flexShrink: 0, color: running ? 'primary.main' : 'text.secondary' }}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
    </Box>
  );
}

/** A new target of a kind, at this place, from what it offers. */
function objectiveOf(kind: Objective['kind'], offer: OptimizeSetup, place: Place): Objective {
  const p = { part: place.part, offsetMm: 0 };
  const lens = offer.lenses[0];
  return kind === 'rms-spot'
    ? { kind, plane: p }
    : kind === 'beam-diameter'
      ? { kind, plane: p, targetMm: 5 }
      : kind === 'magnification'
        ? { kind, target: Math.round(Math.abs(offer.magnification ?? 1)) || 1 }
        : kind === 'focal-length'
          ? { kind, part: lens?.id ?? '', targetMm: Math.round(lens?.focalMm ?? 50) }
          : { kind };
}

/** A target in words, as the table names it: "RMS spot size at Camera", "Focal length of Tube lens = 100 mm". */
function goalLabel(o: Objective, offer: OptimizeSetup, place: Place): string {
  const name = offer.objectives.find((x) => x.kind === o.kind)!.label;
  const shift = (plane: Plane) => (plane.offsetMm ? ` ${plane.offsetMm > 0 ? '+' : '−'}${Math.abs(plane.offsetMm)} mm` : '');
  switch (o.kind) {
    case 'rms-spot':
      return `${name} at ${place.label}${shift(o.plane)}`;
    case 'beam-diameter':
      return `${name} = ${o.targetMm} mm at ${place.label}${shift(o.plane)}`;
    case 'magnification':
      return `${name} = ${o.target}×`;
    case 'focal-length':
      return `Focal length of ${offer.lenses.find((l) => l.id === o.part)?.label ?? o.part} = ${o.targetMm} mm`;
    default:
      return name;
  }
}

/** One target: what, where and how much it counts; and its value now. */
function GoalCard({ goal, offer, place, now, onChange, onRemove }: { goal: Goal; offer: OptimizeSetup; place: Place; now: number | null; onChange: (g: Goal) => void; onRemove?: () => void }) {
  const o = goal.objective;
  const unit = offer.objectives.find((x) => x.kind === o.kind)!.unit;
  const set = (objective: Objective) => onChange({ ...goal, objective });
  const plane = o.kind === 'rms-spot' || o.kind === 'beam-diameter' ? o.plane : null;
  return (
    <Box sx={{ p: 1, borderRadius: 1, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <Select
          size="small"
          variant="standard"
          disableUnderline
          value={o.kind}
          onChange={(e) => set(objectiveOf(e.target.value as Objective['kind'], offer, place))}
          aria-label="Target"
          sx={{ flex: 1, typography: 'body2', fontWeight: 500 }}
        >
          {offer.objectives.map((x) => (
            <MenuItem key={x.kind} value={x.kind} dense>
              {x.label}
            </MenuItem>
          ))}
        </Select>
        {now !== null && (
          <Typography variant="mono" color="text.secondary" sx={{ fontSize: 11 }} title="Its value now">
            {fmt(now, unit)}
          </Typography>
        )}
        {onRemove && (
          <Tooltip title="Remove this target">
            <IconButton size="small" aria-label="Remove this target" onClick={onRemove}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      {plane && <ScrubNumber label={`Shift from ${place.label}`} value={plane.offsetMm} step={0.5} unit="mm" onChange={(v) => set({ ...o, plane: { ...plane, offsetMm: v } } as Objective)} />}
      {o.kind === 'beam-diameter' && <ScrubNumber label="Aim" value={o.targetMm} min={0.1} step={0.1} unit="mm" onChange={(v) => set({ ...o, targetMm: v })} />}
      {o.kind === 'magnification' && <ScrubNumber label="Aim" value={o.target} min={0.01} step={0.1} unit="×" onChange={(v) => set({ ...o, target: v })} />}
      {o.kind === 'focal-length' && (
        <>
          <Select
            size="small"
            variant="standard"
            disableUnderline
            fullWidth
            value={o.part}
            onChange={(e) => set({ ...o, part: e.target.value })}
            aria-label="Of"
            sx={{ typography: 'body2', color: 'text.secondary' }}
          >
            {offer.lenses.map((l) => (
              <MenuItem key={l.id} value={l.id} dense>
                {`of ${l.label}`}
              </MenuItem>
            ))}
          </Select>
          <ScrubNumber label="Aim" value={o.targetMm} step={1} unit="mm" onChange={(v) => set({ ...o, targetMm: v })} />
        </>
      )}
      <ScrubNumber
        label="Weight"
        value={goal.weight}
        min={0}
        max={10}
        step={0.1}
        hint="How much it counts against the other targets. Each counts from its value at the start."
        onChange={(weight) => onChange({ ...goal, weight })}
      />
    </Box>
  );
}

export function OptimizePane({ design, light, onApply, onSelect, onClose, free, onFree, onGroups, onProposed, session, onSession }: OptimizePaneProps) {
  const analysis = useAnalysis();
  // Where the light is read: picking a detector picks the light that reaches it.
  const placesAsk = useMemo(() => ({ design, light, settings: DEFAULT_SETTINGS }), [design, light]);
  const places = useMemo(() => answer(() => analysis.places(placesAsk)), [analysis, placesAsk]);
  const targets = places.data ?? [];
  const target = targets.find((t) => t.key === session.place) ?? targets[0];
  const placeKey = target?.key ?? null;
  // What the place offers: its objectives and variables. Another place's would mislead, so none is kept.
  const setupAsk = useMemo(() => (placeKey ? { design, light, place: placeKey } : null), [design, light, placeKey]);
  const setup = useMemo(() => (setupAsk ? answer(() => analysis.setup(setupAsk)) : NO_ANSWER), [analysis, setupAsk]);
  const [ran, setRan] = useState<Ran | null>(null);
  /** A kept run shown, by id. */
  const [picked, setPicked] = useState<number | null>(null);
  const [sameScale, setSameScale] = useState(false);

  // The targets of this path: as set, else the one it offers.
  const goals: Goal[] = placeKey && setup.data ? (session.goals[placeKey] ?? [{ objective: setup.data.objective, weight: 1 }]) : [];
  const goalsKey = JSON.stringify(goals);
  // The light at the place as it is, read for the targets.
  const viewAsk = useMemo<OptimizeAsk | null>(() => (placeKey && goals.length ? { design, light, place: placeKey, goals } : null), [design, light, placeKey, goalsKey]); // eslint-disable-line react-hooks/exhaustive-deps -- by value
  const view = useMemo(() => (viewAsk ? answer(() => analysis.view(viewAsk)) : NO_ANSWER), [analysis, viewAsk]);

  // A run is for one design and one question: when either changes, or the pane closes, it stops.
  const asking = useRef<string | null>(null);
  asking.current = null;
  useEffect(() => {
    if (ran?.status === 'running' && (ran.design !== design || ran.key !== asking.current)) ran.job.stop();
  });
  const job = ran?.status === 'running' ? ran.job : null;
  useEffect(() => () => job?.stop(), [job]);
  // Properties shows a V on the rows of what this path lets change; none once the pane closes.
  const groupsNow = setup.data?.groups;
  const groupsKey = JSON.stringify(groupsNow?.map((g) => [g.part.id, g.fixed, g.variables.map((v) => [v.id, v.value])]) ?? null);
  useEffect(() => {
    onGroups?.(groupsNow ?? []);
  }, [groupsKey]); // eslint-disable-line react-hooks/exhaustive-deps -- when what it offers changes
  useEffect(() => () => onGroups?.([]), []); // eslint-disable-line react-hooks/exhaustive-deps -- once, on close
  // The proposal, for Properties: read after each render (the run shown is worked out below), told when it changes.
  const proposedRef = useRef<Readonly<Record<string, number>> | null>(null);
  proposedRef.current = null; // none unless a run is shown below
  const proposedKey = useRef('');
  useEffect(() => {
    const k = JSON.stringify(proposedRef.current);
    if (k !== proposedKey.current) {
      proposedKey.current = k;
      onProposed?.(proposedRef.current);
    }
  });
  useEffect(() => () => onProposed?.(null), []); // eslint-disable-line react-hooks/exhaustive-deps -- once, on close
  // A new question (another path, target or variable): the kept run shown steps back, so Run is offered.
  const all = setup.data?.groups.flatMap((g) => g.variables) ?? [];
  const chosen = freeOf(all, free);
  const key = JSON.stringify([placeKey, goals, chosen.map((v) => [v.id, v.min, v.max])]);
  const lastKey = useRef(key);
  useEffect(() => {
    if (lastKey.current !== key) setPicked(null);
    lastKey.current = key;
  }, [key]);

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
  if (!target || !setup.data) {
    return frame(
      <EmptyState icon={<AutoFixHighOutlinedIcon />} title="Nothing to optimize for yet">
        Optimize needs light that reaches a detector, or runs out past the last part. Add a source and a detector, with the parts between them on the light’s path.
      </EmptyState>,
    );
  }

  const offer = setup.data;
  const setGoals = (next: Goal[]) => onSession((s) => ({ ...s, goals: { ...s.goals, [target.key]: next } }));
  const unitOf = (o: Objective) => offer.objectives.find((x) => x.kind === o.kind)!.unit;
  const groups = offer.groups;
  const partLabel = (id: string) => groups.find((g) => g.part.id === id)?.part.label ?? id;
  asking.current = key;
  const mine = ran && ran.design === design && ran.key === key ? ran : null;
  const running = mine?.status === 'running' ? mine : null;
  const kept = picked !== null ? (session.runs.find((r) => r.id === picked) ?? null) : null;
  /** The run shown: a kept one, or the best so far while one goes. */
  const shownRun = running ? running.best : (kept?.run ?? null);
  proposedRef.current = shownRun?.values ?? null;
  const shownVars = running ? chosen : (kept?.variables ?? chosen);
  const shownGoals = running ? goals : (kept?.goals ?? goals);
  const stale = Boolean(kept && kept.base !== design && !kept.applied);
  const runsHere = session.runs.filter((r) => r.place === target.key).reverse();
  // The next target to offer: one not set yet, the likeliest first (where light runs out: how parallel it leaves; at a detector: what the parts are).
  const order: Objective['kind'][] = target.part === 'end' ? ['collimation', 'beam-diameter', 'focal-length', 'magnification', 'rms-spot'] : ['focal-length', 'magnification', 'beam-diameter', 'rms-spot', 'collimation'];
  const nextKind = order.find((k) => offer.objectives.some((x) => x.kind === k) && !goals.some((g) => g.objective.kind === k) && (k !== 'focal-length' || offer.lenses.length > 0));
  const canAdd = nextKind !== undefined;

  const go = () => {
    const asked = { key, design };
    const ours = (r: Ran | null) => r !== null && r.key === asked.key && r.design === asked.design;
    const runGoals = goals;
    const runVars = chosen;
    const started = analysis.run({ design, light, place: target.key, goals: runGoals, variables: runVars }, (best) => setRan((r) => (ours(r) && r!.status === 'running' ? { ...r!, best } : r)));
    setPicked(null);
    setRan({ ...asked, status: 'running', job: started, best: null });
    started.done.then(
      (run) => {
        // Kept, and shown: it can be looked at again from Runs.
        const id = Math.max(0, ...session.runs.map((r) => r.id)) + 1;
        const saved: SavedRun = { id, place: target.key, placeLabel: target.label, goals: runGoals, variables: runVars, run, base: design, applied: false, key };
        onSession((s) => ({ ...s, runs: [...s.runs, saved] }));
        setRan((r) => (ours(r) ? null : r));
        setPicked(id);
      },
      (e: unknown) => setRan((r) => (ours(r) ? { ...asked, status: 'error', error: errorText(e) } : r)),
    );
  };
  const apply = (saved: SavedRun) => {
    onApply(saved.run.design);
    onSession((s) => ({ ...s, runs: s.runs.map((r) => (r.id === saved.id ? { ...r, applied: true } : r)) }));
    setPicked(null);
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
  const done = kept && !running ? kept.run : null;
  const atBound = done ? shownVars.filter((v) => Math.min(Math.abs(done.values[v.id] - v.min), Math.abs(done.values[v.id] - v.max)) <= Math.max(1e-6, (v.max - v.min) * 1e-3)) : [];
  const spotLabel = now?.spot.at ?? target.label;
  const color = `var(--mui-palette-rays-${target.ray.color})`;
  const proposedName = running ? 'Best so far' : 'Proposed';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, bgcolor: 'canvas.ground' }}>
      {header}
      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* What the run does: the beam envelope with the proposal dashed over it, the spots before and after, each target side by side. */}
        <Stack sx={{ position: 'relative', flex: 1, minWidth: 0, p: 1.5, gap: 1.5, overflow: 'auto', scrollbarWidth: 'thin' }}>
          {view.error && <Failed message={view.error} />}
          {now && (
            <Stack sx={{ gap: 1.5 }}>
              <Figure title={`Beam envelope · ${target.ray.label}`} meta={proposed ? `current solid · ${proposedName.toLowerCase()} dashed` : undefined}>
                <BeamLayout envelope={now.envelope} name={target.ray.label} proposal={proposed?.envelope} color={color} />
              </Figure>
              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: proposed ? 'repeat(auto-fit, minmax(200px, 1fr))' : 'minmax(200px, 420px)' }}>
                <Figure title="Spot · current" meta={`RMS ${lengthText(rmsNow)}${airyNow && !proposed ? ` · Airy ${lengthText(airyNow)}` : ''}`}>
                  <SpotDiagram points={now.spot.points} rmsMm={rmsNow} airyMm={airyNow} reachMm={sameScale ? sharedReach : undefined} color={INK} height={250} legend={!proposed} />
                </Figure>
                {proposed && rmsNext !== null && (
                  <Figure title={`Spot · ${proposedName.toLowerCase()}`} meta={`RMS ${lengthText(rmsNext)}`}>
                    <SpotDiagram points={proposed.spot.points} rmsMm={rmsNext} airyMm={airyNext} reachMm={sameScale ? sharedReach : undefined} color={ACCENT} height={250} legend={false} />
                  </Figure>
                )}
              </Box>
              {proposed && (
                <FormControlLabel
                  control={<Checkbox size="small" checked={sameScale} onChange={(_, c) => setSameScale(c)} />}
                  label={<Typography variant="caption">{`Same scale for both spots · at ${spotLabel} · dashed circle: RMS radius${airyNow ? ' · solid: Airy radius' : ''}`}</Typography>}
                  sx={{ ml: 0 }}
                />
              )}
              {shownRun && proposed && (
                <Figure title={kept && !running ? `Run ${kept.id} · before and proposed` : 'Before and best so far'}>
                  <Box
                    component="table"
                    sx={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      '& th, & td': { py: 0.5, px: 1, borderTop: 1, borderColor: 'divider', typography: 'caption' },
                      '& td': { typography: 'mono', fontSize: 11, textAlign: 'right' },
                      '& th': { textAlign: 'left', fontWeight: 'fontWeightRegular', color: 'text.secondary' },
                    }}
                  >
                    <thead>
                      <tr>
                        <Box component="th" sx={{ borderTop: '0 !important' }} />
                        {['Before', proposedName, 'Change'].map((h) => (
                          <Box component="th" key={h} sx={{ borderTop: '0 !important', textAlign: 'right !important' }}>
                            {h}
                          </Box>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ...(shownGoals.length > 1
                          ? [{ label: 'All targets (merit)', now: percent(shownRun.merit.before), next: percent(shownRun.merit.after), change: change(shownRun.merit.before, shownRun.merit.after) }]
                          : []),
                        ...shownGoals.map((g, i) => {
                          const v = shownRun.goals[i];
                          const u = unitOf(g.objective);
                          return {
                            label: goalLabel(g.objective, offer, target),
                            now: fmt(v.before, u),
                            next: fmt(v.after, u),
                            change: g.objective.kind === 'rms-spot' ? spotChange(v.before, v.after) : change(v.before, v.after),
                          };
                        }),
                        ...shownVars.map((v) => ({
                          label: `${partLabel(v.part)} · ${v.label}`,
                          now: `${v.value.toFixed(2)} mm`,
                          next: `${shownRun.values[v.id].toFixed(2)} mm`,
                          change: `${shownRun.values[v.id] - v.value >= 0 ? '+' : '−'}${Math.abs(shownRun.values[v.id] - v.value).toFixed(2)} mm`,
                        })),
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
                  {done && (atBound.length > 0 || nextLimited || stale) && (
                    <Stack spacing={0.5} sx={{ mt: 1, px: 1 }}>
                      {stale && (
                        <Typography variant="caption" color="warning.main" component="div">
                          Made on an earlier version of the design: applying it replaces the changes made since.
                        </Typography>
                      )}
                      {atBound.map((v) => (
                        <Typography key={v.id} variant="caption" color="warning.main" component="div">
                          {`${partLabel(v.part)} · ${v.label} stopped at its bound (${done.values[v.id].toFixed(2)} mm): the best may lie beyond it. Widen the bounds and run again.`}
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
            <Section title="Light">
              {targets.length > 1 ? (
                <Select size="small" fullWidth value={target.key} onChange={(e) => onSession((s) => ({ ...s, place: e.target.value }))} aria-label="Light read at" sx={{ typography: 'body2' }}>
                  {targets.map((t) => (
                    <MenuItem key={t.key} value={t.key}>
                      {`${t.ray.label} · read at ${t.label}`}
                    </MenuItem>
                  ))}
                </Select>
              ) : (
                <Typography variant="body2">{`${target.ray.label} · read at ${target.label}`}</Typography>
              )}
            </Section>

            <Section
              title="Targets"
              aside={
                goals.length > 1 && (
                  <Typography variant="caption" color="text.secondary">
                    each counts from where it starts
                  </Typography>
                )
              }
            >
              <Stack spacing={1}>
                {goals.map((g, i) => (
                  <GoalCard
                    key={i}
                    goal={g}
                    offer={offer}
                    place={target}
                    now={now?.values[i] ?? null}
                    onChange={(next) => setGoals(goals.map((x, j) => (j === i ? next : x)))}
                    onRemove={goals.length > 1 ? () => setGoals(goals.filter((_, j) => j !== i)) : undefined}
                  />
                ))}
                {canAdd && (
                  <Button
                    size="small"
                    startIcon={<AddIcon fontSize="small" />}
                    onClick={() => nextKind && setGoals([...goals, { objective: objectiveOf(nextKind, offer, target), weight: 1 }])}
                    sx={{ alignSelf: 'flex-start', color: 'text.secondary' }}
                  >
                    Add a target
                  </Button>
                )}
              </Stack>
            </Section>

            <Section title="Variables" aside={<Typography variant="caption" color="text.secondary">{`${chosen.length} of ${all.length} free`}</Typography>}>
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: -0.5, mb: 1 }}>
                Or select a part: its rows in Properties show a V.
              </Typography>
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
                      const on = free[v.id];
                      return (
                        <Box key={v.id} sx={{ ml: -1 }}>
                          <Stack direction="row" sx={{ alignItems: 'center' }}>
                            <Checkbox size="small" checked={Boolean(on)} onChange={() => onFree(toggled(free, v))} inputProps={{ 'aria-label': `Vary ${g.part.label} ${v.label}` }} />
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
                                onChange={(m) => onFree({ ...free, [v.id]: { ...on, min: Math.min(m, on.max) } })}
                                step={1}
                                precision={2}
                                unit="mm"
                                size="small"
                              />
                              <NumberInput
                                label="Max"
                                value={on.max}
                                onChange={(m) => onFree({ ...free, [v.id]: { ...on, max: Math.max(m, on.min) } })}
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

            {running && (
              <Section title="Running" aside={running.best && <Typography variant="mono">{`${percent(running.best.merit.before)} → ${percent(running.best.merit.after)}`}</Typography>}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {running.best ? `Step ${running.best.steps} · the best so far` : 'Starting…'}
                  </Typography>
                  {running.best && <Progress history={running.best.history} running />}
                </Stack>
              </Section>
            )}

            {runsHere.length > 0 && (
              <Section
                title="Runs"
                aside={
                  <Typography variant="caption" color="text.secondary">
                    merit: all targets, from 100 %
                  </Typography>
                }
              >
                <Stack spacing={0.5}>
                  {runsHere.map((r) => {
                    const on = kept?.id === r.id;
                    return (
                      <ButtonBase
                        key={r.id}
                        onClick={() => setPicked(on ? null : r.id)}
                        aria-pressed={on}
                        sx={(t) => ({
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          px: 1,
                          py: 0.75,
                          borderRadius: 1,
                          textAlign: 'left',
                          border: `${t.layout.hairline}px solid`,
                          borderColor: on ? 'primary.main' : 'divider',
                          bgcolor: on ? 'primary.soft' : 'transparent',
                        })}
                      >
                        <Typography variant="mono" color="text.meta" sx={{ width: 22, flexShrink: 0 }}>
                          {`#${r.id}`}
                        </Typography>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" noWrap>
                            {`${percent(r.run.merit.before)} → ${percent(r.run.merit.after)}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" component="div" noWrap>
                            {[
                              `${r.goals.length} target${r.goals.length === 1 ? '' : 's'}`,
                              `${r.variables.length} free`,
                              r.run.stopped ? 'stopped' : `${r.run.steps} steps`,
                              r.applied ? 'applied' : r.base !== design ? 'earlier design' : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </Typography>
                        </Box>
                        <Progress history={r.run.history} running={false} width={56} />
                      </ButtonBase>
                    );
                  })}
                </Stack>
              </Section>
            )}
          </Box>

          {mine?.status === 'error' && <Failed message={mine.error} onRetry={go} sx={{ mx: 1.5, mt: 1.5 }} />}
          <Stack direction="row" spacing={1} sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
            {running ? (
              <Button variant="outlined" sx={{ flex: 1 }} onClick={() => running.job.stop()}>
                Stop · keep the best so far
              </Button>
            ) : kept && !kept.applied ? (
              <>
                <Button variant="contained" sx={{ flex: 1 }} onClick={() => apply(kept)}>
                  {`Apply run ${kept.id}`}
                </Button>
                <Button onClick={() => setPicked(null)}>Close</Button>
              </>
            ) : (
              <Button variant="contained" sx={{ flex: 1 }} disabled={!chosen.length || !goals.length} onClick={go}>
                {chosen.length ? `Run · ${chosen.length} variable${chosen.length === 1 ? '' : 's'}` : 'Tick a variable to run'}
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
