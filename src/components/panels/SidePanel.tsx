import { useState, type KeyboardEvent, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';

/**
 * - `collapsed`: icon rail only.
 * - `expanded`: panel floats over the content next to the rail.
 * - `pinned`: panel takes layout space and pushes the content aside.
 */
export type SidePanelState = 'collapsed' | 'expanded' | 'pinned';

export interface SidePanelItem {
  id: string;
  /** Rail tooltip, and the panel title unless `title` is given. */
  label: string;
  icon: ReactNode;
  content: ReactNode;
  /** Panel title when it should differ from the rail label (e.g. the selected symbol's name). */
  title?: ReactNode;
  /** Pinned to the bottom of the panel, outside the scroll area (e.g. "+ Add symbol"). */
  footer?: ReactNode;
}

export interface SidePanelProps {
  items: SidePanelItem[];
  /** Controlled state. Omit it to let the panel manage its own. */
  state?: SidePanelState;
  defaultState?: SidePanelState;
  onStateChange?: (state: SidePanelState) => void;
  /** Controlled active item id. */
  activeId?: string;
  defaultActiveId?: string;
  onActiveChange?: (id: string) => void;
  /** Rendered at the bottom of the rail (e.g. settings). */
  railFooter?: ReactNode;
  /** Which edge the panel sits on; the rail is always on the outside. */
  side?: 'left' | 'right';
  'aria-label'?: string;
}

/** Collapsible side panel: icon rail plus an expandable or pinnable panel, on either edge. */
export function SidePanel({
  items,
  state: stateProp,
  defaultState = 'collapsed',
  onStateChange,
  activeId: activeIdProp,
  defaultActiveId,
  onActiveChange,
  railFooter,
  side = 'left',
  'aria-label': ariaLabel = 'Side panel',
}: SidePanelProps) {
  const left = side === 'left';
  const inner = left ? 'borderRight' : 'borderLeft'; // border between rail/panel and the content
  const [innerState, setInnerState] = useState(defaultState);
  const [innerActiveId, setInnerActiveId] = useState(defaultActiveId ?? items[0]?.id);
  const state = stateProp ?? innerState;
  const activeId = activeIdProp ?? innerActiveId;
  const active = items.find((item) => item.id === activeId) ?? items[0];
  const open = state !== 'collapsed';
  const pinned = state === 'pinned';

  const setState = (next: SidePanelState) => {
    setInnerState(next);
    onStateChange?.(next);
  };

  const setActive = (id: string) => {
    setInnerActiveId(id);
    onActiveChange?.(id);
  };

  const handleRailClick = (id: string) => {
    if (open && id === active?.id) {
      setState('collapsed');
      return;
    }
    setActive(id);
    if (!open) setState('expanded');
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && state === 'expanded') setState('collapsed');
  };

  return (
    <Box
      component="aside"
      aria-label={ariaLabel}
      sx={{ position: 'relative', display: 'flex', flexDirection: left ? 'row' : 'row-reverse', height: '100%', flexShrink: 0 }}
    >
      <Stack
        component="nav"
        sx={{
          width: (theme) => theme.spacing(theme.layout.railWidth),
          alignItems: 'center',
          gap: 0.5,
          py: 1,
          bgcolor: 'background.paper',
          [inner]: 1,
          borderColor: 'divider',
        }}
      >
        {items.map((item) => {
          const selected = open && item.id === active?.id;
          return (
            <Tooltip key={item.id} title={item.label} placement={left ? 'right' : 'left'}>
              <IconButton
                aria-label={item.label}
                aria-pressed={selected}
                onClick={() => handleRailClick(item.id)}
                sx={{
                  borderRadius: 1,
                  color: selected ? 'primary.onSoft' : 'text.secondary',
                  bgcolor: selected ? 'primary.soft' : 'transparent',
                }}
              >
                {item.icon}
              </IconButton>
            </Tooltip>
          );
        })}
        <Box sx={{ flex: 1 }} />
        {railFooter}
      </Stack>

      {open && active && (
        <Paper
          square
          elevation={pinned ? 0 : 8}
          onKeyDown={handleKeyDown}
          sx={{
            position: pinned ? 'relative' : 'absolute',
            top: 0,
            bottom: 0,
            [left ? 'left' : 'right']: pinned ? undefined : (theme: Theme) => theme.spacing(theme.layout.railWidth),
            zIndex: (theme) => theme.zIndex.drawer,
            width: (theme) => theme.spacing(theme.layout.sidePanelWidth),
            display: 'flex',
            flexDirection: 'column',
            [inner]: 1,
            borderColor: 'divider',
          }}
        >
          <Stack
            direction="row"
            sx={{
              alignItems: 'center',
              minHeight: (theme) => theme.spacing(theme.layout.panelHeaderHeight),
              pl: 2,
              pr: 0.5,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
              {active.title ?? active.label}
            </Typography>
            <Tooltip title={pinned ? 'Unpin panel' : 'Pin panel'}>
              <IconButton
                aria-pressed={pinned}
                aria-label="Pin panel"
                onClick={() => setState(pinned ? 'expanded' : 'pinned')}
                sx={pinned ? { borderRadius: 1, bgcolor: 'primary.soft', color: 'primary.onSoft' } : { borderRadius: 1 }}
              >
                {pinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Collapse">
              <IconButton aria-label="Collapse panel" onClick={() => setState('collapsed')}>
                {left ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Stack>
          <Box sx={{ flex: 1, overflow: 'auto' }}>{active.content}</Box>
          {active.footer && <Box sx={{ borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>{active.footer}</Box>}
        </Paper>
      )}
    </Box>
  );
}
