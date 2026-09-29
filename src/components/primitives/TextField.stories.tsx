import type { Meta, StoryObj } from '@storybook/react-vite';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import SearchIcon from '@mui/icons-material/Search';

const meta = {
  title: 'Primitives/Text Field',
  component: TextField,
  tags: ['autodocs'],
  args: {
    label: 'Surface name',
    placeholder: 'e.g. L1 front',
    helperText: '',
    error: false,
    disabled: false,
  },
  decorators: [
    (Story) => (
      <Stack sx={{ maxWidth: (theme) => theme.spacing(46) }}>
        <Story />
      </Stack>
    ),
  ],
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHelper: Story = {
  args: { helperText: 'Shown in the layers list' },
};

export const ErrorState: Story = {
  args: { error: true, defaultValue: '??', helperText: 'Name must not be empty' },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Locked' },
};

export const Search: Story = {
  args: {
    label: undefined,
    placeholder: 'Search components',
    slotProps: {
      input: {
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
      },
    },
  },
};

export const Multiline: Story = {
  args: { label: 'Notes', multiline: true, minRows: 3, placeholder: 'Design intent, tolerances…' },
};
