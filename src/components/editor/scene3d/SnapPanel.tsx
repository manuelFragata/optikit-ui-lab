/**
 * The close-up's column for an ideal part: make it real, one of two ways,
 * chosen at the top:
 * - from the catalogue: the parts of its kind, best first against its
 *   numbers (snap.ts), each with how it falls short and which holders could
 *   put it in a cube. Hovering one shows it in the close-up;
 * - design my own: a lens or a mirror of its f and Ø, from a form; then
 *   every radius, the glass and the Ø are set in Properties (Shape).
 * Below, a ready module skips to the last step.
 */
import { useEffect, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ArchitectureIcon from '@mui/icons-material/Architecture';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import { Failed, Waiting } from '../../primitives/RequestState';
import type { Request } from '../../../ports/request';
import type { SnapCandidate } from '../../../ports/service';
import type { ModuleOption, SchematicSymbol, SymbolKind } from '../model';
import { PartStage } from '../PartStage';
import { designLens, designMirror, LENS_FORMS, MIRROR_FORMS } from '../holders/designs';
import type { FragmentSurface } from '../holders/optic';
import { OpticProfileSvg } from '../OpticProfile';

/** How a part is made real here. */
export type MakeReal = 'catalogue' | 'design';

const ONE_INCH = 25.4;

/** The forms offered for designing a part of these numbers: a lens of its sign, a mirror of its curve (and a flat one). */
function designForms(kind: SymbolKind, inputs: Readonly<Record<string, number>>): { label: string; prescription: FragmentSurface[] }[] {
  const f = inputs['Focal length'];
  const d = inputs.Diameter ?? ONE_INCH;
  if (kind === 'lens' && f) {
    const forms = f > 0 ? ['biconvex', 'plano-convex', 'achromat'] : ['biconcave', 'plano-concave'];
    return LENS_FORMS.filter((x) => forms.includes(x.form)).map((x) => ({ label: x.label, prescription: designLens(x.form, f, d) }));
  }
  if (kind === 'mirror') {
    // A mirror of focal length f has R = 2f: concave for f > 0, convex for f < 0.
    const curve = f ? (f > 0 ? 'concave' : 'convex') : null;
    return MIRROR_FORMS.filter((x) => x.form === 'flat' || x.form === curve).map((x) => ({ label: x.label, prescription: designMirror(x.form, 2 * Math.abs(f ?? 0), d) }));
  }
  return [];
}

export interface SnapPanelProps {
  part: Pick<SchematicSymbol, 'kind' | 'placement' | 'prescription'>;
  label: string;
  /** The specification, in a line. */
  spec: string;
  candidates: SnapCandidate[];
  /** Where the service's answer is: the list waits for it, or says it failed. */
  request?: Pick<Request<unknown>, 'status' | 'slow' | 'error' | 'retry'>;
  /** The candidate shown in the close-up (hovered, else picked), by record id. */
  shown: string | null;
  onShow: (recordId: string | null) => void;
  picked: string | null;
  onPick: (recordId: string) => void;
  onSnap: (candidate: SnapCandidate) => void;
  /** Modules it could be realized as, and the inputs it has (for which fit as they are). */
  modules: ModuleOption[];
  inputs: Readonly<Record<string, number>>;
  onRealize: (option: ModuleOption) => void;
  /** Design it here instead: a real lens or mirror of the specification, from a form. */
  onDesign?: (prescription: FragmentSurface[]) => void;
  /** The way shown first. */
  start?: MakeReal;
  /** The way chosen, and the designed form the pointer is on (`null`: none): for the close-up to show. */
  onWay?: (way: MakeReal) => void;
  onShowDesign?: (prescription: FragmentSurface[] | null) => void;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider' }}>
      <Typography variant="overline" color="text.secondary" component="div" sx={{ fontSize: 10, lineHeight: 2 }}>
        {title}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
          {hint}
        </Typography>
      )}
      {children}
    </Box>
  );
}

const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

export function SnapPanel({ part, label, spec, candidates, request, shown, onShow, picked, onPick, onSnap, modules, inputs, onRealize, onDesign, start = 'catalogue', onWay, onShowDesign }: SnapPanelProps) {
  const [all, setAll] = useState(false);
  const [way, choose] = useState<MakeReal>(start);
  const setWay = (w: MakeReal) => {
    choose(w);
    onWay?.(w);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only when asked anew
  useEffect(() => setWay(start), [start]);
  const forms = designForms(part.kind, inputs);
  const listed = all ? candidates : candidates.slice(0, 5);
  const chosen = candidates.find((c) => c.record.id === picked) ?? candidates[0];
  const fits = (o: ModuleOption) => Boolean(o.fixes && Object.entries(o.fixes).every(([k, v]) => inputs[k] === v));

  return (
    <Stack component="aside" aria-label="Real part" sx={{ width: 330, flexShrink: 0, minHeight: 0, bgcolor: 'background.paper', borderLeft: 1, borderColor: 'divider' }}>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', scrollbarWidth: 'thin' }}>
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="overline" color="text.secondary" component="div" sx={{ fontSize: 10, lineHeight: 2 }}>
            Make it real
          </Typography>
          <Typography variant="subtitle2">{label}</Typography>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1.25 }}>
            {spec ? `Ideal: ${spec}` : 'Ideal, no numbers set'}
          </Typography>
          <PartStage part={part} dense />
          <ToggleButtonGroup exclusive fullWidth size="small" value={way} onChange={(_, v: MakeReal | null) => v && setWay(v)} aria-label="How to make it real" sx={{ mt: 1.5 }}>
            <ToggleButton value="catalogue" sx={{ gap: 0.75, textTransform: 'none' }}>
              <TravelExploreIcon sx={{ fontSize: '1rem' }} />
              From the catalogue
            </ToggleButton>
            <ToggleButton value="design" sx={{ gap: 0.75, textTransform: 'none' }}>
              <ArchitectureIcon sx={{ fontSize: '1rem' }} />
              Design my own
            </ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
            {way === 'catalogue'
              ? 'A part that exists, from a vendor. Its real values replace the ideal ones.'
              : 'Your own glass. Start from a form at these numbers, then set every radius, the glass and the Ø in Properties.'}
          </Typography>
        </Box>

        {way === 'catalogue' && (
          <Section title="From the catalogue" hint={candidates.length ? 'Nearest the ideal numbers first. Hover one to see it.' : undefined}>
            {request?.status === 'error' ? (
              <Failed message={request.error ?? ''} onRetry={request.retry} />
            ) : request?.status === 'loading' ? (
              request.slow && <Waiting label="Getting the catalogue parts" rows={3} height={56} />
            ) : candidates.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                The catalogue has no part of this kind. Use a ready module below.
              </Typography>
            ) : (
              <Stack spacing={0.75} onPointerLeave={() => onShow(null)}>
                {listed.map((c) => {
                  const id = c.record.id;
                  const isPicked = chosen?.record.id === id;
                  return (
                    <ButtonBase
                      key={id}
                      onPointerEnter={() => onShow(id)}
                      onClick={() => onPick(id)}
                      aria-pressed={isPicked}
                      sx={(t) => ({
                        display: 'block',
                        textAlign: 'left',
                        p: 1,
                        borderRadius: 1,
                        border: `${t.layout.hairline}px solid`,
                        borderColor: isPicked ? 'primary.main' : shown === id ? 'text.secondary' : 'divider',
                        bgcolor: isPicked ? 'primary.soft' : 'transparent',
                      })}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }} noWrap>
                          {c.record.vendor?.mpn ?? c.record.id}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {[c.eflMm !== undefined && `f = ${fmt(c.eflMm)} mm`, `Ø${fmt(c.diameterMm)}`].filter(Boolean).join(' · ')}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary" component="div">
                        {c.record.vendor?.name}
                        {c.record.fragmentSurfaces.length === 3 ? ' · achromatic doublet' : c.record.fragmentSurfaces.length === 2 && c.eflMm ? ' · singlet' : ''}
                      </Typography>
                      {c.matches ? (
                        <Typography variant="caption" color="success.main" component="div">
                          As specified
                        </Typography>
                      ) : (
                        c.notes.map((n) => (
                          <Typography key={n} variant="caption" color="warning.main" component="div">
                            {n}
                          </Typography>
                        ))
                      )}
                      <Typography variant="caption" color={c.holders.length ? 'text.secondary' : 'error.main'} component="div">
                        {c.holders.length ? `Cube holders: ${c.holders.join(', ')}` : 'No cube holder takes it'}
                      </Typography>
                    </ButtonBase>
                  );
                })}
                {candidates.length > 5 && (
                  <Button size="small" onClick={() => setAll(!all)} sx={{ alignSelf: 'flex-start', color: 'text.secondary' }}>
                    {all ? 'Fewer' : `All ${candidates.length}`}
                  </Button>
                )}
              </Stack>
            )}
          </Section>
        )}

        {way === 'design' && (
          <Section title="Design my own" hint={forms.length ? `Pick a form. It is made at ${spec || 'these numbers'}.` : undefined}>
            {!onDesign || forms.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {part.kind === 'lens' ? 'Set a focal length first.' : 'Only lenses and mirrors can be designed here. Choose this part from the catalogue, or use a ready module.'}
              </Typography>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.75 }}>
                {forms.map((form) => (
                  <ButtonBase
                    key={form.label}
                    onClick={() => onDesign(form.prescription)}
                    onPointerEnter={() => onShowDesign?.(form.prescription)}
                    onPointerLeave={() => onShowDesign?.(null)}
                    sx={(t) => ({
                      display: 'flex',
                      flexDirection: 'column',
                      p: 0.75,
                      borderRadius: 1,
                      border: `${t.layout.hairline}px solid ${(t.vars ?? t).palette.divider}`,
                      '&:hover': { borderColor: 'primary.main' },
                    })}
                  >
                    <OpticProfileSvg surfaces={form.prescription} sx={{ width: '100%', height: 40 }} />
                    <Typography variant="caption">{form.label}</Typography>
                  </ButtonBase>
                ))}
              </Box>
            )}
          </Section>
        )}

        <Section title="Or skip to a ready module" hint="A library module that holds such a part, in its own cube: mounted at once.">
          {modules.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No module of this kind.
            </Typography>
          ) : (
            <Stack spacing={0.75}>
              {modules.map((o) => (
                <Stack key={o.module} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {o.module}
                    </Typography>
                    <Typography variant="caption" color={o.fixes && !fits(o) ? 'warning.main' : 'text.secondary'} component="div">
                      {o.fixes
                        ? fits(o)
                          ? 'As specified'
                          : `Fixes ${Object.entries(o.fixes)
                              .map(([k, v]) => `${k.toLowerCase()} ${v}`)
                              .join(', ')}`
                        : o.source}
                    </Typography>
                  </Box>
                  <Button size="small" variant="outlined" startIcon={<ViewInArOutlinedIcon fontSize="small" />} onClick={() => onRealize(o)}>
                    Use
                  </Button>
                </Stack>
              ))}
            </Stack>
          )}
        </Section>
      </Box>

      {way === 'catalogue' && (
        <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Button fullWidth variant="contained" startIcon={<TravelExploreIcon fontSize="small" />} disabled={!chosen} onClick={() => chosen && onSnap(chosen)}>
            {chosen ? `Use ${chosen.record.vendor?.mpn ?? chosen.record.id}` : 'Use a part'}
          </Button>
        </Box>
      )}
    </Stack>
  );
}
