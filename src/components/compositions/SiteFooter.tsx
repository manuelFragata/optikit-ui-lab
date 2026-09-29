import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { OpenUC2Mark } from '../primitives/OpenUC2Mark';
import { PageContainer } from './PageContainer';

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface SiteFooterProps {
  columns?: FooterColumn[];
  legalLinks?: FooterLink[];
  contactEmail?: string;
  /** Small print on the left of the bottom row, e.g. version or copyright. */
  note?: string;
}

const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    title: 'Product',
    links: [
      { label: 'Editor', href: '#/editor/new' },
      { label: 'Examples', href: '#examples' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Release notes', href: '#releases' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Gallery', href: '#gallery' },
      { label: 'Forum', href: '#forum' },
      { label: 'Tutorials', href: '#tutorials' },
      { label: 'GitHub', href: 'https://github.com/openUC2' },
    ],
  },
  {
    title: 'openUC2',
    links: [
      { label: 'About us', href: '#about' },
      { label: 'Cube kits and shop', href: 'https://openuc2.com' },
      { label: 'For schools and labs', href: '#lab' },
      { label: 'Press', href: '#press' },
    ],
  },
];

const DEFAULT_LEGAL: FooterLink[] = [
  { label: 'Legal notice', href: '#legal' },
  { label: 'Privacy', href: '#privacy' },
  { label: 'Terms of use', href: '#terms' },
];

function external(href: string) {
  return href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}

/**
 * Site footer: a full-width band on the sunken surface, set apart from the
 * page. About and contact on the left, link columns, then a legal row.
 */
export function SiteFooter({
  columns = DEFAULT_COLUMNS,
  legalLinks = DEFAULT_LEGAL,
  contactEmail = 'info@openuc2.com',
  note = 'Optikit v0.4.2 · © openUC2 GmbH',
}: SiteFooterProps) {
  return (
    <Box component="footer" sx={{ flexShrink: 0, borderTop: 1, borderColor: 'divider', bgcolor: 'background.sunken' }}>
      <PageContainer sx={{ pt: { xs: 5, md: 7 }, pb: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 4, md: 6 },
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: `2fr repeat(${columns.length}, minmax(0, 1fr))` },
          }}
        >
          <Stack spacing={1.5} sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, maxWidth: (t) => t.spacing(52) }}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <OpenUC2Mark sx={{ height: (theme) => theme.spacing(3.5) }} />
              <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'fontWeightBold' }}>
                Optikit
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Optikit is the design tool for openUC2, the open-source optics toolbox made of 3D-printed cubes. Made in Jena, Germany.
            </Typography>
            <Box>
              <Typography variant="caption" color="text.secondary" component="div">
                Questions, schools, labs:
              </Typography>
              <Link href={`mailto:${contactEmail}`} variant="body2">
                {contactEmail}
              </Link>
            </Box>
          </Stack>

          {columns.map((column) => (
            <Box component="nav" key={column.title} aria-label={column.title}>
              <Typography variant="overline" color="text.secondary" component="h2" sx={{ display: 'block', mb: 1 }}>
                {column.title}
              </Typography>
              <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} variant="body2" color="text.primary" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }} {...external(link.href)}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </Stack>
            </Box>
          ))}
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mt: { xs: 5, md: 7 }, pt: 2.5, borderTop: 1, borderColor: 'divider', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
        >
          <Typography variant="meta" color="text.meta">
            {note}
          </Typography>
          <Stack component="nav" aria-label="Legal" direction="row" useFlexGap spacing={2.5} sx={{ flexWrap: 'wrap' }}>
            {legalLinks.map((link) => (
              <Link key={link.label} href={link.href} variant="body2" color="text.secondary">
                {link.label}
              </Link>
            ))}
          </Stack>
        </Stack>
      </PageContainer>
    </Box>
  );
}
