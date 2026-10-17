/**
 * The close-up's Optical side: one optic as the light sees it. Its surfaces
 * and the coating on each (a catalogue part's are the vendor's; a part
 * designed here takes its own), a surface's reflectance across the spectrum
 * with the design's wavelengths on it, what the optic passes on at each, and
 * what the coatings cost. What needs the real light trace (the beam on each
 * surface, rays through it, power) has its place here, empty until then.
 */
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { focalLength } from '../holders/designs';
import type { CatalogRecord } from '../holders/optic';
import { COATINGS, coating, coatingChecks, surfaceReflectance, throughput, type CoatingId, type SurfaceInfo } from '../../../standins/kernel/coatings';
import { nmColor } from './nmColor';
import { CoatingChart } from './CoatingChart';

export interface OpticsPanelProps {
  record: CatalogRecord;
  infos: SurfaceInfo[];
  /** The wavelengths of the design's sources, nm. */
  wavelengths: number[];
  /** The surface looked at, by index. */
  surface: number;
  onSurface: (index: number) => void;
  onHoverSurface: (index: number | null) => void;
  /** A designed optic's coating changed. Without it, coatings are only read. */
  onCoating?: (index: number, id: CoatingId) => void;
}

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

const ROLE: Record<SurfaceInfo['role'], string> = {
  front: 'Front',
  back: 'Back',
  cemented: 'Cemented',
  mirror: 'Face',
  substrate: 'Back',
};
const pct = (r: number, d = 1) => `${(r * 100).toFixed(d)}%`;

export function OpticsPanel({ record, infos, wavelengths, surface, onSurface, onHoverSurface, onCoating }: OpticsPanelProps) {
  const designed = record.id.startsWith('designed.');
  const mirror = infos.some((s) => s.role === 'mirror');
  const f = focalLength(record.fragmentSurfaces);
  const diameter = 2 * Math.max(...record.fragmentSurfaces.map((s) => s.semi_aperture ?? 0));
  const shown = infos[surface] ?? infos[0];
  const checks = coatingChecks(infos, wavelengths);

  return (
    <Stack
      component="aside"
      aria-label="Optics"
      sx={{
        width: 330,
        flexShrink: 0,
        minHeight: 0,
        bgcolor: 'background.paper',
        borderLeft: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', scrollbarWidth: 'thin' }}>
        <Box sx={{ px: 2, pt: 1.5, pb: 1.5 }}>
          <Typography variant="overline" color="text.secondary" component="div" sx={{ fontSize: 10, lineHeight: 2 }}>
            Optics
          </Typography>
          <Typography variant="subtitle2">{designed ? `Designed here · ${mirror ? 'mirror' : 'lens'}` : (record.vendor?.mpn ?? record.id)}</Typography>
          <Typography variant="caption" color="text.secondary" component="div">
            {[f === null ? 'flat' : `f = ${f.toFixed(1)} mm`, `Ø${diameter.toFixed(1)}`, `${infos.length} surfaces`, !designed && record.vendor?.name].filter(Boolean).join(' · ')}
          </Typography>
        </Box>

        {wavelengths.length > 0 && (
          <Section title="Light">
            <Stack spacing={0.5}>
              {wavelengths.map((nm) => (
                <Stack key={nm} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: nmColor(nm), flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ flex: 1, fontVariantNumeric: 'tabular-nums' }}>{`${nm} nm`}</Typography>
                  <Typography variant="mono">{`${pct(throughput(infos, nm))} ${mirror ? 'back' : 'through'}`}</Typography>
                </Stack>
              ))}
            </Stack>
          </Section>
        )}

        <Section title="Surfaces">
          <Stack spacing={0.5} onMouseLeave={() => onHoverSurface(null)}>
            {infos.map((s) => {
              const picked = s.index === shown.index;
              const editable = Boolean(onCoating && designed && s.coating && s.inLight);
              return (
                <Box
                  key={s.index}
                  onMouseEnter={() => onHoverSurface(s.index)}
                  sx={{
                    borderRadius: 1,
                    border: 1,
                    borderColor: picked ? 'primary.main' : 'divider',
                    bgcolor: picked ? 'primary.soft' : 'transparent',
                  }}
                >
                  <ButtonBase
                    onClick={() => onSurface(s.index)}
                    sx={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      px: 1,
                      pt: 0.75,
                      pb: editable ? 0.25 : 0.75,
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="mono" color="text.secondary" sx={{ width: 16, flexShrink: 0 }}>
                      {s.index + 1}
                    </Typography>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2">{ROLE[s.role]}</Typography>
                      {!editable && (
                        <Typography variant="caption" color="text.secondary" component="div">
                          {s.role === 'cemented' ? `${pct(surfaceReflectance(s, 550), 2)}` : !s.inLight ? '–' : `${coating(s.coating!).label}${s.from === 'assumed' ? ' (assumed)' : ''}`}
                        </Typography>
                      )}
                    </Box>
                  </ButtonBase>
                  {editable && (
                    <Box sx={{ pl: 3.5, pr: 1, pb: 0.75 }}>
                      <Select
                        size="small"
                        fullWidth
                        value={s.coating!}
                        onChange={(e) => {
                          onCoating!(s.index, e.target.value as CoatingId);
                          onSurface(s.index);
                        }}
                        aria-label={`Coating on surface ${s.index + 1}`}
                        sx={{ typography: 'body2' }}
                      >
                        {COATINGS.filter((c) => c.on === (s.role === 'mirror' ? 'mirror' : 'transmit')).map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {c.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Stack>
        </Section>

        {shown.inLight && (
          <Section title={`S${shown.index + 1} · reflectance${shown.coating && coating(shown.coating).approximate ? ' (approx.)' : ''}`}>
            <CoatingChart info={shown} wavelengths={wavelengths} />
          </Section>
        )}

        <Section title="Checks">
          {checks.length ? (
            <Stack spacing={0.75}>
              {checks.map((c) => (
                <Stack
                  key={c.message}
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: 'flex-start',
                    cursor: c.surface === undefined ? 'default' : 'pointer',
                  }}
                  onClick={() => c.surface !== undefined && onSurface(c.surface)}
                >
                  <WarningAmberIcon fontSize="small" color="warning" />
                  <Typography variant="body2">{c.message}</Typography>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <CheckCircleOutlineIcon fontSize="small" color="success" />
              <Typography variant="body2">{wavelengths.length ? 'All good' : 'No wavelength to check'}</Typography>
            </Stack>
          )}
        </Section>

        <Section title="Needs the real trace">
          <Stack direction="row" useFlexGap sx={{ gap: 0.75, flexWrap: 'wrap' }}>
            {['Footprint', 'Rays', 'Power'].map((name) => (
              <Stack key={name} direction="row" spacing={0.5} sx={{ alignItems: 'center', px: 1, py: 0.25, borderRadius: 1, border: 1, borderStyle: 'dashed', borderColor: 'divider' }}>
                <HourglassEmptyIcon sx={{ fontSize: 14, color: 'text.meta' }} />
                <Typography variant="caption" color="text.secondary">
                  {name}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Section>
      </Box>
    </Stack>
  );
}
