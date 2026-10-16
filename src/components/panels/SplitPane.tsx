import { useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import Box from '@mui/material/Box';

export interface SplitPaneProps {
  first: ReactNode;
  /** The second pane; `null` gives the first all the room (and no handle). */
  second: ReactNode | null;
  /** The share of the width the first pane takes, 0 to 1. */
  fraction: number;
  onFraction: (fraction: number) => void;
  /** Neither pane gets narrower than this (px). */
  minWidth?: number;
  'aria-label'?: string;
}

const DEFAULT_FRACTION = 0.55;

/**
 * Two panes side by side and a handle between them, dragged to share the
 * width (arrow keys too; a double-click shares it as it was). The handle is a
 * thin line with a wider grip, so it is easy to catch and takes no room.
 */
export function SplitPane({ first, second, fraction, onFraction, minWidth = 240, 'aria-label': ariaLabel = 'Resize panes' }: SplitPaneProps) {
  const frame = useRef<HTMLDivElement>(null);

  const clamp = (f: number) => {
    const width = frame.current?.clientWidth ?? 0;
    const min = width > 0 ? Math.min(0.5, minWidth / width) : 0.2;
    return Math.min(1 - min, Math.max(min, f));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const box = frame.current?.getBoundingClientRect();
    if (box && box.width > 0) onFraction(clamp((e.clientX - box.left) / box.width));
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    if (e.key === 'ArrowLeft') onFraction(clamp(fraction - step));
    else if (e.key === 'ArrowRight') onFraction(clamp(fraction + step));
    else if (e.key === 'Home') onFraction(clamp(0));
    else if (e.key === 'End') onFraction(clamp(1));
    else return;
    e.preventDefault();
  };

  return (
    <Box ref={frame} sx={{ position: 'relative', display: 'flex', flex: 1, minWidth: 0 }}>
      <Box sx={{ position: 'relative', display: 'flex', minWidth: 0, flex: second ? `0 0 ${fraction * 100}%` : 1 }}>{first}</Box>
      {second && (
        <>
          <Box
            role="separator"
            aria-orientation="vertical"
            aria-label={ariaLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(fraction * 100)}
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onKeyDown={onKeyDown}
            onDoubleClick={() => onFraction(clamp(DEFAULT_FRACTION))}
            sx={{
              position: 'relative',
              flex: '0 0 1px',
              bgcolor: 'divider',
              cursor: 'col-resize',
              zIndex: 5,
              touchAction: 'none',
              // The grip: wider than the line, invisible until hovered or dragged.
              '&::before': { content: '""', position: 'absolute', top: 0, bottom: 0, left: -4, right: -4 },
              '&::after': {
                content: '""',
                position: 'absolute',
                top: '50%',
                left: -2,
                width: 5,
                height: 36,
                transform: 'translateY(-50%)',
                borderRadius: 3,
                bgcolor: 'text.disabled',
                opacity: 0.6,
                transition: 'opacity 120ms, background-color 120ms',
              },
              '&:hover::after, &:focus-visible::after, &:active::after': { bgcolor: 'primary.main', opacity: 1 },
              '&:focus-visible': { outline: 'none', bgcolor: 'primary.main' },
            }}
          />
          <Box sx={{ position: 'relative', display: 'flex', flex: 1, minWidth: 0 }}>{second}</Box>
        </>
      )}
    </Box>
  );
}
