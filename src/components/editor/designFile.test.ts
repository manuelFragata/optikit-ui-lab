import { describe, expect, it } from 'vitest';
import { demoSchematic } from '../../demo/editorContent';
import { designFileText, readDesignFile } from './designFile';

describe('design file', () => {
  it('reads back what it writes', () => {
    expect(readDesignFile(designFileText(demoSchematic))).toEqual(demoSchematic);
  });

  it('turns down text that is not a design', () => {
    expect(readDesignFile('not json')).toBeNull();
    expect(readDesignFile('null')).toBeNull();
    expect(readDesignFile('{"name":"a list"}')).toBeNull();
  });

  it('gives an older file the fields it lacks', () => {
    const d = readDesignFile('{"symbols":[],"rays":[]}');
    expect(d).toMatchObject({ groups: [], unitMm: 50 });
  });
});
