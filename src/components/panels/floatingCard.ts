import type { Theme } from '@mui/material/styles';

/**
 * The look of a floating panel card: rounded, slightly translucent over a
 * blur, a soft shadow, and a short slide in from `from`. Shared by the
 * editor's side panels and the gallery's filter pop-ups.
 */
export function floatingCardSx(theme: Theme, from: 'left' | 'right' | 'top' | 'bottom') {
  const v = theme.vars ?? theme;
  const offset = { left: 'translateX(-8px)', right: 'translateX(8px)', top: 'translateY(-6px)', bottom: 'translateY(6px)' }[from];
  return {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: `${theme.radius.card}px`,
    border: `${theme.layout.hairline}px solid ${v.palette.divider}`,
    bgcolor: `color-mix(in srgb, ${v.palette.background.paper} 86%, transparent)`,
    backdropFilter: 'blur(18px) saturate(1.4)',
    boxShadow: `0 24px 48px -16px color-mix(in srgb, ${v.palette.text.primary} 30%, transparent), 0 2px 8px color-mix(in srgb, ${v.palette.text.primary} 8%, transparent)`,
    animation: 'floatingCardIn 260ms cubic-bezier(0.22, 1, 0.36, 1)',
    '@keyframes floatingCardIn': {
      from: { opacity: 0, transform: `${offset} scale(0.985)` },
      to: { opacity: 1, transform: 'none' },
    },
    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
  } as const;
}
