import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';
import Box from '@mui/material/Box';
import AdjustIcon from '@mui/icons-material/Adjust';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { SelectField } from '../primitives/SelectField';
import { SliderField } from '../primitives/SliderField';
import { DisclosureSection } from './DisclosureSection';
import { InspectorPanel, type InspectorPanelProps } from './InspectorPanel';

const meta = {
  title: 'Panels/Inspector Panel',
  component: InspectorPanel,
  tags: ['autodocs'],
  args: {
    title: 'L1 front',
    kind: 'Spherical surface',
    icon: <AdjustIcon fontSize="small" />,
    position: { x: 0, y: 0, z: 12.5 },
    notes: '',
    unit: 'mm',
    onPositionChange: fn(),
    onNotesChange: fn(),
    onClose: fn(),
    menuItems: [
      { id: 'duplicate', label: 'Duplicate', icon: <ContentCopyIcon fontSize="small" /> },
      { id: 'delete', label: 'Delete', icon: <DeleteOutlineIcon fontSize="small" />, destructive: true, dividerBefore: true },
    ],
  },
  argTypes: {
    icon: { control: false },
    menuItems: { control: false },
    children: { control: false },
  },
  decorators: [
    (Story) => (
      <Box
        sx={{
          width: (theme) => theme.spacing(theme.layout.inspectorWidth),
          height: (theme) => theme.spacing(80),
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Story />
      </Box>
    ),
  ],
  render: function Render(args: InspectorPanelProps) {
    const [, updateArgs] = useArgs<InspectorPanelProps>();
    return (
      <InspectorPanel
        {...args}
        onPositionChange={(position) => {
          args.onPositionChange(position);
          updateArgs({ position });
        }}
        onNotesChange={(notes) => {
          args.onNotesChange(notes);
          updateArgs({ notes });
        }}
      />
    );
  },
} satisfies Meta<typeof InspectorPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithNotes: Story = {
  args: { notes: 'Keep centre thickness above 2 mm for manufacturability.' },
};

export const WithExtraSections: Story = {
  args: {
    children: (
      <DisclosureSection title="Surface">
        <Box sx={{ display: 'grid', gap: 2 }}>
          <SliderField label="Radius" value={48.2} onChange={() => {}} min={-200} max={200} step={0.1} precision={1} unit="mm" />
          <SelectField
            label="Material"
            value="n-bk7"
            onChange={() => {}}
            options={[
              { value: 'n-bk7', label: 'N-BK7' },
              { value: 'n-sf11', label: 'N-SF11' },
            ]}
          />
        </Box>
      </DisclosureSection>
    ),
  },
};
