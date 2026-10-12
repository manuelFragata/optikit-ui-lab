/**
 * Placeholder projects for the Projects drawer. Not part of the component set;
 * replace freely. Ids match the editor's designs where one exists.
 */
import type { ProjectSummary } from '../api/types';

const mine = { maintainer: 'manu', tags: [] as string[] };

export const demoDrawerProjects: ProjectSummary[] = [
  { ...mine, id: 'bf-fluor', name: 'BF+Fluor FRAME Optical Core', kind: 'instrument', version: '0.4.2', description: '', updated: '2 h ago', cubes: 9, status: 'draft', pinned: true, unmounted: 1 },
  { ...mine, id: 'ex-fluor', name: 'Fluorescence microscope', kind: 'instrument', version: '1.2.0', description: '', updated: '6 days ago', cubes: 9, status: 'published', pinned: true, unmounted: 0 },
  { ...mine, id: 'light-sheet', name: 'openUC2 light sheet microscope', kind: 'instrument', version: '1.0.1', description: '', updated: '6 days ago', cubes: 4, status: 'published', pinned: false, unmounted: 0 },
  { ...mine, id: 'ex-brightfield', name: 'Brightfield microscope', kind: 'instrument', version: '1.4.0', description: '', updated: '2 weeks ago', cubes: 8, status: 'published', pinned: false, unmounted: 0 },
  { ...mine, id: 'slit-scope', name: 'Slit scope', kind: 'instrument', version: '0.2.0', description: '', updated: '3 weeks ago', cubes: 2, status: 'draft', pinned: false, unmounted: 2 },
  { ...mine, id: 'g2', name: 'Fluorescence core', kind: 'assembly', version: '1.2.0', description: '', updated: '3 weeks ago', cubes: 2, status: 'published', pinned: false, unmounted: 0 },
  { ...mine, id: 'ex-expander', name: 'Beam expander', kind: 'assembly', version: '0.3.0', description: '', updated: '1 month ago', cubes: 6, status: 'draft', pinned: false, unmounted: 1 },
  { ...mine, id: 'storm', name: "Franzi's Stain STORM setup", kind: 'instrument', version: '0.1.3', description: '', updated: '12 Mar 2026', cubes: 5, status: 'draft', pinned: false, unmounted: 3, maintainer: 'franzi', sharedBy: 'franzi' },
  { ...mine, id: 'g4', name: "Paul's FRAME", kind: 'instrument', version: '2.1.0', description: '', updated: '3 days ago', cubes: 8, status: 'published', pinned: false, unmounted: 0, maintainer: 'paulh', sharedBy: 'paulh' },
];
