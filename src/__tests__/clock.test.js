import { describe, it, expect } from 'vitest';
import { parseClock } from '../clock';

describe('parseClock', () => {
  it('should return an empty object for no match', () => {
    expect(parseClock('just a random phrase')).toEqual({});
  });

  it.each`
    description                  | input                          | expected
    ${'set timer for 5 minutes'} | ${'set a timer for 5 minutes'} | ${{ type: 'timer', action: 'set', time: '5 minutes' }}
    ${'cancel timer'}            | ${'cancel timer'}              | ${{ type: 'timer', action: 'cancel', time: null }}
    ${'cancel the timer'}        | ${'cancel the timer'}          | ${{ type: 'timer', action: 'cancel', time: null }}
    ${'set alarm for 7 AM'}      | ${'set an alarm for 7 AM'}     | ${{ type: 'alarm', action: 'set', time: '7 AM' }}
    ${'set alarm for 7 AM'}      | ${'set an alarm for 7:15'}     | ${{ type: 'alarm', action: 'set', time: '7:15' }}
    ${'cancel my alarm'}         | ${'cancel my alarm'}           | ${{ type: 'alarm', action: 'cancel', time: null }}
    ${'set timer without "for"'} | ${'set a timer 10 minutes'}    | ${{ type: 'timer', action: 'set', time: '10 minutes' }}
    ${'set timer without "a"'}   | ${'set timer 10 minutes'}      | ${{ type: 'timer', action: 'set', time: '10 minutes' }}
  `('$description', ({ input, expected }) => {
    expect(parseClock(input)).toEqual(expected);
  });
});
