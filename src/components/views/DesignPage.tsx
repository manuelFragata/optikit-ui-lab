import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IosShareIcon from '@mui/icons-material/IosShare';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import type { DesignDetail } from '../../api/types';
import { CubeThumbnail } from '../cards/CubeThumbnail';
import { PageContainer } from '../compositions/PageContainer';
import { HistoryPanel } from '../editor/panels/HistoryPanel';
import { Pill } from '../primitives/Pill';

export interface DesignPageProps {
  design: DesignDetail;
  /** A live 3D view or drawing of the design; a cube thumbnail when there is none. */
  preview?: ReactNode;
  onBack: () => void;
  /** Where the back button goes, e.g. "Explore". */
  backLabel?: string;
  /** Open the design in the editor (its View tab). */
  onEdit: () => void;
  onExport?: () => void;
  onShare?: () => void;
  /** Inside another surface (a project's document): no page margins of its own. */
  embedded?: boolean;
}

/** Wide enough for the picture and the facts side by side; it is the page's own width that counts, not the window's. */
const TWO_COLUMNS = '@container (min-width: 760px)';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box component="section">
      <Typography variant="overline" component="h2" color="text.secondary">
        {title}
      </Typography>
      {children}
    </Box>
  );
}

/**
 * A design's page (UI-V4 §2): 3D preview, the parts it needs, where it is
 * used, and its versions. Shown in Explore, and inside a project's document.
 */
export function DesignPage({ design, preview, onBack, backLabel = 'Explore', onEdit, onExport, onShare, embedded }: DesignPageProps) {
  const body = (
    // The layout answers to this box's width, so the page fits a full screen and a document alike.
    <Box sx={{ containerType: 'inline-size' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ ml: -1 }}>
        {backLabel}
      </Button>

      <Stack spacing={2} useFlexGap sx={{ mt: 1, [TWO_COLUMNS]: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' } }}>
        <Box>
          <Typography variant="caption" color="primary" sx={{ textTransform: 'capitalize' }}>
            {design.kind}
          </Typography>
          <Typography variant="headline" component="h1">
            {design.name}
          </Typography>
          <Typography variant="meta" color="text.secondary">
            v{design.version} · @{design.maintainer} · updated {design.updated}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={onExport}>
            Export
          </Button>
          <Button variant="outlined" startIcon={<IosShareIcon />} onClick={onShare}>
            Share
          </Button>
          <Button variant="contained" onClick={onEdit}>
            Open in editor
          </Button>
        </Stack>
      </Stack>

      {design.description && <Typography sx={{ mt: 2, maxWidth: 720 }}>{design.description}</Typography>}
      {design.tags.length > 0 && (
        <Stack direction="row" useFlexGap spacing={0.5} sx={{ flexWrap: 'wrap', mt: 1.5 }}>
          {design.tags.map((tag) => (
            <Pill key={tag}>#{tag}</Pill>
          ))}
        </Stack>
      )}

      <Box sx={{ display: 'grid', gap: 3, mt: 3, gridTemplateColumns: '1fr', [TWO_COLUMNS]: { gridTemplateColumns: '3fr 2fr' } }}>
        <Paper variant="outlined" sx={{ overflow: 'hidden', aspectRatio: '4 / 3', display: 'grid', position: 'relative' }}>
          {preview ?? <CubeThumbnail cubes={Math.min(design.cubes, 6)} layout={design.kind === 'collection' ? 'mosaic' : 'row'} />}
        </Paper>

        <Stack spacing={3}>
          {design.parts.length > 0 && (
            <Section title="Parts">
              <Box component="ul" sx={{ m: 0, mt: 1, p: 0, listStyle: 'none' }}>
                {design.parts.map((part) => (
                  <Stack component="li" key={part.name} direction="row" spacing={1} sx={{ py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="mono" sx={{ width: 32, flexShrink: 0 }}>
                      {part.qty}×
                    </Typography>
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {part.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {part.source}
                    </Typography>
                  </Stack>
                ))}
              </Box>
            </Section>
          )}

          {design.usedIn.length > 0 && (
            <Section title="Used in">
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {design.usedIn.join(' · ')}
              </Typography>
            </Section>
          )}
        </Stack>
      </Box>

      {design.versions.length > 0 && (
        <Box sx={{ mt: 4, maxWidth: 720 }}>
          <Section title="Versions">
            <HistoryPanel entries={design.versions} />
          </Section>
        </Box>
      )}
    </Box>
  );

  return embedded ? body : <PageContainer sx={{ py: 3 }}>{body}</PageContainer>;
}
