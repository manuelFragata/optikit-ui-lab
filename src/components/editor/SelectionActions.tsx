import { useState, type MouseEvent, type ReactNode } from 'react';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import TuneIcon from '@mui/icons-material/Tune';
import { floatingCardSx } from '../panels/floatingCard';
import { frozen, isLocked, realize, shifted, unbound, type Lock, type ModuleOption, type SchematicSymbol, type Seat } from './model';

export interface SelectionActionsProps {
  /** The selected parts: one, or several. */
  parts: SchematicSymbol[];
  /** Existing modules the part can be realized as (one part selected). */
  realizeOptions: ModuleOption[];
  /** Change every selected part at once (one undo step): `patch` says what changes for each. */
  onUpdate: (patch: (part: SchematicSymbol) => Partial<SchematicSymbol>) => void;
  /** Open the part's properties (as a double-click does). */
  onProperties: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function Action({ label, onClick, disabled, children }: { label: string; onClick: (e: MouseEvent<HTMLElement>) => void; disabled?: boolean; children: ReactNode }) {
  return (
    <Tooltip title={label} placement="top">
      <span>
        <IconButton size="small" aria-label={label} disabled={disabled} onClick={onClick} sx={{ borderRadius: 1.5 }}>
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

const LOCKS: Lock[] = ['x', 'y', 'z', 'turn'];
const locksAll = (on: boolean) => Object.fromEntries(LOCKS.map((l) => [l, on]));

/**
 * The one-click edits of the selection, floating next to it: turn, move a
 * layer, lock, mount or unmount (one part), duplicate, delete.
 */
export function SelectionActions({ parts, realizeOptions, onUpdate, onProperties, onDuplicate, onDelete }: SelectionActionsProps) {
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const one = parts.length === 1 ? parts[0] : null;
  const turnable = parts.some((s) => s.placement.state === 'in-cube' && !isLocked(s, 'turn'));
  // Locked when every part is locked every way; the button then unlocks them all.
  const allLocked = parts.every((s) => LOCKS.every((l) => isLocked(s, l)));

  const turn = () =>
    onUpdate((s) => (s.placement.state === 'in-cube' && !isLocked(s, 'turn') ? { placement: { ...s.placement, seat: ((s.placement.seat + 1) % 4) as Seat } } : {}));

  return (
    <Stack
      role="toolbar"
      aria-label={`${one ? one.label : `${parts.length} parts`} actions`}
      direction="row"
      onClick={(e) => e.stopPropagation()}
      sx={(t) => ({ ...floatingCardSx(t, 'bottom'), flexDirection: 'row', alignItems: 'center', p: 0.25, borderRadius: `${t.radius.tile}px` })}
    >
      {!one && (
        <Typography variant="body2" sx={{ px: 1, whiteSpace: 'nowrap' }}>
          {parts.length} parts
        </Typography>
      )}
      <Action label={one ? 'Turn a quarter (R)' : 'Turn each a quarter (R)'} disabled={!turnable} onClick={turn}>
        <RotateRightIcon fontSize="small" />
      </Action>
      <Action label="Layer below (Page Down)" disabled={parts.every((s) => s.z <= 0 || isLocked(s, 'z'))} onClick={() => onUpdate((s) => ({ z: shifted(s, { z: -1 }).z }))}>
        <ExpandMoreIcon fontSize="small" />
      </Action>
      <Action label="Layer above (Page Up)" disabled={parts.every((s) => isLocked(s, 'z'))} onClick={() => onUpdate((s) => ({ z: shifted(s, { z: 1 }).z }))}>
        <ExpandLessIcon fontSize="small" />
      </Action>
      <Action label={allLocked ? 'Unlock: free to move and turn' : 'Lock in place: no moving or turning'} onClick={() => onUpdate(() => ({ locks: locksAll(!allLocked) }))}>
        {allLocked ? <LockOutlinedIcon fontSize="small" /> : <LockOpenOutlinedIcon fontSize="small" />}
      </Action>

      {one && (
        <>
          <Divider orientation="vertical" flexItem sx={{ my: 0.5, mx: 0.25 }} />
          {one.placement.state === 'in-cube' ? (
            <Action label="Unbind: take it out of its cube" onClick={() => onUpdate((s) => ({ placement: unbound(s) }))}>
              <LinkOffIcon fontSize="small" />
            </Action>
          ) : (
            <>
              <Action label="Realize: swap for an existing module" onClick={(e) => setMenu(e.currentTarget)}>
                <SwapHorizIcon fontSize="small" />
              </Action>
              <Action label="Freeze: make a holder for it here" onClick={() => onUpdate((s) => ({ placement: frozen(s.placement) }))}>
                <AcUnitIcon fontSize="small" />
              </Action>
            </>
          )}
        </>
      )}

      <Divider orientation="vertical" flexItem sx={{ my: 0.5, mx: 0.25 }} />
      {one && (
        <Action label="Properties (double-click, Enter)" onClick={onProperties}>
          <TuneIcon fontSize="small" />
        </Action>
      )}
      <Action label="Duplicate (Ctrl D, or Alt-drag)" onClick={onDuplicate}>
        <ContentCopyOutlinedIcon fontSize="small" />
      </Action>
      <Action label="Delete (Del)" onClick={onDelete}>
        <DeleteOutlineIcon fontSize="small" />
      </Action>

      <Menu open={Boolean(menu)} anchorEl={menu} onClose={() => setMenu(null)}>
        {realizeOptions.length === 0 && <MenuItem disabled>No matching module</MenuItem>}
        {realizeOptions.map((o) => (
          <MenuItem
            key={o.module}
            onClick={() => {
              setMenu(null);
              onUpdate((s) => realize(s, o));
            }}
          >
            <ListItemText primary={o.module} secondary={o.source} />
          </MenuItem>
        ))}
      </Menu>
    </Stack>
  );
}
