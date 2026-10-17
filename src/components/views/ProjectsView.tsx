import { useRef, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { DesignDetail, ProjectSummary } from '../../api/types';
import type { Schematic } from '../editor/model';
import { PageContainer } from '../compositions/PageContainer';
import { PillButton } from '../landing/PillButton';
import { useRiseIn } from '../landing/motion';
import { ProjectDocument } from './projects/ProjectDocument';
import { EASE, ProjectDrawer } from './projects/ProjectDrawer';
import { PageHeader } from './PageHeader';

export interface ProjectsViewProps {
  /** The signed-in user's name, for the drawer's label. */
  owner: string;
  projects: ProjectSummary[];
  drawings?: Record<string, Schematic>;
  /** Parts, versions and the rest of the design page, by project id. */
  details?: Record<string, DesignDetail>;
  /** The 3D view (or drawing) for a project's document. */
  renderPreview?: (id: string) => ReactNode;
  onOpen: (id: string) => void;
  /** Export or share a project (the File tab). */
  onExport?: (id: string) => void;
  onShare?: (id: string) => void;
  /** Delete a project, or take a shared one out of the drawer. */
  onDelete?: (id: string) => void;
  onNewProject: () => void;
}

/** The drawer's width when nothing is open, px. */
const DRAWER_W = 920;

/** A project with no page of its own yet still opens: its summary, with empty lists. */
const asDetail = (p: ProjectSummary): DesignDetail => ({ ...p, inputs: [], parts: [], versions: [], usedIn: [] });

/** Where the drawer and the document go when one opens, for a stage this wide: the document to the right edge, the drawer to its left with a clear gap. */
function layoutFor(stageWidth: number) {
  const drawer = Math.min(DRAWER_W, stageWidth);
  const docWidth = Math.round(Math.min(1100, Math.max(560, stageWidth * 0.5)));
  const gap = Math.max(64, stageWidth * 0.08);
  const scale = Math.max(0.45, Math.min(0.72, (stageWidth - docWidth - gap) / drawer));
  // The drawer is centred; at the stage's left edge it would leave this much room before the document.
  const room = stageWidth - docWidth - drawer * scale;
  // Half of that goes to the left of the drawer, so it stays half as far from the document (scaling from its left).
  const shift = -(stageWidth - drawer) / 2 + Math.max(0, room / 2);
  return { docWidth, drawerTransform: `translateX(${shift}px) scale(${scale})` };
}

/**
 * Projects (UI-V4 §2): the user's designs, filed in a drawer. Opening a card
 * pushes the drawer to the left and unfolds the card into the design's page,
 * as a document, on the right.
 */
export function ProjectsView({ owner, projects, drawings = {}, details = {}, renderPreview, onOpen, onExport, onShare, onDelete, onNewProject }: ProjectsViewProps) {
  const titleRef = useRiseIn<HTMLHeadingElement>({ immediate: true });
  const stageRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<{ id: string; number: string; from: DOMRect; top: number; docWidth: number; drawerTransform: string } | null>(null);
  const project = doc && projects.find((p) => p.id === doc.id);

  const preview = (id: string, number: string, from: DOMRect) => {
    const stage = stageRef.current?.getBoundingClientRect();
    if (!stage) return;
    // The document starts near the top of what is on screen, even when the page has scrolled.
    const top = Math.max(0, -stage.top + 24);
    setDoc({ id, number, from, top, ...layoutFor(stage.width) });
  };

  return (
    <PageContainer sx={{ pt: 3, pb: 8 }}>
      <PageHeader
        titleRef={titleRef}
        title="Projects"
        lead="Your designs and the ones you work on with others. Pull a card out by its tab, drag it up, or turn the mouse wheel; click it to read it."
        actions={<PillButton onClick={onNewProject}>New project</PillButton>}
      />

      {projects.length > 0 ? (
        <Box ref={stageRef} sx={{ position: 'relative', minHeight: doc ? 900 : undefined }}>
          {/* With a document open, the drawer steps back to the left and stays in use: another card pulled out takes the document's place. */}
          <Box
            sx={{
              maxWidth: DRAWER_W,
              mx: 'auto',
              transformOrigin: 'left top',
              transform: doc?.drawerTransform ?? 'none',
              opacity: doc ? 0.9 : 1,
              transition: `transform 800ms ${EASE}, opacity 800ms ${EASE}`,
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            }}
          >
            <ProjectDrawer projects={projects} drawings={drawings} label={`${owner.toLowerCase()}'s projects`} onPreview={preview} onPull={(id, number, from) => doc && setDoc({ ...doc, id, number, from })} hiddenId={doc?.id} onDelete={onDelete} />
          </Box>

          {doc && project && (
            <ProjectDocument
              key={doc.id}
              design={details[project.id] ?? asDetail(project)}
              number={doc.number}
              preview={renderPreview?.(project.id)}
              from={doc.from}
              top={doc.top}
              width={doc.docWidth}
              onOpen={() => onOpen(project.id)}
              onExport={onExport && (() => onExport(project.id))}
              onShare={onShare && (() => onShare(project.id))}
              onClose={() => setDoc(null)}
            />
          )}
        </Box>
      ) : (
        <Typography color="text.secondary" sx={{ py: 8, textAlign: 'center' }}>
          The drawer is empty. Start a new project, or open one from Explore.
        </Typography>
      )}
    </PageContainer>
  );
}
