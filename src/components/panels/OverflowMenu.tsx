import { useId, useState, type ReactNode } from 'react';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export interface OverflowMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  destructive?: boolean;
  disabled?: boolean;
  /** Draw a divider above this item. */
  dividerBefore?: boolean;
  onSelect?: () => void;
}

export interface OverflowMenuProps {
  items: OverflowMenuItem[];
  /** Accessible name and tooltip for the trigger. */
  label?: string;
  /** Trigger icon; defaults to a vertical ellipsis. */
  icon?: ReactNode;
}

/** "More actions" icon button that opens a menu. */
export function OverflowMenu({ items, label = 'More actions', icon }: OverflowMenuProps) {
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = anchor !== null;
  const close = () => setAnchor(null);

  return (
    <>
      <Tooltip title={label}>
        <IconButton
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={(event) => setAnchor(event.currentTarget)}
          color="inherit"
        >
          {icon ?? <MoreVertIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {items.flatMap((item) => [
          item.dividerBefore ? <Divider key={`${item.id}-divider`} /> : null,
          <MenuItem
            key={item.id}
            disabled={item.disabled}
            onClick={() => {
              close();
              item.onSelect?.();
            }}
            sx={item.destructive ? { color: 'error.main' } : undefined}
          >
            {item.icon && <ListItemIcon sx={item.destructive ? { color: 'inherit' } : undefined}>{item.icon}</ListItemIcon>}
            <ListItemText>{item.label}</ListItemText>
            {item.shortcut && (
              <Typography variant="mono" color="text.secondary" sx={{ ml: 3 }}>
                {item.shortcut}
              </Typography>
            )}
          </MenuItem>,
        ])}
      </Menu>
    </>
  );
}
