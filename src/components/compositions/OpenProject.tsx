import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';

export interface OpenProjectProps {
  name: string;
  version: string;
  /** Go back to the project in the editor. */
  onShow?: () => void;
  /** Close the project; its tabs go away until another one is opened. */
  onClose?: () => void;
}

/**
 * The project being worked on, in the header: labelled as such, so it never
 * reads as the page's title. Clicking it returns to the project in the
 * editor; the cross closes it.
 */
export function OpenProject({ name, version, onShow, onClose }: OpenProjectProps) {
  return (
    <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center', minWidth: 0 }}>
      <ButtonBase
        onClick={onShow}
        aria-label={`Working on ${name}. Show it in the editor`}
        sx={{ flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, px: 1, py: 0.25, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
      >
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          {/* A live dot: this project is open. */}
          <Box aria-hidden sx={(t) => ({ width: 6, height: 6, borderRadius: '50%', bgcolor: (t.vars ?? t).palette.brand.lime })} />
          <Typography variant="meta" color="text.meta" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10, lineHeight: 1.4 }}>
            Working on
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', minWidth: 0, maxWidth: 360 }}>
          <Typography variant="subtitle2" noWrap>
            {name}
          </Typography>
          <Typography variant="mono" color="text.meta" sx={{ flexShrink: 0 }}>
            v{version}
          </Typography>
        </Stack>
      </ButtonBase>
      {onClose && (
        <Tooltip title="Close project">
          <IconButton size="small" aria-label={`Close ${name}`} onClick={onClose}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
}
