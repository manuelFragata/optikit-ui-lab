import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import Box from '@mui/material/Box';
import { demoSchematic } from '../../demo/editorContent';
import { CanvasToolbar, DEFAULT_VIEW_OPTIONS, type CanvasTool, type ViewOptions } from './CanvasToolbar';
import { SchematicCanvas, type SchematicCanvasProps } from './SchematicCanvas';

const meta = {
  title: 'Editor/Schematic Canvas',
  component: SchematicCanvas,
  parameters: { layout: 'fullscreen' },
  args: {
    schematic: demoSchematic,
    selectedId: null,
    view: 'schematic',
    options: DEFAULT_VIEW_OPTIONS,
    onSelect: () => {},
  },
  argTypes: {
    schematic: { control: false },
    toolbar: { control: false },
    selectedId: { control: 'select', options: [null, 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'] },
    view: { control: 'inline-radio', options: ['schematic', 'parts', 'assembly'] },
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
    const [options, setOptions] = useState<ViewOptions>(args.options as ViewOptions);
    return (
      <SchematicCanvas
        {...args}
        options={options}
        onSelect={(selectedId) => updateArgs({ selectedId })}
        toolbar={
          <CanvasToolbar
            tool={tool}
            onToolChange={setTool}
            view={args.view ?? 'schematic'}
            onViewChange={(view) => updateArgs({ view })}
            options={options}
            onOptionsChange={setOptions}
          />
        }
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
