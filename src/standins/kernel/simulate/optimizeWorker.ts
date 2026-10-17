/**
 * STAND-IN for oc-wasm's optimizer, in a worker of its own: it takes one run,
 * goes a step at a time, and says the best so far after each step (at most
 * every few frames), then the run. The page ends the worker to stop it.
 */
import { catalogRecord } from '../../library/catalog';
import { optimizeSteps, type RunAsk, type WorkerSays } from './standinAnalysis';

/** How often a step is said, ms: often enough to watch, not so often that the page redraws for nothing. */
const SAY_EVERY_MS = 50;

const say = (m: WorkerSays) => postMessage(m);

onmessage = (e: MessageEvent<RunAsk>) => {
  try {
    const it = optimizeSteps(e.data, catalogRecord);
    let said = 0;
    for (let r = it.next(); ; r = it.next()) {
      if (r.done) return say({ kind: 'done', run: r.value });
      const now = performance.now();
      if (now - said >= SAY_EVERY_MS) {
        said = now;
        say({ kind: 'step', best: r.value });
      }
    }
  } catch (err) {
    say({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
