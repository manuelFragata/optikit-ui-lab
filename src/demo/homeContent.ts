/**
 * Placeholder data for the home page. Not part of the component set; replace freely.
 */
import type { DesignCardProps } from '../components/cards/DesignCard';

export interface ProjectSummary {
  id: string;
  name: string;
  version: string;
  status: 'Draft' | 'Published';
  edited: string;
  cubes: number;
  symbols: number;
}

export const demoProjects: ProjectSummary[] = [
  { id: 'bf-fluor', name: 'BF+Fluor FRAME Optical Core', version: '0.4.2', status: 'Draft', edited: '2 h ago', cubes: 3, symbols: 6 },
  { id: 'light-sheet', name: 'openUC2 light sheet microscope', version: '1.0.1', status: 'Published', edited: '6 days ago', cubes: 4, symbols: 12 },
  { id: 'slit-scope', name: 'Slit scope', version: '0.2.0', status: 'Draft', edited: '3 weeks ago', cubes: 2, symbols: 4 },
  { id: 'storm', name: "Franzi's Stain STORM setup", version: '0.1.3', status: 'Draft', edited: '12 Mar 2026', cubes: 5, symbols: 9 },
];

export const demoInspiration: DesignCardProps[] = [
  {
    kind: 'Instrument',
    title: 'Basic BF FRAME',
    version: '1.4.0',
    description: 'Brightfield microscope on the FRAME chassis.',
    tags: ['brightfield', 'frame'],
    maintainer: 'manu',
    cubes: 3,
  },
  {
    kind: 'Assembly',
    title: 'FRAME BF optical core',
    version: '1.2.0',
    description: 'Brightfield core, drops into any FRAME chassis.',
    tags: ['brightfield', 'core-box'],
    maintainer: 'manu',
    cubes: 2,
  },
  {
    kind: 'Collection',
    title: 'Devices you can build with a core BOX',
    count: 11,
    description: 'Everything buildable from one core BOX.',
    tags: ['teaching'],
    maintainer: 'manu',
    cubes: 4,
  },
];

export interface ForumThread {
  id: string;
  title: string;
  category: string;
  author: string;
  replies: number;
  lastActivity: string;
}

export const demoForumThreads: ForumThread[] = [
  { id: 'f1', title: 'Dichroic choice for 488 nm with the Fluor Box?', category: 'Optics', author: 'paulh', replies: 14, lastActivity: '1 h ago' },
  { id: 'f2', title: 'Share: light sheet on a 4×3 plate, parts list inside', category: 'Show & tell', author: 'ohkyung', replies: 8, lastActivity: '5 h ago' },
  { id: 'f3', title: 'STEP export misses the RMS thread', category: 'Bug', author: 'franzi', replies: 3, lastActivity: 'yesterday' },
  { id: 'f4', title: 'Teaching kit: 10 experiments with one core BOX', category: 'Education', author: 'mlab', replies: 21, lastActivity: '2 days ago' },
];

export interface ReleaseNote {
  version: string;
  date: string;
  items: string[];
}

export const demoReleaseNotes: ReleaseNote[] = [
  {
    version: '0.4.2',
    date: '23 Sep 2026',
    items: ['The status bar counts parts not mounted yet', 'Snap to grid remembers its pitch per design', 'Fixed ray labels overlapping group outlines'],
  },
  {
    version: '0.4.1',
    date: '12 Sep 2026',
    items: ['Tube lens links to Thorlabs AC254-050-A', 'Export BOM as CSV'],
  },
];

export interface GalleryItem {
  id: string;
  title: string;
  /** `optikit`: shipped with Optikit. `community`: shared by a user. */
  source: 'optikit' | 'community';
  author?: string;
  cubes: number;
  kind: 'Instrument' | 'Assembly' | 'Collection';
}

export const demoGallery: GalleryItem[] = [
  { id: 'g1', title: 'Basic BF FRAME', source: 'optikit', kind: 'Instrument', cubes: 3 },
  { id: 'g2', title: 'Fluorescence core', source: 'optikit', kind: 'Assembly', cubes: 2 },
  { id: 'g3', title: 'Light sheet microscope', source: 'optikit', kind: 'Instrument', cubes: 4 },
  { id: 'g4', title: "Paul's FRAME", source: 'community', author: 'paulh', kind: 'Instrument', cubes: 3 },
  { id: 'g5', title: 'Slit scope', source: 'community', author: 'ohkyung', kind: 'Instrument', cubes: 2 },
  { id: 'g6', title: 'Core BOX devices', source: 'community', author: 'manu', kind: 'Collection', cubes: 4 },
];

export interface Tutorial {
  id: string;
  title: string;
  format: 'Video' | 'Text';
  /** e.g. "6 min" or "4 min read". */
  length: string;
  href: string;
}

export const demoTutorials: Tutorial[] = [
  { id: 't1', title: 'Build your first microscope', format: 'Video', length: '6 min', href: '#' },
  { id: 't2', title: 'Link symbols to real parts', format: 'Text', length: '4 min read', href: '#' },
  { id: 't3', title: 'Trace rays through a cube', format: 'Video', length: '9 min', href: '#' },
  { id: 't4', title: 'Export STEP and a parts list', format: 'Text', length: '3 min read', href: '#' },
];

export const demoShowcase = {
  title: 'Two-colour light sheet on a 4×3 plate',
  author: 'ohkyung',
  description: 'Two 488/561 nm sheets from opposite sides, detection through a 10× RMS objective. Full parts list and STEP files included.',
  cubes: 4,
};
