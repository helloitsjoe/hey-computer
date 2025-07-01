import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleClockCommand, clockEmitter, initSavedTimers } from '../../clock';

let originalEnv = process.env;

const MOCK_CLOCK_FILE = path.join(__dirname, 'saved', 'clock.json');

beforeEach(() => {
  process.env = { ...originalEnv };
  process.env.CLOCK_FILE = MOCK_CLOCK_FILE;
  vi.useFakeTimers();
});

afterEach(() => {
  process.env = originalEnv;
  fs.rmdirSync(path.dirname(MOCK_CLOCK_FILE), { recursive: true, force: true });
  vi.useRealTimers();
});

const createSavedTimer = (ts, name) => ({
  name,
  id: ts,
  triggerTimeStamp: ts,
  type: 'timer',
});

describe('clock integration tests', () => {
  it.each`
    time                | messageTime    | timeInMs
    ${'thirty seconds'} | ${'30 second'} | ${30 * 1000}
    ${'thirty minutes'} | ${'30 minute'} | ${30 * 60 * 1000}
    ${'three hours'}    | ${'3 hour'}    | ${3 * 60 * 60 * 1000}
  `(
    'returns triggerTimeStamp for $time',
    async ({ time, messageTime, timeInMs }) => {
      const input = { type: 'timer', action: 'set', time };
      const triggerTime = Date.now() + timeInMs;
      const response = await handleClockCommand(input);

      expect(response).toEqual({
        type: 'timer',
        message: `${messageTime} timer starting now.`,
        data: { triggerTimeStamp: expect.any(Number) },
      });
      expect(response.data.triggerTimeStamp / 1000).toBeCloseTo(
        triggerTime / 1000,
      );
    },
  );

  it('saves to disk', async () => {
    const input = { type: 'timer', action: 'set', time: 'thirty seconds' };
    const response = await handleClockCommand(input);
    expect(response).toEqual({
      type: 'timer',
      message: '30 second timer starting now.',
      data: { triggerTimeStamp: expect.any(Number) },
    });

    const saved = fs.readFileSync(MOCK_CLOCK_FILE);
    const entries = Object.entries(JSON.parse(saved).timers);
    expect(entries.length).toBe(1);
    const [key, value] = entries[0];
    expect(value).toEqual({
      id: expect.any(Number),
      triggerTimeStamp: expect.any(Number),
      name: 'thirty seconds',
      type: 'timer',
    });
    expect(value.id).toEqual(value.triggerTimeStamp);
    expect(key).toBe(String(value.id));
  });

  it('triggers timer at time', async () => {
    let triggeredName = null;
    clockEmitter.on('trigger-timer', ({ name }) => {
      triggeredName = name;
    });

    const input = { type: 'timer', action: 'set', time: 'thirty seconds' };
    const response = await handleClockCommand(input);
    expect(response).toEqual({
      type: 'timer',
      message: '30 second timer starting now.',
      data: { triggerTimeStamp: expect.any(Number) },
    });

    vi.advanceTimersByTime(29 * 1000);
    expect(triggeredName).toBeNull();
    vi.advanceTimersByTime(1 * 1000);
    expect(triggeredName).toBe('thirty seconds');
  });

  // it('stops a triggered timer', () => {
  //   //
  // });

  describe('saved timers', () => {
    beforeEach(() => {
      const ts = Date.now() + 45 * 1000;
      fs.mkdirSync(path.dirname(MOCK_CLOCK_FILE), { recursive: true });
      fs.writeFileSync(
        MOCK_CLOCK_FILE,
        JSON.stringify({
          timers: {
            [ts]: createSavedTimer(ts, 'forty five seconds'),
          },
        }),
      );
    });

    it('reads from saved timers', async () => {
      const input = { type: 'timer', action: 'set', time: 'three minutes' };
      const response = await handleClockCommand(input);
      expect(response).toEqual({
        type: 'timer',
        message: '3 minute timer starting now.',
        data: { triggerTimeStamp: expect.any(Number) },
      });

      const saved = fs.readFileSync(MOCK_CLOCK_FILE);
      const entries = Object.entries(JSON.parse(saved).timers);
      expect(entries.length).toBe(2);
      const [key1, value1] = entries[0];
      const [key2, value2] = entries[1];

      expect(value1).toEqual({
        id: expect.any(Number),
        triggerTimeStamp: expect.any(Number),
        name: 'forty five seconds',
        type: 'timer',
      });
      expect(value1.id).toEqual(value1.triggerTimeStamp);
      expect(key1).toBe(String(value1.id));

      expect(value2).toEqual({
        id: expect.any(Number),
        triggerTimeStamp: expect.any(Number),
        name: 'three minutes',
        type: 'timer',
      });
      expect(value2.id).toEqual(value2.triggerTimeStamp);
      expect(key2).toBe(String(value2.id));
    });

    it('triggers from a saved timer', () => {
      let triggeredName = null;
      clockEmitter.on('trigger-timer', ({ name }) => {
        triggeredName = name;
      });

      initSavedTimers();

      vi.advanceTimersByTime(44 * 1000);
      expect(triggeredName).toBeNull();
      vi.advanceTimersByTime(1 * 1000);
      expect(triggeredName).toBe('forty five seconds');
    });
  });
});
