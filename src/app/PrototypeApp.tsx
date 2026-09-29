import { useEffect, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import { demoSchematic } from '../demo/editorContent';
import { demoGallery, demoProjects } from '../demo/homeContent';
import { exampleDesigns } from '../demo/landingContent';
import { demoUser } from '../demo/user';
import type { AccountUser } from '../components/compositions/AccountMenu';
import { AuthDialog, type AuthMode } from '../components/compositions/AuthDialog';
import { EditorShell } from '../components/compositions/EditorShell';
import { AccountPage } from '../components/pages/AccountPage';
import { HomePage } from '../components/pages/HomePage';
import type { Schematic } from '../components/editor/model';
import { scrollToSection } from '../components/pages/LandingPage';
import { ColorSchemeToggle } from '../components/primitives/ColorSchemeToggle';
import { useHashRoute, useSession, type Route } from './routing';

const emptySchematic: Schematic = { ...demoSchematic, symbols: [], rays: [], groups: [] };

/** Gallery designs that have a matching example drawing; the rest show the demo schematic. */
const GALLERY_DRAWINGS: Record<string, string> = { g1: 'ex-brightfield', g2: 'ex-fluor' };

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
};

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
  const openEditor = (id: string) => navigate({ name: 'editor', id });

  let page;
  if (route.name === 'editor') {
    const design = findDesign(route.id);
    page = design ? (
      <EditorShell
        key={route.id}
        projectName={design.name}
        version={design.version}
        schematic={played[route.id] ?? design.schematic}
        defaultLeftState={design.empty ? 'expanded' : 'collapsed'}
        user={user}
        onHome={home}
        onLogIn={() => openAuth('login')}
        onAccount={() => navigate({ name: 'account' })}
        onLogOut={logOut}
        headerActions={<ColorSchemeToggle />}
      />
    ) : null;
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
