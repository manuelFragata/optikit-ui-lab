import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { demoUser } from '../../demo/user';
import { StatusBar } from './StatusBar';
import { TAB_LABELS, type WorkspaceTab } from './Ribbon';
import { WorkspaceShell } from './WorkspaceShell';

const meta = {
  title: 'Compositions/Workspace Shell',
  component: WorkspaceShell,
  parameters: { layout: 'fullscreen' },
  args: {
    tab: 'view',
    design: { name: 'BF+Fluor FRAME Optical Core', version: '0.4.2' },
    user: demoUser,
    onTabChange: () => {},
    children: null,
  },
  argTypes: {
    tab: { control: 'inline-radio', options: Object.keys(TAB_LABELS) },
    children: { control: false },
    commands: { control: false },
    statusBar: { control: false },
  },
  // Clicking a tab updates the `tab` control, so the story behaves like the app.
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return (
      <WorkspaceShell {...args} onTabChange={(tab: WorkspaceTab) => updateArgs({ tab })}>
        <Typography sx={{ p: 3 }} color="text.secondary">
          The {TAB_LABELS[args.tab]} view goes here.
        </Typography>
      </WorkspaceShell>
    );
  },
} satisfies Meta<typeof WorkspaceShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A design is open: every view is available. */
export const DesignOpen: Story = {
  args: {
    commands: (
      <>
        <Button size="small" variant="outlined">
          Add mounted part
        </Button>
        <Button size="small" variant="outlined">
          Add unmounted part
        </Button>
      </>
    ),
    statusBar: <StatusBar tone="warning" status="1 part not mounted yet" />,
  },
};

/** No design open: only Home and Projects. */
export const NoDesign: Story = {
  args: { tab: 'projects', design: null },
};

/** Signed out: Home is browsable, the header offers Log in. */
export const SignedOut: Story = {
  args: { tab: 'home', design: null, user: null },
};
