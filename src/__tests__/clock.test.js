import { describe, it, expect } from 'vitest';
import { parseClock, parseTimerString, convertStringToNumber } from '../clock';

describe('parseClock', () => {
  it('should return an empty object for no match', () => {
    expect(parseClock('just a random phrase')).toEqual({});
  });

  it.each`
    input                                       | expected
    ${'set a timer for 30 seconds'}             | ${{ type: 'timer', action: 'set', time: '30 seconds' }}
    ${'set a timer for 5 minutes'}              | ${{ type: 'timer', action: 'set', time: '5 minutes' }}
    ${'set a timer for 2 hours'}                | ${{ type: 'timer', action: 'set', time: '2 hours' }}
    ${'set a timer for 2 hours and 30 minutes'} | ${{ type: 'timer', action: 'set', time: '2 hours and 30 minutes' }}
    ${'set a timer for half an hour'}           | ${{ type: 'timer', action: 'set', time: 'half an hour' }}
    ${'cancel timer'}                           | ${{ type: 'timer', action: 'cancel', time: null }}
    ${'cancel the timer'}                       | ${{ type: 'timer', action: 'cancel', time: null }}
    ${'cancel the time or'}                     | ${{ type: 'timer', action: 'cancel', time: null }}
    ${'cancel my time'}                         | ${{ type: 'timer', action: 'cancel', time: null }}
    ${'set an alarm for 7 AM'}                  | ${{ type: 'alarm', action: 'set', time: '7 AM' }}
    ${'set an alarm for 7:15'}                  | ${{ type: 'alarm', action: 'set', time: '7:15' }}
    ${'set an alarm for seven thirty'}          | ${{ type: 'alarm', action: 'set', time: 'seven thirty' }}
    ${'cancel my alarm'}                        | ${{ type: 'alarm', action: 'cancel', time: null }}
    ${'set a timer 10 minutes'}                 | ${{ type: 'timer', action: 'set', time: '10 minutes' }}
    ${'set timer 10 minutes'}                   | ${{ type: 'timer', action: 'set', time: '10 minutes' }}
    ${'stop the timer'}                         | ${{ type: 'timer', action: 'stop', time: null }}
    ${'stop the time'}                          | ${{ type: 'timer', action: 'stop', time: null }}
    ${'stop the time or'}                       | ${{ type: 'timer', action: 'stop', time: null }}
    ${'stop'}                                   | ${{ type: 'timer', action: 'stop', time: null }}
    ${'stop stop'}                              | ${{ type: 'timer', action: 'stop', time: null }}
  `('$input', ({ input, expected }) => {
    expect(parseClock(input)).toEqual(expected);
  });
});

describe('parseTimerString', () => {
  it.each`
    input                                                              | expected
    ${'1 second'}                                                      | ${{ hours: 0, minutes: 0, seconds: 1 }}
    ${'30 seconds'}                                                    | ${{ hours: 0, minutes: 0, seconds: 30 }}
    ${'1 minute'}                                                      | ${{ hours: 0, minutes: 1, seconds: 0 }}
    ${'one minute'}                                                    | ${{ hours: 0, minutes: 1, seconds: 0 }}
    ${'5 minutes'}                                                     | ${{ hours: 0, minutes: 5, seconds: 0 }}
    ${'5 minutes and 30 seconds'}                                      | ${{ hours: 0, minutes: 5, seconds: 30 }}
    ${'1 hour and thirty minutes'}                                     | ${{ hours: 1, minutes: 30, seconds: 0 }}
    ${'3 hours and 5 minutes'}                                         | ${{ hours: 3, minutes: 5, seconds: 0 }}
    ${'3 hours 5 minutes 40 seconds'}                                  | ${{ hours: 3, minutes: 5, seconds: 40 }}
    ${'3 hours 5 minutes and 40 seconds'}                              | ${{ hours: 3, minutes: 5, seconds: 40 }}
    ${'twenty three hours forty five minutes and thirty nine seconds'} | ${{ hours: 23, minutes: 45, seconds: 39 }}
  `('$input', ({ input, expected }) => {
    // TODO:
    expect(parseTimerString(input)).toEqual(expected);
  });
});

describe('convertStringToNumber', () => {
  it.each`
    input                                                            | expected
    ${'one'}                                                         | ${1}
    ${'thirty'}                                                      | ${30}
    ${'forty five'}                                                  | ${45}
    ${'one hundred fifty'}                                           | ${150}
    ${'one hundred and thirty six'}                                  | ${136}
    ${'three hundred and thirty six'}                                | ${336}
    ${'one thousand two hundred and twelve'}                         | ${1212}
    ${'one hundred thousand eighty'}                                 | ${100_080}
    ${'one hundred twenty three thousand three hundred and fifteen'} | ${123_315}
    ${'three hundred and three thousand and fifteen'}                | ${303_015}
  `('$input', ({ input, expected }) => {
    expect(convertStringToNumber(input)).toBe(expected);
  });
});
