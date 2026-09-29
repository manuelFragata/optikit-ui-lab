import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

const meta = {
  title: 'Primitives/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    children: 'Add surface',
    variant: 'contained',
    color: 'primary',
    disabled: false,
    onClick: fn(),
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['contained', 'outlined', 'text'] },
    color: { control: 'select', options: ['primary', 'secondary', 'inherit', 'error'] },
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: { variant: 'outlined', children: 'Cancel' },
};

export const WithIcon: Story = {
  args: { startIcon: <AddIcon /> },
};

export const Icon: Story = {
  render: () => (
    <Stack direction="row" spacing={1}>
      <Tooltip title="Duplicate">
        <IconButton aria-label="Duplicate">
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Toggle visibility">
        <IconButton aria-label="Toggle visibility" color="primary">
          <VisibilityOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton aria-label="Delete" color="error">
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  ),
};

export const Hierarchy: Story = {
  render: () => (
    <Stack direction="row" spacing={1}>
      <Button variant="contained">Apply</Button>
      <Button variant="outlined">Cancel</Button>
      <Button variant="text">Reset</Button>
      <Button variant="contained" disabled>
        Disabled
      </Button>
    </Stack>
  ),
};
