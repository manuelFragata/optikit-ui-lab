/**
 * What a module's mesh is made of, read from the node names in the store's
 * GLBs (Inventor exports). A module is a cube of two halves (`CUBHLF`) with
 * an insert in it; the insert is printed parts (`PRT`), bought parts (`BUY`:
 * the lens, the mirror, the camera board) and standard hardware (`ISO`,
 * `DIN`: screws, washers):
 *
 *   ASS - 2021 - CUBLEND40F50 - V04            the module
 *     PRT - 1003 - CUBHLF111 - V04:1           cube half
 *     PRT - 1003 - CUBHLF111 - V04:2           cube half
 *     SUB - 0023 - LEND40F50 - V04 - virt ass:1
 *       PRT - 2023 - INSLEND40F50 - V04:1      the lens holder
 *       PRT - 2003 - NUTD40:1                  its retaining ring
 *       BUY - Lens - f50 D40 sA2.1 sI10.1 bi-cx:1
 *
 * Each part under an assembly (`ASS`, `SUB`) is a component, so it can be
 * hovered, picked and looked at on its own; the two cube halves are one, the
 * enclosure. Pure: no three.js here, so it is tested on names alone.
 */

/** What a component is, roughly, for its colour in lists and its icon. */
export type ComponentRole = 'enclosure' | 'holder' | 'optic' | 'electronics' | 'hardware' | 'part';

/** Where a component comes from: printed for the kit, bought in, or a standard part. */
export type ComponentSource = 'printed' | 'bought' | 'standard' | 'unknown';

export interface ComponentInfo {
  /** Groups instances that are one component (the cube halves); otherwise the node's own name. */
  key: string;
  /** For people: "Lens holder", "Lens f50 D40 bi-convex", "Screw M3 × 20". */
  label: string;
  role: ComponentRole;
  source: ComponentSource;
  /** The part code ("INSLEND40F50"), or the bought part's description. */
  code: string;
  /** The openUC2 part number, when the name has one ("2023"). */
  number?: string;
  /** Which copy, when the module has several of it (":3" → 3). */
  instance?: number;
}

/** A node that only groups others: its children are the components. */
export const isAssembly = (name: string) => /^(ASS|SUB)\s*-/i.test(name) || /^__mm_scale__$/.test(name);

/** Printed part codes, by prefix, as people call them. */
const PRINTED: [RegExp, string, ComponentRole][] = [
  [/^CUBHLF/, 'Cube enclosure', 'enclosure'],
  [/^INSLEN/, 'Lens holder', 'holder'],
  [/^INSMIR/, 'Mirror holder', 'holder'],
  [/^INSDIC|^INSBEA|^INSFIL/, 'Filter holder', 'holder'],
  [/^INSCAM.*UPP/, 'Camera housing, top', 'holder'],
  [/^INSCAM.*LOW/, 'Camera housing, bottom', 'holder'],
  [/^INSCAM/, 'Camera holder', 'holder'],
  [/^INSLAS/, 'Laser holder', 'holder'],
  [/^INSRMS|^INSOBJ/, 'Objective mount', 'holder'],
  [/^INSSAM/, 'Sample holder', 'holder'],
  [/^INS/, 'Insert', 'holder'],
  [/^NUT/, 'Retaining ring', 'hardware'],
  [/^SAMITK|^SAMCLP/, 'Sample clip', 'part'],
  [/^STK/, 'Cube connector', 'hardware'],
];

const OPTIC = /lens|mirror|filter|glass|dichroic|splitter|objective|prism|window/i;
const ELECTRONIC = /raspberry|camera|laser|diode|led\b|board|pcb|cable|sensor/i;

/** "bi-cx" and friends, spelled out. */
const SPELLED: [RegExp, string][] = [
  [/\bbi-cx\b/i, 'bi-convex'],
  [/\bpl-cx\b/i, 'plano-convex'],
  [/\bbi-cc\b/i, 'bi-concave'],
  [/\bpl-cc\b/i, 'plano-concave'],
  [/\s*-\s*Kopie\b/i, ''],
  [/\bs[AI][\d.]+\s*/g, ''], // the lens's sag figures: for the drawing, not for the name
];

function tidy(text: string): string {
  let out = text;
  for (const [from, to] of SPELLED) out = out.replace(from, to);
  return out.replace(/\s+-\s+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** A screw, washer or nut by its standard: "Hex socket head cap screw - M3 x 20 - 8.8 - A2K" → "Screw M3 × 20". */
function standardLabel(description: string): string {
  const [what = description, size] = description.split(/\s+-\s+/);
  const noun = /screw/i.test(what) ? 'Screw' : /washer/i.test(what) ? 'Washer' : /nut/i.test(what) ? 'Nut' : what;
  return size ? `${noun} ${size.replace(/\s*x\s*/i, ' × ')}` : noun;
}

/** One node's name (the original, from `userData.name`), read as a component. */
export function describeComponent(name: string): ComponentInfo {
  const instanceMatch = /:(\d+)$/.exec(name);
  const instance = instanceMatch ? Number(instanceMatch[1]) : undefined;
  const base = name.replace(/:\d+$/, '').trim();

  // PRT - 2023 - INSLEND40F50 - V04
  const printed = /^PRT\s*-\s*(\d+)\s*-\s*([^\s-][^-]*?)(?:\s*-\s*V\d+)?$/i.exec(base);
  if (printed) {
    const [, number, rawCode] = printed;
    const code = rawCode.trim();
    const known = PRINTED.find(([re]) => re.test(code));
    const role = known?.[2] ?? 'part';
    return {
      key: role === 'enclosure' ? 'enclosure' : name,
      label: known?.[1] ?? `Part ${code}`,
      role,
      source: 'printed',
      code,
      number,
      instance: role === 'enclosure' ? undefined : instance,
    };
  }

  // BUY - Lens - f50 D40 sA2.1 sI10.1 bi-cx
  const bought = /^BUY\s*-\s*(.+)$/i.exec(base);
  if (bought) {
    const code = bought[1].trim();
    const role: ComponentRole = OPTIC.test(code) && !/camera/i.test(code) ? 'optic' : ELECTRONIC.test(code) ? 'electronics' : 'hardware';
    return { key: name, label: tidy(code), role, source: 'bought', code, instance };
  }

  // ISO 4762 - Hex socket head cap screw - M3 x 20 - 8.8 - A2K
  const standard = /^((?:ISO|DIN|EN)\s*[\d-]+)\s*-\s*(.+)$/i.exec(base);
  if (standard) {
    return { key: name, label: standardLabel(standard[2]), role: 'hardware', source: 'standard', code: `${standard[1]} ${standard[2]}`.trim(), instance };
  }

  return { key: name, label: tidy(base) || 'Part', role: 'part', source: 'unknown', code: base, instance };
}

/**
 * The component a mesh belongs to: the mesh, or the node above it that sits
 * right under an assembly (a part with several materials is a node of
 * meshes). With no assembly above, the node right under the root.
 */
export function ownerOf<T extends { parent: T | null }>(node: T, nameOf: (n: T) => string): T {
  let owner = node;
  while (owner.parent && owner.parent.parent && !isAssembly(nameOf(owner.parent))) owner = owner.parent;
  return owner;
}

/** "Screw M3 × 20" → "Screw M3 × 20 (2 of 4)", for components that come in several. */
export function numbered<T extends { info: ComponentInfo }>(components: T[]): (T & { title: string })[] {
  const counts = new Map<string, number>();
  for (const c of components) counts.set(c.info.label, (counts.get(c.info.label) ?? 0) + 1);
  const seen = new Map<string, number>();
  return components.map((c) => {
    const total = counts.get(c.info.label) ?? 1;
    if (total === 1) return { ...c, title: c.info.label };
    const n = (seen.get(c.info.label) ?? 0) + 1;
    seen.set(c.info.label, n);
    return { ...c, title: `${c.info.label} (${n} of ${total})` };
  });
}

export const ROLE_LABEL: Record<ComponentRole, string> = {
  enclosure: 'Enclosure',
  holder: 'Holders',
  optic: 'Optics',
  electronics: 'Electronics',
  hardware: 'Hardware',
  part: 'Other parts',
};

export const SOURCE_LABEL: Record<ComponentSource, string> = {
  printed: 'Printed part',
  bought: 'Bought part',
  standard: 'Standard part',
  unknown: 'Part',
};
