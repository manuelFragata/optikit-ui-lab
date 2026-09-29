import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import GitHubIcon from '@mui/icons-material/GitHub';
import NewReleasesOutlinedIcon from '@mui/icons-material/NewReleasesOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import {
  demoForumThreads,
  demoGallery,
  demoProjects,
  demoReleaseNotes,
  demoShowcase,
  demoTutorials,
  type ProjectSummary,
} from '../../demo/homeContent';
import { BenchIllustration } from '../cards/BenchIllustration';
import { CubeThumbnail } from '../cards/CubeThumbnail';
import { DashboardCard } from '../cards/DashboardCard';
import { GalleryTile } from '../cards/GalleryTile';
import { StackedCards } from '../cards/StackedCards';
import { PageContainer } from '../compositions/PageContainer';
import { SiteFooter } from '../compositions/SiteFooter';
import { SiteHeader } from '../compositions/SiteHeader';
import { LandingPage, type LandingPageProps } from './LandingPage';
import { TagChip } from '../primitives/TagChip';
import { demoUser } from '../../demo/user';
import type { AccountUser } from '../compositions/AccountMenu';

export interface HomePageProps
  extends Pick<LandingPageProps, 'onOpenExample' | 'onBrowseGallery' | 'onChoosePlan' | 'onSection'> {
  /** Signed-in account, or `null` when signed out (shows the landing page). */
  user?: AccountUser | null;
  /** Pass [] to see the empty state. */
  projects?: ProjectSummary[];
  /** Community stack (and, signed out, example slideshow) auto-advance in ms; 0 turns it off. */
  autoAdvanceMs?: number;
  onOpenProject?: (id: string) => void;
  onNewProject?: () => void;
  onLogIn?: () => void;
  onSignUp?: () => void;
  onHome?: () => void;
  /** A gallery design was clicked. */
  onOpenDesign?: (id: string) => void;
  onAccount?: () => void;
  onLogOut?: () => void;
}

const tileRadius = (theme: { radius: { tile: number } }) => `${theme.radius.tile}px`;
const rowSx = { borderRadius: tileRadius, mx: 1, px: 1.5 } as const;

/* ------------------------------------------------------------------ */
/* Your projects                                                       */
/* ------------------------------------------------------------------ */

function ProjectsBody({
  signedIn,
  projects,
  onOpenProject,
  onNewProject,
  onLogIn,
}: Pick<HomePageProps, 'onOpenProject' | 'onNewProject' | 'onLogIn'> & { signedIn: boolean; projects: ProjectSummary[] }) {
  return (
    <List sx={{ py: 1 }}>
      <ListItemButton onClick={onNewProject} sx={{ ...rowSx, gap: 1.5, py: 1.25, color: 'primary.main' }}>
        <AddIcon fontSize="small" />
        <Typography variant="subtitle2" component="span">
          Start a new project
        </Typography>
      </ListItemButton>

      {signedIn && projects.length > 0 ? (
        projects.map((project) => (
          <ListItemButton key={project.id} onClick={() => onOpenProject?.(project.id)} sx={{ ...rowSx, gap: 1.5, py: 0.75 }}>
            <Box sx={{ width: (theme) => theme.spacing(9), flexShrink: 0, borderRadius: tileRadius, overflow: 'hidden' }}>
              <CubeThumbnail cubes={project.cubes} size="compact" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap>
                {project.name}
              </Typography>
              <Typography variant="meta" color="text.meta" noWrap component="div">
                v{project.version} · {project.edited}
              </Typography>
            </Box>
            {project.status === 'Published' && <TagChip label="Published" tone="success" dot />}
          </ListItemButton>
        ))
      ) : (
        <Box sx={{ px: 2.5, py: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            {signedIn ? (
              'No projects yet. Start one above, or open something from the gallery.'
            ) : (
              <>
                <Link component="button" variant="body2" onClick={onLogIn} sx={{ verticalAlign: 'baseline' }}>
                  Log in
                </Link>{' '}
                to see your projects. You can also start without an account and save later.
              </>
            )}
          </Typography>
        </Box>
      )}
    </List>
  );
}

/* ------------------------------------------------------------------ */
/* Need inspiration? (gallery)                                         */
/* ------------------------------------------------------------------ */

type GalleryFilter = 'all' | 'optikit' | 'community';

const FILTERS: { value: GalleryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'optikit', label: 'Shipped with Optikit' },
  { value: 'community', label: 'Community' },
];

function GalleryBody({ onOpenDesign }: { onOpenDesign?: (id: string) => void }) {
  const [filter, setFilter] = useState<GalleryFilter>('all');
  const items = demoGallery.filter((item) => filter === 'all' || item.source === filter);

  return (
    <Stack spacing={2} sx={{ flex: 1 }}>
      <Typography variant="body2" color="text.secondary">
        Ready-made systems that ship with Optikit, and designs shared by the community. Open one, fork it, make it yours.
      </Typography>
      <Stack direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: 'wrap' }} role="group" aria-label="Filter gallery">
        {FILTERS.map((f) => {
          const selected = f.value === filter;
          return (
            <Chip
              key={f.value}
              label={f.label}
              onClick={() => setFilter(f.value)}
              aria-pressed={selected}
              sx={
                selected
                  ? { bgcolor: 'primary.soft', color: 'primary.onSoft', '&:hover': { bgcolor: 'primary.soft' } }
                  : { bgcolor: 'background.sunken', color: 'text.secondary' }
              }
            />
          );
        })}
      </Stack>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', alignContent: 'start', flex: 1 }}>
        {items.map((item) => (
          <GalleryTile key={item.id} item={item} onOpen={() => onOpenDesign?.(item.id)} />
        ))}
      </Box>
      <Link href="#gallery" variant="body2" sx={{ alignSelf: 'flex-start' }}>
        Browse the full gallery
      </Link>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Need a hand? (tutorials)                                            */
/* ------------------------------------------------------------------ */

function TutorialsBody() {
  return (
    <List sx={{ py: 1 }}>
      {demoTutorials.map((t) => (
        <ListItemButton key={t.id} component="a" href={t.href} sx={{ ...rowSx, gap: 1.5, py: 0.75 }}>
          <Box
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: (theme) => theme.spacing(5),
              height: (theme) => theme.spacing(5),
              flexShrink: 0,
              borderRadius: tileRadius,
              bgcolor: 'background.sunken',
              color: 'text.secondary',
            }}
          >
            {t.format === 'Video' ? <PlayCircleOutlineIcon fontSize="small" /> : <ArticleOutlinedIcon fontSize="small" />}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap>
              {t.title}
            </Typography>
            <Typography variant="meta" color="text.meta">
              {t.format} · {t.length}
            </Typography>
          </Box>
          <ChevronRightIcon fontSize="small" sx={{ color: 'text.meta' }} />
        </ListItemButton>
      ))}
      <Stack direction="row" spacing={2} sx={{ px: 2.5, pt: 1.5, pb: 0.5 }}>
        <Link href="#tutorials" variant="body2">
          All tutorials
        </Link>
        <Link href="#docs" variant="body2">
          Documentation
        </Link>
      </Stack>
    </List>
  );
}

/* ------------------------------------------------------------------ */
/* Community (stacked cards)                                           */
/* ------------------------------------------------------------------ */

function ForumCard() {
  return (
    <Stack>
      {demoForumThreads.slice(0, 3).map((thread) => (
        <ButtonBase key={thread.id} sx={{ display: 'block', textAlign: 'left', px: 2.5, py: 1, '&:hover': { bgcolor: 'action.hover' } }}>
          <Typography variant="subtitle2">{thread.title}</Typography>
          <Typography variant="meta" color="text.meta" component="div">
            {thread.category} · {thread.replies} replies · {thread.lastActivity}
          </Typography>
        </ButtonBase>
      ))}
      <Link href="#forum" variant="body2" sx={{ px: 2.5, pt: 1 }}>
        Open the forum
      </Link>
    </Stack>
  );
}

function ReleaseNotesCard() {
  const [latest] = demoReleaseNotes;
  return (
    <Stack spacing={1} sx={{ px: 2.5 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="subtitle2">v{latest.version}</Typography>
        <TagChip label="Current" tone="success" dot />
        <Box sx={{ flex: 1 }} />
        <Typography variant="meta" color="text.meta">
          {latest.date}
        </Typography>
      </Stack>
      <Box component="ul" sx={{ m: 0, pl: 2.5, color: 'text.secondary', typography: 'body2' }}>
        {latest.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </Box>
      <Link href="#releases" variant="body2">
        All release notes
      </Link>
    </Stack>
  );
}

function ShowcaseCard() {
  return (
    <Stack spacing={1.25} sx={{ px: 2.5 }}>
      <Box sx={{ borderRadius: tileRadius, overflow: 'hidden' }}>
        <CubeThumbnail cubes={demoShowcase.cubes} size="tile" />
      </Box>
      <Box>
        <Typography variant="subtitle2">{demoShowcase.title}</Typography>
        <Typography variant="meta" color="text.meta">
          @{demoShowcase.author}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {demoShowcase.description}
      </Typography>
    </Stack>
  );
}

function ContributeCard() {
  return (
    <Stack spacing={1.5} sx={{ px: 2.5, alignItems: 'flex-start' }}>
      <Typography variant="body2" color="text.secondary">
        Optikit and the openUC2 parts library are open source. Report a bug, suggest a part, or send a pull request.
      </Typography>
      <Button variant="outlined" startIcon={<GitHubIcon />} href="https://github.com/openUC2" target="_blank" rel="noopener noreferrer">
        Contribute on GitHub
      </Button>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/**
 * Optikit home. Signed in: projects, gallery, tutorials and a community card
 * stack in three columns. Signed out: the landing page.
 */
export function HomePage({
  user = demoUser,
  projects = demoProjects,
  autoAdvanceMs = 7000,
  onOpenProject,
  onNewProject,
  onLogIn,
  onSignUp,
  onHome,
  onOpenDesign,
  onAccount,
  onLogOut,
  onOpenExample,
  onBrowseGallery,
  onChoosePlan,
  onSection,
}: HomePageProps) {
  if (user === null) {
    return (
      <LandingPage
        autoAdvanceMs={autoAdvanceMs}
        onHome={onHome}
        onLogIn={onLogIn}
        onSignUp={onSignUp}
        onOpenExample={onOpenExample}
        onOpenDesign={onOpenDesign}
        onNewProject={onNewProject}
        onBrowseGallery={onBrowseGallery}
        onChoosePlan={onChoosePlan}
        onSection={onSection}
      />
    );
  }

  return (
    <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <SiteHeader user={user} onHome={onHome} onLogIn={onLogIn} onSignUp={onSignUp} onProjects={onHome} onAccount={onAccount} onLogOut={onLogOut} />

      <PageContainer component="main" sx={{ flex: 1, pt: { xs: 3, md: 5 }, pb: { xs: 6, md: 8 } }}>
        <Typography variant="h1" sx={{ mb: { xs: 3, md: 4 } }}>
          Welcome back, {user.name}.
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 4, lg: 5 },
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
          }}
        >
          <Stack spacing={3} sx={{ minWidth: 0 }}>
            <DashboardCard
              title="Your projects"
              flush
              action={
                <Link href="#projects" variant="body2">
                  View all
                </Link>
              }
            >
              <ProjectsBody
                signedIn
                projects={projects}
                onOpenProject={onOpenProject}
                onNewProject={onNewProject}
                onLogIn={onLogIn}
              />
            </DashboardCard>
            <BenchIllustration />
          </Stack>

          <Stack sx={{ minWidth: 0 }}>
            <DashboardCard title="Need inspiration?" grow>
              <GalleryBody onOpenDesign={onOpenDesign} />
            </DashboardCard>
          </Stack>

          <Stack spacing={4} sx={{ minWidth: 0, gridColumn: { md: '1 / -1', lg: 'auto' } }}>
            <DashboardCard title="Need a hand?" flush>
              <TutorialsBody />
            </DashboardCard>
            <DashboardCard title="Community" unframed>
              <StackedCards
                aria-label="Community"
                autoAdvanceMs={autoAdvanceMs}
                items={[
                  { id: 'forum', label: 'Community forum', icon: <ForumOutlinedIcon fontSize="small" />, content: <ForumCard /> },
                  { id: 'releases', label: 'Release notes', icon: <NewReleasesOutlinedIcon fontSize="small" />, content: <ReleaseNotesCard /> },
                  { id: 'showcase', label: 'Build of the week', icon: <AutoAwesomeOutlinedIcon fontSize="small" />, content: <ShowcaseCard /> },
                  { id: 'contribute', label: 'Contribute', icon: <GitHubIcon fontSize="small" />, content: <ContributeCard /> },
                ]}
              />
            </DashboardCard>
          </Stack>
        </Box>
      </PageContainer>

      <SiteFooter />
    </Box>
  );
}
