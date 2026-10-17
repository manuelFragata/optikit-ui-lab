/**
 * The shape of a lens or mirror designed here, as rows of the spec sheet:
 * the optic drawn in section; its focal length and Ø (changing them bends
 * or widens the shape); then each surface, as a lens data editor lists them:
 * its radius, then how thick the glass after it is, and which glass. A form
 * to start again from is in a menu. Every edit keeps the part's inputs in
 * step with its prescription (designs.ts).
 */
import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { ScrubNumber } from '../../primitives/ScrubNumber';
import { designChecks, designedValues, designLens, designMirror, focalLength, LENS_FORMS, MIRROR_FORMS, mirrorForm, withDiameter, withFocalLength, type MirrorForm } from '../holders/designs';
import { GLASS_ND, opticShape, type FragmentSurface } from '../holders/optic';
import type { SchematicSymbol } from '../model';
import { OpticProfileSvg } from '../OpticProfile';

export interface ShapeSectionProps {
  symbol: SchematicSymbol & { prescription: FragmentSurface[] };
  onChange: (patch: Partial<SchematicSymbol>) => void;
}

const GLASSES = Object.keys(GLASS_ND);
const radiusOf = (s: FragmentSurface) => (typeof s.geometry?.radius === 'number' ? s.geometry.radius : null);
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

/** A small heading inside the sheet, with an action at its right. */
function Head({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', mt: 1, mb: 0.25 }}>
      <Typography variant="overline" color="text.meta" sx={{ fontSize: 10, lineHeight: 2, flex: 1 }}>
        {children}
      </Typography>
      {action}
    </Stack>
  );
}

export function ShapeSection({ symbol, onChange }: ShapeSectionProps) {
  const [forms, setForms] = useState<HTMLElement | null>(null);
  /** The row the pointer is on (R1, t1…): shown in the picture. */
  const [active, setActive] = useState<string | null>(null);
  const point = (key: string) => ({ onPointerEnter: () => setActive(key), onPointerLeave: () => setActive(null) });
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
  /** A mirror of focal length `to`: R = 2f, concave for f > 0, convex for f < 0, flat at 0. */
  const mirrorAt = (to: number) => designMirror(to === 0 ? 'flat' : to > 0 ? 'concave' : 'convex', 2 * Math.abs(to), diameter, surfaces[0].thickness);

  return (
    <Box>
      <OpticProfileSvg surfaces={surfaces} title={`${symbol.label}, in section`} labels={!mirror} active={active} sx={{ width: '100%', height: mirror ? 64 : 104, display: 'block', mb: 0.5 }} />

      <ScrubNumber
        label="Focal length"
        value={round(f ?? 0, 1)}
        step={1}
        unit="mm"
        hint={mirror ? '0: flat · positive: concave · negative: convex' : 'Bends the lens: every radius scales; a singlet keeps a 2 mm rim'}
        onChange={(to) => (mirror ? reshape(mirrorAt(to)) : to !== 0 && reshape(withFocalLength(surfaces, to)))}
      />
      <ScrubNumber label="Diameter" value={round(diameter, 1)} min={1} max={100} step={0.5} unit="mm" onChange={(d) => d > 0 && reshape(withDiameter(surfaces, d))} />
      {!mirror && shape && (
        <ScrubNumber label="Centre · edge" value={0} text={`${round(shape.centreThicknessMm)} · ${round(shape.edgeThicknessMm)} mm`} hint="How thick the lens is, at its centre and at its rim" />
      )}

      {mirror ? (
        <>
          <Head>Face</Head>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={mirrorForm(surfaces)}
            onChange={(_, form: MirrorForm | null) => form && reshape(designMirror(form, Math.abs(radiusOf(surfaces[0]) ?? 200), diameter, surfaces[0].thickness))}
            aria-label="Mirror form"
            sx={{ mb: 0.5, '& .MuiToggleButton-root': { py: 0.25, textTransform: 'none' } }}
          >
            {MIRROR_FORMS.map((m) => (
              <ToggleButton key={m.form} value={m.form}>
                {m.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {radiusOf(surfaces[0]) !== null && (
            <ScrubNumber
              label="Radius"
              value={Math.abs(radiusOf(surfaces[0])!)}
              min={diameter / 2}
              step={1}
              unit="mm"
              onChange={(r) => reshape(designMirror(mirrorForm(surfaces), Math.max(r, diameter / 2), diameter, surfaces[0].thickness))}
            />
          )}
          <ScrubNumber label="Substrate" value={surfaces[0].thickness ?? 6} min={0.5} step={0.5} unit="mm" onChange={(t) => setSurface(0, { thickness: t })} />
        </>
      ) : (
        <>
          <Head
            action={
              <Button size="small" endIcon={<ArrowDropDownIcon />} onClick={(e) => setForms(e.currentTarget)} sx={{ color: 'text.secondary', py: 0, minWidth: 0, fontSize: 12 }}>
                Start again
              </Button>
            }
          >
            Surfaces
          </Head>
          <Menu anchorEl={forms} open={Boolean(forms)} onClose={() => setForms(null)} slotProps={{ list: { dense: true } }}>
            {LENS_FORMS.map((l) => (
              <MenuItem
                key={l.form}
                onClick={() => {
                  setForms(null);
                  reshape(designLens(l.form, Math.abs(f ?? 50), diameter, surfaces[0].material_post));
                }}
              >
                {l.label}
              </MenuItem>
            ))}
          </Menu>

          {/* As a lens data editor lists them: each radius, then how much of which glass follows it. */}
          {surfaces.map((s, i) => {
            const r = radiusOf(s);
            const last = i === surfaces.length - 1;
            return (
              <Box key={i}>
                <Box {...point(`R${i + 1}`)} sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center' }}>
                  {r === null ? (
                    <ScrubNumber label={`R${i + 1}`} value={0} text="∞ (flat)" hint="A flat surface" />
                  ) : (
                    <ScrubNumber
                      label={`R${i + 1}`}
                      value={r}
                      step={0.1}
                      unit="mm"
                      hint="Radius: + when its centre is after it"
                      onChange={(v) => setSurface(i, { geometry: { radius: v === 0 ? 'inf' : v } })}
                    />
                  )}
                  <Tooltip title={r === null ? 'Curve it' : 'Make it flat'}>
                    <IconButton
                      size="small"
                      aria-pressed={r === null}
                      aria-label={`Surface ${i + 1} flat`}
                      onClick={() => setSurface(i, { geometry: { radius: r === null ? (i === 0 ? 50 : -50) : 'inf' } })}
                    >
                      <AllInclusiveIcon sx={{ fontSize: '0.9rem', color: r === null ? 'primary.main' : 'text.meta' }} />
                    </IconButton>
                  </Tooltip>
                </Box>
                {!last && (
                  <Box {...point(`t${i + 1}`)} sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 104px', alignItems: 'center', columnGap: 0.5, pr: 0.25 }}>
                    <ScrubNumber
                      label={`t${i + 1}`}
                      value={s.thickness ?? 0}
                      min={0.1}
                      step={0.05}
                      unit="mm"
                      hint={`Thickness after R${i + 1}, on the axis, and its glass`}
                      onChange={(t) => setSurface(i, { thickness: t })}
                    />
                    <Select
                      variant="standard"
                      disableUnderline
                      value={s.material_post ?? 'N-BK7'}
                      onChange={(e) => setSurface(i, { material_post: e.target.value })}
                      aria-label={`Glass after surface ${i + 1}`}
                      renderValue={(g) => g}
                      sx={{ fontSize: 12, '& .MuiSelect-select': { py: 0.25, px: 0.75, borderRadius: 0.75 }, '&:hover .MuiSelect-select': { bgcolor: 'action.hover' } }}
                    >
                      {GLASSES.map((g) => (
                        <MenuItem key={g} value={g} dense>
                          {`${g} · n ${GLASS_ND[g].toFixed(3)}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>
                )}
              </Box>
            );
          })}
        </>
      )}

      {checks.map((c) => (
        <Stack key={c.message} direction="row" spacing={1} sx={{ alignItems: 'flex-start', mt: 1 }}>
          {c.severity === 'error' ? <ErrorOutlineIcon sx={{ fontSize: 16 }} color="error" /> : <WarningAmberIcon sx={{ fontSize: 16 }} color="warning" />}
          <Typography variant="caption">{c.message}</Typography>
        </Stack>
      ))}
    </Box>
  );
}
