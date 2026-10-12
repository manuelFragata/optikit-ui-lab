import Box from '@mui/material/Box';
import NorthEastIcon from '@mui/icons-material/NorthEast';

/**
 * The round ↗ in a tile's corner. It turns when its tile is hovered: give the
 * tile `'&:hover .corner-arrow': { transform: 'rotate(45deg)' }`.
 */
export function CornerArrow({ inverted }: { inverted?: boolean }) {
  return (
    <Box
      aria-hidden
      className="corner-arrow"
      sx={(t) => ({
        position: 'absolute',
        top: t.spacing(1.5),
        right: t.spacing(1.5),
        display: 'grid',
        placeItems: 'center',
        width: t.spacing(5),
        height: t.spacing(5),
        borderRadius: '50%',
        bgcolor: inverted ? 'text.primary' : 'background.paper',
        color: inverted ? 'background.paper' : 'text.primary',
        transition: t.transitions.create('transform', { duration: t.transitions.duration.shorter }),
      })}
    >
      <NorthEastIcon fontSize="small" />
    </Box>
  );
}
