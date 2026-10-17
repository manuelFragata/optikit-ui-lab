/**
 * The close-up's holder designer: for a part with no holder (or a frozen
 * one), which road holds it, the road's parameters, and a dry run that
 * checks as you go. As optikit-v2's "Put … in a cube" wizard (HolderWizard),
 * in one panel beside the part, with the checks its wizard does not show yet
 * (will it build, will the light get through). Freezing keeps the generator
 * and its parameters on the part, ready for `POST /v1/generate`.
 */
import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { PillSwitch } from '../../primitives/PillSwitch';
import { SliderField } from '../../primitives/SliderField';
import { TagChip } from '../../primitives/TagChip';
import type { BeamAxis, CartridgeParams, CartridgePlan, HolderCheck as Check, Road } from '../../../ports/holders';
import type { CatalogRecord, OpticFacts } from '../holders/optic';

/** What is being designed: the road, its parameters, and the beam the checks assume. */
export interface HolderDraft {
  road: string;
  params: CartridgeParams;
  /** The beam's Ø at the optic, for the checks (not a generator input). */
  beamMm: number;
}

/** The road the lab can preview and freeze. */
export const PREVIEWED_ROAD = 'lens_cartridge_v4';

export interface HolderDesignerProps {
  /** The catalogue part it is for. */
  partName: string;
  record?: CatalogRecord;
  facts: OpticFacts;
  roads: Road[];
  draft: HolderDraft;
  onDraft: (draft: HolderDraft) => void;
  plan: CartridgePlan | null;
  /** Frozen already: the draft is the saved holder, or a change to it. */
  frozen: boolean;
  changed: boolean;
  onFreeze: () => void;
}

const AXES: { value: BeamAxis; label: string }[] = [
  { value: '+x', label: '+x' },
  { value: '-x', label: '−x' },
  { value: '+y', label: '+y' },
  { value: '-y', label: '−y' },
];

const SEVERITY_ICON: Record<Check['severity'], ReactNode> = {
  error: <ErrorOutlineIcon fontSize="small" color="error" />,
  warning: <WarningAmberIcon fontSize="small" color="warning" />,
  info: <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />,
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider' }}>
      <Typography variant="overline" color="text.secondary" component="div" sx={{ fontSize: 10, lineHeight: 2, mb: 0.5 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

const mono = { fontFamily: 'var(--mui-font-mono, ui-monospace, monospace)', fontSize: 11 } as const;

export function HolderDesigner({ partName, record, facts, roads, draft, onDraft, plan, frozen, changed, onFreeze }: HolderDesignerProps) {
  const [refusedOpen, setRefusedOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const open = roads.filter((r) => !r.refusal);
  const refused = roads.filter((r) => r.refusal);
  const road = roads.find((r) => r.spec.script === draft.road);
  const p = draft.params;
  const set = (patch: Partial<CartridgeParams>) => onDraft({ ...draft, params: { ...p, ...patch } });
  const at = (patch: Partial<CartridgeParams['part_position_mm']>) => set({ part_position_mm: { ...p.part_position_mm, ...patch } });
  const lensMm = facts.acrossMm;
  const ca = p.clear_aperture_mm ?? Math.round(0.9 * lensMm * 10) / 10;

  const status = !plan ? null : !plan.fits ? (
    <TagChip label="Won't build" tone="error" dot />
  ) : frozen && !changed ? (
    <TagChip label="Mounted in it" tone="success" dot />
  ) : frozen ? (
    <TagChip label="Changed" tone="warning" dot />
  ) : (
    <TagChip label="Fits · not mounted yet" tone="success" dot />
  );

  const copyParams = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ generator: `generators/${draft.road}.py`, params: p }, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // No clipboard (an insecure page, a denied permission): nothing to do.
    }
  };

  return (
    <Stack
      component="aside"
      aria-label="Holder"
      sx={{ width: 330, flexShrink: 0, minHeight: 0, bgcolor: 'background.paper', borderLeft: 1, borderColor: 'divider' }}
    >
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', scrollbarWidth: 'thin' }}>
        <Box sx={{ px: 2, pt: 1.5, pb: 1.5 }}>
          <Typography variant="overline" color="text.secondary" component="div" sx={{ fontSize: 10, lineHeight: 2 }}>
            Holder
          </Typography>
          <Typography variant="subtitle2">{`For ${partName}`}</Typography>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
            {record
              ? `${record.vendor?.name ?? (record.id.startsWith('designed.') ? 'Designed here' : 'Catalogue')} · ${facts.rectangular ? 'plate' : `Ø${facts.acrossMm.toFixed(1)}`} · ${facts.thicknessMm.toFixed(1)} mm thick · ${facts.curved ? 'curved' : 'flat'}`
              : 'Not in the catalogue: only its inputs are known, and no prescription.'}
          </Typography>
          {status}
        </Box>

        <Section title="How it is held">
          {open.length ? (
            <RadioGroup value={draft.road} onChange={(_, road) => onDraft({ ...draft, road })}>
              {open.map((r) => (
                <Box key={r.spec.script} sx={{ mb: 0.5 }}>
                  <FormControlLabel value={r.spec.script} control={<Radio size="small" />} label={<Typography variant="body2" sx={{ textTransform: 'none' }}>{r.spec.holds.label.replace(/^./, (c) => c.toUpperCase())}</Typography>} />
                  {r.spec.script === draft.road && (
                    <Typography variant="caption" color="text.secondary" component="div" sx={{ pl: 3.75, mt: -0.5 }}>
                      {r.spec.holds.hint}
                    </Typography>
                  )}
                </Box>
              ))}
            </RadioGroup>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No road holds this part yet. The reasons are below.
            </Typography>
          )}
          {refused.length > 0 && (
            <>
              <Button size="small" onClick={() => setRefusedOpen(!refusedOpen)} startIcon={refusedOpen ? <ExpandMoreIcon /> : <ChevronRightIcon />} sx={{ mt: 0.5, color: 'text.secondary', textTransform: 'none' }}>
                {`${refused.length} roads can't hold it`}
              </Button>
              <Collapse in={refusedOpen}>
                <Stack spacing={0.75} sx={{ pl: 1, pt: 0.5 }}>
                  {refused.map((r) => (
                    <Box key={r.spec.script}>
                      <Typography variant="caption" component="div" sx={{ fontWeight: 500 }}>
                        {r.spec.holds.label.replace(/^./, (c) => c.toUpperCase())}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" component="div">
                        {r.refusal}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Collapse>
            </>
          )}
        </Section>

        {road && draft.road !== PREVIEWED_ROAD && (
          <Section title="Preview">
            <Typography variant="body2" color="text.secondary">
              No live preview for this holder yet. It is built with <Box component="span" sx={mono}>{road.spec.script}</Box> when the design is exported.
            </Typography>
          </Section>
        )}

        {draft.road === PREVIEWED_ROAD && plan && (
          <>
            <Section title="Where the lens sits">
              <Stack spacing={1.25}>
                <Box>
                  <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
                    The beam runs along
                  </Typography>
                  <PillSwitch aria-label="Beam axis" value={p.beam_axis} options={AXES} onChange={(beam_axis) => set({ beam_axis })} />
                </Box>
                <SliderField label="Along the beam, from the cube centre" value={p.part_position_mm.z} onChange={(z) => at({ z })} min={-20} max={20} step={0.1} precision={1} unit="mm" />
                <FormControlLabel
                  control={<Switch size="small" checked={p.snap_to_notch} onChange={(_, snap_to_notch) => set({ snap_to_notch })} />}
                  label={<Typography variant="body2">{`Snap to the notch grid · joint at ${plan.joint_mm >= 0 ? '+' : ''}${plan.joint_mm.toFixed(p.snap_to_notch ? 0 : 1)} mm`}</Typography>}
                />
                <SliderField label="Sideways, off the beam" value={p.part_position_mm.x} onChange={(x) => at({ x })} min={-10} max={10} step={0.1} precision={1} unit="mm" />
                <SliderField label="Up, off the beam" value={p.part_position_mm.y} onChange={(y) => at({ y })} min={-10} max={10} step={0.1} precision={1} unit="mm" />
                <SliderField label="Tilt about the up axis" value={p.part_rotation_deg.y} onChange={(y) => set({ part_rotation_deg: { ...p.part_rotation_deg, y } })} min={-60} max={60} step={0.5} precision={1} unit="°" />
              </Stack>
            </Section>

            <Section title="The cartridge">
              <Stack spacing={1.25}>
                <SliderField label="Clear aperture Ø" value={ca} onChange={(clear_aperture_mm) => set({ clear_aperture_mm })} min={1} max={Math.round(lensMm * 10) / 10} step={0.1} precision={1} unit="mm" />
                <SliderField label="Fit clearance around the glass" value={p.fit_clearance_mm} onChange={(fit_clearance_mm) => set({ fit_clearance_mm })} min={0} max={0.5} step={0.05} precision={2} unit="mm" />
                <SliderField label="Alignment pins" value={p.alignment_pins} onChange={(alignment_pins) => set({ alignment_pins: Math.round(alignment_pins) })} min={0} max={4} step={1} precision={0} />
                <FormControlLabel control={<Switch size="small" checked={p.include_master_inserts} onChange={(_, include_master_inserts) => set({ include_master_inserts })} />} label={<Typography variant="body2">Include the molded master inserts</Typography>} />
                <SliderField label="Beam Ø at the lens, for the checks" value={draft.beamMm} onChange={(beamMm) => onDraft({ ...draft, beamMm })} min={1} max={30} step={0.5} precision={1} unit="mm" />
              </Stack>
            </Section>

            <Section title="Checks">
              <Stack spacing={0.75}>
                {[...plan.checks].sort((a, b) => ['error', 'warning', 'info'].indexOf(a.severity) - ['error', 'warning', 'info'].indexOf(b.severity)).map((c, i) => (
                  <Stack key={`${c.code}-${i}`} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                    <Box sx={{ pt: 0.25 }}>{SEVERITY_ICON[c.severity]}</Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2">{c.message}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={mono}>
                        {c.code}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
                <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                  <Box sx={{ pt: 0.25 }}>{plan.fits_envelope ? <CheckCircleOutlineIcon fontSize="small" color="success" /> : <ErrorOutlineIcon fontSize="small" color="error" />}</Box>
                  <Typography variant="body2">{`${plan.bbox_mm.size.map((n) => n.toFixed(1)).join(' × ')} mm: ${plan.fits_envelope ? 'fits its cell' : 'does not fit one cell'}`}</Typography>
                </Stack>
              </Stack>
            </Section>

            <Section title="Parameters">
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
                As <Box component="span" sx={mono}>lens_cartridge_v4</Box> takes them: the same for <Box component="span" sx={mono}>POST /v1/generate</Box>. The preview here is drawn from these numbers; the service cuts the real parts.
              </Typography>
              <Button size="small" variant="outlined" startIcon={<ContentCopyIcon fontSize="small" />} onClick={copyParams}>
                {copied ? 'Copied' : 'Copy the parameters'}
              </Button>
            </Section>
          </>
        )}
      </Box>

      <Stack direction="row" spacing={1} sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Tooltip title={!plan ? 'Pick the lens cartridge to freeze it here' : !plan.fits ? 'Fix the errors in the checks first' : frozen && !changed ? 'This is the frozen holder' : 'Keep this holder on the part: it goes into its cube'}>
          <span style={{ flex: 1, display: 'flex' }}>
            <Button fullWidth variant="contained" startIcon={<AcUnitIcon fontSize="small" />} disabled={!plan?.fits || (frozen && !changed)} onClick={onFreeze}>
              {frozen ? 'Update the holder' : 'Mount it in this holder'}
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="Needs the optikit service: POST /v1/generate cuts STEP, STL and GLB">
          <span>
            <Button variant="outlined" disabled startIcon={<DownloadIcon fontSize="small" />}>
              Parts
            </Button>
          </span>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
