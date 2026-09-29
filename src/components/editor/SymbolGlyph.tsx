import type { SymbolKind } from './model';

/**
 * Conventional optics notation, one stroke weight. Drawn around the symbol's
 * anchor in grid units (y down); the parent sets stroke colour and width.
 * Strokes are non-scaling, so dash lengths are in screen pixels.
 */
export function SymbolGlyph({ kind }: { kind: SymbolKind }) {
  switch (kind) {
    case 'laser':
      // Source body left of the anchor; the beam leaves at the anchor.
      return (
        <>
          <rect x={-2.3} y={-0.55} width={2} height={1.1} />
          <path d="M-2 -0.55 V0.55 M-0.65 -0.55 V0.55 M-1.65 0.25 L-1 -0.25 M-0.3 0 H0" />
        </>
      );
    case 'mirror':
      // Reflecting face plus hatched back.
      return (
        <>
          <path d="M-0.75 0.75 L0.75 -0.75" />
          <path d="M-0.55 0.95 L0.95 -0.55" strokeDasharray="3 3" />
        </>
      );
    case 'dichroic':
      // Plate with excitation filter (left) and emission filter (below).
      return (
        <>
          <path d="M-0.7 0.7 L0.7 -0.7 M-0.55 0.85 L0.85 -0.55" />
          <rect x={-1.15} y={-0.5} width={0.22} height={1} />
          <rect x={-0.5} y={1} width={1} height={0.22} />
        </>
      );
    case 'lens':
    case 'objective':
      return (
        <>
          <ellipse cx={0} cy={0} rx={0.26} ry={0.85} />
          <path d="M0 -1.2 V-0.95 M0 0.95 V1.2" strokeDasharray="3 2" />
        </>
      );
    case 'camera':
      // Sensor body left, lens mount towards the anchor.
      return (
        <>
          <rect x={-2.25} y={-0.8} width={1.3} height={1.6} />
          <path d="M-1.85 -0.8 V0.8 M-0.95 -0.3 L-0.2 -0.8 V0.8 L-0.95 0.3" />
        </>
      );
  }
}
