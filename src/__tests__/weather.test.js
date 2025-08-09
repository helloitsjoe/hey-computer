import { describe, it, expect } from 'vitest';
import { parseWeather, getHighLowTempsForDay } from '../weather';

const TODAY = 'today';
const TOMORROW = 'tomorrow';

describe.skip('parseClock', () => {
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

describe.skip('getHighLowTempsForDay', () => {
  const weatherProperties = {
    periods: [
      { temperature: 80, isDaytime: true },
      { temperature: 80, isDaytime: true },
      { temperature: 80, isDaytime: true },
      { temperature: 79, isDaytime: false },
      { temperature: 77, isDaytime: false },
      { temperature: 76, isDaytime: false },
      { temperature: 73, isDaytime: false },
      { temperature: 70, isDaytime: false },
      { temperature: 69, isDaytime: false },
      { temperature: 66, isDaytime: false },
      { temperature: 65, isDaytime: false },
      { temperature: 63, isDaytime: false },
      { temperature: 60, isDaytime: false },
      { temperature: 62, isDaytime: false },
      { temperature: 62, isDaytime: false },
      { temperature: 62, isDaytime: true },
      { temperature: 65, isDaytime: true },
      { temperature: 70, isDaytime: true },
      { temperature: 70, isDaytime: true },
      { temperature: 70, isDaytime: true },
      { temperature: 70, isDaytime: true },
      { temperature: 70, isDaytime: true },
      { temperature: 70, isDaytime: true },
      { temperature: 70, isDaytime: true },
      { temperature: 70, isDaytime: true },
      { temperature: 69, isDaytime: true },
      { temperature: 68, isDaytime: true },
      { temperature: 67, isDaytime: false },
      { temperature: 66, isDaytime: false },
      { temperature: 65, isDaytime: false },
      { temperature: 63, isDaytime: false },
      { temperature: 59, isDaytime: false },
      { temperature: 58, isDaytime: false },
      { temperature: 55, isDaytime: false },
      { temperature: 52, isDaytime: false },
      { temperature: 50, isDaytime: false },
      { temperature: 50, isDaytime: false },
      { temperature: 50, isDaytime: false },
      { temperature: 50, isDaytime: false },
      { temperature: 51, isDaytime: true },
      { temperature: 52, isDaytime: true },
      { temperature: 53, isDaytime: true },
      { temperature: 53, isDaytime: true },
      { temperature: 53, isDaytime: true },
      { temperature: 53, isDaytime: true },
    ],
  };

  it('should return the correct high and low temperatures for today', () => {
    const result = getHighLowTempsForDay(weatherProperties, TODAY);
    expect(result.high).toBe(80);
    expect(result.low).toBe(60);
  });

  it('should return the correct high and low temperatures for tomorrow', () => {
    const result = getHighLowTempsForDay(weatherProperties, TOMORROW);
    expect(result.high).toBe(70);
    expect(result.low).toBe(50);
  });

  describe('asking at nighttime', () => {
    const nightWeatherProperties = {
      periods: weatherProperties.periods.slice(5),
    };

    it('should return the correct high and low temperatures for today', () => {
      const result = getHighLowTempsForDay(nightWeatherProperties, TODAY);
      expect(result.high).toBe(76);
      expect(result.low).toBe(60);
    });

    it('should return the correct high and low temperatures for tomorrow', () => {
      const result = getHighLowTempsForDay(nightWeatherProperties, TOMORROW);
      expect(result.high).toBe(70);
      expect(result.low).toBe(50);
    });
  });
});
