import type { ReactNode } from 'react';
import Box, { type BoxProps } from '@mui/material/Box';

export interface PageContainerProps extends Omit<BoxProps, 'children'> {
  children?: ReactNode;
}

/** Centres document-style page content (landing, home, account) at the page max width. */
export function PageContainer({ children, sx, ...rest }: PageContainerProps) {
  return (
    <Box
      {...rest}
      sx={[
        { width: '100%', maxWidth: (t) => t.spacing(t.layout.pageMaxWidth), mx: 'auto', px: { xs: 2, md: 5 } },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}
