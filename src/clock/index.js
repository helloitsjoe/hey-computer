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

const CLOCK_FILE = path.join(SAVE_DIR, 'clock.json');
const CLOCK_REGEX =
  /^(set|cancel|stop)\s*(?:a|an|my|the)?\s*(timer|alarm)(?: for)?(.*)?$/i;

const clockEmitter = new EventEmitter();

function loadTimers() {
  try {
    return JSON.parse(fs.readFileSync(CLOCK_FILE, 'utf-8')).timers || {};
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
  fs.writeFileSync(CLOCK_FILE, JSON.stringify({ timers }, null, 2));
}

function parseClock(transcript) {
  const match = transcript.match(CLOCK_REGEX);

  if (!match) {
    return {};
  }

  const action = match[1].toLowerCase(); // 'set', 'stop' or 'cancel'
  const type = match[2].toLowerCase(); // 'timer' or 'alarm'
  const time = match[3] ? match[3].trim() : null; // e.g. '5 minutes', '7 AM'

  return { type, action, time };
}

// function getUnit(input) {
//   switch (input) {
//     case 'min':
//     case 'mins':
//     case 'minute':
//     case 'minutes':
//       return 'minutes';
//     case 'hr':
//     case 'hrs':
//     case 'hour':
//     case 'hours':
//       return 'hours';
//     case 'sec':
//     case 'secs':
//     case 'second':
//     case 'seconds':
//       return 'seconds';
//     default:
//       throw new Error(`Unexpected unit: ${input}`);
//   }
// }

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

      // Load existing timers or create a new object
      const timers = loadTimers();

      timers[triggerTimeStamp] = {
        // TODO: Human friendly name
        id: triggerTimeStamp,
        type: 'timer',
        triggerTimeStamp,
      };

      setTimer({ triggerTimeStamp });

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
        // TODO: name
        data: { triggerTimeStamp },
      };
    } else if (action === 'cancel') {
      // If only one timer, cancel, otherwise ask which one
      return 'Timer cancelled.';
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
  const timers = loadTimers();
  const entries = Object.entries(timers);

  for (let i = 0; i < entries.length; i++) {
    const [id, { name, triggerTimeStamp }] = entries[i];

    if (triggerTimeStamp < Date.now()) {
      console.log(`Timer ${id} past due, will be deleted`);
      delete timers[id];
    } else {
      const duration = triggerTimeStamp - Date.now();
      console.log(`Timer will go off in ${duration / 1000} sec`);
      setTimer({ name, triggerTimeStamp });
    }
  }

  saveTimers(timers);
}

function setTimer({ name, triggerTimeStamp }) {
  const duration = triggerTimeStamp - Date.now();

  return setTimeout(() => {
    clockEmitter.emit('trigger-timer');
  }, duration);
}

module.exports = {
  CLOCK_REGEX,
  setTimer,
  parseClock,
  clockEmitter,
  initSavedTimers,
  parseTimerString,
  handleClockCommand,
  convertStringToNumber,
};
