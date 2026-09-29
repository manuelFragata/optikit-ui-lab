import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { OverflowMenu, type OverflowMenuItem } from './OverflowMenu';

const ITEMS: OverflowMenuItem[] = [
  { id: 'rename', label: 'Rename', icon: <DriveFileRenameOutlineIcon fontSize="small" />, shortcut: 'F2', onSelect: fn() },
  { id: 'duplicate', label: 'Duplicate', icon: <ContentCopyIcon fontSize="small" />, shortcut: 'Ctrl+D', onSelect: fn() },
  { id: 'lock', label: 'Lock position', icon: <LockOutlinedIcon fontSize="small" />, disabled: true },
  {
    id: 'delete',
    label: 'Delete',
    icon: <DeleteOutlineIcon fontSize="small" />,
    shortcut: 'Del',
    destructive: true,
    dividerBefore: true,
    onSelect: fn(),
  },
];

const meta = {
  title: 'Panels/Overflow Menu',
  component: OverflowMenu,
  tags: ['autodocs'],
  args: { items: ITEMS, label: 'More actions' },
  argTypes: { items: { control: false }, icon: { control: false } },
} satisfies Meta<typeof OverflowMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Minimal: Story = {
  args: { items: ITEMS.slice(0, 2) },
};
