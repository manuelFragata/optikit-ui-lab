import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import NewReleasesOutlinedIcon from '@mui/icons-material/NewReleasesOutlined';
import OndemandVideoOutlinedIcon from '@mui/icons-material/OndemandVideoOutlined';
import RocketLaunchOutlinedIcon from '@mui/icons-material/RocketLaunchOutlined';
import {
  demoForumThreads,
  demoHelpLinks,
  demoInspiration,
  demoProjects,
  demoReleaseNotes,
  type ProjectSummary,
} from '../../demo/homeContent';
import { CubeThumbnail } from '../cards/CubeThumbnail';
import { DashboardCard } from '../cards/DashboardCard';
import { DesignCard } from '../cards/DesignCard';
import { StackedCards } from '../cards/StackedCards';
import { SiteHeader } from '../compositions/SiteHeader';
import { TagChip } from '../primitives/TagChip';

export interface HomePageProps {
  signedIn?: boolean;
  userName?: string;
  /** Pass [] to see the empty state. */
  projects?: ProjectSummary[];
  /** Forum / release-notes auto-advance in ms; 0 turns it off. */
  autoAdvanceMs?: number;
  onOpenProject?: (id: string) => void;
  onNewProject?: () => void;
  onLogIn?: () => void;
  onSignUp?: () => void;
  onHome?: () => void;
}

const HELP_ICONS: Record<string, ReactNode> = {
  start: <RocketLaunchOutlinedIcon fontSize="small" />,
  docs: <MenuBookOutlinedIcon fontSize="small" />,
  video: <OndemandVideoOutlinedIcon fontSize="small" />,
  issue: <BugReportOutlinedIcon fontSize="small" />,
};

function ProjectRow({ project, onOpen }: { project: ProjectSummary; onOpen?: () => void }) {
  return (
    <ListItemButton onClick={onOpen} sx={{ gap: 2, py: 1, px: 2.5, borderTop: 1, borderColor: 'divider' }}>
      <Box sx={{ width: (theme) => theme.spacing(12), flexShrink: 0, borderRadius: 0.5, overflow: 'hidden' }}>
        <CubeThumbnail cubes={project.cubes} size="compact" />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" noWrap>
          {project.name}
        </Typography>
        <Typography variant="mono" color="text.secondary" noWrap component="div">
          v{project.version} · {project.symbols} symbols · edited {project.edited}
        </Typography>
      </Box>
      <TagChip
        label={project.status}
        tone={project.status === 'Published' ? 'success' : 'neutral'}
        dot
        sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
      />
      <ChevronRightIcon fontSize="small" sx={{ color: 'text.secondary' }} />
    </ListItemButton>
  );
}

function ProjectsEmpty({ signedIn, onLogIn, onNewProject }: Pick<HomePageProps, 'signedIn' | 'onLogIn' | 'onNewProject'>) {
  return (
    <Stack spacing={1.5} sx={{ alignItems: 'flex-start', py: 3, px: 2.5, borderTop: 1, borderColor: 'divider' }}>
      <Typography variant="body1">{signedIn ? 'No projects yet.' : 'Log in to see your projects.'}</Typography>
      <Typography variant="body2" color="text.secondary">
        {signedIn
          ? 'Start from an empty canvas or fork one of the designs below.'
          : 'You can also start a design without an account and save it later.'}
      </Typography>
      <Stack direction="row" spacing={1}>
        {!signedIn && (
          <Button variant="contained" onClick={onLogIn}>
            Log in
          </Button>
        )}
        <Button variant={signedIn ? 'contained' : 'outlined'} startIcon={<AddIcon />} onClick={onNewProject}>
          New project
        </Button>
      </Stack>
    </Stack>
  );
}

function ForumList() {
  return (
    <List disablePadding>
      {demoForumThreads.map((thread) => (
        <ListItemButton key={thread.id} sx={{ display: 'block', px: 2.5, py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="body2" sx={{ fontWeight: 'fontWeightMedium' }}>
            {thread.title}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
            <TagChip label={thread.category} />
            <Typography variant="mono" color="text.secondary">
              @{thread.author} · {thread.replies} replies · {thread.lastActivity}
            </Typography>
          </Stack>
        </ListItemButton>
      ))}
      <Box sx={{ px: 2.5, py: 1.5 }}>
        <Link href="#" variant="body2">
          Open the forum
        </Link>
      </Box>
    </List>
  );
}

function ReleaseNotesList() {
  return (
    <Stack spacing={2} sx={{ px: 2.5, py: 2 }}>
      {demoReleaseNotes.map((note, i) => (
        <Box key={note.version}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', mb: 0.5 }}>
            <Typography variant="subtitle2">v{note.version}</Typography>
            {i === 0 && <TagChip label="Current" tone="success" dot />}
            <Box sx={{ flex: 1 }} />
            <Typography variant="mono" color="text.secondary">
              {note.date}
            </Typography>
          </Stack>
          <Box component="ul" sx={{ m: 0, pl: 2.5, color: 'text.secondary', typography: 'body2' }}>
            {note.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </Box>
        </Box>
      ))}
      <Link href="#" variant="body2">
        All release notes
      </Link>
    </Stack>
  );
}

/** Optikit front page: projects, inspiration, forum / release notes, help. */
export function HomePage({
  signedIn = true,
  userName = 'Beni',
  projects = demoProjects,
  autoAdvanceMs = 7000,
  onOpenProject,
  onNewProject,
  onLogIn,
  onSignUp,
  onHome,
}: HomePageProps) {
  const showProjects = signedIn && projects.length > 0;

  return (
    <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <SiteHeader signedIn={signedIn} onLogIn={onLogIn} onSignUp={onSignUp} onHome={onHome} />

      <Box
        component="main"
        sx={{
          width: '100%',
          maxWidth: (theme) => theme.spacing(theme.layout.pageMaxWidth),
          mx: 'auto',
          px: { xs: 2, md: 4 },
          py: { xs: 3, md: 5 },
        }}
      >
        <Stack spacing={0.5} sx={{ mb: 4 }}>
          <Typography
            variant="h1"
            sx={(theme) => ({
              color: (theme.vars ?? theme).palette.text.primary,
              ...theme.applyStyles('light', { color: (theme.vars ?? theme).palette.brand.anchor }),
            })}
          >
            {signedIn ? `Welcome back, ${userName}` : 'Design optical instruments from cubes'}</Typography>
          <Typography variant="body1" color="text.secondary">
            {signedIn
              ? 'Pick up where you left off, or start something new.'
              : 'Optikit turns openUC2 parts into schematics, parts lists and CAD you can build.'}
          </Typography>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gap: 3,
            alignItems: 'start',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 2fr) minmax(0, 1fr)' },
          }}
        >
          <Stack spacing={3} sx={{ minWidth: 0 }}>
            <DashboardCard
              title="Your projects"
              icon={<FolderOpenOutlinedIcon />}
              subtitle={showProjects ? `${projects.length} designs, most recent first` : undefined}
              flush
              action={
                showProjects && (
                  <Button variant="contained" startIcon={<AddIcon />} onClick={onNewProject}>
                    New project
                  </Button>
                )
              }
            >
              {showProjects ? (
                <List disablePadding>
                  {projects.map((project) => (
                    <ProjectRow key={project.id} project={project} onOpen={() => onOpenProject?.(project.id)} />
                  ))}
                </List>
              ) : (
                <ProjectsEmpty signedIn={signedIn} onLogIn={onLogIn} onNewProject={onNewProject} />
              )}
            </DashboardCard>

            <DashboardCard
              title="Need inspiration?"
              icon={<LightbulbOutlinedIcon />}
              subtitle="Featured designs from the community. Open one, fork it, make it yours."
              action={
                <Link href="#" variant="body2">
                  Browse all
                </Link>
              }
            >
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(3, minmax(0, 1fr))' },
                }}
              >
                {demoInspiration.map((design) => (
                  <DesignCard key={design.title} {...design} />
                ))}
              </Box>
            </DashboardCard>
          </Stack>

          <Stack spacing={3} sx={{ minWidth: 0 }}>
            <StackedCards
              aria-label="Community and releases"
              autoAdvanceMs={autoAdvanceMs}
              items={[
                { id: 'forum', label: 'Community forum', icon: <ForumOutlinedIcon fontSize="small" />, content: <ForumList /> },
                { id: 'releases', label: 'Release notes', icon: <NewReleasesOutlinedIcon fontSize="small" />, content: <ReleaseNotesList /> },
              ]}
            />

            <DashboardCard title="Need help?" icon={<HelpOutlineIcon />} flush>
              <List disablePadding>
                {demoHelpLinks.map((link) => (
                  <ListItemButton
                    key={link.id}
                    component="a"
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    sx={{ px: 2.5, borderTop: 1, borderColor: 'divider' }}
                  >
                    <ListItemIcon sx={{ color: 'text.secondary' }}>{HELP_ICONS[link.id]}</ListItemIcon>
                    <ListItemText primary={link.title} secondary={link.description} />
                    <ChevronRightIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </ListItemButton>
                ))}
              </List>
            </DashboardCard>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
