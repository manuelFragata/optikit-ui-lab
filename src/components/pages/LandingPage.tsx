import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { demoGallery } from '../../demo/homeContent';
import { communityFacts, exampleDesigns, featureHighlights, pricingPlans } from '../../demo/landingContent';
import type { Schematic } from '../editor/model';
import { PageContainer } from '../compositions/PageContainer';
import { SiteFooter } from '../compositions/SiteFooter';
import { SiteHeader } from '../compositions/SiteHeader';
import { CommunitySection } from '../landing/CommunitySection';
import { ExampleShowcase } from '../landing/ExampleShowcase';
import { PricingSection } from '../landing/PricingSection';
import { BenchPreview } from '../landing/BenchPreview';
import { SectionHeading } from '../landing/SectionHeading';

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
  /**
   * A top-bar section link was clicked. Without it the page scrolls to the
   * section itself; the prototype passes it to put the section in the URL.
   */
  onSection?: (section: LandingSection) => void;
}

export const LANDING_SECTIONS: { id: LandingSection; label: string }[] = [
  { id: 'examples', label: 'Examples' },
  { id: 'community', label: 'Community' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'pricing', label: 'Pricing' },
];

export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** A full-width band; `raised` puts it on the paper surface between hairlines. */
function Band({ id, raised, children }: { id?: string; raised?: boolean; children: ReactNode }) {
  return (
    <Box
      component="section"
      id={id}
      sx={{
        // Land below the sticky top bar when scrolled to.
        scrollMarginTop: (t) => t.spacing(t.layout.topbarHeight),
        py: { xs: 6, md: 10 },
        ...(raised ? { bgcolor: 'background.paper', borderTop: 1, borderBottom: 1, borderColor: 'divider' } : {}),
      }}
    >
      <PageContainer>{children}</PageContainer>
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

      <Box component="main" sx={{ flex: 1 }}>
        <Box
          component="section"
          id="examples"
          sx={{ scrollMarginTop: (t) => t.spacing(t.layout.topbarHeight), pt: { xs: 5, md: 8 }, pb: { xs: 6, md: 10 } }}
        >
          <PageContainer>
            <Typography
              variant="meta"
              color="text.secondary"
              component="p"
              sx={{ mb: { xs: 2, md: 3 }, textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              Examples · no account needed
            </Typography>
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

        <Band id="community">
          <CommunitySection
            items={[...demoGallery.filter((g) => g.source === 'community'), ...demoGallery.filter((g) => g.source === 'optikit')].slice(0, 4)}
            facts={communityFacts}
            onOpenDesign={onOpenDesign}
            onBrowseGallery={onBrowseGallery}
          />
        </Band>

        <Band id="how-it-works">
          <Stack spacing={{ xs: 4, md: 6 }}>
            <SectionHeading eyebrow="How it works" title="From a sketch to a box of parts">
              Real openUC2 modules, in 3D. Drag the bench to turn it, click a part to see what it is.
            </SectionHeading>
            <BenchPreview features={featureHighlights} />
          </Stack>
        </Band>

        <Band id="pricing">
          <PricingSection plans={pricingPlans} onChoosePlan={onChoosePlan} />
        </Band>
      </Box>

      <SiteFooter />
    </Box>
  );
}
