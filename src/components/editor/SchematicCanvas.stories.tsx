import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import Box from '@mui/material/Box';
import { demoSchematic } from '../../demo/editorContent';
import { CanvasToolbar } from './CanvasToolbar';
import { DEFAULT_VIEW_OPTIONS, type CanvasTool } from './viewOptions';
import { SchematicCanvas, type SchematicCanvasProps } from './SchematicCanvas';

const meta = {
  title: 'Editor/Schematic Canvas',
  component: SchematicCanvas,
  parameters: { layout: 'fullscreen' },
  args: {
    schematic: demoSchematic,
    selectedId: null,
    view: '2d',
    options: DEFAULT_VIEW_OPTIONS,
    onSelect: () => {},
  },
  argTypes: {
    schematic: { control: false },
    toolbar: { control: false },
    selectedId: { control: 'select', options: [null, 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'] },
    view: { control: 'inline-radio', options: ['2d', '3d'] },
  },
  decorators: [
    (Story) => (
      <Box sx={{ height: '100vh', display: 'flex' }}>
        <Story />
      </Box>
    ),
  ],
  render: function Render(args: SchematicCanvasProps) {
    const [, updateArgs] = useArgs<SchematicCanvasProps>();
    const [tool, setTool] = useState<CanvasTool>('select');
    return (
      <SchematicCanvas
        {...args}
        onSelect={(selectedId) => updateArgs({ selectedId })}
        toolbar={<CanvasToolbar tool={tool} onToolChange={setTool} view={args.view ?? '2d'} onViewChange={(view) => updateArgs({ view })} />}
      />
    );
  },
} satisfies Meta<typeof SchematicCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  args: { selectedId: 'S3' },
};

export const NoRayLabels: Story = {
  name: 'Ray labels off',
  args: { options: { ...DEFAULT_VIEW_OPTIONS, showRayLabels: false } },
};
