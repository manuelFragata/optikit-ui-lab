/**
 * Everything the lab stands in for, given to the views below it: the light,
 * the analysis and the coatings (the optics engine's place, in the page),
 * the parts library, and the service with its holders. The one place the
 * stand-ins are wired in; the app gives the real ones here.
 *
 * The optics answer at once, as oc-wasm does in the page. The library loads,
 * and the service answers, over the stand-in network (./network.ts): with a
 * delay, and failing when the address asks for it.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BuildNotesProvider, type BuildNote } from '../ports/build';
import { AnalysisProvider } from '../ports/analysis';
import { CoatingsProvider } from '../ports/coatings';
import { ElectronicsProvider } from '../ports/electronics';
import { HoldersProvider } from '../ports/holders';
import { EMPTY_LIBRARY, LibraryProvider, type Library } from '../ports/library';
import { LightProvider, type LightFor } from '../ports/light';
import { ServiceProvider } from '../ports/service';
import { standinCoatings } from './kernel/coatings';
import { demoLight } from './kernel/light';
import { standinAnalysis } from './kernel/simulate/standinAnalysis';
import { standinLibrary } from './library';
import { standinElectronics } from './library/electronics';
import { NO_NETWORK, overNetwork, type Network } from './network';
import { standinService } from './service';
import { standinHolders } from './service/standinHolders';

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

/** What the stand-ins do differently from the app, for Settings → This build. */
function notesFor(net: Network): BuildNote[] {
  return [
    { topic: 'Light and analysis', text: 'Traced and optimized in the page by the lab’s own optics stand-in: on axis, one wavelength. The app does both with oc-wasm, in the page too.' },
    { topic: 'Parts and prices', text: 'A demo catalogue (lenses only) and a made-up price list.' },
    { topic: 'Holders', text: 'Only the V4 lens cartridge has a live preview; optikit-v2 builds the other holders.' },
    { topic: 'Electronics', text: 'Control follows Ethan’s connections, with his device files, and a bench instrument that always answers the same: one Motor Z driver does not answer. The app gets the devices from the library and asks NewSwitch.' },
    { topic: 'Sign-in', text: 'Any details sign you in as the demo user. Designs are kept for this visit only, and not deleted.' },
    {
      topic: 'Network',
      text: `The service’s answers (parts, prices, holders) come after about ${net.latencyMs} ms${net.failRate ? `, and ${Math.round(net.failRate * 100)} % fail` : ''}. Set this with ?latency= (ms) and ?fail= (0 … 1) before the # in the address.`,
    },
  ];
}

/** The light, traced at once in the page, as oc-wasm does. */
const LIGHT: LightFor = demoLight;

export function StandinsProvider({ network = NO_NETWORK, children }: { network?: Network; children: ReactNode }) {
  const library = useLibraryOver(network);
  const service = useMemo(() => standinService(library, network), [library, network]);
  const analysis = useMemo(() => standinAnalysis(library), [library]);
  const holders = useMemo(() => standinHolders(network), [network]);
  const electronics = useMemo(() => standinElectronics(network), [network]);
  const notes = useMemo(() => notesFor(network), [network]);
  return (
    <BuildNotesProvider value={notes}>
      <LightProvider value={LIGHT}>
        <AnalysisProvider value={analysis}>
          <CoatingsProvider value={standinCoatings}>
            <LibraryProvider value={library}>
              <ServiceProvider value={service}>
                <HoldersProvider value={holders}>
                  <ElectronicsProvider value={electronics}>{children}</ElectronicsProvider>
                </HoldersProvider>
              </ServiceProvider>
            </LibraryProvider>
          </CoatingsProvider>
        </AnalysisProvider>
      </LightProvider>
    </BuildNotesProvider>
  );
}
