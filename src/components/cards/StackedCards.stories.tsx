import type { Meta, StoryObj } from '@storybook/react-vite';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import NewReleasesOutlinedIcon from '@mui/icons-material/NewReleasesOutlined';
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined';
import { StackedCards, type StackedCardItem } from './StackedCards';

const body = (text: string) => (
  <Box sx={{ p: 2.5 }}>
    <Typography variant="body2" color="text.secondary">
      {text}
    </Typography>
  </Box>
);

const ITEMS: StackedCardItem[] = [
  { id: 'forum', label: 'Community forum', icon: <ForumOutlinedIcon fontSize="small" />, content: body('Latest threads from the forum.') },
  { id: 'releases', label: 'Release notes', icon: <NewReleasesOutlinedIcon fontSize="small" />, content: body('What changed in v0.4.2.') },
  { id: 'tips', label: 'Tip of the week', icon: <TipsAndUpdatesOutlinedIcon fontSize="small" />, content: body('Hold Shift while nudging to move 10 units.') },
];

const meta = {
  title: 'Cards/Stacked Cards',
  component: StackedCards,
  tags: ['autodocs'],
  args: { items: ITEMS.slice(0, 2), autoAdvanceMs: 4000 },
  argTypes: {
    items: { control: false },
    autoAdvanceMs: { control: { type: 'number', min: 0, step: 500 } },
  },
  decorators: [
    (Story) => (
      <Box sx={{ maxWidth: (theme) => theme.spacing(64) }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof StackedCards>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoCards: Story = {};

export const ThreeCards: Story = {
  args: { items: ITEMS },
};

export const Manual: Story = {
  name: 'Manual (no auto-advance)',
  args: { autoAdvanceMs: 0 },
};
