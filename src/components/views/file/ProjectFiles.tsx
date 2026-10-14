import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Typography from '@mui/material/Typography';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import SchemaOutlinedIcon from '@mui/icons-material/SchemaOutlined';
import { cardSx } from '../card';

export interface ProjectFileData {
  id: string;
  name: string;
  kind: 'design' | 'export' | 'doc';
  size: string;
  updated: string;
}

const ICONS = {
  design: <SchemaOutlinedIcon sx={{ fontSize: '1.1rem' }} />,
  export: <FileDownloadOutlinedIcon sx={{ fontSize: '1.1rem' }} />,
  doc: <ArticleOutlinedIcon sx={{ fontSize: '1.1rem' }} />,
};

const COLUMNS: { kind: ProjectFileData['kind']; label: string }[] = [
  { kind: 'design', label: 'Design' },
  { kind: 'export', label: 'Exports' },
  { kind: 'doc', label: 'Documents' },
];

/** The files that come with the design, side by side: the design, generated exports, and docs. */
export function ProjectFiles({ files }: { files: ProjectFileData[] }) {
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, alignItems: 'start' }}>
      {COLUMNS.map(({ kind, label }) => {
        const list = files.filter((f) => f.kind === kind);
        return (
          <Box key={kind}>
            <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
              {label}
            </Typography>
            <Box sx={(t) => ({ ...cardSx(t), px: 1, py: 1 })}>
              {list.length === 0 ? (
                <Typography variant="body2" color="text.meta" sx={{ px: 1.5, py: 0.5 }}>
                  None yet
                </Typography>
              ) : (
                <List disablePadding>
                  {list.map((f) => (
                    <ListItemButton key={f.id} sx={(t) => ({ gap: 1.5, px: 1.5, py: 0.5, borderRadius: `${t.radius.tile}px` })}>
                      <Box sx={{ display: 'flex', color: 'text.secondary' }}>{ICONS[f.kind]}</Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" noWrap>
                          {f.name}
                        </Typography>
                        <Typography variant="meta" color="text.meta" component="div">
                          {f.size} · {f.updated}
                        </Typography>
                      </Box>
                    </ListItemButton>
                  ))}
                </List>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
