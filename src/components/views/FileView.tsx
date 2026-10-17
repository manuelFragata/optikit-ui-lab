import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Stack from '@mui/material/Stack';
import CloudDownloadOutlinedIcon from '@mui/icons-material/CloudDownloadOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import HistoryIcon from '@mui/icons-material/History';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import type { ProjectFileData } from './file/ProjectFiles';
import type { VersionEntryData } from '../editor/panels/HistoryPanel';
import { PageContainer } from '../compositions/PageContainer';
import { InfoSection, type DesignInfo } from './file/InfoSection';
import { ShareSection, type LinkAccess, type SharePerson } from './file/ShareSection';
import { ExportSection, ImportSection } from './file/TransferSection';
import { type ExportId, type ImportId } from './file/formats';
import { VersionsSection } from './file/VersionsSection';
import { PageHeader } from './PageHeader';

export type FileSection = 'info' | 'versions' | 'share' | 'export' | 'import';

const SECTIONS: { id: FileSection; label: string; icon: ReactNode; text: string }[] = [
  { id: 'info', label: 'Info', icon: <InfoOutlinedIcon fontSize="small" />, text: 'The design, its licence and files; new, open, save a copy.' },
  { id: 'versions', label: 'Versions', icon: <HistoryIcon fontSize="small" />, text: 'Save a version, see what changed, go back to one.' },
  { id: 'share', label: 'Share', icon: <PeopleOutlineIcon fontSize="small" />, text: 'Who can see the design, and who can change it.' },
  { id: 'export', label: 'Export', icon: <CloudDownloadOutlinedIcon fontSize="small" />, text: 'The design as files: to open again, to buy, to build, for CAD.' },
  { id: 'import', label: 'Import', icon: <CloudUploadOutlinedIcon fontSize="small" />, text: 'Bring in a design, an optical design, a CAD part or a catalogue part.' },
];

export interface FileViewProps {
  name: string;
  version?: string;
  info: DesignInfo;
  files: ProjectFileData[];
  versions: VersionEntryData[];
  people: SharePerson[];
  link: string;
  /** The section it opens on. */
  section?: FileSection;
  onRename: (name: string) => void;
  onNewProject: () => void;
  onOpenProjects: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onExport: (id: ExportId) => void;
  onImport: (id: ImportId, file: File) => void;
  /** Tell the person what happened, for what the prototype only pretends to do (saved, restored, invited, copied). */
  onNotice: (text: string) => void;
}

/** A save's id, as a short hash. */
const newHash = () => Math.random().toString(16).slice(2, 9);

/**
 * File (UI-V4 §2): the design as a document. Info, versions, sharing, export
 * and import, one section at a time, as in an office suite's File tab. The
 * versions, the people and the link's access are kept here while the tab is
 * open; in the product they are the service's.
 */
export function FileView({ name, version, info, files, versions: initialVersions, people: initialPeople, link, section: initialSection = 'info', onNotice, ...actions }: FileViewProps) {
  const [section, setSection] = useState<FileSection>(initialSection);
  const [versions, setVersions] = useState(initialVersions);
  const [people, setPeople] = useState(initialPeople);
  const [access, setAccess] = useState<LinkAccess>('invited');
  const [license, setLicense] = useState(info.license);
  const current = SECTIONS.find((s) => s.id === section)!;

  const addVersion = (message: string) => setVersions([{ hash: newHash(), message, when: 'just now', author: 'you' }, ...versions]);

  return (
    <PageContainer sx={{ pt: 3, pb: 8 }}>
      <PageHeader title="File" lead={`${name}${version ? ` v${version}` : ''}. ${current.text}`} />

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '200px 1fr' }, alignItems: 'start' }}>
        <Stack component="nav" aria-label="File" sx={{ gap: 0.5, flexDirection: { xs: 'row', md: 'column' }, flexWrap: 'wrap' }}>
          {SECTIONS.map((s) => {
            const on = s.id === section;
            return (
              <ButtonBase
                key={s.id}
                aria-current={on ? 'page' : undefined}
                onClick={() => setSection(s.id)}
                sx={(t) => ({
                  justifyContent: 'flex-start',
                  gap: 1.25,
                  px: 2,
                  py: 1,
                  borderRadius: `${t.radius.pill}px`,
                  typography: 'subtitle2',
                  bgcolor: on ? 'text.primary' : 'transparent',
                  color: on ? 'background.paper' : 'text.secondary',
                  transition: 'background-color 200ms, color 200ms',
                  '&:hover': { color: on ? 'background.paper' : 'text.primary' },
                })}
              >
                {s.icon}
                {s.label}
              </ButtonBase>
            );
          })}
        </Stack>

        <Box>
          {section === 'info' && <InfoSection name={name} info={info} files={files} license={license} onLicense={setLicense} {...actions} />}
          {section === 'versions' && (
            <VersionsSection
              versions={versions}
              onSave={(message) => {
                addVersion(message);
                onNotice('Version saved.');
              }}
              onRestore={(entry) => {
                const label = entry.version ? `v${entry.version}` : entry.hash;
                addVersion(`Restore ${label}`);
                onNotice(`${label} is the current version again, saved on top of the others.`);
              }}
            />
          )}
          {section === 'share' && (
            <ShareSection
              link={link}
              access={access}
              people={people}
              onAccess={setAccess}
              onRole={(email, role) => setPeople(role ? people.map((p) => (p.email === email ? { ...p, role } : p)) : people.filter((p) => p.email !== email))}
              onInvite={(email, role) => {
                setPeople([...people, { name: email.split('@')[0], email, role }]);
                onNotice(`Invitation sent to ${email}.`);
              }}
              onCopyLink={() => {
                navigator.clipboard?.writeText(link).catch(() => {});
                onNotice('Link copied.');
              }}
            />
          )}
          {section === 'export' && <ExportSection onExport={actions.onExport} />}
          {section === 'import' && <ImportSection onImport={actions.onImport} />}
        </Box>
      </Box>
    </PageContainer>
  );
}
