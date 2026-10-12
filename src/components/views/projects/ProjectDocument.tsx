import { useLayoutEffect, useRef, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import type { DesignDetail } from '../../../api/types';
import { gsap, reducedMotion } from '../../landing/motion';
import { DesignPage } from '../DesignPage';
import { CardTab, cardOutlineSx, ProjectTabLabel, TAB_H } from './ProjectDrawer';

export interface ProjectDocumentProps {
  design: DesignDetail;
  /** The card's number in the drawer, kept on the document's tab. */
  number: string;
  /** The design's 3D view or drawing. */
  preview?: ReactNode;
  /** Where the card was on screen: the document grows out of it. */
  from: DOMRect;
  /** Position in the positioned parent, px. */
  top: number;
  width: number;
  onOpen: () => void;
  onExport?: () => void;
  onShare?: () => void;
  /** Called once the document has gone. */
  onClose: () => void;
}

/**
 * A project's card opened into a document: the same outline and tab as in
 * the drawer, page-sized, holding the design's full page. It grows out of
 * the card when it mounts and folds away when closed.
 */
export function ProjectDocument({ design, number, preview, from, top, width, onOpen, onExport, onShare, onClose }: ProjectDocumentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Grow out of the card: start at the card's box, end at the document's own; the content follows once there is room.
  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.offsetParent;
    if (!el || !parent || reducedMotion()) return;
    const box = parent.getBoundingClientRect();
    const to = el.getBoundingClientRect();
    const tl = gsap.timeline();
    tl.fromTo(
      el,
      { left: from.left - box.left, top: from.top - box.top, width: from.width, height: from.height },
      { left: to.left - box.left, top: to.top - box.top, width: to.width, height: to.height, duration: 0.8, ease: 'power3.inOut', clearProps: 'left,top,width,height' },
    );
    tl.from(contentRef.current, { opacity: 0, y: 12, duration: 0.45, ease: 'power2.out', clearProps: 'opacity,transform' }, 0.55);
    return () => {
      tl.progress(1).kill();
    };
  }, [from]);

  const close = () => {
    const el = ref.current;
    if (!el || reducedMotion()) return onClose();
    gsap.to(el, { opacity: 0, y: 16, scale: 0.98, duration: 0.3, ease: 'power2.in', onComplete: onClose });
  };

  return (
    <Box
      ref={ref}
      role="dialog"
      aria-label={design.name}
      onKeyDown={(e) => e.key === 'Escape' && close()}
      sx={{ ...cardOutlineSx, position: 'absolute', top: top + TAB_H, right: 0, width, zIndex: 2, boxShadow: 8 }}
    >
      <CardTab x={24}>
        <ProjectTabLabel number={number} name={design.name} />
      </CardTab>

      {/* The content clips while the outline grows, so nothing spills before there is room. */}
      <Box sx={{ overflow: 'hidden', height: '100%', borderRadius: '10px' }}>
        <Box ref={contentRef} sx={{ m: 1.5, p: { xs: 2, md: 3.5 }, border: 1, borderStyle: 'dashed', borderColor: 'divider', borderRadius: '6px' }}>
          <DesignPage
            embedded
            design={design}
            preview={preview}
            onBack={close}
            backLabel="Back to the drawer"
            onEdit={onOpen}
            onExport={onExport}
            onShare={onShare}
          />
        </Box>
      </Box>
    </Box>
  );
}
