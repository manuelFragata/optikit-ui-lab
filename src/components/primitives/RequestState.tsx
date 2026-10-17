/**
 * How a view shows a request it waits for (ports/request.ts), the same
 * everywhere:
 *
 * - `Waiting`: rows the shape of what is coming, quietly pulsing; only once
 *   the wait is long enough to notice (`Request.slow`).
 * - `Refreshing`: a hairline bar along the top, while a new answer replaces
 *   the one still shown.
 * - `Failed`: what went wrong, in words, and Try again.
 */
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import type { SxProps, Theme } from '@mui/material/styles';

/** Placeholder rows for an answer on its way. `label` is read out to screen readers. */
export function Waiting({ label, rows = 3, height = 44, sx }: { label: string; rows?: number; height?: number; sx?: SxProps<Theme> }) {
  return (
    <Stack role="status" aria-label={label} aria-busy spacing={1} sx={sx}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} variant="rounded" height={height} sx={{ opacity: 1 - i * 0.22 }} />
      ))}
    </Stack>
  );
}

/** A thin bar at the top of its (positioned) container, while a newer answer is on its way. */
export function Refreshing({ on }: { on: boolean }) {
  if (!on) return null;
  return <LinearProgress aria-label="Updating" sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 1 }} />;
}

/** A request that failed: what went wrong, and a way to ask again. */
export function Failed({ message, onRetry, sx }: { message: string; onRetry?: () => void; sx?: SxProps<Theme> }) {
  return (
    <Box
      role="alert"
      sx={[
        (t) => ({
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
          p: 1.25,
          borderRadius: 1,
          bgcolor: 'error.soft',
          color: 'error.onSoft',
          border: `${t.layout.hairline}px solid`,
          borderColor: 'error.main',
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <ErrorOutlineIcon fontSize="small" sx={{ mt: 0.125 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2">{message}</Typography>
        {onRetry && (
          <Button size="small" color="inherit" onClick={onRetry} sx={{ mt: 0.5, ml: -1, fontWeight: 500 }}>
            Try again
          </Button>
        )}
      </Box>
    </Box>
  );
}
