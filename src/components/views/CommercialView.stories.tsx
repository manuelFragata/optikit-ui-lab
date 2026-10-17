import type { Meta, StoryObj } from '@storybook/react-vite';
import { demoChecks, demoCustomer, demoLabourRate, demoSupply } from '../../demo/commercial';
import { demoLight } from '../../standins/kernel/light';
import { demoSchematic } from '../../demo/editorContent';
import { demoPrices } from '../../standins/library/prices';
import { buildBom } from '../../standins/service/bom';
import { CommercialView } from './CommercialView';

const bom = buildBom(demoSchematic, demoPrices);

const meta = {
  title: 'Views/Commercial',
  component: CommercialView,
  parameters: { layout: 'fullscreen' },
  args: {
    designName: 'Fluorescence microscope',
    version: '1.0.0',
    bom,
    supply: demoSupply,
    labourRate: demoLabourRate,
    checks: demoChecks(demoSchematic, bom, demoLight(demoSchematic)),
    customer: demoCustomer,
    onSend: () => {},
    onCreateOdoo: () => {},
    onDownloadCsv: () => {},
  },
  argTypes: { bom: { control: false }, supply: { control: false }, checks: { control: false } },
} satisfies Meta<typeof CommercialView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The demo design: one line without a price, one optic still needing a holder. */
export const Quote: Story = {};

/** No customer yet: the quote cannot be sent. */
export const NoCustomer: Story = { args: { customer: undefined } };
