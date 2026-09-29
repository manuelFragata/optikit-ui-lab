import { useEffect, useState } from 'react';
import { EditorShell } from './components/compositions/EditorShell';
import { HomePage } from './components/pages/HomePage';
import { ColorSchemeToggle } from './components/primitives/ColorSchemeToggle';

type Route = 'home' | 'editor';

/** Tiny hash router (#/ and #/editor), so the demo app needs no routing library. */
function useHashRoute(): [Route, (route: Route) => void] {
  const read = (): Route => (window.location.hash.startsWith('#/editor') ? 'editor' : 'home');
  const [route, setRoute] = useState<Route>(read);

  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = (next: Route) => {
    window.location.hash = next === 'editor' ? '/editor' : '/';
  };
  return [route, navigate];
}

export function App() {
  const [route, navigate] = useHashRoute();

  if (route === 'editor') {
    return <EditorShell onHome={() => navigate('home')} headerActions={<ColorSchemeToggle />} />;
  }
  return <HomePage onOpenProject={() => navigate('editor')} onNewProject={() => navigate('editor')} />;
}
