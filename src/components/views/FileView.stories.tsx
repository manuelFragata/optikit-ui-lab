import type { Meta, StoryObj } from '@storybook/react-vite';
import { demoDesignInfo, demoFiles, demoHistory } from '../../demo/editorContent';
import { demoPeople, demoShareLink } from '../../demo/fileContent';
import { FileView } from './FileView';

const meta = {
  title: 'Views/File',
  component: FileView,
  parameters: { layout: 'fullscreen' },
  args: {
    name: 'Fluorescence microscope',
    version: '0.4.2',
    info: demoDesignInfo,
    files: demoFiles,
    versions: demoHistory,
    people: demoPeople,
    link: demoShareLink('ex-fluor'),
    onRename: () => {},
    onNewProject: () => {},
    onOpenProjects: () => {},
    onDuplicate: () => {},
    onDelete: () => {},
    onExport: () => {},
    onImport: () => {},
    onNotice: () => {},
  },
  argTypes: { section: { control: 'inline-radio', options: ['info', 'versions', 'share', 'export', 'import'] } },
} satisfies Meta<typeof FileView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};
export const Versions: Story = { args: { section: 'versions' } };
export const Share: Story = { args: { section: 'share' } };
export const Export: Story = { args: { section: 'export' } };
export const Import: Story = { args: { section: 'import' } };
