import { useEffect, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import { demoSchematic } from '../demo/editorContent';
import { demoGallery, demoProjects } from '../demo/homeContent';
import { demoUser } from '../demo/user';
import type { AccountUser } from '../components/compositions/AccountMenu';
import { AuthDialog, type AuthMode } from '../components/compositions/AuthDialog';
import { EditorShell } from '../components/compositions/EditorShell';
import { AccountPage } from '../components/pages/AccountPage';
import { HomePage } from '../components/pages/HomePage';
import { ColorSchemeToggle } from '../components/primitives/ColorSchemeToggle';
import { useHashRoute, useSession, type Route } from './routing';

/** Which design an editor route opens. */
function findDesign(id: string) {
  if (id === 'new') return { name: 'Untitled design', version: '0.0.1', empty: true };
  const project = demoProjects.find((p) => p.id === id);
  if (project) return { name: project.name, version: project.version, empty: false };
  const shared = demoGallery.find((g) => g.id === id);
  if (shared) return { name: shared.title, version: '1.0.0', empty: false };
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
        schematic={design.empty ? { ...demoSchematic, symbols: [], rays: [] } : demoSchematic}
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
