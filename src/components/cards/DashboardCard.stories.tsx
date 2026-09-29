import type { Meta, StoryObj } from '@storybook/react-vite';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { BenchIllustration } from './BenchIllustration';
import { DashboardCard } from './DashboardCard';

const meta = {
  title: 'Cards/Dashboard Card',
  component: DashboardCard,
  tags: ['autodocs'],
  args: {
    title: 'Need a hand?',
    children: (
      <Typography variant="body2" color="text.secondary">
        Card body.
      </Typography>
    ),
  },
  argTypes: {
    action: { control: false },
    children: { control: false },
  },
  decorators: [
    (Story) => (
      <Box sx={{ maxWidth: (theme) => theme.spacing(60) }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof DashboardCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    title: 'Your projects',
    action: (
      <Link href="#" variant="body2">
        View all
      </Link>
    ),
  },
};

export const Unframed: Story = {
  name: 'Unframed (custom content)',
  args: { title: 'Filler illustration', unframed: true, children: <BenchIllustration /> },
};
