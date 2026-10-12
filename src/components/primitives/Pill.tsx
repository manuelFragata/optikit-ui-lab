import type { ReactNode } from 'react';
import ButtonBase from '@mui/material/ButtonBase';

export interface PillProps {
  children: ReactNode;
  /** Selected filter: solid ink. */
  active?: boolean;
  /** Makes it a toggle button; without it the pill is a plain label (a tag). */
  onClick?: () => void;
  /** On a picture: a paper fill instead of a hairline. */
  overlay?: boolean;
}

/** Hairline pill for filters and tags, as on the landing page. */
export function Pill({ children, active, onClick, overlay }: PillProps) {
  return (
    <ButtonBase
      component={onClick ? 'button' : 'span'}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      sx={(t) => ({
        px: 1.5,
        py: 0.5,
        borderRadius: `${t.radius.pill}px`,
        border: `${t.layout.hairline}px solid`,
        borderColor: active ? 'text.primary' : overlay ? 'transparent' : 'divider',
        bgcolor: active ? 'text.primary' : overlay ? 'background.paper' : 'transparent',
        color: active ? 'background.paper' : 'text.primary',
        typography: 'meta',
        pointerEvents: onClick ? 'auto' : 'none',
        whiteSpace: 'nowrap',
        transition: 'background-color 150ms, border-color 150ms',
        ...(onClick && !active && { '&:hover': { borderColor: 'text.secondary' } }),
      })}
    >
      {children}
    </ButtonBase>
  );
}
