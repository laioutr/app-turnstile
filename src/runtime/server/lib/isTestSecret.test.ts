import { describe, expect, it } from 'vitest';
import { isTestSecret } from './isTestSecret';

describe('isTestSecret', () => {
  it('recognises the three documented test secrets', () => {
    for (const prefix of ['1x', '2x', '3x']) expect(isTestSecret(`${prefix}0000000000000000000000000000000AA`)).toBe(true);
  });

  it('does not flag a real-looking secret', () => {
    expect(isTestSecret('0x4AAAAAAABkMYinukE8nzYS')).toBe(false);
  });
});
