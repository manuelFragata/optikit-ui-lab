/**
 * A plot label's small markup, as a paper sets it: `*z*` an italic variable,
 * `_{y}` a subscript (it may hold an italic: `_{*y*}`). "Defocus Δ*z*" reads
 * Defocus Δ𝑧. Pure.
 */

export interface Run {
  text: string;
  italic: boolean;
  sub: boolean;
}

/** The label as runs of text, each upright or italic, on the line or below it. */
export function runsOf(label: string): Run[] {
  const runs: Run[] = [];
  const push = (text: string, italic: boolean, sub: boolean) => {
    if (!text) return;
    const last = runs[runs.length - 1];
    if (last && last.italic === italic && last.sub === sub) last.text += text;
    else runs.push({ text, italic, sub });
  };
  const walk = (s: string, sub: boolean) => {
    let i = 0;
    let italic = false;
    let buf = '';
    while (i < s.length) {
      if (s[i] === '*') {
        push(buf, italic, sub);
        buf = '';
        italic = !italic;
        i++;
      } else if (s.startsWith('_{', i)) {
        push(buf, italic, sub);
        buf = '';
        const end = s.indexOf('}', i + 2);
        const inner = end < 0 ? s.slice(i + 2) : s.slice(i + 2, end);
        walk(inner, true);
        i = end < 0 ? s.length : end + 1;
      } else {
        buf += s[i];
        i++;
      }
    }
    push(buf, italic, sub);
  };
  walk(label, false);
  return runs;
}

/** The label as plain text (for screen readers and widths). */
export const plainOf = (label: string) =>
  runsOf(label)
    .map((r) => r.text)
    .join('');
