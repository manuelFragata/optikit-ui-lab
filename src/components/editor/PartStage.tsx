/**
 * Where a part is on its way from the sketch to the bench, the same
 * everywhere (the inspector, the close-up, Choose parts): the three steps
 * (model.ts STEPS), the current one marked, and where its optic or its
 * cube comes from.
 */
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import { ORIGINS, STEPS, stageOf, type SchematicSymbol } from './model';

/** The colour each step is shown in: the sketch's blue, the warning's amber (not buildable yet), the success green. */
export const STEP_TONE = { ideal: 'primary', real: 'warning', mounted: 'success' } as const;

export function PartStage({ part, dense = false }: { part: Pick<SchematicSymbol, 'placement' | 'prescription'>; dense?: boolean }) {
  const { step, origin } = stageOf(part);
  const at = STEPS.findIndex((s) => s.step === step);
  const tone = STEP_TONE[step];
  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center' }} role="list" aria-label="Steps of the part">
        {STEPS.map((s, i) => {
          const done = i < at;
          const now = i === at;
          return (
            <Stack key={s.step} direction="row" sx={{ alignItems: 'center', flex: i < STEPS.length - 1 ? '1 1 auto' : 'none', minWidth: 0 }} role="listitem" aria-current={now ? 'step' : undefined}>
              <Tooltip title={s.what}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 18,
                      height: 18,
                      flexShrink: 0,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                      border: 1.5,
                      borderColor: now ? `${tone}.main` : done ? 'text.secondary' : 'divider',
                      bgcolor: now ? `${tone}.main` : 'transparent',
                      color: now ? `${tone}.contrastText` : 'text.secondary',
                    }}
                  >
                    {done ? <CheckIcon sx={{ fontSize: 12 }} /> : i + 1}
                  </Box>
                  <Typography variant="caption" noWrap sx={{ fontWeight: now ? 600 : 400, color: now ? 'text.primary' : 'text.secondary' }}>
                    {s.label}
                  </Typography>
                </Stack>
              </Tooltip>
              {i < STEPS.length - 1 && <Box sx={{ flex: 1, minWidth: 8, height: 1.5, mx: 0.75, bgcolor: done ? 'text.secondary' : 'divider' }} />}
            </Stack>
          );
        })}
      </Stack>
      {!dense && (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
          {origin ? `${ORIGINS[origin]}. ` : ''}
          {STEPS[at].what}
        </Typography>
      )}
    </Box>
  );
}

/** The three steps as dots, for a header: the current one filled in its colour, the ones done checked; the words in the tooltip. */
export function StepDots({ part }: { part: Pick<SchematicSymbol, 'placement' | 'prescription'> }) {
  const { step, origin } = stageOf(part);
  const at = STEPS.findIndex((s) => s.step === step);
  const tone = STEP_TONE[step];
  return (
    <Tooltip
      placement="top-end"
      enterDelay={500}
      disableInteractive
      title={
        <Box sx={{ py: 0.25 }}>
          {STEPS.map((s, i) => (
            <Box key={s.step} sx={{ fontWeight: i === at ? 600 : 400, opacity: i === at ? 1 : 0.75 }}>
              {`${i + 1} ${s.label}${i === at && origin ? ` · ${ORIGINS[origin].toLowerCase()}` : ''}`}
            </Box>
          ))}
          <Box sx={{ mt: 0.5 }}>{STEPS[at].what}</Box>
        </Box>
      }
    >
      <Stack direction="row" sx={{ alignItems: 'center' }} aria-label={`Step ${at + 1} of 3: ${STEPS[at].label}`} role="img">
        {STEPS.map((s, i) => (
          <Stack key={s.step} direction="row" sx={{ alignItems: 'center' }}>
            {i > 0 && <Box sx={{ width: 10, height: 1.5, bgcolor: i <= at ? 'text.secondary' : 'divider' }} />}
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                border: 1.5,
                borderColor: i === at ? `${tone}.main` : i < at ? 'text.secondary' : 'divider',
                bgcolor: i === at ? `${tone}.main` : i < at ? 'text.secondary' : 'transparent',
              }}
            />
          </Stack>
        ))}
      </Stack>
    </Tooltip>
  );
}
