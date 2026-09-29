import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { demoPanelItems } from '../../demo/panelContent';
import { SidePanel, type SidePanelProps } from './SidePanel';

const meta = {
  title: 'Panels/Side Panel',
  component: SidePanel,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    items: demoPanelItems,
    state: 'collapsed',
    activeId: 'palette',
  },
  argTypes: {
    state: { control: 'inline-radio', options: ['collapsed', 'expanded', 'pinned'] },
    activeId: { control: 'inline-radio', options: demoPanelItems.map((i) => i.id) },
    items: { control: false },
  },
  render: function Render(args: SidePanelProps) {
    const [, updateArgs] = useArgs<SidePanelProps>();
    return (
      <Box sx={{ display: 'flex', height: (theme) => theme.spacing(80), bgcolor: 'background.default' }}>
        <SidePanel
          {...args}
          onStateChange={(state) => updateArgs({ state })}
          onActiveChange={(activeId) => updateArgs({ activeId })}
        />
        <Box sx={{ flex: 1, p: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Content area. An expanded panel floats over it; a pinned panel pushes it aside.
          </Typography>
        </Box>
      </Box>
    );
  },
} satisfies Meta<typeof SidePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {};

export const Expanded: Story = {
  args: { state: 'expanded' },
};

export const Pinned: Story = {
  args: { state: 'pinned' },
};
