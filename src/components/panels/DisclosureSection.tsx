import { useId, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export interface DisclosureSectionProps {
  title: ReactNode;
  /** Controlled open state. Omit it to let the section manage its own. */
  open?: boolean;
  defaultOpen?: boolean;
  onToggle?: (open: boolean) => void;
  /** Extra controls on the right of the header (kept outside the toggle button). */
  actions?: ReactNode;
  children: ReactNode;
}

/** Collapsible section with a clickable header. */
export function DisclosureSection({
  title,
  open: openProp,
  defaultOpen = true,
  onToggle,
  actions,
  children,
}: DisclosureSectionProps) {
  const contentId = useId();
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const open = openProp ?? innerOpen;

  const toggle = () => {
    setInnerOpen(!open);
    onToggle?.(!open);
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Stack direction="row" sx={{ alignItems: 'center', pr: 1 }}>
        <ButtonBase
          onClick={toggle}
          aria-expanded={open}
          aria-controls={contentId}
          sx={{ flex: 1, justifyContent: 'flex-start', gap: 1, px: 1.5, py: 1, textAlign: 'left' }}
        >
          <ExpandMoreIcon
            fontSize="small"
            sx={{
              color: 'text.secondary',
              transform: open ? 'none' : 'rotate(-90deg)',
              transition: (theme) => theme.transitions.create('transform', { duration: theme.transitions.duration.shortest }),
            }}
          />
          <Typography variant="overline" color="text.secondary">
            {title}
          </Typography>
        </ButtonBase>
        {actions}
      </Stack>
      <Collapse in={open}>
        <Box id={contentId} sx={{ px: 2, pb: 2 }}>
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}
