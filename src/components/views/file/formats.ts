/** One way in or out: what it is, the file it makes or takes, and whether the lab can do it yet. */
export interface Format<Id extends string> {
  id: Id;
  title: string;
  /** File type, e.g. ".step". */
  file: string;
  text: string;
  /** Why it is not available yet (it needs a service the lab does not have); absent when it works. */
  later?: string;
}

export type ExportId = 'archive' | 'bom' | 'step' | 'stl' | 'build-sheet' | 'link';
export type ImportId = 'archive' | 'step' | 'optics' | 'catalogue';

export const EXPORTS: Format<ExportId>[] = [
  { id: 'archive', title: 'Design file', file: '.optikit', text: 'The whole design, to open again or send to someone.' },
  { id: 'bom', title: 'Bill of materials', file: '.csv', text: 'What to buy, how many, and what it costs.' },
  { id: 'link', title: '3D link', file: 'link', text: 'A read-only 3D view anyone can open in a browser.' },
  { id: 'build-sheet', title: 'Build sheet', file: '.pdf', text: 'The parts and the steps to put it together, to print.', later: 'Needs the documentation service.' },
  { id: 'step', title: 'CAD assembly', file: '.step', text: 'Every cube and insert, for CAD.', later: 'Needs the CAD service.' },
  { id: 'stl', title: 'Parts to print', file: '.stl', text: 'The printed parts, one file each.', later: 'Needs the CAD service.' },
];

export const IMPORTS: Format<ImportId>[] = [
  { id: 'archive', title: 'Design file', file: '.optikit', text: 'A design saved from Optikit.' },
  { id: 'optics', title: 'Optical design', file: '.zmx, .json', text: 'A Zemax or Optiland file, turned into cubes.', later: 'Needs the optics importer.' },
  { id: 'step', title: 'CAD part', file: '.step', text: 'A part from CAD, as a new module.', later: 'Needs the CAD service.' },
  { id: 'catalogue', title: 'Catalogue part', file: 'row', text: 'A vendor part from a catalogue, unmounted.', later: 'Needs the parts catalogue.' },
];
