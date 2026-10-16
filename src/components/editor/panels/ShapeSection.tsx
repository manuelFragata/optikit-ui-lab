/**
 * The inspector's Shape section, for a lens or mirror designed here: the
 * optic drawn as it is, its surfaces to edit (radius, thickness, glass, as a
 * lens data editor does), its diameter, and the focal length that follows,
 * with a way to bend it to another. Every edit keeps the part's inputs in
 * step with its prescription (designs.ts).
 */
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { NumberInput } from '../../primitives/NumberInput';
import { designChecks, designedValues, designLens, designMirror, focalLength, LENS_FORMS, MIRROR_FORMS, mirrorForm, withDiameter, withFocalLength, type MirrorForm } from '../holders/designs';
import { GLASS_ND, opticShape, type FragmentSurface } from '../holders/optic';
import type { SchematicSymbol } from '../model';
import { OpticProfileSvg } from '../OpticProfile';

export interface ShapeSectionProps {
  symbol: SchematicSymbol & { prescription: FragmentSurface[] };
  onChange: (patch: Partial<SchematicSymbol>) => void;
}

const GLASSES = Object.keys(GLASS_ND);
const fmt = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : '–');
const radiusOf = (s: FragmentSurface) => (typeof s.geometry?.radius === 'number' ? s.geometry.radius : null);

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" component="div">
        {label}
      </Typography>
      <Typography variant="mono" component="div">
        {value}
      </Typography>
    </Box>
  );
}

export function ShapeSection({ symbol, onChange }: ShapeSectionProps) {
  const surfaces = symbol.prescription;
  const mirror = symbol.kind === 'mirror';
  const shape = opticShape({ fragmentSurfaces: surfaces });
  const f = focalLength(surfaces);
  const diameter = 2 * Math.max(...surfaces.map((s) => s.semi_aperture ?? 0));
  const checks = designChecks(surfaces);

  /** A new prescription, and the inputs that follow from it. */
  const reshape = (next: FragmentSurface[]) => {
    const values = designedValues(next);
    onChange({ prescription: next, ...(symbol.inputs && { inputs: symbol.inputs.map((i) => (i.label in values ? { ...i, value: values[i.label] } : i)) }) });
  };
  const setSurface = (i: number, patch: Partial<FragmentSurface>) => reshape(surfaces.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  return (
    <Stack spacing={1.5}>
      <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'background.sunken', border: 1, borderColor: 'divider' }}>
        <OpticProfileSvg surfaces={surfaces} title={`${symbol.label}, in section`} sx={{ width: '100%', height: 110, display: 'block' }} />
      </Box>

      <Stack direction="row" spacing={2}>
        <Readout label="Focal length" value={f === null ? '∞ (flat)' : `${fmt(f)} mm`} />
        {!mirror && shape && <Readout label="Centre" value={`${fmt(shape.centreThicknessMm, 2)} mm`} />}
        {!mirror && shape && <Readout label="Edge" value={`${fmt(shape.edgeThicknessMm, 2)} mm`} />}
      </Stack>

      {mirror ? (
        <>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={mirrorForm(surfaces)}
            onChange={(_, form: MirrorForm | null) => form && reshape(designMirror(form, Math.abs(radiusOf(surfaces[0]) ?? 200), diameter, surfaces[0].thickness))}
            aria-label="Mirror form"
          >
            {MIRROR_FORMS.map((m) => (
              <ToggleButton key={m.form} value={m.form}>
                {m.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Stack direction="row" spacing={1}>
            <NumberInput
              label="Radius"
              value={Math.abs(radiusOf(surfaces[0]) ?? 0)}
              disabled={radiusOf(surfaces[0]) === null}
              onChange={(r) => reshape(designMirror(mirrorForm(surfaces), Math.max(r, diameter / 2), diameter, surfaces[0].thickness))}
              min={1}
              step={10}
              precision={1}
              unit="mm"
              size="small"
            />
            <NumberInput label="Substrate" value={surfaces[0].thickness ?? 6} onChange={(t) => setSurface(0, { thickness: t })} min={0.5} step={0.5} precision={1} unit="mm" size="small" />
          </Stack>
        </>
      ) : (
        <>
          <Box>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
              Start again as
            </Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              {LENS_FORMS.map((l) => (
                <Button
                  key={l.form}
                  size="small"
                  variant="outlined"
                  sx={{ textTransform: 'none', py: 0, minWidth: 0 }}
                  onClick={() => reshape(designLens(l.form, Math.abs(f ?? 50), diameter, surfaces[0].material_post))}
                >
                  {l.label}
                </Button>
              ))}
            </Stack>
          </Box>

          {/* The surfaces, as a lens data editor lists them: each radius, then how much of which glass follows it. */}
          <Stack spacing={1}>
            {surfaces.map((s, i) => {
              const r = radiusOf(s);
              const last = i === surfaces.length - 1;
              return (
                <Box key={i}>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <Typography variant="mono" color="text.secondary" sx={{ width: 14, flexShrink: 0 }}>
                      {i + 1}
                    </Typography>
                    {r === null ? (
                      <Typography variant="body2" sx={{ flex: 1, pl: 1.5 }}>
                        Flat (R = ∞)
                      </Typography>
                    ) : (
                      <NumberInput label="Radius" value={r} onChange={(v) => setSurface(i, { geometry: { radius: v === 0 ? 'inf' : v } })} step={1} precision={2} unit="mm" size="small" sx={{ flex: 1 }} />
                    )}
                    <Tooltip title={r === null ? 'Curve it' : 'Make it flat'}>
                      <IconButton size="small" aria-pressed={r === null} aria-label={`Surface ${i + 1} flat`} onClick={() => setSurface(i, { geometry: { radius: r === null ? (i === 0 ? 50 : -50) : 'inf' } })}>
                        <AllInclusiveIcon sx={{ fontSize: '1rem', color: r === null ? 'primary.main' : 'text.meta' }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  {!last && (
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 0.75, pl: 2.5 }}>
                      <NumberInput label="Then" value={s.thickness ?? 0} onChange={(t) => setSurface(i, { thickness: t })} min={0.1} step={0.5} precision={2} unit="mm" size="small" sx={{ width: 104, flexShrink: 0 }} />
                      <Select size="small" value={s.material_post ?? 'N-BK7'} onChange={(e) => setSurface(i, { material_post: e.target.value })} aria-label={`Glass after surface ${i + 1}`} sx={{ flex: 1, typography: 'body2' }}>
                        {GLASSES.map((g) => (
                          <MenuItem key={g} value={g}>
                            {`${g} · n ${GLASS_ND[g].toFixed(3)}`}
                          </MenuItem>
                        ))}
                      </Select>
                    </Stack>
                  )}
                </Box>
              );
            })}
          </Stack>

          <NumberInput
            label="Bend to a focal length"
            value={Math.round((f ?? 50) * 10) / 10}
            onChange={(target) => target !== 0 && reshape(withFocalLength(surfaces, target))}
            step={5}
            precision={1}
            unit="mm"
            size="small"
            helperText="Scales every radius; a singlet gets a 2 mm rim again"
          />
        </>
      )}

      <NumberInput label="Diameter" value={Math.round(diameter * 10) / 10} onChange={(d) => d > 0 && reshape(withDiameter(surfaces, d))} min={1} max={100} step={0.5} precision={1} unit="mm" size="small" />

      {checks.map((c) => (
        <Stack key={c.message} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          {c.severity === 'error' ? <ErrorOutlineIcon fontSize="small" color="error" /> : <WarningAmberIcon fontSize="small" color="warning" />}
          <Typography variant="body2">{c.message}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}
