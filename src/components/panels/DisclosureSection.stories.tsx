import type { Meta, StoryObj } from '@storybook/react-vite';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import { TagChip } from '../primitives/TagChip';
import { DisclosureSection } from './DisclosureSection';

const meta = {
  title: 'Panels/Disclosure Section',
  component: DisclosureSection,
  tags: ['autodocs'],
  args: {
    title: 'Surface properties',
    defaultOpen: true,
    children: (
      <Typography variant="body2" color="text.secondary">
        Radius, thickness and material go here.
      </Typography>
    ),
  },
  argTypes: {
    children: { control: false },
    actions: { control: false },
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: (theme) => theme.spacing(44), bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof DisclosureSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};

export const Closed: Story = {
  args: { defaultOpen: false },
};

export const WithActions: Story = {
  args: {
    title: 'Coatings',
    actions: (
      <IconButton aria-label="Add coating">
        <AddIcon fontSize="small" />
      </IconButton>
    ),
    children: (
      <Stack direction="row" spacing={1}>
        <TagChip label="AR · 550 nm" tone="secondary" />
        <TagChip label="MgF₂" />
      </Stack>
    ),
  },
};

export const Stacked: Story = {
  render: () => (
    <>
      <DisclosureSection title="Geometry">
        <Typography variant="body2">Radius, thickness, semi-diameter.</Typography>
      </DisclosureSection>
      <DisclosureSection title="Material" defaultOpen={false}>
        <Typography variant="body2">Glass catalogue selection.</Typography>
      </DisclosureSection>
      <DisclosureSection title="Tolerances" defaultOpen={false}>
        <Typography variant="body2">± values per parameter.</Typography>
      </DisclosureSection>
    </>
  ),
};
