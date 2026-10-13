import { useState } from 'react';

/** A value that is controlled when `value` is defined, and internal state otherwise. */
export function useControllable<T>(value: T | undefined, initial: T, onChange?: (next: T) => void): [T, (next: T) => void] {
  const [inner, setInner] = useState(initial);
  const current = value !== undefined ? value : inner;
  return [
    current,
    (next: T) => {
      setInner(next);
      onChange?.(next);
    },
  ];
}
