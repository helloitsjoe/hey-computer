import { describe, it, expect } from 'vitest';
import { parseWeather } from '../weather';

describe('parseClock', () => {
  it('should return an empty object for no match', () => {
    expect(parseWeather('just a random phrase')).toEqual({});
  });

  it.each`
    input                                                | expected
    ${"what's the weather today in Boston"}              | ${{ type: 'weather', period: 'today', location: 'boston' }}
    ${"what's the weather tomorrow"}                     | ${{ type: 'weather', period: 'tomorrow', location: '' }}
    ${'what is the weather this week'}                   | ${{ type: 'weather', period: 'this week', location: '' }}
    ${"what's the forecast today"}                       | ${{ type: 'weather', period: 'today', location: '' }}
    ${"what's the weather forecast today"}               | ${{ type: 'weather', period: 'today', location: '' }}
    ${"what's the weather forecast for tomorrow"}        | ${{ type: 'weather', period: 'tomorrow', location: '' }}
    ${"what's the weather going to be today"}            | ${{ type: 'weather', period: 'today', location: '' }}
    ${"what's the weather gonna be today"}               | ${{ type: 'weather', period: 'today', location: '' }}
    ${"what's the weather going to be tomorrow"}         | ${{ type: 'weather', period: 'tomorrow', location: '' }}
    ${"what's the weather going to be on saturday"}      | ${{ type: 'weather', period: 'saturday', location: '' }}
    ${"what's the weather going to be this evening"}     | ${{ type: 'weather', period: 'tonight', location: '' }}
    ${"what's the weather going to be tonight"}          | ${{ type: 'weather', period: 'tonight', location: '' }}
    ${'what will the weather be on wednesday'}           | ${{ type: 'weather', period: 'wednesday', location: '' }}
    ${"what's the temperature for today"}                | ${{ type: 'temperature', period: 'today', location: '' }}
    ${'what are the temps going to be today'}            | ${{ type: 'temperature', period: 'today', location: '' }}
    ${'what are the high and low temperatures today'}    | ${{ type: 'temperature', period: 'today', location: '' }}
    ${'what will the temp be today'}                     | ${{ type: 'temperature', period: 'today', location: '' }}
    ${'what will the high temperature be today'}         | ${{ type: 'temperature', period: 'today', location: '' }}
    ${'what will the low temperature be today'}          | ${{ type: 'temperature', period: 'today', location: '' }}
    ${'what will the high and low temperature be today'} | ${{ type: 'temperature', period: 'today', location: '' }}
  `('$input', ({ input, expected }) => {
    expect(parseWeather(input)).toEqual(expected);
  });
});
