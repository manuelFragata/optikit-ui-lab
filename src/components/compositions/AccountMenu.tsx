import { useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';

export interface AccountUser {
  name: string;
  email: string;
  /** Two letters for the avatar. */
  initials: string;
}

export interface AccountMenuProps {
  /** `null` when signed out. */
  user: AccountUser | null;
  /** Avatar diameter in spacing units. */
  size?: number;
  /** Show "Sign up" next to "Log in" when signed out. */
  showSignUp?: boolean;
  onLogIn?: () => void;
  onSignUp?: () => void;
  onProjects?: () => void;
  onAccount?: () => void;
  onLogOut?: () => void;
}

/** Avatar with an account menu when signed in; Log in / Sign up buttons when not. */
export function AccountMenu({ user, size = 4.5, showSignUp = true, onLogIn, onSignUp, onProjects, onAccount, onLogOut }: AccountMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  const run = (fn?: () => void) => () => {
    close();
    fn?.();
  };

  if (!user) {
    return (
      <Stack direction="row" spacing={1}>
        <Button variant="outlined" onClick={onLogIn}>
          Log in
        </Button>
        {showSignUp && (
          <Button variant="contained" onClick={onSignUp}>
            Sign up
          </Button>
        )}
      </Stack>
    );
  }

  return (
    <>
      <ButtonBase
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label={`Account: ${user.name}`}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        sx={{ borderRadius: '50%' }}
      >
        <Avatar
          sx={{
            width: (t) => t.spacing(size),
            height: (t) => t.spacing(size),
            typography: size > 5 ? 'subtitle1' : 'body2',
            bgcolor: 'background.sunken',
            color: 'text.primary',
            border: 1,
            borderColor: anchor ? 'primary.main' : 'divider',
          }}
        >
          {user.initials}
        </Avatar>
      </ButtonBase>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: (t) => t.spacing(30) } } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2">{user.name}</Typography>
          <Typography variant="meta" color="text.meta">
            {user.email}
          </Typography>
        </Box>
        <Divider />
        {onProjects && (
          <MenuItem onClick={run(onProjects)}>
            <ListItemIcon>
              <FolderOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Your projects</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={run(onAccount)}>
          <ListItemIcon>
            <SettingsOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Account settings</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={run(onLogOut)}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Log out</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
