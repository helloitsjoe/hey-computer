import { describe, it, expect } from 'vitest';
import { parseWeather } from '../weather';

describe('parseClock', () => {
  it('should return an empty object for no match', () => {
    expect(parseWeather('just a random phrase')).toEqual({});
  });

  it.each`
    input                                   | expected
    ${"what's the weather today in Boston"} | ${{ period: 'today', location: 'boston' }}
    ${"what's the weather tomorrow"}        | ${{ period: 'tomorrow', location: '' }}
    ${'what is the weather this week'}      | ${{ period: 'this week', location: '' }}
  `('$input', ({ input, expected }) => {
    expect(parseWeather(input)).toEqual(expected);
  });
});
