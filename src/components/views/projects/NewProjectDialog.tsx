import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
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
import DrawOutlinedIcon from '@mui/icons-material/DrawOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import type { KitBox, ProjectTemplate } from '../../../api/types';
import { DESIGN_FILE_EXTENSION, readDesignFile } from '../../editor/designFile';
import type { Schematic } from '../../editor/model';
import { PillButton } from '../../landing/PillButton';
import { Pill } from '../../primitives/Pill';
import { DesignPicture } from '../explore/DesignTile';

/** Where a new project starts: a sketch on an empty grid, a template, a box's parts, or a design file. */
export type ProjectStart = { kind: 'sketch' } | { kind: 'template'; id: string } | { kind: 'box'; id: string } | { kind: 'import'; design: Schematic; fileName: string };

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

/** One start for each way people come to a design: from the optics, from an instrument, from a kit, from a file. */
const STARTS: { kind: StartKind; title: string; text: string; icon: ReactNode }[] = [
  { kind: 'sketch', title: 'Sketch freely', text: 'Ideal parts first, real ones later', icon: <DrawOutlinedIcon /> },
  { kind: 'template', title: 'From a template', text: 'A working instrument to change', icon: <ContentCopyOutlinedIcon /> },
  { kind: 'box', title: 'From a box', text: 'Only the parts in your kit', icon: <Inventory2OutlinedIcon /> },
  { kind: 'import', title: 'Import a file', text: 'A design you already have', icon: <FileUploadOutlinedIcon /> },
];

/** Optical design files the optics importer will read; until it is in, they are named, not read. */
const OPTICS_FILE = /\.(zmx|zos|json)$/i;

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
 * New project (UI-V4 §2, Projects): sketch freely, start from a template or
 * a box, or import a file; name it, and create it. The app opens each start
 * with the panes it needs (PrototypeApp's START_OPENS).
 */
export function NewProjectDialog({ open, templates, boxes, drawings = {}, onClose, onCreate }: NewProjectDialogProps) {
  const [kind, setKind] = useState<StartKind>('template');
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [boxId, setBoxId] = useState(boxes[0]?.id ?? '');
  const [imported, setImported] = useState<{ design: Schematic; fileName: string } | null>(null);
  const [importNote, setImportNote] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const readFile = async (file: File) => {
    const design = readDesignFile(await file.text());
    if (design) {
      setImported({ design, fileName: file.name });
      setImportNote(null);
    } else {
      setImported(null);
      setImportNote(
        OPTICS_FILE.test(file.name)
          ? `${file.name}: Zemax and Optiland files open once the optics importer is in. Until then, sketch the system, or open an Optikit file.`
          : `${file.name} is not an Optikit design file.`,
      );
    }
  };
  // The name follows the choice until the user types one of their own.
  const [typedName, setTypedName] = useState<string | null>(null);

  const template = templates.find((t) => t.id === templateId);
  const box = boxes.find((b) => b.id === boxId);
  const suggested =
    kind === 'template' && template
      ? `My ${template.name}`
      : kind === 'box' && box
        ? `My ${box.name.replace(/^.*\| /, '')} project`
        : kind === 'import' && imported
          ? imported.fileName.replace(/\.[^.]+$/, '')
          : 'Untitled project';
  const name = typedName ?? suggested;
  const start: ProjectStart | null =
    kind === 'template' ? { kind, id: templateId } : kind === 'box' ? { kind, id: boxId } : kind === 'import' ? imported && { kind, ...imported } : { kind };

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
            <Typography variant="h1" component="h2">
              New project
            </Typography>
            <Typography color="text.secondary">One design file. You can add, swap and remove parts any time.</Typography>
          </Box>
          <IconButton aria-label="Close" onClick={onClose} sx={{ mt: -1, mr: -1 }}>
            <CloseIcon />
          </IconButton>
        </Stack>

        <Box role="radiogroup" aria-label="Start from" sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
          {STARTS.map((s) => (
            <ButtonBase key={s.kind} role="radio" aria-checked={kind === s.kind} onClick={() => setKind(s.kind)} sx={{ ...choiceSx(kind === s.kind), justifyContent: 'flex-start', p: 2, gap: 0.5 }}>
              <Box sx={{ color: kind === s.kind ? 'text.primary' : 'text.secondary', mb: 0.5 }}>{s.icon}</Box>
              <Typography variant="subtitle1">{s.title}</Typography>
              <Typography variant="meta" color="text.meta">
                {s.text}
              </Typography>
            </ButtonBase>
          ))}
        </Box>

        {kind === 'sketch' && (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            An empty grid with the sketch open: place a lens, a mirror or a source by what it does, and Simulate shows at once whether the light gets where it should.
            Choose real parts, and their cubes, when the optics work.
          </Typography>
        )}

        {kind === 'import' && (
          <Stack spacing={1.5} sx={{ py: 1 }}>
            <Box
              component="input"
              ref={fileInput}
              type="file"
              accept={`${DESIGN_FILE_EXTENSION},.zmx,.zos,.json`}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (file) void readFile(file);
                e.target.value = '';
              }}
              sx={{ display: 'none' }}
            />
            <ButtonBase
              onClick={() => fileInput.current?.click()}
              sx={{ ...choiceSx(Boolean(imported)), flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 1.5, p: 2.5, borderStyle: imported ? 'solid' : 'dashed' }}
            >
              <FileUploadOutlinedIcon color={imported ? 'inherit' : 'disabled'} />
              <Box>
                <Typography variant="subtitle1">{imported ? imported.fileName : 'Choose a file'}</Typography>
                <Typography variant="meta" color="text.meta">
                  {imported
                    ? `${imported.design.symbols.length} parts · opens with its parts list and Choose parts, to make the ideal parts real`
                    : `An Optikit design (${DESIGN_FILE_EXTENSION}). Zemax (.zmx) and Optiland (.json) once the optics importer is in.`}
                </Typography>
              </Box>
            </ButtonBase>
            {importNote && (
              <Typography variant="body2" color="warning.main">
                {importNote}
              </Typography>
            )}
          </Stack>
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
            <PillButton disabled={!name.trim() || !start} onClick={() => start && onCreate({ name: name.trim(), start })}>
              Create
            </PillButton>
          </Stack>
        </Stack>
      </Stack>
    </Dialog>
  );
}
