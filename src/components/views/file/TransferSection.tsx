import { useRef, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { cardSx } from '../card';
import { EXPORTS, IMPORTS, type ExportId, type Format, type ImportId } from './formats';

function FormatCard<Id extends string>({ format, action }: { format: Format<Id>; action: ReactNode }) {
  return (
    <Box sx={(t) => ({ ...cardSx(t), display: 'flex', flexDirection: 'column', gap: 1, opacity: format.later ? 0.7 : 1 })}>
      <Typography variant="subtitle1">
        {format.title}{' '}
        <Typography component="span" variant="mono" color="text.meta">
          {format.file}
        </Typography>
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
        {format.text}
      </Typography>
      {format.later && (
        <Typography variant="meta" color="text.meta">
          {format.later}
        </Typography>
      )}
      <Box>{action}</Box>
    </Box>
  );
}

const grid = { display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' } as const;

/** Export: every way the design goes out. */
export function ExportSection({ onExport }: { onExport: (id: ExportId) => void }) {
  return (
    <Box sx={grid}>
      {EXPORTS.map((f) => (
        <FormatCard
          key={f.id}
          format={f}
          action={
            <Button variant="outlined" disabled={Boolean(f.later)} onClick={() => onExport(f.id)}>
              {f.id === 'link' ? 'Copy link' : 'Download'}
            </Button>
          }
        />
      ))}
    </Box>
  );
}

/** Import: every way something comes in, each from a file picked here. */
export function ImportSection({ onImport }: { onImport: (id: ImportId, file: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const picking = useRef<ImportId>('archive');
  return (
    <Box sx={grid}>
      <input
        ref={input}
        type="file"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImport(picking.current, file);
          e.target.value = '';
        }}
      />
      {IMPORTS.map((f) => (
        <FormatCard
          key={f.id}
          format={f}
          action={
            <Button
              variant="outlined"
              disabled={Boolean(f.later)}
              onClick={() => {
                picking.current = f.id;
                input.current?.click();
              }}
            >
              Choose file
            </Button>
          }
        />
      ))}
    </Box>
  );
}
