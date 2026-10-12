import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import type { KitBox, ProjectTemplate } from '../../../api/types';
import type { Schematic } from '../../editor/model';
import { PillButton } from '../../landing/PillButton';
import { Pill } from '../../primitives/Pill';
import { DesignPicture } from '../explore/DesignTile';

/** Where a new project starts. */
export type ProjectStart = { kind: 'blank' } | { kind: 'template'; id: string } | { kind: 'box'; id: string };

export interface NewProjectDialogProps {
  open: boolean;
  templates: ProjectTemplate[];
  boxes: KitBox[];
  /** Template drawings by template id, for their pictures. */
  drawings?: Record<string, Schematic>;
  onClose: () => void;
  onCreate: (project: { name: string; start: ProjectStart }) => void;
}

type StartKind = ProjectStart['kind'];

const STARTS: { kind: StartKind; title: string; text: string; icon: ReactNode }[] = [
  { kind: 'blank', title: 'Blank', text: 'An empty grid', icon: <InsertDriveFileOutlinedIcon /> },
  { kind: 'template', title: 'From a template', text: 'A working instrument to change', icon: <ContentCopyOutlinedIcon /> },
  { kind: 'box', title: 'From a box', text: 'Only the parts in your kit', icon: <Inventory2OutlinedIcon /> },
];

/** A choice that stays outlined in ink once picked. */
const choiceSx = (selected: boolean) =>
  ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    textAlign: 'left',
    borderRadius: '12px',
    border: 1,
    borderColor: selected ? 'text.primary' : 'divider',
    // A second ink line inside the border: picked reads at a glance.
    boxShadow: (t: Theme) => (selected ? `inset 0 0 0 1px ${(t.vars ?? t).palette.text.primary}` : 'none'),
    transition: 'border-color 150ms, box-shadow 150ms',
    '&:hover': { borderColor: 'text.primary' },
  }) as const;

/**
 * New project (UI-V4 §2, Projects): start blank, from a template, or from a
 * box, name it, and create it.
 */
export function NewProjectDialog({ open, templates, boxes, drawings = {}, onClose, onCreate }: NewProjectDialogProps) {
  const [kind, setKind] = useState<StartKind>('template');
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [boxId, setBoxId] = useState(boxes[0]?.id ?? '');
  // The name follows the choice until the user types one of their own.
  const [typedName, setTypedName] = useState<string | null>(null);

  const template = templates.find((t) => t.id === templateId);
  const box = boxes.find((b) => b.id === boxId);
  const suggested = kind === 'template' && template ? `My ${template.name}` : kind === 'box' && box ? `My ${box.name.replace(/^.*\| /, '')} project` : 'Untitled project';
  const name = typedName ?? suggested;
  const start: ProjectStart = kind === 'template' ? { kind, id: templateId } : kind === 'box' ? { kind, id: boxId } : { kind };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{ paper: { sx: (t) => ({ borderRadius: `${t.radius.card}px`, border: `${t.layout.hairline}px solid`, borderColor: 'divider', backgroundImage: 'none' }) } }}
    >
      <Stack spacing={3} sx={{ p: { xs: 2.5, md: 4 } }}>
        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="headline" component="h2">
              New project
            </Typography>
            <Typography color="text.secondary">One design file. You can add, swap and remove parts any time.</Typography>
          </Box>
          <IconButton aria-label="Close" onClick={onClose} sx={{ mt: -1, mr: -1 }}>
            <CloseIcon />
          </IconButton>
        </Stack>

        <Box role="radiogroup" aria-label="Start from" sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
          {STARTS.map((s) => (
            <ButtonBase key={s.kind} role="radio" aria-checked={kind === s.kind} onClick={() => setKind(s.kind)} sx={{ ...choiceSx(kind === s.kind), p: 2, gap: 0.5 }}>
              <Box sx={{ color: kind === s.kind ? 'text.primary' : 'text.secondary', mb: 0.5 }}>{s.icon}</Box>
              <Typography variant="subtitle1">{s.title}</Typography>
              <Typography variant="meta" color="text.meta">
                {s.text}
              </Typography>
            </ButtonBase>
          ))}
        </Box>

        {kind === 'blank' && (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            An empty grid. Add mounted parts from the library, or unmounted optics from the catalogue, and mount them later.
          </Typography>
        )}

        {kind === 'template' && (
          <Box role="radiogroup" aria-label="Template" sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {templates.map((t) => (
              <ButtonBase key={t.id} role="radio" aria-checked={templateId === t.id} onClick={() => setTemplateId(t.id)} sx={{ ...choiceSx(templateId === t.id), overflow: 'hidden' }}>
                <Box sx={{ position: 'relative', aspectRatio: '4 / 3' }}>
                  <DesignPicture design={{ kind: 'instrument', cubes: t.cubes }} drawing={drawings[t.id]} />
                </Box>
                <Box sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2">{t.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {t.description}
                  </Typography>
                  <Typography variant="meta" color="text.meta">
                    {t.cubes} cubes
                  </Typography>
                </Box>
              </ButtonBase>
            ))}
          </Box>
        )}

        {kind === 'box' && (
          <Box role="radiogroup" aria-label="Box" sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
            {boxes.map((b) => (
              <ButtonBase key={b.id} role="radio" aria-checked={boxId === b.id} onClick={() => setBoxId(b.id)} sx={{ ...choiceSx(boxId === b.id), p: 2.5, gap: 1.5 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Typography variant="subtitle1">{b.name}</Typography>
                  <Pill>{b.price}</Pill>
                </Stack>
                <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', columnGap: 2, rowGap: 0.5, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                  {b.contents.map((c) => (
                    <Typography component="li" key={c.name} variant="meta" color="text.secondary">
                      <Box component="span" sx={{ color: 'text.primary', mr: 0.75 }}>
                        ×{c.qty}
                      </Box>
                      {c.name}
                    </Typography>
                  ))}
                </Box>
              </ButtonBase>
            ))}
          </Box>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
          <TextField label="Project name" value={name} onChange={(e) => setTypedName(e.target.value)} sx={{ flex: 1 }} />
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
            <Button onClick={onClose}>Cancel</Button>
            <PillButton disabled={!name.trim()} onClick={() => onCreate({ name: name.trim(), start })}>
              Create
            </PillButton>
          </Stack>
        </Stack>
      </Stack>
    </Dialog>
  );
}
