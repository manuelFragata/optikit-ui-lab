/**
 * STAND-IN for the network between the app and optikit-core: the stand-ins
 * answer after a delay, and fail now and then when asked to, so the views'
 * waiting and failing can be seen and tried in the lab.
 *
 * Set from the page's address, before the #: `?latency=800` (ms, about; 0 for
 * none) and `?fail=0.3` (the share of requests that fail). Without them: a
 * short, realistic delay and no failures.
 */

export interface Network {
  /** About how long an answer takes, ms. */
  latencyMs: number;
  /** The share of requests that fail, 0 … 1. */
  failRate: number;
}

/** As in the app on a good connection. */
export const LAB_NETWORK: Network = { latencyMs: 250, failRate: 0 };
/** At once and always: for stories and tests. */
export const NO_NETWORK: Network = { latencyMs: 0, failRate: 0 };

/** The network the page's address asks for, else the lab's. */
export function networkFromSearch(search: string): Network {
  const q = new URLSearchParams(search);
  const num = (key: string, fallback: number, max: number) => {
    const v = Number(q.get(key));
    return q.has(key) && Number.isFinite(v) ? Math.min(max, Math.max(0, v)) : fallback;
  };
  return { latencyMs: num('latency', LAB_NETWORK.latencyMs, 30_000), failRate: num('fail', LAB_NETWORK.failRate, 1) };
}

/** A request's answer over the network: after about `latencyMs`, or a failure in words. */
export function overNetwork<T>(net: Network, what: string, answer: () => T, random = Math.random): Promise<T> {
  const fails = random() < net.failRate;
  const ms = net.latencyMs * (0.6 + 0.8 * random());
  return new Promise((resolve, reject) => {
    const settle = () => {
      if (fails) reject(new Error(`Could not get ${what}: the service did not answer.`));
      else {
        try {
          resolve(answer());
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      }
    };
    if (ms > 0) setTimeout(settle, ms);
    else queueMicrotask(settle);
  });
}
