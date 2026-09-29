import { useCallback, useEffect, useState } from 'react';
import type { AccountUser } from '../components/compositions/AccountMenu';

/**
 * Hash routes, so the prototype works from any static host (GitHub Pages,
 * a Storybook iframe) without server rewrites, and back/forward just work.
 */
export type Route =
  | { name: 'home' }
  | { name: 'login' }
  | { name: 'signup' }
  | { name: 'account' }
  | { name: 'editor'; id: string };

export function parseHash(hash: string): Route {
  const [, first, second] = hash.replace(/^#/, '').split('/');
  switch (first) {
    case 'login':
    case 'signup':
    case 'account':
      return { name: first };
    case 'editor':
      return second ? { name: 'editor', id: decodeURIComponent(second) } : { name: 'editor', id: 'new' };
    default:
      return { name: 'home' };
  }
}

export function routeToHash(route: Route): string {
  return route.name === 'editor' ? `#/editor/${encodeURIComponent(route.id)}` : route.name === 'home' ? '#/' : `#/${route.name}`;
}

export type Navigate = (route: Route, options?: { replace?: boolean }) => void;

export function useHashRoute(): [Route, Navigate] {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback<Navigate>((next, options) => {
    const hash = routeToHash(next);
    if (options?.replace) {
      // replaceState does not fire hashchange, so update state directly.
      window.history.replaceState(null, '', hash);
      setRoute(next);
    } else if (window.location.hash !== hash) {
      window.location.hash = hash;
    } else {
      setRoute(next);
    }
  }, []);

  return [route, navigate];
}

const SESSION_KEY = 'optikit-lab-user';

/** The signed-in prototype user, remembered in this browser (if storage is available). */
export function useSession(): [AccountUser | null, (user: AccountUser | null) => void] {
  const [user, setUserState] = useState<AccountUser | null>(() => {
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as AccountUser) : null;
    } catch {
      return null;
    }
  });

  const setUser = useCallback((next: AccountUser | null) => {
    setUserState(next);
    try {
      if (next) window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(SESSION_KEY);
    } catch {
      // Storage blocked (private window, previews): the session just won't survive a reload.
    }
  }, []);

  return [user, setUser];
}
