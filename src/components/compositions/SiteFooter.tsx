import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export interface FooterLink {
  label: string;
  href: string;
}

export interface SiteFooterProps {
  links?: FooterLink[];
  contactHref?: string;
  /** Small print on the left, e.g. version or copyright. */
  note?: string;
}

const DEFAULT_LINKS: FooterLink[] = [
  { label: 'About', href: '#about' },
  { label: 'Legal notice', href: '#legal' },
  { label: 'Privacy', href: '#privacy' },
  { label: 'Terms of use', href: '#terms' },
];

/** Page footer: a hairline, info and legal links, and contact on the right. */
export function SiteFooter({ links = DEFAULT_LINKS, contactHref = 'mailto:info@openuc2.com', note = 'Optikit v0.4.2 · openUC2' }: SiteFooterProps) {
  return (
    <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', pt: 2.5, pb: 1 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between' }}
      >
        <Typography variant="mono" color="text.secondary">
          {note}
        </Typography>
        <Stack component="nav" aria-label="Site information" direction="row" useFlexGap spacing={2.5} sx={{ flexWrap: 'wrap' }}>
          {links.map((link) => (
            <Link key={link.label} href={link.href} variant="body2" color="text.secondary">
              {link.label}
            </Link>
          ))}
        </Stack>
        <Link href={contactHref} variant="body2">
          Contact
        </Link>
      </Stack>
    </Box>
  );
}
