const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { SAVE_DIR } = require('../utils');

// Project: clock-parser
// Regex should handle various clock intents:
// Timer, alarm
// With various functions:
//  - Set a timer for 5 minutes
//  - Set a second timer for 10 minutes
//  - Set an alarm for 7 AM
//  - Cancel the timer
//  - Cancel the alarm
//  - "Set a timer" should ask how long

const DEFAULT_CLOCK_FILE = path.join(SAVE_DIR, 'clock.json');
const STOP_REGEX = /^stop( stop)?( stop)?$/i;
const CLOCK_REGEX =
  /^(set|cancel|stop)\s*(?:a|an|my|the)?\s*(timer|alarm|time(?: or)?)(?: for)?(.*)?$/i;

// Node setTimeout returns a non-serializable Timer object instead of ID
const timerCancelMap = {};
const clockEmitter = new EventEmitter();

function loadTimers() {
  try {
    const saveFile = process.env.CLOCK_FILE || DEFAULT_CLOCK_FILE;
    return JSON.parse(fs.readFileSync(saveFile, 'utf-8')).timers || {};
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {};
    } else {
      console.error('Error reaading file', err);
      return {};
    }
  }
}

function saveTimers(timers) {
  const saveFile = process.env.CLOCK_FILE || DEFAULT_CLOCK_FILE;
  fs.mkdirSync(path.dirname(saveFile), { recursive: true });
  fs.writeFileSync(saveFile, JSON.stringify({ timers }, null, 2));
}

// function cancelAllTimers() {
//   for (const [k, cancelable] of Object.entries(timerCancelMap)) {
//     clearTimeout(cancelable);
//     delete timerCancelMap[k];
//   }
// }

const translateMap = {
  time: 'timer',
  'time or': 'timer',
};

function parseClock(transcript) {
  // TODO: Eventually might have more things we want to stop, at that point
  // pull this out of clock and have detect what needs stopping
  if (transcript.match(STOP_REGEX)) {
    return { type: 'timer', action: 'stop', time: null };
  }

  const match = transcript.match(CLOCK_REGEX);

  if (!match) {
    return {};
  }

  const action = match[1].toLowerCase(); // 'set', 'stop' or 'cancel'
  const typeRaw = match[2].toLowerCase(); // 'timer' or 'alarm'
  const type = translateMap[typeRaw] || typeRaw;
  const time = match[3] ? match[3].trim() : null; // e.g. 'five minutes'

  return { type, action, time };
}

function parseTimerString(timeString) {
  let parts = timeString.replaceAll(' and', '').split(' ');
  const parsedWords = { hours: '', minutes: '', seconds: '' };

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (['hours', 'minutes', 'seconds'].includes(part)) {
      parsedWords[part] = parts.slice(0, i).join(' ');
      parts = parts.slice(i + 1);
      i = 0;
    }
  }

  return {
    hours: convertStringToNumber(parsedWords.hours),
    minutes: convertStringToNumber(parsedWords.minutes),
    seconds: convertStringToNumber(parsedWords.seconds),
  };
}

function convertStringToNumber(input) {
  console.log('input', input);
  if (typeof input === 'number' || Number(input) === Number(input)) {
    return Number(input);
  }
  const parts = input.replaceAll(' and', '').split(' ');

  const wordToNum = {
    zero: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
    twenty: 20,
    thirty: 30,
    forty: 40,
    fifty: 50,
    sixty: 60,
    seventy: 70,
    eighty: 80,
    ninety: 90,
    hundred: 100,
    thousand: 1000,
  };

  let current = 0;
  let prevMultiple = null;

  // TODO: Millions
  const multiples = {
    hundred: 0,
    thousand: 0,
    // million: 0,
  };

  for (const part of parts) {
    if (Object.keys(multiples).includes(part)) {
      if (prevMultiple === 'hundred' && part === 'thousand') {
        multiples[part] = (multiples.hundred + current) * wordToNum[part];
        multiples[prevMultiple] = 0;
        prevMultiple = null;
        current = 0;
        continue;
      }

      multiples[part] = (current || 1) * wordToNum[part];
      prevMultiple = part;
      current = 0;
      continue;
    }
    current += wordToNum[part];
  }

  let total = current;
  for (const val of Object.values(multiples)) {
    total += val;
  }

  return total;
}

async function handleClockCommand({ type, action, time }) {
  console.log(`Handling ${action} for ${type} with time: ${time}`);

  // Simulate handling the clock command
  if (type === 'timer') {
    if (action === 'stop') {
      clockEmitter.emit('stop-timer');
      return;
    } else if (action === 'set') {
      if (!time) {
        return { message: "You didn't tell me how long!" };
      }

      const parsedTime = parseTimerString(time);
      if (!parsedTime) {
        return { message: `Invalid time specified for the timer: ${time}` };
      }

      const totalSeconds =
        parsedTime.hours * 3600 + parsedTime.minutes * 60 + parsedTime.seconds;

      if (totalSeconds <= 0) {
        return { message: `Time must be a positive number` };
      }

      const triggerTimeStamp = Date.now() + totalSeconds * 1000;

      // TODO: Move load/save into setTimer to simplify?
      // Load existing timers or create a new object
      const timers = loadTimers();

      // setTimeout ID
      const cancelable = setTimer({ name: time, triggerTimeStamp });

      timerCancelMap[triggerTimeStamp] = cancelable;
      timers[triggerTimeStamp] = {
        id: triggerTimeStamp,
        name: time,
        type: 'timer',
        triggerTimeStamp,
      };

      // Save timer to disk
      saveTimers(timers);

      console.log(
        `Timer set with ID: ${triggerTimeStamp}`,
        timers[triggerTimeStamp],
      );

      // Return a confirmation message, only including the units of time that contain a non-zero value
      const parts = [];
      const unitNames = ['hours', 'minutes', 'seconds'];
      unitNames.forEach((unit) => {
        if (parsedTime[unit] > 0) {
          parts.push(
            `${parsedTime[unit]} ${unit.substring(0, unit.length - 1)}`,
          );
        }
      });

      const timeString = parts.join(', ');
      return {
        message: `${timeString} timer starting now.`,
        type: 'timer',
        data: { triggerTimeStamp },
      };
    } else if (action === 'cancel') {
      const savedTimers = loadTimers();
      console.log('savedTimers', savedTimers);
      console.log('timerCancelMap', timerCancelMap);
      const timers = Object.values(savedTimers);

      if (timers.length === 0) {
        return { message: "You don't have any timers set" };
      }

      if (timers.length === 1) {
        const onlyTimer = timers[0];
        clearTimeout(timerCancelMap[onlyTimer.triggerTimeStamp]);
        delete timerCancelMap[onlyTimer.triggerTimeStamp];
        delete savedTimers[onlyTimer.id];

        saveTimers(savedTimers);

        return { message: `${onlyTimer.name} timer canceled` };
      }

      if (!time) {
        return { message: 'Which timer should I cancel?' };
      }

      // If only one timer, cancel, otherwise ask which one
      // TODO: Handle `time` in `cancel` flow, e.g. "Cancel my 30 minute timer"

      return { message: 'Something went wrong with timers' };
    }
  } else if (type === 'alarm') {
    if (action === 'set') {
      return `Alarm set for ${time || 'a time you need to specify'}.`;
    } else if (action === 'cancel') {
      // If only one timer, cancel, otherwise ask which one
      return 'Alarm cancelled.';
    }
  }

  return `Unknown command: ${action} for ${type}.`;
}

async function initSavedTimers() {
  // TODO: Write tests for this
  const savedTimers = loadTimers();
  const entries = Object.entries(savedTimers);

  for (let i = 0; i < entries.length; i++) {
    const [id, { name, triggerTimeStamp }] = entries[i];

    if (triggerTimeStamp < Date.now()) {
      console.log(`Timer ${id} past due, will be deleted`);
      delete savedTimers[id];
    } else {
      const duration = triggerTimeStamp - Date.now();
      console.log(`Timer will go off in ${duration / 1000} sec`);
      const cancelable = setTimer({ name, triggerTimeStamp });
      timerCancelMap[triggerTimeStamp] = cancelable;
    }
  }

  saveTimers(savedTimers);
}

function setTimer({ name, triggerTimeStamp }) {
  const duration = triggerTimeStamp - Date.now();

  const cancelable = setTimeout(() => {
    clockEmitter.emit('trigger-timer', { name });
    delete timerCancelMap[cancelable];
  }, duration);

  return cancelable;
}

module.exports = {
  CLOCK_REGEX,
  STOP_REGEX,
  setTimer,
  parseClock,
  clockEmitter,
  initSavedTimers,
  parseTimerString,
  handleClockCommand,
  convertStringToNumber,
};
