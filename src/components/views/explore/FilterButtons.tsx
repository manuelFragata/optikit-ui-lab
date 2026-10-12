import { useState, type ReactNode } from 'react';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import { floatingCardSx } from '../../panels/floatingCard';
import { Pill } from '../../primitives/Pill';

export interface FilterButtonsProps {
  /** Makers with how many designs each has under the current kind. */
  makers: { name: string; count: number }[];
  maker: string | null;
  onMaker: (maker: string | null) => void;
  tags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

type PanelId = 'makers' | 'tags';

/**
 * Makers and tags as two icon buttons, like the editor's rails. Each opens a
 * floating card under it; a dot on the button says a filter is in use.
 */
export function FilterButtons({ makers, maker, onMaker, tags, selectedTags, onToggleTag }: FilterButtonsProps) {
  const [open, setOpen] = useState<PanelId | null>(null);

  const buttons: { id: PanelId; label: string; icon: ReactNode; inUse: boolean }[] = [
    { id: 'makers', label: 'Makers', icon: <PeopleAltOutlinedIcon fontSize="small" />, inUse: maker !== null },
    { id: 'tags', label: 'Tags', icon: <LocalOfferOutlinedIcon fontSize="small" />, inUse: selectedTags.length > 0 },
  ];

  return (
    <ClickAwayListener onClickAway={() => setOpen(null)}>
      <Box sx={{ position: 'relative' }} onKeyDown={(e) => e.key === 'Escape' && setOpen(null)}>
        <Stack direction="row" spacing={0.5}>
          {buttons.map((b) => {
            const selected = open === b.id;
            return (
              <Tooltip key={b.id} title={b.label}>
                <IconButton
                  aria-label={b.label}
                  aria-pressed={selected}
                  aria-expanded={selected}
                  onClick={() => setOpen(selected ? null : b.id)}
                  sx={{ borderRadius: 1, color: selected ? 'primary.onSoft' : 'text.secondary', bgcolor: selected ? 'primary.soft' : 'transparent' }}
                >
                  <Badge variant="dot" color="primary" invisible={!b.inUse}>
                    {b.icon}
                  </Badge>
                </IconButton>
              </Tooltip>
            );
          })}
        </Stack>

        {open && (
          <Box
            role="dialog"
            aria-label={open === 'makers' ? 'Filter by maker' : 'Filter by tag'}
            sx={(t) => ({
              ...floatingCardSx(t, 'top'),
              position: 'absolute',
              top: `calc(100% + ${t.spacing(1)})`,
              right: 0,
              zIndex: t.zIndex.modal,
              width: 300,
              maxHeight: '60vh',
            })}
          >
            <Stack direction="row" sx={{ alignItems: 'center', minHeight: (t) => t.spacing(t.layout.panelHeaderHeight), pl: 2, pr: 0.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ flex: 1 }}>
                {open === 'makers' ? 'Makers' : 'Tags'}
              </Typography>
              <IconButton aria-label="Close" onClick={() => setOpen(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>

            <Box sx={{ overflow: 'auto', p: 1 }}>
              {open === 'makers' ? (
                makers.map((m) => {
                  const selected = maker === m.name;
                  return (
                    <ButtonBase
                      key={m.name}
                      onClick={() => onMaker(selected ? null : m.name)}
                      aria-pressed={selected}
                      sx={{
                        display: 'flex',
                        width: '100%',
                        gap: 1.25,
                        px: 1.25,
                        py: 1,
                        borderRadius: 1,
                        justifyContent: 'flex-start',
                        bgcolor: selected ? 'primary.soft' : 'transparent',
                        color: selected ? 'primary.onSoft' : 'text.primary',
                        '&:hover': { bgcolor: selected ? 'primary.soft' : 'action.hover' },
                      }}
                    >
                      <Box
                        aria-hidden
                        sx={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: '50%', bgcolor: 'canvas.ground', typography: 'meta', textTransform: 'uppercase' }}
                      >
                        {m.name.slice(0, 2)}
                      </Box>
                      <Typography variant="body2" sx={{ flex: 1, textAlign: 'left' }}>
                        @{m.name}
                      </Typography>
                      <Typography variant="meta" color="text.meta">
                        {m.count}
                      </Typography>
                    </ButtonBase>
                  );
                })
              ) : (
                <Stack direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: 'wrap', p: 0.5 }}>
                  {tags.map((tag) => (
                    <Pill key={tag} active={selectedTags.includes(tag)} onClick={() => onToggleTag(tag)}>
                      #{tag}
                    </Pill>
                  ))}
                </Stack>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
}
