/**
 * Response shapes of the optikit-core service (optikit-v2,
 * `src/optikit_core/service/app.py`), so lab screens use the same data as the
 * real app. Field names keep the wire spelling. Only what the lab uses is here.
 */

/** A 422 from the service. `code` is the stable part; never parse `message`. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** POST /v1/validate, /v1/drc */
export interface Finding {
  code: string;
  severity: 'error' | 'warning' | 'info';
  /** Where it applies, e.g. `components.lens1.pose`. */
  where: string;
  message: string;
}

/** POST /v1/projection: one surface of a beam path, in ray order. */
export interface ProjectionRow {
  index: number;
  component_id: string;
  type: string;
  reflective: boolean;
  radius_mm: number | null;
  z_mm: number | null;
  material: string;
  semi_aperture_mm: number | null;
  is_stop: boolean;
  /** Inputs that move this surface; empty means it is fixed. */
  driven_by: string[];
}

/** POST /v1/simulate */
export interface SimulateResult {
  path: string;
  warnings: string[];
  /** Spot positions on the detector, mm. */
  spot?: { x: number[]; y: number[] };
  /** Empty when the path folds. */
  paraxial?: { f1?: number; EPD?: number; FNO?: number; magnification?: number };
  photon_budget?: { transmitted_fraction: number; power_mw: number | null };
}

/** A change the optimizer proposes (back-annotation). */
export interface Delta {
  component: string;
  classification: 'POSE_UPDATE' | 'TILT_UPDATE' | 'PART_PARAM' | 'PART_SUBSTITUTION';
  param: string;
  old: number;
  new: number;
}

/** POST /v1/optimize */
export interface OptimizeResult {
  dof_values: Record<string, number>;
  merit: { rms_spot_before_mm: number; rms_spot_after_mm: number; iterations: number };
  deltas: Delta[];
}

/* Designs and projects: the service has no endpoint for these yet (accounts are planned). */

export type DesignKind = 'part' | 'assembly' | 'instrument' | 'collection';

export interface DesignSummary {
  id: string;
  name: string;
  kind: DesignKind;
  version: string;
  description: string;
  tags: string[];
  maintainer: string;
  updated: string;
}

export interface ProjectSummary extends DesignSummary {
  status: 'draft' | 'published';
  pinned: boolean;
  /** Who shared it with you; absent for your own. */
  sharedBy?: string;
  /** Parts not mounted yet; 0 means buildable. */
  unmounted: number;
}
