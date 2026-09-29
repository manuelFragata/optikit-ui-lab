import type { Meta, StoryObj } from '@storybook/react-vite';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import { DashboardCard } from './DashboardCard';

const meta = {
  title: 'Cards/Dashboard Card',
  component: DashboardCard,
  tags: ['autodocs'],
  args: {
    title: 'Your projects',
    subtitle: '4 designs, most recent first',
    icon: <FolderOpenOutlinedIcon />,
    children: (
      <Typography variant="body2" color="text.secondary">
        Card body.
      </Typography>
    ),
  },
  argTypes: {
    icon: { control: false },
    action: { control: false },
    children: { control: false },
  },
  decorators: [
    (Story) => (
      <Box sx={{ maxWidth: (theme) => theme.spacing(90) }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof DashboardCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithButton: Story = {
  args: {
    action: (
      <Button variant="contained" startIcon={<AddIcon />}>
        New project
      </Button>
    ),
  },
};

export const WithLink: Story = {
  args: {
    title: 'Need inspiration?',
    subtitle: undefined,
    action: (
      <Link href="#" variant="body2">
        Browse all
      </Link>
    ),
  },
};
