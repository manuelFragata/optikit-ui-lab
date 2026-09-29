import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { BrandMark } from '../primitives/BrandMark';

/** `light`: Bench surface bar with a hairline. `navy`: solid brand-anchor bar. */
export type HeaderVariant = 'navy' | 'light';

export interface AppHeaderProps {
  variant?: HeaderVariant;
  title?: string;
  projectName?: string;
  /** Shown after the project name, e.g. "0.4.2". */
  version?: string;
  /** When given, the project name opens a menu with these actions. */
  projectMenu?: { id: string; label: string; onSelect?: () => void }[];
  /** Makes the brand mark a link back to the home page. */
  onHome?: () => void;
  /** Right-hand actions. Icon buttons should use `color="inherit"`. */
  actions?: ReactNode;
}

/** Top application bar, either a solid navy bar or a light surface bar. */
export function AppHeader({ variant = 'light', title = 'Optikit', projectName, version, projectMenu, onHome, actions }: AppHeaderProps) {
  const navy = variant === 'navy';
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  return (
    <Box
      component="header"
      sx={{
        flexShrink: 0,
        bgcolor: navy ? 'header.main' : 'background.paper',
        color: navy ? 'header.contrastText' : 'text.primary',
        borderBottom: navy ? 0 : 1,
        borderColor: 'divider',
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: 'center',
          height: (theme) => theme.spacing(theme.layout.headerHeight),
          px: 2,
        }}
      >
        <BrandMark product={title} onClick={onHome} colored={!navy} />
        {projectName && (
          <>
            <Divider orientation="vertical" flexItem sx={{ borderColor: 'currentColor', opacity: 0.3, my: 2 }} />
            {projectMenu ? (
              <ButtonBase
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                aria-haspopup="menu"
                aria-label={`Project: ${projectName}`}
                sx={{ gap: 0.5, borderRadius: 1, px: 0.75, py: 0.5, mx: -0.75, '&:hover': { bgcolor: 'action.hover' } }}
              >
                <Typography variant="subtitle1" component="span" noWrap>
                  {projectName}
                </Typography>
                <ExpandMoreIcon fontSize="small" sx={{ opacity: 0.7 }} />
              </ButtonBase>
            ) : (
              <Typography variant="subtitle1" component="span" noWrap>
                {projectName}
              </Typography>
            )}
            {version && (
              <Typography variant="mono" component="span" sx={{ opacity: 0.75 }}>
                v{version}
              </Typography>
            )}
            {projectMenu && (
              <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
                {projectMenu.map((item) => (
                  <MenuItem
                    key={item.id}
                    onClick={() => {
                      setMenuAnchor(null);
                      item.onSelect?.();
                    }}
                  >
                    <ListItemText>{item.label}</ListItemText>
                  </MenuItem>
                ))}
              </Menu>
            )}
          </>
        )}
        <Box sx={{ flex: 1 }} />
        {actions}
      </Stack>
    </Box>
  );
}
