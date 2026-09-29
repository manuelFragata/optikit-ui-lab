import type { ReactNode } from 'react';
import Box from '@mui/material/Box';

export interface CanvasPlaceholderProps {
  children?: ReactNode;
}

/** Plain two-level grid standing in for the real viewport. */
export function CanvasPlaceholder({ children }: CanvasPlaceholderProps) {
  return (
    <Box
      role="img"
      aria-label="Canvas"
      sx={(theme) => {
        const { palette } = theme.vars ?? theme;
        const line = `${theme.layout.hairline}px`;
        const minor = theme.spacing(theme.layout.canvasGridMinor);
        const major = theme.spacing(theme.layout.canvasGridMajor);
        return {
          position: 'relative',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          bgcolor: 'canvas.ground',
          backgroundImage: [
            `linear-gradient(to right, ${palette.canvas.gridMajor} ${line}, transparent ${line})`,
            `linear-gradient(to bottom, ${palette.canvas.gridMajor} ${line}, transparent ${line})`,
            `linear-gradient(to right, ${palette.canvas.grid} ${line}, transparent ${line})`,
            `linear-gradient(to bottom, ${palette.canvas.grid} ${line}, transparent ${line})`,
          ].join(', '),
          backgroundSize: `${major} ${major}, ${major} ${major}, ${minor} ${minor}, ${minor} ${minor}`,
        };
      }}
    >
      {children}
    </Box>
  );
}
