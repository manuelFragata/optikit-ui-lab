/** The landing page's sections, as the header links to them. */
export type LandingSection = 'examples' | 'community' | 'how-it-works' | 'pricing';

export const LANDING_SECTIONS: { id: LandingSection; label: string }[] = [
  { id: 'examples', label: 'Examples' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'community', label: 'Community' },
  { id: 'pricing', label: 'Pricing' },
];

export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
