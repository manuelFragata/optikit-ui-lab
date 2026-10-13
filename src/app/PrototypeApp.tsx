import { useEffect, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { demoSchematic } from '../demo/editorContent';
import { demoGallery, demoProjects } from '../demo/homeContent';
import { exampleDesigns } from '../demo/landingContent';
import { exploreDesigns } from '../demo/exploreContent';
import { demoDrawerProjects } from '../demo/projectsContent';
import { kitBoxes, projectTemplates } from '../demo/newProjectContent';
import { exampleAssemblies } from '../demo/assemblies';
import { demoUser } from '../demo/user';
import type { AccountUser } from '../components/compositions/AccountMenu';
import { AuthDialog, type AuthMode } from '../components/compositions/AuthDialog';
import { DESIGN_TABS, TAB_LABELS, type WorkspaceTab } from '../components/compositions/Ribbon';
import { WorkspaceShell } from '../components/compositions/WorkspaceShell';
import { AccountPage } from '../components/pages/AccountPage';
import { HomeDashboard, HomePage } from '../components/pages/HomePage';
import { AssemblyView } from '../components/landing/AssemblyView';
import { SchematicCanvas } from '../components/editor/SchematicCanvas';
import { DesignPage } from '../components/views/DesignPage';
import { ExploreView } from '../components/views/ExploreView';
import { EditorShell } from '../components/compositions/EditorShell';
import { ProjectsView } from '../components/views/ProjectsView';
import { NewProjectDialog, type ProjectStart } from '../components/views/projects/NewProjectDialog';
import type { Schematic } from '../components/editor/model';
import type { ProjectSummary } from '../api/types';
import { scrollToSection } from '../components/pages/LandingPage';
import { ColorSchemeToggle } from '../components/primitives/ColorSchemeToggle';
import { SettingsButton } from '../settings/SettingsDialog';
import { useHashRoute, useSession, type Route } from './routing';

const emptySchematic: Schematic = { ...demoSchematic, symbols: [], rays: [], groups: [] };

/** Gallery designs that have a matching example drawing; the rest show the demo schematic. */
const GALLERY_DRAWINGS: Record<string, string> = { g1: 'ex-brightfield', g2: 'ex-fluor', g4: 'ex-brightfield', g7: 'ex-fluor' };

/** Schematic drawings by design id, for the pictures in Explore and Projects. */
const DRAWINGS: Record<string, Schematic> = {
  ...Object.fromEntries(exampleDesigns.map((e) => [e.id, e.schematic])),
  ...Object.fromEntries(
    Object.entries(GALLERY_DRAWINGS).flatMap(([id, exampleId]) => {
      const example = exampleDesigns.find((e) => e.id === exampleId);
      return example ? [[id, example.schematic]] : [];
    }),
  ),
  'bf-fluor': demoSchematic,
};

/** A design's picture on its page: the 3D assembly when it has one, else its schematic drawing. */
function designPreview(id: string) {
  const assembly = exampleAssemblies[id];
  if (assembly) return <AssemblyView assembly={assembly} turntable label="3D view of the design" sx={{ width: '100%', height: '100%' }} />;
  const drawing = DRAWINGS[id];
  if (drawing) return <SchematicCanvas fit schematic={drawing} selectedId={null} onSelect={() => undefined} options={{ showRayLabels: false }} hint={false} />;
  return undefined;
}

/** Parts and versions by design id, for the project documents. */
const DETAILS = Object.fromEntries(exploreDesigns.map((d) => [d.id, d]));

/** Which design an editor route opens. */
/** A project made with New project in this session. */
interface CreatedProject {
  summary: ProjectSummary;
  schematic: Schematic;
}

/** A new project's first drawing: the template's, or an empty grid. */
function startingSchematic(start: ProjectStart): Schematic {
  if (start.kind !== 'template') return emptySchematic;
  return DRAWINGS[start.id] ?? demoSchematic;
}

function findDesign(id: string, created: CreatedProject[] = []): { name: string; version: string; schematic: Schematic; empty: boolean } | null {
  const made = created.find((c) => c.summary.id === id);
  if (made) return { name: made.summary.name, version: made.summary.version, schematic: made.schematic, empty: made.schematic.symbols.length === 0 };
  if (id === 'new') return { name: 'Untitled design', version: '0.0.1', schematic: emptySchematic, empty: true };
  const example = exampleDesigns.find((e) => e.id === id);
  if (example) return { name: example.title, version: '1.0.0', schematic: example.schematic, empty: false };
  const project = demoProjects.find((p) => p.id === id);
  if (project) return { name: project.name, version: project.version, schematic: demoSchematic, empty: false };
  const shared = demoGallery.find((g) => g.id === id);
  if (shared) {
    const drawing = exampleDesigns.find((e) => e.id === GALLERY_DRAWINGS[id]);
    return { name: shared.title, version: '1.0.0', schematic: drawing?.schematic ?? demoSchematic, empty: false };
  }
  const explored = exploreDesigns.find((d) => d.id === id);
  if (explored) return { name: explored.name, version: explored.version, schematic: demoSchematic, empty: false };
  return null;
}

const TITLES: Record<Route['name'], string> = {
  home: 'Optikit',
  login: 'Log in · Optikit',
  signup: 'Sign up · Optikit',
  account: 'Account · Optikit',
  editor: 'Editor · Optikit',
  workspace: 'Optikit',
  explore: 'Explore · Optikit',
};

/** What each view will hold; shown until it is built. */
const UPCOMING: Record<WorkspaceTab, string> = {
  home: 'Your projects, inspiration and help.',
  projects: 'Your designs: pinned, recent, shared with you, and New project.',
  file: 'Save, version history, import, export and share.',
  view: 'The canvas: schematic per layer or 3D, add parts, and the inspector.',
  simulate: 'The beam table, checks and results, then the optimizer round trip.',
};

function UpcomingView({ tab }: { tab: WorkspaceTab }) {
  return (
    <Stack spacing={1} sx={{ alignItems: 'center', justifyContent: 'center', height: '100%', p: 4, textAlign: 'center' }}>
      <Typography variant="h5">{TAB_LABELS[tab]}</Typography>
      <Typography color="text.secondary">{UPCOMING[tab]}</Typography>
    </Stack>
  );
}

/**
 * The clickable prototype: home, log in / sign up, editor and account pages
 * wired together with hash routes and a remembered demo session.
 */
export function PrototypeApp() {
  const [route, navigate] = useHashRoute();
  const [user, setUser] = useSession();
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [afterLogin, setAfterLogin] = useState<Route | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Examples the visitor changed on the landing page, so the editor opens with their changes.
  const [played, setPlayed] = useState<Record<string, Schematic>>({});
  // The design open in the workspace, kept while the visitor looks at Home or Projects.
  const [lastOpenId, setLastOpenId] = useState<string>();
  const [created, setCreated] = useState<CreatedProject[]>([]);
  // A fresh key each time, so the dialog opens on its defaults.
  const [newProjectKey, setNewProjectKey] = useState<number | null>(null);

  useEffect(() => {
    if (route.name === 'workspace' && DESIGN_TABS.includes(route.tab) && route.id) setLastOpenId(route.id);
  }, [route]);

  // #/login and #/signup are entry points: open the dialog over the home page.
  useEffect(() => {
    if (route.name === 'login' || route.name === 'signup') {
      setAuthMode(user ? null : route.name);
      navigate({ name: 'home' }, { replace: true });
    } else if (route.name === 'editor') {
      // The editor now lives in the workspace's View tab.
      navigate({ name: 'workspace', tab: 'view', id: route.id }, { replace: true });
    } else if (route.name === 'account' && !user) {
      // Account needs a session: ask to log in, then come back here.
      setAfterLogin(route);
      setAuthMode('login');
      navigate({ name: 'home' }, { replace: true });
    }
  }, [route, user, navigate]);

  useEffect(() => {
    document.title = TITLES[route.name];
    if (route.name === 'home' && route.section) {
      // Wait a frame so the landing page is on screen before scrolling to the section.
      const section = route.section;
      const frame = window.requestAnimationFrame(() => scrollToSection(section));
      return () => window.cancelAnimationFrame(frame);
    }
    window.scrollTo(0, 0);
  }, [route]);

  const openAuth = (mode: AuthMode) => setAuthMode(mode);

  const signIn = ({ mode, name, email }: { mode: AuthMode; name: string; email: string }) => {
    const next: AccountUser =
      mode === 'signup' && name
        ? { name, email: email || demoUser.email, initials: name.slice(0, 2).toLowerCase() }
        : demoUser;
    setUser(next);
    setAuthMode(null);
    setToast(mode === 'signup' ? `Account created. Welcome, ${next.name}!` : `Welcome back, ${next.name}.`);
    if (afterLogin) {
      navigate(afterLogin);
      setAfterLogin(null);
    }
  };

  const logOut = () => {
    setUser(null);
    setToast('You are logged out.');
    if (route.name === 'account') navigate({ name: 'home' });
  };

  const home = () => navigate({ name: 'home' });
  const newProject = () => setNewProjectKey(Date.now());

  const createProject = ({ name, start }: { name: string; start: ProjectStart }) => {
    const id = `p-${Date.now().toString(36)}`;
    const template = start.kind === 'template' ? projectTemplates.find((t) => t.id === start.id) : undefined;
    const summary: ProjectSummary = {
      id,
      name,
      kind: 'instrument',
      version: '0.0.1',
      description: '',
      tags: start.kind === 'box' ? [start.id] : [],
      maintainer: user?.name.toLowerCase() ?? 'you',
      updated: 'just now',
      cubes: template?.cubes ?? 0,
      status: 'draft',
      pinned: false,
      unmounted: 0,
    };
    setCreated([{ summary, schematic: startingSchematic(start) }, ...created]);
    setNewProjectKey(null);
    setToast(`${name} created.`);
    navigate({ name: 'workspace', tab: 'view', id });
  };
  const openEditor = (id: string) => navigate({ name: 'workspace', tab: 'view', id });

  // A gallery design opens its page in Explore when it has one, else straight in the editor.
  const openDesign = (id: string) =>
    exploreDesigns.some((d) => d.id === id) ? navigate({ name: 'explore', id }) : openEditor(id);

  let page;
  // Signed in, Home is the dashboard inside the workspace; signed out, it is the landing page.
  if (route.name === 'workspace' || route.name === 'explore' || (route.name === 'home' && user)) {
    // Explore belongs to Home, so Home stays the selected tab there.
    const routeTab: WorkspaceTab = route.name === 'workspace' ? route.tab : 'home';
    const onDesignTab = DESIGN_TABS.includes(routeTab);
    const openId = route.name === 'workspace' && onDesignTab ? route.id : lastOpenId;
    const design = openId ? findDesign(openId, created) : null;
    // An unknown design: its tabs are hidden, so show Projects.
    const tab = design || !onDesignTab ? routeTab : 'projects';

    let view;
    if (route.name === 'explore') {
      const browsed = route.id ? exploreDesigns.find((d) => d.id === route.id) : undefined;
      view = browsed ? (
        <DesignPage
          key={browsed.id}
          design={browsed}
          preview={designPreview(browsed.id)}
          onBack={() => navigate({ name: 'explore' })}
          onEdit={() => openEditor(browsed.id)}
          onExport={() => setToast('Export (STEP, STL, BOM) comes with the File tab.')}
          onShare={() => setToast('Sharing comes with the File tab.')}
        />
      ) : (
        <ExploreView designs={exploreDesigns} drawings={DRAWINGS} onOpen={(id) => navigate({ name: 'explore', id })} onBack={user ? home : undefined} />
      );
    } else if (tab === 'home' && user) {
      view = (
        <HomeDashboard
          user={user}
          onOpenProject={openEditor}
          onNewProject={newProject}
          onOpenDesign={openDesign}
          onBrowseGallery={() => navigate({ name: 'explore' })}
        />
      );
    } else if (tab === 'projects' && user) {
      view = (
        <ProjectsView
          owner={user.name}
          projects={[...created.map((c) => c.summary), ...demoDrawerProjects]}
          drawings={{ ...DRAWINGS, ...Object.fromEntries(created.filter((c) => c.schematic.symbols.length > 0).map((c) => [c.summary.id, c.schematic])) }}
          details={DETAILS}
          renderPreview={designPreview}
          onOpen={openEditor}
          onExport={() => setToast('Export (STEP, STL, BOM) comes with the File tab.')}
          onShare={() => setToast('Sharing comes with the File tab.')}
          onNewProject={newProject}
        />
      );
    } else if (tab === 'view' && design && openId) {
      view = (
        <EditorShell
          key={openId}
          showHeader={false}
          schematic={played[openId] ?? design.schematic}
          defaultLeftState={design.empty ? 'expanded' : 'collapsed'}
        />
      );
    } else {
      view = <UpcomingView tab={tab} />;
    }

    page = (
      <WorkspaceShell
        tab={tab}
        onTabChange={(next) =>
          next === 'home' ? home() : navigate({ name: 'workspace', tab: next, id: DESIGN_TABS.includes(next) ? openId : undefined })
        }
        design={design}
        onShowDesign={() => openId && openEditor(openId)}
        onCloseDesign={() => {
          setLastOpenId(undefined);
          // Its tabs go away with it; from one of them, land on Projects.
          if (onDesignTab) navigate({ name: 'workspace', tab: 'projects' });
        }}
        user={user}
        onHome={home}
        onLogIn={() => openAuth('login')}
        onAccount={() => navigate({ name: 'account' })}
        onLogOut={logOut}
        headerActions={
          <>
            <ColorSchemeToggle />
            <SettingsButton />
          </>
        }
      >
        {view}
      </WorkspaceShell>
    );
  } else if (route.name === 'account' && user) {
    page = (
      <AccountPage
        user={user}
        onHome={home}
        onLogOut={logOut}
        onSave={(next) => {
          setUser(next);
          setToast('Profile saved.');
        }}
      />
    );
  }

  return (
    <>
      {page ?? (
        <HomePage
          user={user}
          onHome={home}
          onOpenProject={openEditor}
          onOpenDesign={openDesign}
          onNewProject={() => openEditor('new')}
          onLogIn={() => openAuth('login')}
          onSignUp={() => openAuth('signup')}
          onAccount={() => navigate({ name: 'account' })}
          onLogOut={logOut}
          onOpenExample={(id, schematic) => {
            setPlayed({ ...played, [id]: schematic });
            openEditor(id);
          }}
          onSection={(section) => navigate({ name: 'home', section })}
          onBrowseGallery={() => navigate({ name: 'explore' })}
          onChooseKit={() => setToast('On the real site this opens the openUC2 shop.')}
          onChoosePlan={(plan) => (plan === 'lab' ? setToast('On the real site this opens a contact form.') : openAuth('signup'))}
        />
      )}

      {newProjectKey !== null && (
        <NewProjectDialog
          key={newProjectKey}
          open
          templates={projectTemplates}
          boxes={kitBoxes}
          drawings={DRAWINGS}
          onClose={() => setNewProjectKey(null)}
          onCreate={createProject}
        />
      )}

      <AuthDialog
        open={authMode !== null}
        mode={authMode ?? 'login'}
        onModeChange={setAuthMode}
        onClose={() => {
          setAuthMode(null);
          setAfterLogin(null);
        }}
        onSubmit={signIn}
      />

      <Snackbar
        open={toast !== null}
        message={toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}
