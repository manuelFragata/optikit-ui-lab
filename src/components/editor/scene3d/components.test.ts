import { describe, expect, it } from 'vitest';
import { describeComponent, numbered, ownerOf } from './components';

describe('describeComponent', () => {
  it('makes the two cube halves one enclosure', () => {
    const a = describeComponent('PRT - 1003 - CUBHLF111 - V04:1');
    const b = describeComponent('PRT - 1003 - CUBHLF111 - V04:2');
    expect(a).toMatchObject({ key: 'enclosure', label: 'Cube enclosure', role: 'enclosure', source: 'printed', code: 'CUBHLF111', number: '1003' });
    expect(b.key).toBe(a.key);
  });

  it('names the holder, its ring and the lens apart', () => {
    expect(describeComponent('PRT - 2023 - INSLEND40F50 - V04:1')).toMatchObject({ label: 'Lens holder', role: 'holder', code: 'INSLEND40F50', number: '2023', instance: 1 });
    expect(describeComponent('PRT - 2003 - NUTD40:1')).toMatchObject({ label: 'Retaining ring', role: 'hardware', code: 'NUTD40' });
    expect(describeComponent('BUY - Lens - f50 D40 sA2.1 sI10.1 bi-cx:1')).toMatchObject({ label: 'Lens f50 D40 bi-convex', role: 'optic', source: 'bought' });
  });

  it('tells optics from electronics among bought parts', () => {
    expect(describeComponent('BUY - Mirror - 40x30x2:1').role).toBe('optic');
    expect(describeComponent('BUY - Raspberry Pi Camera V2.1:1').role).toBe('electronics');
    expect(describeComponent('BUY - Cover glass - D14 x 0.15 - Kopie:2')).toMatchObject({ role: 'optic', label: 'Cover glass D14 x 0.15', instance: 2 });
    expect(describeComponent('BUY - Adhesive pad - 41x29x1:1').role).toBe('hardware');
  });

  it('shortens standard hardware', () => {
    expect(describeComponent('ISO 4762 - Hex socket head cap screw - M3 x 20 - 8.8 - A2K:3')).toMatchObject({ label: 'Screw M3 × 20', role: 'hardware', source: 'standard', instance: 3 });
    expect(describeComponent('ISO 7092 - Washer - 3 - 200 HV - A2K:1').label).toBe('Washer 3');
  });

  it('keeps names it does not know', () => {
    expect(describeComponent('Body001')).toMatchObject({ key: 'Body001', label: 'Body001', role: 'part', source: 'unknown' });
  });
});

describe('ownerOf', () => {
  type N = { name: string; parent: N | null };
  const node = (name: string, parent: N | null): N => ({ name, parent });
  const root = node('Scene', null);
  const scale = node('__mm_scale__', root);
  const module = node('ASS - 2021 - CUBLEND40F50 - V04', scale);
  const insert = node('SUB - 0023 - LEND40F50 - V04 - virt ass:1', module);
  const holder = node('PRT - 2023 - INSLEND40F50 - V04:1', insert);
  const holderPrimitive = node('PRT_-_2023_mesh_1', holder);
  const half = node('PRT - 1003 - CUBHLF111 - V04:1', module);
  const nameOf = (n: N) => n.name;

  it('stops right under an assembly', () => {
    expect(ownerOf(holderPrimitive, nameOf)).toBe(holder);
    expect(ownerOf(holder, nameOf)).toBe(holder);
    expect(ownerOf(half, nameOf)).toBe(half);
  });

  it('stops under the root when nothing is an assembly', () => {
    const a = node('Group', root);
    const b = node('Mesh', a);
    expect(ownerOf(b, nameOf)).toBe(a);
  });
});

describe('numbered', () => {
  it('counts copies, and leaves single parts alone', () => {
    const items = ['Screw M3 × 20', 'Lens holder', 'Screw M3 × 20'].map((label) => ({ info: { ...describeComponent('x'), label } }));
    expect(numbered(items).map((c) => c.title)).toEqual(['Screw M3 × 20 (1 of 2)', 'Lens holder', 'Screw M3 × 20 (2 of 2)']);
  });
});
