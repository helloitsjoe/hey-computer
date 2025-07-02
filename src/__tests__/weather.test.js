import { describe, it, expect } from 'vitest';
import { parseWeather } from '../weather';

describe('parseClock', () => {
  it('should return an empty object for no match', () => {
    expect(parseWeather('just a random phrase')).toEqual({});
  });

  it.each`
    input                                            | expected
    ${"what's the weather today in Boston"}          | ${{ period: 'today', location: 'boston' }}
    ${"what's the weather tomorrow"}                 | ${{ period: 'tomorrow', location: '' }}
    ${'what is the weather this week'}               | ${{ period: 'this week', location: '' }}
    ${"what's the forecast today"}                   | ${{ period: 'today', location: '' }}
    ${"what's the weather forecast today"}           | ${{ period: 'today', location: '' }}
    ${"what's the weather forecast for tomorrow"}    | ${{ period: 'tomorrow', location: '' }}
    ${"what's the weather going to be today"}        | ${{ period: 'today', location: '' }}
    ${"what's the weather gonna be today"}           | ${{ period: 'today', location: '' }}
    ${"what's the weather going to be tomorrow"}     | ${{ period: 'tomorrow', location: '' }}
    ${"what's the weather going to be on saturday"}  | ${{ period: 'saturday', location: '' }}
    ${"what's the weather going to be this evening"} | ${{ period: 'tonight', location: '' }}
    ${"what's the weather going to be tonight"}      | ${{ period: 'tonight', location: '' }}
  `('$input', ({ input, expected }) => {
    expect(parseWeather(input)).toEqual(expected);
  });
});
