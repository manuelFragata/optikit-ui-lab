/**
 * The licences a design can be published under, by SPDX id. Open hardware
 * licences first, then Creative Commons for designs shared as content.
 * Each links to the licence's official page.
 */
export interface License {
  id: string;
  name: string;
  group: 'Open hardware' | 'Creative Commons' | 'Closed';
  /** What it means for someone who builds the design, in one line. */
  summary: string;
  url?: string;
}

export const LICENSES: License[] = [
  {
    id: 'CERN-OHL-S-2.0',
    name: 'CERN OHL v2, strongly reciprocal',
    group: 'Open hardware',
    summary: 'Anyone may build, change and sell it; changed designs, and designs built around it, must be shared under the same licence.',
    url: 'https://ohwr.org/cern_ohl_s_v2.txt',
  },
  {
    id: 'CERN-OHL-W-2.0',
    name: 'CERN OHL v2, weakly reciprocal',
    group: 'Open hardware',
    summary: 'Changes to this design must be shared under the same licence; larger products that only use it may stay closed.',
    url: 'https://ohwr.org/cern_ohl_w_v2.txt',
  },
  {
    id: 'CERN-OHL-P-2.0',
    name: 'CERN OHL v2, permissive',
    group: 'Open hardware',
    summary: 'Anyone may build, change and sell it, open or closed, as long as they keep the notice.',
    url: 'https://ohwr.org/cern_ohl_p_v2.txt',
  },
  {
    id: 'CC-BY-4.0',
    name: 'CC BY 4.0',
    group: 'Creative Commons',
    summary: 'Anyone may use and change it, also commercially, as long as they credit you.',
    url: 'https://creativecommons.org/licenses/by/4.0/',
  },
  {
    id: 'CC-BY-SA-4.0',
    name: 'CC BY-SA 4.0',
    group: 'Creative Commons',
    summary: 'As CC BY, and changed versions must be shared under the same licence.',
    url: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  {
    id: 'CC-BY-NC-SA-4.0',
    name: 'CC BY-NC-SA 4.0',
    group: 'Creative Commons',
    summary: 'As CC BY-SA, but not for commercial use.',
    url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  },
  {
    id: 'CC0-1.0',
    name: 'CC0 1.0, public domain',
    group: 'Creative Commons',
    summary: 'No conditions: anyone may do anything with it, without credit.',
    url: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  {
    id: 'proprietary',
    name: 'All rights reserved',
    group: 'Closed',
    summary: 'Only people you share it with may see it; nobody may build or sell it without your permission.',
  },
];

/** Where to read about choosing between open hardware licences. */
export const LICENSE_HELP = 'https://cern-ohl.web.cern.ch/';

export const licenseById = (id: string) => LICENSES.find((l) => l.id === id);
