import { describe, expect, it } from 'vitest';
import { LAB_NETWORK, networkFromSearch, NO_NETWORK, overNetwork } from './network';

describe('the stand-in network', () => {
  it('reads the delay and the failures from the address, within bounds', () => {
    expect(networkFromSearch('')).toEqual(LAB_NETWORK);
    expect(networkFromSearch('?latency=800&fail=0.3')).toEqual({ latencyMs: 800, failRate: 0.3 });
    expect(networkFromSearch('?latency=-5&fail=7')).toEqual({ latencyMs: 0, failRate: 1 });
    expect(networkFromSearch('?latency=soon')).toEqual(LAB_NETWORK);
  });

  it('answers, or fails in words', async () => {
    await expect(overNetwork(NO_NETWORK, 'the parts list', () => 42)).resolves.toBe(42);
    await expect(overNetwork({ latencyMs: 0, failRate: 1 }, 'the parts list', () => 42)).rejects.toThrow('Could not get the parts list: the service did not answer.');
    await expect(
      overNetwork(NO_NETWORK, 'x', () => {
        throw new Error('bad input');
      }),
    ).rejects.toThrow('bad input');
  });
});
