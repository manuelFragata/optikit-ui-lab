/**
 * What the Optimize tab keeps while the design is open, held by the editor
 * so it outlives the tab: the light path being optimized, its targets (per
 * path), and the runs made, to look at again, compare and apply. Pure.
 */
import type { Goal, OptimizeRun, Variable } from '../../../ports/analysis';
import type { Schematic } from '../model';

/** A run kept: what it was asked, on which design, and what it proposed. */
export interface SavedRun {
  id: number;
  place: string;
  placeLabel: string;
  goals: Goal[];
  variables: Variable[];
  run: OptimizeRun;
  /** The design it ran on: applying it then makes the design its proposal. */
  base: Schematic;
  applied: boolean;
  /** The question it answered (the path, targets and free variables), to tell when they change. */
  key: string;
}

export interface OptimizeSession {
  /** The path being optimized, by place key; `null`: the first. */
  place: string | null;
  /** The targets of each path, by place key; a path not set has one target, its own. */
  goals: Readonly<Record<string, Goal[]>>;
  runs: SavedRun[];
}

export const NEW_SESSION: OptimizeSession = { place: null, goals: {}, runs: [] };

/** A share of where it started, as the pane shows it: "100 %", "4.2 %", "0.03 %", "< 0.01 %". */
export const percent = (v: number) => {
  const p = v * 100;
  return p >= 10 ? `${p.toFixed(0)} %` : p >= 1 ? `${p.toFixed(1)} %` : p >= 0.01 ? `${p.toPrecision(2)} %` : p > 0 ? '< 0.01 %' : '0 %';
};
