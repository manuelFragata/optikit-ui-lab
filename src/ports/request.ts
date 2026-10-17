/**
 * A question to the service, as a view waits for its answer. The service's
 * calls take time (a network round trip; in the lab a stand-in delay), and
 * can fail. A view asks with `useRequest` and draws what it gets:
 *
 * - `ready`: the answer;
 * - `loading`: no answer yet, or a new one on its way. With `keep`, the
 *   last answer stays in `data` meanwhile, so a view can keep showing it (a
 *   BOM does not blank while a part moves); without, a new question starts
 *   empty (another part's choices are not this one's). `slow` turns true
 *   only after a moment, so a quick answer never flashes a spinner;
 * - `error`: what went wrong, in words, and `retry`.
 *
 * An answer to an older question (the part selected before) is dropped.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export type RequestStatus = 'loading' | 'ready' | 'error';

export interface Request<T> {
  status: RequestStatus;
  /** The answer; while loading again, or after an error, the last one (if any). */
  data: T | undefined;
  /** Waiting long enough to show it. */
  slow: boolean;
  error: string | null;
  retry: () => void;
}

/** How long a wait goes unshown, ms: most answers come sooner. */
export const SLOW_AFTER_MS = 180;

/** What went wrong, in words a person can read. */
export const errorText = (e: unknown) => (e instanceof Error ? e.message : typeof e === 'string' ? e : 'Something went wrong.');

/**
 * Ask `ask(input)` whenever `input` or `ask` changes (by identity); `null`
 * input asks nothing and gives `ready`, with the last answer if `keep`.
 */
export function useRequest<I, T>(input: I | null, ask: (input: I) => Promise<T>, { keep = false }: { keep?: boolean } = {}): Request<T> {
  // `for`: the question the state answers. Until the effect has asked a new one, the old answer is not shown as this one's.
  const [state, setState] = useState<{ for: I | null; status: RequestStatus; data: T | undefined; error: string | null }>({ for: null, status: 'ready', data: undefined, error: null });
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const asked = useRef(0);

  useEffect(() => {
    if (input === null) {
      setState((s) => ({ for: null, status: 'ready', data: keep ? s.data : undefined, error: null }));
      return;
    }
    const n = ++asked.current;
    setState((s) => ({ for: input, status: 'loading', data: keep ? s.data : undefined, error: null }));
    setSlow(false);
    const timer = window.setTimeout(() => n === asked.current && setSlow(true), SLOW_AFTER_MS);
    ask(input).then(
      (data) => n === asked.current && setState({ for: input, status: 'ready', data, error: null }),
      (e: unknown) => n === asked.current && setState((s) => ({ for: input, status: 'error', data: s.data, error: errorText(e) })),
    );
    return () => window.clearTimeout(timer);
  }, [input, ask, attempt, keep]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  if (input !== null && state.for !== input) return { status: 'loading', data: keep ? state.data : undefined, slow: false, error: null, retry };
  return { status: state.status, data: state.data, error: state.error, slow: slow && state.status === 'loading', retry };
}
