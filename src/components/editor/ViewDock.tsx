import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import CheckIcon from '@mui/icons-material/Check';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FilterNoneIcon from '@mui/icons-material/FilterNone';
import CenterFocusStrongOutlinedIcon from '@mui/icons-material/CenterFocusStrongOutlined';
import FitScreenOutlinedIcon from '@mui/icons-material/FitScreenOutlined';
import ThreeDRotationIcon from '@mui/icons-material/ThreeDRotation';
import GridOnIcon from '@mui/icons-material/GridOn';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import NearMeOutlinedIcon from '@mui/icons-material/NearMeOutlined';
import PanToolOutlinedIcon from '@mui/icons-material/PanToolOutlined';
import RedoIcon from '@mui/icons-material/Redo';
import StraightenIcon from '@mui/icons-material/Straighten';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import TimelineIcon from '@mui/icons-material/Timeline';
import UndoIcon from '@mui/icons-material/Undo';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import { floatingCardSx } from '../panels/floatingCard';
import type { CanvasTool, EditorView, ViewOptions } from './CanvasToolbar';
import type { CameraMove } from './scene3d/Camera';
import type { Fidelity } from './scene3d/layout3d';

/** How much the 3D view draws: the symbols, their cubes, or the real solids (the brief's fidelity dial). */
export type Detail = Fidelity;

/** The dock's pop-up option lists; one is open at a time. */
export type Flyout = 'add' | 'show' | 'detail' | 'zoom' | 'views' | 'build';

export type ZoomCommand = 'in' | 'out' | 'actual' | 'fit';

export interface ViewDockProps {
  view: EditorView;
  /** The open option list, if any. Controlled, so a shortcut can open Add. */
  flyout: Flyout | null;
  onFlyout: (flyout: Flyout | null) => void;
  /** The search shown by the + button (see AddPartSearch). */
  addPanel: ReactNode;
  /** A part card is being dragged out of the Add list: the list steps aside, the + becomes "drop here to cancel". */
  dragging?: boolean;

  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;

  tool: CanvasTool;
  onTool: (tool: CanvasTool) => void;
  options: ViewOptions;
  onOptions: (options: ViewOptions) => void;
  detail: Detail;
  onDetail: (detail: Detail) => void;
  /** The schematic zoom, 1 = 100%. */
  zoom: number;
  onZoom: (command: ZoomCommand) => void;
  /** 3D: move the camera to a view, or fit. */
  onCamera?: (move: CameraMove) => void;

  /** The parts not mounted yet; none means buildable. */
  unmounted: { id: string; label: string }[];
  onShowPart: (id: string) => void;
  onMountAll: () => void;
}

type ShowKey = 'showPartLabels' | 'showRays' | 'showRayLabels' | 'showCages' | 'onionSkin';

const SHOW: { key: ShowKey; label: string; icon: ReactNode }[] = [
  { key: 'showPartLabels', label: 'Part labels', icon: <TextFieldsIcon fontSize="small" /> },
  { key: 'showRays', label: 'Rays', icon: <TimelineIcon fontSize="small" /> },
  { key: 'showRayLabels', label: 'Ray labels', icon: <LabelOutlinedIcon fontSize="small" /> },
  { key: 'showCages', label: 'Cube cages', icon: <CheckBoxOutlineBlankIcon fontSize="small" /> },
  { key: 'onionSkin', label: 'Other layers, faintly', icon: <FilterNoneIcon fontSize="small" /> },
];

const DETAILS: { value: Detail; label: string; icon: ReactNode }[] = [
  { value: 'symbols', label: 'Symbols', icon: <CategoryOutlinedIcon fontSize="small" /> },
  { value: 'cubes', label: 'Cubes', icon: <CheckBoxOutlineBlankIcon fontSize="small" /> },
  { value: 'solids', label: 'Solids', icon: <ViewInArOutlinedIcon fontSize="small" /> },
];

const TOOLS: { value: CanvasTool; label: string; icon: ReactNode }[] = [
  { value: 'select', label: 'Select (V)', icon: <NearMeOutlinedIcon fontSize="small" sx={{ transform: 'scaleX(-1)' }} /> },
  { value: 'pan', label: 'Pan (H)', icon: <PanToolOutlinedIcon fontSize="small" /> },
  { value: 'zoom', label: 'Zoom (Z), Alt-click to zoom out', icon: <ZoomInIcon fontSize="small" /> },
  { value: 'measure', label: 'Measure (M)', icon: <StraightenIcon fontSize="small" /> },
];

/** Faces of a view cube, drawn small: which side the camera looks from. */
const face = (d: string) => (
  <Box component="svg" viewBox="0 0 20 20" sx={{ width: 20, height: 20 }}>
    <path d="M10 2 17 6v8l-7 4-7-4V6z" fill="none" stroke="currentColor" strokeWidth={1.2} />
    <path d={d} fill="currentColor" opacity={0.45} />
  </Box>
);

const VIEWS: { value: CameraMove; label: string; shortcut?: string; icon: ReactNode }[] = [
  { value: 'iso', label: 'Angled', icon: <ThreeDRotationIcon fontSize="small" /> },
  { value: 'top', label: 'Top', icon: face('M10 2 17 6l-7 4-7-4z') },
  { value: 'front', label: 'Front', icon: face('M3 6l7 4v8l-7-4z') },
  { value: 'right', label: 'Right', icon: face('M17 6l-7 4v8l7-4z') },
  { value: 'fit', label: 'Fit the design', shortcut: 'F', icon: <FitScreenOutlinedIcon fontSize="small" /> },
  { value: 'fitSelection', label: 'Fit the selection', shortcut: 'Shift F', icon: <CenterFocusStrongOutlinedIcon fontSize="small" /> },
];

const ZOOMS: { value: ZoomCommand; label: string; shortcut: string; icon: ReactNode }[] = [
  { value: 'in', label: 'Zoom in', shortcut: '+', icon: <ZoomInIcon fontSize="small" /> },
  { value: 'out', label: 'Zoom out', shortcut: '−', icon: <ZoomOutIcon fontSize="small" /> },
  { value: 'actual', label: 'Actual size', shortcut: '1', icon: <Typography variant="mono" sx={{ width: 20, fontSize: 11 }}>1:1</Typography> },
  { value: 'fit', label: 'Fit the drawing', shortcut: 'F', icon: <FitScreenOutlinedIcon fontSize="small" /> },
];

const hoverSx = (on: boolean) => ({ bgcolor: on ? 'primary.soft' : 'transparent', '&:hover': { bgcolor: on ? 'primary.soft' : 'action.hover' } });

/** A dock button. With `flyout`, a caret says it opens a list of options. */
function DockButton({ label, on, flyout, disabled, onClick, sx, children }: { label: string; on?: boolean; flyout?: boolean; disabled?: boolean; onClick: () => void; sx?: object; children: ReactNode }) {
  return (
    // No tooltip over its own open list.
    <Tooltip title={flyout && on ? '' : label} placement="top">
      <span>
        <ButtonBase
          aria-label={label}
          aria-pressed={flyout ? undefined : on}
          aria-expanded={flyout ? on : undefined}
          disabled={disabled}
          onClick={onClick}
          sx={{ height: 36, minWidth: 36, px: 0.75, gap: 0.25, borderRadius: 1.5, color: on ? 'primary.onSoft' : 'text.secondary', '&.Mui-disabled': { opacity: 0.35 }, ...hoverSx(!!on), ...sx }}
        >
          {children}
          {flyout && <KeyboardArrowUpIcon sx={{ fontSize: 14, opacity: 0.7, transition: 'transform 150ms', transform: on ? 'rotate(180deg)' : 'none' }} />}
        </ButtonBase>
      </span>
    </Tooltip>
  );
}

/**
 * A button with its option list above it while open. `away` sinks the list
 * back into its button without closing it, so it can rise again.
 */
function WithFlyout({ open, away = false, content, children }: { open: boolean; away?: boolean; content: ReactNode; children: ReactNode }) {
  return (
    <Box sx={{ position: 'relative' }}>
      {open && (
        <Box
          aria-hidden={away || undefined}
          sx={(t) => ({
            ...floatingCardSx(t, 'bottom'),
            position: 'absolute',
            bottom: 'calc(100% + 14px)',
            left: '50%',
            translate: '-50% 0',
            p: 0.5,
            minWidth: 200,
            transformOrigin: 'bottom center',
            transition: 'opacity 160ms ease-out, transform 240ms cubic-bezier(0.22, 1, 0.36, 1)',
            ...(away && { opacity: 0, transform: 'translateY(16px) scale(0.85)', pointerEvents: 'none' }),
            '@media (prefers-reduced-motion: reduce)': { animation: 'none', transition: 'none' },
          })}
        >
          {content}
        </Box>
      )}
      {children}
    </Box>
  );
}

/** One option in a list: icon, name, and a check (or a shortcut) on the right. */
function FlyoutRow({ label, icon, on, hint, onClick }: { label: string; icon: ReactNode; on?: boolean; hint?: string; onClick: () => void }) {
  return (
    <ButtonBase onClick={onClick} aria-pressed={on} sx={{ width: '100%', justifyContent: 'flex-start', gap: 1.25, px: 1, py: 0.75, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}>
      <Box sx={{ display: 'flex', color: on === false ? 'text.secondary' : 'text.primary' }}>{icon}</Box>
      <Typography variant="body2" sx={{ color: on === false ? 'text.secondary' : 'text.primary', whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
      {hint ? (
        <Typography variant="mono" color="text.meta" sx={{ ml: 'auto', pl: 2 }}>
          {hint}
        </Typography>
      ) : (
        <CheckIcon fontSize="small" sx={{ ml: 'auto', pl: 1, color: 'primary.main', visibility: on ? 'visible' : 'hidden' }} />
      )}
    </ButtonBase>
  );
}

const Sep = () => <Divider orientation="vertical" flexItem sx={{ my: 0.75, mx: 0.25 }} />;

/**
 * The editor's dock, floating at the bottom of the canvas, CAD style, in
 * groups: add | undo, redo | tools | what is shown, zoom | build state.
 * The main buttons open their options above them.
 */
export function ViewDock(props: ViewDockProps) {
  const { view, flyout, onFlyout, tool, onTool, options, onOptions, detail, onDetail, zoom, onZoom, unmounted } = props;
  const toggle = (f: Flyout) => onFlyout(flyout === f ? null : f);
  const schematic = view === '2d';
  const currentDetail = DETAILS.find((d) => d.value === detail) ?? DETAILS[2];
  const buildable = unmounted.length === 0;

  return (
    <ClickAwayListener onClickAway={() => flyout && onFlyout(null)}>
      <Stack
        role="toolbar"
        aria-label="Editor"
        direction="row"
        spacing={0.25}
        sx={(t) => ({ ...floatingCardSx(t, 'bottom'), overflow: 'visible', flexDirection: 'row', alignItems: 'center', p: 0.5 })}
      >
        <WithFlyout open={flyout === 'add'} away={props.dragging} content={props.addPanel}>
          <DockButton
            label={props.dragging ? 'Drop here to cancel' : 'Add a part (A)'}
            on={flyout === 'add' && !props.dragging}
            onClick={() => toggle('add')}
            sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } }}
          >
            {/* While a part is dragged out, the + turns into an x. */}
            <AddIcon fontSize="small" sx={{ transition: 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)', transform: props.dragging ? 'rotate(45deg)' : 'none' }} />
          </DockButton>
        </WithFlyout>

        <Sep />
        <DockButton label="Undo (Ctrl Z)" disabled={!props.canUndo} onClick={props.onUndo}>
          <UndoIcon fontSize="small" />
        </DockButton>
        <DockButton label="Redo (Ctrl Shift Z)" disabled={!props.canRedo} onClick={props.onRedo}>
          <RedoIcon fontSize="small" />
        </DockButton>

        <Sep />
        {/* Measure is 2D only. In 3D, right drag orbits whatever the tool. */}
        {TOOLS.filter((t) => schematic || t.value !== 'measure').map((t) => (
          <DockButton key={t.value} label={t.label} on={tool === t.value} onClick={() => onTool(t.value)}>
            {t.icon}
          </DockButton>
        ))}

        <Sep />
        <WithFlyout
          open={flyout === 'show'}
          content={SHOW.map((s) => (
            <FlyoutRow key={s.key} label={s.label} icon={s.icon} on={options[s.key] !== false} onClick={() => onOptions({ ...options, [s.key]: options[s.key] === false })} />
          ))}
        >
          <DockButton label="Show" flyout on={flyout === 'show'} onClick={() => toggle('show')}>
            <VisibilityOutlinedIcon fontSize="small" />
          </DockButton>
        </WithFlyout>
        <DockButton label="Snap to grid" on={options.snapToGrid} onClick={() => onOptions({ ...options, snapToGrid: !options.snapToGrid })}>
          <GridOnIcon fontSize="small" />
        </DockButton>
        {schematic ? (
          <WithFlyout
            open={flyout === 'zoom'}
            content={ZOOMS.map((z) => (
              <FlyoutRow key={z.value} label={z.label} icon={z.icon} hint={z.shortcut} onClick={() => onZoom(z.value)} />
            ))}
          >
            <DockButton label="Zoom" flyout on={flyout === 'zoom'} onClick={() => toggle('zoom')}>
              <Typography variant="mono" sx={{ minWidth: 38, color: 'text.primary' }}>
                {Math.round(zoom * 100)}%
              </Typography>
            </DockButton>
          </WithFlyout>
        ) : (
          <WithFlyout
            open={flyout === 'views'}
            content={VIEWS.map((v) => (
              <FlyoutRow key={v.value} label={v.label} icon={v.icon} hint={v.shortcut} onClick={() => props.onCamera?.(v.value)} />
            ))}
          >
            <DockButton label="Views" flyout on={flyout === 'views'} onClick={() => toggle('views')}>
              <ThreeDRotationIcon fontSize="small" />
            </DockButton>
          </WithFlyout>
        )}
        {!schematic && (
          <WithFlyout
            open={flyout === 'detail'}
            content={DETAILS.map((d) => (
              <FlyoutRow key={d.value} label={d.label} icon={d.icon} on={detail === d.value} onClick={() => onDetail(d.value)} />
            ))}
          >
            <DockButton label={`3D detail: ${currentDetail.label}`} flyout on={flyout === 'detail'} onClick={() => toggle('detail')}>
              {currentDetail.icon}
            </DockButton>
          </WithFlyout>
        )}

        <Sep />
        <WithFlyout
          open={flyout === 'build'}
          content={
            <Box sx={{ width: 260 }}>
              <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 0.75 }}>
                {buildable ? 'Every part is in a cube. The design can be built.' : 'These parts have no holder yet. Pick one to go to it.'}
              </Typography>
              {unmounted.map((u) => (
                <FlyoutRow key={u.id} label={u.label} icon={<WarningAmberIcon fontSize="small" sx={{ color: 'warning.main' }} />} hint={u.id} onClick={() => props.onShowPart(u.id)} />
              ))}
              {!buildable && (
                <Box sx={{ p: 1, pt: 1.5 }}>
                  <Button fullWidth variant="outlined" size="small" onClick={props.onMountAll}>
                    Mount all: realize or freeze each
                  </Button>
                </Box>
              )}
            </Box>
          }
        >
          <DockButton label={buildable ? 'Buildable' : 'Not mounted yet'} flyout on={flyout === 'build'} onClick={() => toggle('build')} sx={{ px: 1, gap: 0.75 }}>
            {buildable ? <CheckCircleOutlineIcon fontSize="small" sx={{ color: 'success.main' }} /> : <WarningAmberIcon fontSize="small" sx={{ color: 'warning.main' }} />}
            <Typography variant="body2" sx={{ color: 'text.primary', whiteSpace: 'nowrap' }}>
              {buildable ? 'Buildable' : `${unmounted.length} not mounted`}
            </Typography>
          </DockButton>
        </WithFlyout>
      </Stack>
    </ClickAwayListener>
  );
}
