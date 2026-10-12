import { useEffect, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { demoSchematic } from '../demo/editorContent';
import { demoGallery, demoProjects } from '../demo/homeContent';
import { exampleDesigns } from '../demo/landingContent';
import { demoUser } from '../demo/user';
import type { AccountUser } from '../components/compositions/AccountMenu';
import { AuthDialog, type AuthMode } from '../components/compositions/AuthDialog';
import { EditorShell } from '../components/compositions/EditorShell';
import { DESIGN_TABS, TAB_LABELS, type WorkspaceTab } from '../components/compositions/Ribbon';
import { WorkspaceShell } from '../components/compositions/WorkspaceShell';
import { AccountPage } from '../components/pages/AccountPage';
import { HomePage } from '../components/pages/HomePage';
import type { Schematic } from '../components/editor/model';
import { scrollToSection } from '../components/pages/LandingPage';
import { ColorSchemeToggle } from '../components/primitives/ColorSchemeToggle';
import { useHashRoute, useSession, type Route } from './routing';

const emptySchematic: Schematic = { ...demoSchematic, symbols: [], rays: [], groups: [] };

/** Gallery designs that have a matching example drawing; the rest show the demo schematic. */
const GALLERY_DRAWINGS: Record<string, string> = { g1: 'ex-brightfield', g2: 'ex-fluor', g4: 'ex-brightfield', g7: 'ex-fluor' };

/** Which design an editor route opens. */
function findDesign(id: string): { name: string; version: string; schematic: Schematic; empty: boolean } | null {
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
  return null;
}

const TITLES: Record<Route['name'], string> = {
  home: 'Optikit',
  login: 'Log in · Optikit',
  signup: 'Sign up · Optikit',
  account: 'Account · Optikit',
  editor: 'Editor · Optikit',
  workspace: 'Optikit',
};

/** What each view will hold; shown until it is built. */
const UPCOMING: Record<WorkspaceTab, string> = {
  explore: 'The gallery by kind, with a tag filter and a page per design.',
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
  const openEditor = (id: string) => navigate({ name: 'workspace', tab: 'view', id });

  let page;
  if (route.name === 'workspace') {
    const { id } = route;
    const design = id ? findDesign(id) : null;
    // An unknown design: its tabs are hidden, so show Projects.
    const tab = design || !DESIGN_TABS.includes(route.tab) ? route.tab : 'projects';
    page = (
      <WorkspaceShell
        tab={tab}
        onTabChange={(next) => navigate({ name: 'workspace', tab: next, id })}
        design={design}
        user={user}
        onHome={home}
        onLogIn={() => openAuth('login')}
        onAccount={() => navigate({ name: 'account' })}
        onLogOut={logOut}
        headerActions={<ColorSchemeToggle />}
      >
        {tab === 'view' && design && id ? (
          <EditorShell
            key={id}
            showHeader={false}
            schematic={played[id] ?? design.schematic}
            defaultLeftState={design.empty ? 'expanded' : 'collapsed'}
          />
        ) : (
          <UpcomingView tab={tab} />
        )}
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
          onOpenDesign={openEditor}
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
          onBrowseGallery={() => setToast('The full gallery is not part of the prototype yet.')}
          onChooseKit={() => setToast('On the real site this opens the openUC2 shop.')}
          onChoosePlan={(plan) => (plan === 'lab' ? setToast('On the real site this opens a contact form.') : openAuth('signup'))}
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
