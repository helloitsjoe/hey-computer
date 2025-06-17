import { describe, it, expect } from 'vitest';
import { MBTA_REGEX, formatMins } from '../mbta';

describe('formatMins', () => {
  it('handles single element', () => {
    expect(formatMins([2])).toBe('2');
  });

  it('handles two elements', () => {
    expect(formatMins([2, 4])).toBe('2 and 4');
  });

  it('handles multiple elements', () => {
    expect(formatMins([2, 4, 5, 6])).toBe('2, 4, 5 and 6');
  });
});

describe('MBTA regex', () => {
  it.each`
    input
    ${'when is my bus coming'}
    ${'when is the next bus'}
    ${"when's the bus"}
  `('$input', ({ input }) => {
    expect(MBTA_REGEX.test(input)).toBe(true);
  });
});
