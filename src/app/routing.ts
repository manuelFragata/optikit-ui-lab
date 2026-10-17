import { useCallback, useEffect, useState } from 'react';
import type { AccountUser } from '../components/compositions/AccountMenu';
import { DESIGN_TABS, TAB_LABELS, type WorkspaceTab } from '../components/compositions/tabs';

/**
 * Hash routes, so the prototype works from any static host (GitHub Pages,
 * a Storybook iframe) without server rewrites, and back/forward just work.
 */
export type Route =
  /** `section`: a part of the landing page to scroll to (#examples, #community, #pricing). */
  | { name: 'home'; section?: string }
  | { name: 'login' }
  | { name: 'signup' }
  | { name: 'account' }
  | { name: 'editor'; id: string }
  /**
   * A workspace view (#/projects, #/view/<id>); `id` is the open design. The Home tab is the `home` route.
   * `pane`: a pane to open beside the canvas (#/simulate/<id>, once a tab of its own, opens View with Simulate).
   */
  | { name: 'workspace'; tab: WorkspaceTab; id?: string; pane?: 'simulate' }
  /** The gallery (#/explore), or one design's page in it (#/explore/<id>). */
  | { name: 'explore'; id?: string };

const isTab = (s: string): s is WorkspaceTab => Object.hasOwn(TAB_LABELS, s);

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '');
  // Plain anchors (#pricing) are sections of the home page; routes start with a slash.
  if (raw && !raw.startsWith('/')) return { name: 'home', section: decodeURIComponent(raw) };
  const [, first, second] = raw.split('/');
  switch (first) {
    case 'login':
    case 'signup':
    case 'account':
      return { name: first };
    case 'editor':
      return second ? { name: 'editor', id: decodeURIComponent(second) } : { name: 'editor', id: 'new' };
    case 'explore':
      return { name: 'explore', id: second ? decodeURIComponent(second) : undefined };
    case 'simulate':
      return second ? { name: 'workspace', tab: 'view', id: decodeURIComponent(second), pane: 'simulate' } : { name: 'workspace', tab: 'projects' };
    default:
      if (isTab(first) && first !== 'home') {
        const id = second ? decodeURIComponent(second) : undefined;
        // A design tab with no design falls back to Projects.
        return DESIGN_TABS.includes(first) && !id ? { name: 'workspace', tab: 'projects' } : { name: 'workspace', tab: first, id };
      }
      return { name: 'home' };
  }
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'editor':
      return `#/editor/${encodeURIComponent(route.id)}`;
    case 'workspace':
      return route.id ? `#/${route.tab}/${encodeURIComponent(route.id)}` : `#/${route.tab}`;
    case 'explore':
      return route.id ? `#/explore/${encodeURIComponent(route.id)}` : '#/explore';
    case 'home':
      return route.section ? `#${encodeURIComponent(route.section)}` : '#/';
    default:
      return `#/${route.name}`;
  }
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
