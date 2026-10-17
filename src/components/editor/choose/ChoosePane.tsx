/**
 * Choose parts, beside the canvas (the canvas splits, as for the close-up):
 * from a sketch to real parts. The design's parts down the left in the order
 * the light meets them, each with where it stands; on the right, what the
 * current one could become, best first, each a part and its cube together
 * where the library has one. One pick makes the part real and moves on to the
 * next sketched one. The keys: ↑ ↓ go through the parts, Enter takes the
 * first choice, 1 to 9 that one.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import UndoIcon from '@mui/icons-material/Undo';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import { Failed, Waiting } from '../../primitives/RequestState';
import type { Light } from '../../../ports/light';
import { useRequest } from '../../../ports/request';
import type { Choice } from '../../../ports/service';
import { sketched, specLine, type Schematic, type SchematicSymbol } from '../model';
import { inLightOrder, statusOf, type ChoiceStatus } from './order';

export interface ChoosePaneProps {
  design: Schematic;
  light: Light;
  /** What an ideal part could become, best first: the service's answer. */
  choicesFor: (s: SchematicSymbol) => Promise<Choice[]>;
  /** The part selected on the canvas: the one being chosen for. */
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** A part made real (or back to its sketch): one edit. */
  onChoose: (id: string, patch: Partial<SchematicSymbol>) => void;
  /** Design a holder for a chosen part (the close-up's designer). */
  onDesignHolder: (id: string) => void;
  onClose: () => void;
}

/** A row's state as the Simulate list shows one: a dot and a word, in the tone's colour. */
const STATUS: Record<ChoiceStatus, { label: string; color: string }> = {
  ideal: { label: 'Sketch', color: 'primary.main' },
  chosen: { label: 'Holder needed', color: 'warning.main' },
  cube: { label: 'In a cube', color: 'success.main' },
};

const Status = ({ status }: { status: ChoiceStatus }) => (
  <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, flexShrink: 0, mt: 0.25 }}>
    <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: STATUS[status].color }} />
    <Typography variant="caption" sx={{ color: STATUS[status].color, whiteSpace: 'nowrap' }}>
      {STATUS[status].label}
    </Typography>
  </Stack>
);

/** How many choices show before "All". */
const SHOWN = 6;

function ChoiceRow({ choice, n, onPick }: { choice: Choice; n: number; onPick: () => void }) {
  return (
    <ButtonBase
      onClick={onPick}
      sx={(t) => ({
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.25,
        textAlign: 'left',
        p: 1.25,
        borderRadius: 1,
        border: `${t.layout.hairline}px solid ${(t.vars ?? t).palette.divider}`,
        '&:hover, &.Mui-focusVisible': { borderColor: 'primary.main', bgcolor: 'primary.soft' },
      })}
    >
      <Typography variant="mono" color="text.secondary" sx={{ width: 14, flexShrink: 0, pt: 0.25 }}>
        {n <= 9 ? n : ''}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
          {choice.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div" noWrap>
          {choice.detail}
        </Typography>
        {choice.differs.length === 0 ? (
          <Typography variant="caption" color="success.main" component="div">
            As specified
          </Typography>
        ) : (
          choice.differs.map((d) => (
            <Typography key={d} variant="caption" color="warning.main" component="div">
              {d}
            </Typography>
          ))
        )}
        {choice.cube ? (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.25, color: 'success.main' }}>
            <ViewInArOutlinedIcon sx={{ fontSize: '0.9rem' }} />
            <Typography variant="caption" noWrap>{`In ${choice.cube.module} · ${choice.cube.source}`}</Typography>
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.25 }}>
            {choice.holders.length ? `Holder needed · a ${choice.holders[0].toLowerCase()} can hold it` : 'Holder needed · no holder takes it yet'}
          </Typography>
        )}
      </Box>
    </ButtonBase>
  );
}

export function ChoosePane({ design, light, choicesFor, selectedId, onSelect, onChoose, onDesignHolder, onClose }: ChoosePaneProps) {
  const parts = useMemo(() => inLightOrder(design, light), [design, light]);
  const sketchedLeft = parts.filter((s) => statusOf(s) === 'ideal').length;
  const current = parts.find((s) => s.id === selectedId) ?? parts.find((s) => statusOf(s) === 'ideal') ?? parts[0];
  // Only a sketched part is asked about; the answer is for that part alone.
  const request = useRequest(current && statusOf(current) === 'ideal' ? current : null, choicesFor);
  const choices = request.data ?? [];
  const [all, setAll] = useState(false);
  const listed = all ? choices : choices.slice(0, SHOWN);
  const root = useRef<HTMLDivElement>(null);

  // The part being chosen for is the one selected on the canvas, so the canvas shows where it is.
  const currentId = current?.id;
  useEffect(() => {
    if (currentId && currentId !== selectedId) onSelect(currentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the pane picks a part the canvas has not
  }, [currentId]);
  useEffect(() => root.current?.focus(), []);
  useEffect(() => setAll(false), [currentId]);

  const go = (delta: number) => {
    if (!current || parts.length === 0) return;
    const at = parts.indexOf(current);
    onSelect(parts[(at + delta + parts.length) % parts.length].id);
  };

  /** Make it real, then on to the next sketched part. */
  const pick = (choice: Choice) => {
    if (!current) return;
    onChoose(current.id, choice.patch);
    const at = parts.indexOf(current);
    const next = [...parts.slice(at + 1), ...parts.slice(0, at)].find((s) => statusOf(s) === 'ideal');
    if (next) onSelect(next.id);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const n = Number(e.key);
    const ready = request.status === 'ready';
    const take = !ready ? undefined : e.key === 'Enter' ? choices[0] : n >= 1 && n <= 9 ? listed[n - 1] : undefined;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') go(e.key === 'ArrowDown' ? 1 : -1);
    else if (take) pick(take);
    else if (e.key !== 'Enter' && !(n >= 1 && n <= 9)) return;
    // The pane's keys, not the editor's (arrows would move the part).
    e.preventDefault();
    e.stopPropagation();
  };

  const status = current ? statusOf(current) : null;

  return (
    <Box ref={root} tabIndex={-1} onKeyDown={onKeyDown} sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, bgcolor: 'canvas.ground', outline: 'none' }}>
      <Stack
        direction="row"
        sx={(t) => ({ alignItems: 'center', gap: 1, minHeight: t.spacing(t.layout.panelHeaderHeight), pl: 2, pr: 0.5, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' })}
      >
        <Typography variant="subtitle2">Choose parts</Typography>
        <Typography variant="caption" color="text.meta">
          {sketchedLeft ? `${sketchedLeft} to choose` : 'All chosen'}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Close Choose parts">
          <IconButton aria-label="Close Choose parts" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Box
          component="nav"
          aria-label="Parts, in the order the light meets them"
          sx={{ width: 240, flexShrink: 0, overflow: 'auto', scrollbarWidth: 'thin', bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider', py: 0.5 }}
        >
          {parts.map((s, i) => {
            const status = statusOf(s);
            const on = s.id === current?.id;
            return (
              <ButtonBase
                key={s.id}
                onClick={() => onSelect(s.id)}
                aria-current={on}
                sx={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'flex-start',
                  gap: 1,
                  textAlign: 'left',
                  px: 1.5,
                  py: 0.75,
                  bgcolor: on ? 'primary.soft' : 'transparent',
                  '&:hover': { bgcolor: on ? 'primary.soft' : 'action.hover' },
                }}
              >
                <Typography variant="mono" color="text.meta" sx={{ width: 18, flexShrink: 0, pt: 0.25 }}>
                  {i + 1}
                </Typography>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: on ? 500 : 400 }}>
                    {s.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div" noWrap>
                    {s.placement.state === 'ideal' ? specLine(s) || s.kind : s.placement.state === 'unmounted' ? s.placement.part : s.placement.module}
                  </Typography>
                </Box>
                <Status status={status} />
              </ButtonBase>
            );
          })}
        </Box>

        <Stack component="section" aria-label="What it could be" sx={{ flex: 1, minWidth: 0, overflow: 'auto', scrollbarWidth: 'thin', p: 2, gap: 1.5 }}>
          {current && (
            <Box>
              <Typography variant="h6">{current.label}</Typography>
              <Typography variant="body2" color="text.secondary">
                {status === 'ideal'
                  ? `Sketched as ${specLine(current) || `a ${current.kind}`}`
                  : status === 'chosen'
                    ? `${current.placement.state === 'unmounted' && current.placement.part} · no holder yet`
                    : `In ${current.placement.state === 'in-cube' && current.placement.module} · ready to build`}
              </Typography>
            </Box>
          )}

          {status === 'ideal' &&
            (request.status === 'error' ? (
              <Failed message={request.error ?? ''} onRetry={request.retry} />
            ) : request.status === 'loading' ? (
              request.slow && <Waiting label="Getting the choices" rows={3} height={84} />
            ) : choices.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Nothing in the library or the catalogue is of this kind yet.
              </Typography>
            ) : (
              <>
                {listed.map((c, i) => (
                  <ChoiceRow key={c.key} choice={c} n={i + 1} onPick={() => pick(c)} />
                ))}
                {choices.length > SHOWN && (
                  <Button size="small" onClick={() => setAll(!all)} sx={{ alignSelf: 'flex-start', color: 'text.secondary' }}>
                    {all ? 'Fewer' : `All ${choices.length}`}
                  </Button>
                )}
              </>
            ))}

          {status === 'chosen' && current && (
            <Stack direction="row" spacing={1}>
              <Button variant="contained" size="small" startIcon={<ViewInArOutlinedIcon fontSize="small" />} onClick={() => onDesignHolder(current.id)}>
                Design a holder
              </Button>
              <Button
                size="small"
                startIcon={<UndoIcon fontSize="small" />}
                onClick={() => onChoose(current.id, { placement: sketched(current.placement), prescription: undefined })}
                sx={{ color: 'text.secondary' }}
              >
                Back to the sketch
              </Button>
            </Stack>
          )}
        </Stack>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.75, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
        ↑ ↓ parts · Enter takes the first · 1–9 takes that one
      </Typography>
    </Box>
  );
}
