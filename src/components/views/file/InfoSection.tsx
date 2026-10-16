import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { TagChip } from '../../primitives/TagChip';
import { cardSx } from '../card';
import { Titled } from '../Titled';
import { LICENSE_HELP, LICENSES, licenseById } from './licenses';
import { ProjectFiles, type ProjectFileData } from './ProjectFiles';

export interface DesignInfo {
  description: string;
  maintainer: string;
  created: string;
  license: string;
  tags: string[];
}

export interface InfoSectionProps {
  name: string;
  info: DesignInfo;
  files: ProjectFileData[];
  /** The licence's SPDX id (see licenses.ts); empty while none is chosen. */
  license: string;
  onLicense: (id: string) => void;
  onRename: (name: string) => void;
  onNewProject: () => void;
  onOpenProjects: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/** The design itself: its name and what it is, its licence, the files that come with it, and new, open, save a copy, delete. */
export function InfoSection({ name, info, files, license, onLicense, onRename, onNewProject, onOpenProjects, onDuplicate, onDelete }: InfoSectionProps) {
  const [draft, setDraft] = useState(name);
  const rename = () => draft.trim() && draft.trim() !== name && onRename(draft.trim());
  const chosen = licenseById(license);
  // Grouped as Open hardware, Creative Commons, Closed; the Select needs them flat.
  const options = LICENSES.flatMap((l, i) => [
    ...(l.group !== LICENSES[i - 1]?.group ? [<ListSubheader key={l.group}>{l.group}</ListSubheader>] : []),
    <MenuItem key={l.id} value={l.id} sx={{ display: 'block', whiteSpace: 'normal' }}>
      {l.name}
      <Typography variant="meta" color="text.meta" component="div">
        {l.summary}
      </Typography>
    </MenuItem>,
  ]);

  return (
    <Stack sx={{ gap: 3 }}>
      <Titled title="About">
        <Box sx={cardSx}>
          <TextField
            label="Name"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={rename}
            onKeyDown={(e) => e.key === 'Enter' && rename()}
            fullWidth
          />
          {info.description && (
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              {info.description}
            </Typography>
          )}
          {info.tags.length > 0 && (
            <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
              {info.tags.map((t) => (
                <TagChip key={t} label={t} />
              ))}
            </Stack>
          )}
          <Typography variant="meta" color="text.meta" sx={{ display: 'block', mt: 1.5 }}>
            @{info.maintainer} · created {info.created}
          </Typography>
        </Box>
      </Titled>

      <Titled title="Licence">
        <Box sx={cardSx}>
          <Select
            size="small"
            fullWidth
            displayEmpty
            value={license}
            onChange={(e) => onLicense(e.target.value)}
            renderValue={(id) => licenseById(id)?.name ?? 'Not chosen yet'}
            aria-label="Licence"
          >
            {options}
          </Select>
          {!chosen && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Until you choose one, the design is yours alone: others may look at what you share, but not build or change it.
            </Typography>
          )}
          {chosen && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                {chosen.summary}
              </Typography>
              <Stack direction="row" useFlexGap sx={{ gap: 2.5, flexWrap: 'wrap', mt: 1.5 }}>
                {chosen.url && <ExternalLink href={chosen.url}>Read the licence</ExternalLink>}
                {chosen.group === 'Open hardware' && <ExternalLink href={LICENSE_HELP}>Which CERN OHL to choose</ExternalLink>}
              </Stack>
            </>
          )}
        </Box>
      </Titled>

      <Titled title="Files that come with it">
        <ProjectFiles files={files} />
      </Titled>

      <Stack direction="row" useFlexGap sx={{ gap: 1.5, flexWrap: 'wrap' }}>
        <Button variant="outlined" onClick={onNewProject}>
          New project
        </Button>
        <Button variant="outlined" onClick={onOpenProjects}>
          Open…
        </Button>
        <Button variant="outlined" onClick={onDuplicate}>
          Save a copy
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button color="error" onClick={onDelete}>
          Delete design
        </Button>
      </Stack>
    </Stack>
  );
}

/** A link to another site, opened in a new tab. */
function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" variant="body2" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      {children}
      <OpenInNewIcon sx={{ fontSize: '0.9rem' }} />
    </Link>
  );
}
