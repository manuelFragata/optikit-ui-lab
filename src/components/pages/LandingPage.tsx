import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { demoGallery } from '../../demo/homeContent';
import { communityFacts, communityMakers, exampleDesigns, featureHighlights, kitOffers, pricingPlans } from '../../demo/landingContent';
import type { Schematic } from '../editor/model';
import { PageContainer } from '../compositions/PageContainer';
import { SiteFooter } from '../compositions/SiteFooter';
import { SiteHeader } from '../compositions/SiteHeader';
import { CommunitySection } from '../landing/CommunitySection';
import { ExampleShowcase } from '../landing/ExampleShowcase';
import { PricingSection } from '../landing/PricingSection';
import { BenchPreview } from '../landing/BenchPreview';
import { SectionHeading, SectionTag } from '../landing/SectionHeading';

export type LandingSection = 'examples' | 'community' | 'how-it-works' | 'pricing';

export interface LandingPageProps {
  /** Example slideshow auto-advance in ms; 0 turns it off. */
  autoAdvanceMs?: number;
  onHome?: () => void;
  onLogIn?: () => void;
  onSignUp?: () => void;
  /** Open an example, with the visitor's changes, in the editor. */
  onOpenExample?: (id: string, schematic: Schematic) => void;
  onOpenDesign?: (id: string) => void;
  onNewProject?: () => void;
  onBrowseGallery?: () => void;
  onChoosePlan?: (id: string) => void;
  /** A kit (CoreBox, QBox) was clicked. */
  onChooseKit?: (id: string) => void;
  /**
   * A top-bar section link was clicked. Without it the page scrolls to the
   * section itself; the prototype passes it to put the section in the URL.
   */
  onSection?: (section: LandingSection) => void;
}

/** Gallery designs with a drawing of their own (shown live on the featured card). */
const GALLERY_DRAWINGS = Object.fromEntries(
  [
    ['g4', 'ex-brightfield'],
    ['g1', 'ex-brightfield'],
    ['g2', 'ex-fluor'],
  ].flatMap(([galleryId, exampleId]) => {
    const example = exampleDesigns.find((e) => e.id === exampleId);
    return example ? [[galleryId, example.schematic]] : [];
  }),
);

export const LANDING_SECTIONS: { id: LandingSection; label: string }[] = [
  { id: 'examples', label: 'Examples' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'community', label: 'Community' },
  { id: 'pricing', label: 'Pricing' },
];

export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * A full-width stretch of the page. `tinted` lays it on the sunken surface,
 * fading in and out at the edges so it never ends on a line.
 */
function Band({ id, tinted, children }: { id?: string; tinted?: boolean; children: ReactNode }) {
  return (
    <Box
      component="section"
      id={id}
      sx={(t) => ({
        position: 'relative', // paints over the guide lines
        // Land below the sticky top bar when scrolled to.
        scrollMarginTop: t.spacing(t.layout.topbarHeight),
        py: tinted ? { xs: 10, md: 16 } : { xs: 6, md: 10 },
        ...(tinted
          ? {
              background: `linear-gradient(180deg, transparent, ${(t.vars ?? t).palette.background.sunken} 18%, ${(t.vars ?? t).palette.background.sunken} 82%, transparent)`,
            }
          : {}),
      })}
    >
      <PageContainer>{children}</PageContainer>
    </Box>
  );
}

/**
 * Faint vertical lines at the content edges, running the length of the page
 * behind every section, so the sections read as one continuous grid.
 */
function GuideLines() {
  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <PageContainer sx={{ height: '100%' }}>
        <Box
          sx={(t) => ({
            height: '100%',
            borderLeft: `${t.layout.hairline}px solid ${(t.vars ?? t).palette.divider}`,
            borderRight: `${t.layout.hairline}px solid ${(t.vars ?? t).palette.divider}`,
            // Offset by one gutter so the lines sit just outside the content.
            mx: { xs: -1, md: -2.5 },
            opacity: 0.7,
          })}
        />
      </PageContainer>
    </Box>
  );
}

/**
 * What a signed-out visitor sees: a top bar, playable examples, the community
 * gallery, features and pricing, and the footer. Nothing else.
 */
export function LandingPage({
  autoAdvanceMs = 9000,
  onHome,
  onLogIn,
  onSignUp,
  onOpenExample,
  onOpenDesign,
  onNewProject,
  onBrowseGallery,
  onChoosePlan,
  onChooseKit,
  onSection,
}: LandingPageProps) {
  const goTo = onSection ?? scrollToSection;

  return (
    <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <SiteHeader
        user={null}
        nav={LANDING_SECTIONS.map((s) => ({ label: s.label, onClick: () => goTo(s.id) }))}
        onHome={onHome}
        onLogIn={onLogIn}
        onSignUp={onSignUp}
      />

      <Box component="main" sx={{ flex: 1, position: 'relative' }}>
        <GuideLines />
        <Box
          component="section"
          id="examples"
          sx={{ position: 'relative', scrollMarginTop: (t) => t.spacing(t.layout.topbarHeight), pt: { xs: 5, md: 8 }, pb: { xs: 6, md: 10 } }}
        >
          <PageContainer>
            <Box sx={{ mb: { xs: 2, md: 3 } }}>
              <SectionTag>Examples · no account needed</SectionTag>
            </Box>
            <Typography variant="display" component="h1" sx={{ mb: { xs: 4, md: 6 }, maxWidth: (t) => t.spacing(150) }}>
              See? You can do it too, give it a try:
            </Typography>
            <ExampleShowcase examples={exampleDesigns} autoAdvanceMs={autoAdvanceMs} onOpen={onOpenExample} onLocked={onSignUp} />
            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Link component="button" variant="body2" onClick={onNewProject}>
                Or start from an empty page
              </Link>
            </Box>
          </PageContainer>
        </Box>

        <Band id="how-it-works">
          <Stack spacing={{ xs: 4, md: 6 }}>
            <SectionHeading eyebrow="How it works" title="From a sketch to a box of parts">
              Real openUC2 modules, in 3D. Drag the bench to turn it, click a part to see what it is.
            </SectionHeading>
            <BenchPreview features={featureHighlights} onStart={onNewProject} />
          </Stack>
        </Band>

        <Band id="community" tinted>
          <CommunitySection
            items={[...demoGallery.filter((g) => g.source === 'community'), ...demoGallery.filter((g) => g.source === 'optikit')]}
            drawings={GALLERY_DRAWINGS}
            facts={communityFacts}
            makers={communityMakers}
            onOpenDesign={onOpenDesign}
            onBrowseGallery={onBrowseGallery}
          />
        </Band>

        <Band id="pricing">
          <PricingSection plans={pricingPlans} kits={kitOffers} onChoosePlan={onChoosePlan} onChooseKit={onChooseKit} />
        </Band>
      </Box>

      <SiteFooter />
    </Box>
  );
}
