import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Typography from '@mui/material/Typography';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import SchemaOutlinedIcon from '@mui/icons-material/SchemaOutlined';

export interface ProjectFileData {
  id: string;
  name: string;
  kind: 'design' | 'export' | 'doc';
  size: string;
  updated: string;
}

export interface FilesPanelProps {
  files: ProjectFileData[];
}

const ICONS = {
  design: <SchemaOutlinedIcon sx={{ fontSize: '1.1rem' }} />,
  export: <FileDownloadOutlinedIcon sx={{ fontSize: '1.1rem' }} />,
  doc: <ArticleOutlinedIcon sx={{ fontSize: '1.1rem' }} />,
};

const SECTIONS: { kind: ProjectFileData['kind']; label: string }[] = [
  { kind: 'design', label: 'Design' },
  { kind: 'export', label: 'Exports' },
  { kind: 'doc', label: 'Documents' },
];

/** Files that belong to the project: the design, generated exports and docs. */
export function FilesPanel({ files }: FilesPanelProps) {
  return (
    <Box sx={{ py: 1 }}>
      {SECTIONS.map(({ kind, label }) => {
        const list = files.filter((f) => f.kind === kind);
        if (list.length === 0) return null;
        return (
          <Box key={kind} sx={{ mb: 1 }}>
            <Typography variant="overline" color="text.secondary" component="div" sx={{ px: 2, py: 0.5 }}>
              {label}
            </Typography>
            <List disablePadding>
              {list.map((f) => (
                <ListItemButton key={f.id} sx={{ gap: 1.5, px: 2, py: 0.5 }}>
                  <Box sx={{ display: 'flex', color: 'text.secondary' }}>{ICONS[f.kind]}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {f.name}
                    </Typography>
                    <Typography variant="mono" color="text.meta" component="div">
                      {f.size} · {f.updated}
                    </Typography>
                  </Box>
                </ListItemButton>
              ))}
            </List>
          </Box>
        );
      })}
    </Box>
  );
}
