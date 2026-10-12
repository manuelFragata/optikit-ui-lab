import { useRef } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import type { DesignSummary } from '../../../api/types';
import type { Schematic } from '../../editor/model';
import { SchematicCanvas } from '../../editor/SchematicCanvas';
import { CubeThumbnail } from '../../cards/CubeThumbnail';
import { drawRays } from '../../landing/motion';
import { CornerArrow } from '../../primitives/CornerArrow';
import { Pill } from '../../primitives/Pill';

export interface DesignTileProps {
  design: DesignSummary;
  /** The design's schematic; without one the tile shows its cubes. */
  drawing?: Schematic;
  onOpen: () => void;
}

/** The picture of a design: its schematic drawing, or its cubes. Also used on the back cards of a deck. */
export function DesignPicture({ design, drawing }: { design: Pick<DesignSummary, 'cubes' | 'kind'>; drawing?: Schematic }) {
  return (
    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', bgcolor: 'canvas.ground', pointerEvents: 'none' }}>
      {drawing ? (
        <SchematicCanvas fit schematic={drawing} selectedId={null} onSelect={() => undefined} options={{ showRayLabels: false }} hint={false} />
      ) : (
        <Box sx={{ flex: 1, display: 'grid', alignContent: 'center' }}>
          <CubeThumbnail cubes={Math.min(design.cubes, 6)} layout={design.kind === 'collection' ? 'mosaic' : 'row'} size="card" />
        </Box>
      )}
    </Box>
  );
}

/**
 * A design in the gallery: its picture with the kind on it, the name and
 * maker under it. On hover the tile lifts and the light paths draw in.
 */
export function DesignTile({ design, drawing, onOpen }: DesignTileProps) {
  const pictureRef = useRef<HTMLDivElement>(null);

  return (
    <ButtonBase
      onClick={onOpen}
      onPointerEnter={() => pictureRef.current && drawRays(pictureRef.current)}
      aria-label={`Open ${design.name}`}
      sx={(t) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        textAlign: 'left',
        gap: 1.25,
        width: '100%',
        '& .tile-picture': { transition: t.transitions.create(['transform', 'box-shadow'], { duration: 350 }) },
        '&:hover .tile-picture, &:focus-visible .tile-picture': { transform: 'translateY(-4px)', boxShadow: t.shadows[6] },
        '&:hover .corner-arrow': { transform: 'rotate(45deg)' },
      })}
    >
      <Box
        ref={pictureRef}
        className="tile-picture"
        sx={(t) => ({ position: 'relative', aspectRatio: '4 / 3', borderRadius: `${t.radius.stage}px`, overflow: 'hidden' })}
      >
        <DesignPicture design={design} drawing={drawing} />
        <Box sx={{ position: 'absolute', top: (t) => t.spacing(1.5), left: (t) => t.spacing(1.5) }}>
          <Pill overlay>{design.kind}</Pill>
        </Box>
        <CornerArrow />
      </Box>
      <Box sx={{ px: 0.5 }}>
        <Typography variant="subtitle1" noWrap>
          {design.name}
        </Typography>
        <Typography variant="meta" color="text.meta" component="div" noWrap>
          @{design.maintainer} · v{design.version} · {design.updated}
        </Typography>
      </Box>
    </ButtonBase>
  );
}
