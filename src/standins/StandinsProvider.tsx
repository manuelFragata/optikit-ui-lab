/**
 * Everything the lab stands in for, given to the views below it: the light
 * (the optics engine's place), the parts library and the service. The one
 * place the stand-ins are wired in; the app gives the real ones here.
 *
 * The library loads, and the service answers, over the stand-in network
 * (./network.ts): with a delay, and failing when the address asks for it.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { EMPTY_LIBRARY, LibraryProvider, type Library } from '../ports/library';
import { LightProvider } from '../ports/light';
import { ServiceProvider } from '../ports/service';
import { demoLight } from './kernel/light';
import { standinLibrary } from './library';
import { NO_NETWORK, overNetwork, type Network } from './network';
import { standinService } from './service';

/** The library as the app has it: its index loading, loaded, or failed to load. */
function useLibraryOver(net: Network): Library {
  const [attempt, setAttempt] = useState(0);
  const instant = net.latencyMs === 0 && net.failRate === 0;
  const [status, setStatus] = useState<Library['status']>(instant ? { state: 'ready' } : { state: 'loading' });
  useEffect(() => {
    if (instant) return;
    let live = true;
    setStatus({ state: 'loading' });
    overNetwork({ ...net, latencyMs: net.latencyMs * 2 }, 'the parts library', () => true).then(
      () => live && setStatus({ state: 'ready' }),
      (e: Error) => live && setStatus({ state: 'error', error: e.message }),
    );
    return () => {
      live = false;
    };
  }, [net, instant, attempt]);
  const reload = useCallback(() => setAttempt((a) => a + 1), []);
  return useMemo(() => (status.state === 'ready' ? { ...standinLibrary, reload } : { ...EMPTY_LIBRARY, status, reload }), [status, reload]);
}

export function StandinsProvider({ network = NO_NETWORK, children }: { network?: Network; children: ReactNode }) {
  const library = useLibraryOver(network);
  const service = useMemo(() => standinService(library, network), [library, network]);
  return (
    <LightProvider value={demoLight}>
      <LibraryProvider value={library}>
        <ServiceProvider value={service}>{children}</ServiceProvider>
      </LibraryProvider>
    </LightProvider>
  );
}
