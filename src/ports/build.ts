/**
 * What this build stands in for, in words, for the one place that says so
 * (Settings → This build). The product's screens speak as the product; what
 * a stand-in does differently is said here, once. The lab's stand-ins give
 * their notes (src/standins/StandinsProvider.tsx); the app gives none, and
 * the section does not show.
 */
import { createContext, useContext } from 'react';

export interface BuildNote {
  /** What it is about: "Light and analysis", "Sign-in". */
  topic: string;
  text: string;
}

const Context = createContext<BuildNote[]>([]);

export const BuildNotesProvider = Context.Provider;

export const useBuildNotes = () => useContext(Context);
