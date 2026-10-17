/**
 * The close-up's column for an ideal part: what real part it could be. The
 * catalogue parts of its kind, best first against its specification (snap.ts),
 * each with how it falls short and which holders could put it in a cube; and
 * the modules it could be realized as. Hovering one shows it in the close-up;
 * snapping makes the part that part, and the close-up turns to its holder.
 */
import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import { Failed, Waiting } from '../../primitives/RequestState';
import { TagChip } from '../../primitives/TagChip';
import type { Request } from '../../../ports/request';
import type { SnapCandidate } from '../../../ports/service';
import type { ModuleOption } from '../model';
import { designLens, LENS_FORMS } from '../holders/designs';
import type { FragmentSurface } from '../holders/optic';
import { OpticProfileSvg } from '../OpticProfile';

/** The forms offered for designing an ideal lens: the usual three for a positive one. */
const DESIGN_FORMS = LENS_FORMS.filter((f) => f.form === 'biconvex' || f.form === 'plano-convex' || f.form === 'achromat');

export interface SnapPanelProps {
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
  /** Design it here instead: a real lens of the specification, from a form. Lenses only. */
  onDesign?: (prescription: FragmentSurface[]) => void;
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

export function SnapPanel({ label, spec, candidates, request, shown, onShow, picked, onPick, onSnap, modules, inputs, onRealize, onDesign }: SnapPanelProps) {
  const [all, setAll] = useState(false);
  const listed = all ? candidates : candidates.slice(0, 5);
  const chosen = candidates.find((c) => c.record.id === picked) ?? candidates[0];
  const fits = (o: ModuleOption) => Boolean(o.fixes && Object.entries(o.fixes).every(([k, v]) => inputs[k] === v));

  return (
    <Stack component="aside" aria-label="Real part" sx={{ width: 330, flexShrink: 0, minHeight: 0, bgcolor: 'background.paper', borderLeft: 1, borderColor: 'divider' }}>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', scrollbarWidth: 'thin' }}>
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="overline" color="text.secondary" component="div" sx={{ fontSize: 10, lineHeight: 2 }}>
            Real part
          </Typography>
          <Typography variant="subtitle2">{`For ${label}`}</Typography>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
            {spec || 'No specification'}
          </Typography>
          <TagChip label="Ideal · no part chosen" tone="primary" dot />
        </Box>

        <Section title="From the catalogue" hint={candidates.length ? 'Nearest the specification first. Hover one to see it.' : undefined}>
          {request?.status === 'error' ? (
            <Failed message={request.error ?? ''} onRetry={request.retry} />
          ) : request?.status === 'loading' ? (
            request.slow && <Waiting label="Getting the catalogue parts" rows={3} height={56} />
          ) : candidates.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              The catalogue has no part of this kind. Realize it as a module below.
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

        {onDesign && inputs['Focal length'] !== undefined && (
          <Section title="Or design it here" hint={`A real lens of f = ${inputs['Focal length']} mm, Ø${inputs.Diameter ?? 25.4} mm; then shape every radius and glass.`}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.75 }}>
              {DESIGN_FORMS.map((form) => {
                const prescription = designLens(form.form, inputs['Focal length'], inputs.Diameter ?? 25.4);
                return (
                  <ButtonBase
                    key={form.form}
                    onClick={() => onDesign(prescription)}
                    sx={(t) => ({ display: 'flex', flexDirection: 'column', p: 0.75, borderRadius: 1, border: `${t.layout.hairline}px solid ${(t.vars ?? t).palette.divider}`, '&:hover': { borderColor: 'primary.main' } })}
                  >
                    <OpticProfileSvg surfaces={prescription} sx={{ width: '100%', height: 40 }} />
                    <Typography variant="caption">{form.label}</Typography>
                  </ButtonBase>
                );
              })}
            </Box>
          </Section>
        )}

        <Section title="Or an existing module" hint="It comes in its own cube, ready to build.">
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
                      {o.fixes ? (fits(o) ? 'As specified' : `Fixes ${Object.entries(o.fixes).map(([k, v]) => `${k.toLowerCase()} ${v}`).join(', ')}`) : o.source}
                    </Typography>
                  </Box>
                  <Button size="small" variant="outlined" startIcon={<ViewInArOutlinedIcon fontSize="small" />} onClick={() => onRealize(o)}>
                    Realize
                  </Button>
                </Stack>
              ))}
            </Stack>
          )}
        </Section>
      </Box>

      <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Button fullWidth variant="contained" startIcon={<TravelExploreIcon fontSize="small" />} disabled={!chosen} onClick={() => chosen && onSnap(chosen)}>
          {chosen ? `Snap to ${chosen.record.vendor?.mpn ?? chosen.record.id}` : 'Snap to a part'}
        </Button>
      </Box>
    </Stack>
  );
}
