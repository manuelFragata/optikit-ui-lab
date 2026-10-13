import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';

/** Opens the command palette; sits next to the 2D/3D switch. */
export function SearchButton({ onClick }: { onClick: () => void }) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-label="Search commands and parts"
      sx={(t) => ({
        height: 40,
        gap: 1,
        pl: 1.25,
        pr: 1,
        borderRadius: `${t.radius.tile}px`,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: t.shadows[1],
        color: 'text.secondary',
        '&:hover': { color: 'text.primary' },
      })}
    >
      <SearchIcon fontSize="small" />
      <Typography variant="body2">Search</Typography>
      <Typography variant="mono" sx={{ ml: 2, px: 0.75, borderRadius: 0.75, bgcolor: 'action.hover', fontSize: 11 }}>
        Ctrl K
      </Typography>
    </ButtonBase>
  );
}
