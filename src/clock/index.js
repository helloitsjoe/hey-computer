const fs = require('fs');
const path = require('path');
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
  /^(set|cancel)\s*(?:a|an|my|the)?\s*(timer|alarm)(?: for)?(.*)?$/i;

function parseClock(transcript) {
  const match = transcript.match(CLOCK_REGEX);

  if (!match) {
    return {};
  }

  const action = match[1].toLowerCase(); // 'set' or 'cancel'
  const type = match[2].toLowerCase(); // 'timer' or 'alarm'
  const time = match[3] ? match[3].trim() : null; // e.g. '5 minutes', '7 AM'

  return { type, action, time };
}

function getUnit(input) {
  switch (input) {
    case 'min':
    case 'mins':
    case 'minute':
    case 'minutes':
      return 'minutes';
    case 'hr':
    case 'hrs':
    case 'hour':
    case 'hours':
      return 'hours';
    case 'sec':
    case 'secs':
    case 'second':
    case 'seconds':
      return 'seconds';
    default:
      throw new Error(`Unexpected unit: ${input}`);
  }
}

function parseTimerString(timeString) {
  const pattern = /^(?:(\d+)\s*(seconds|minutes|hours)?)\s*(?:and\s*)?/i;
  const parsed = { hours: 0, minutes: 0, seconds: 0 };

  while (timeString.trim().length > 0) {
    const match = timeString.match(pattern);
    console.log(' match', match);
    if (match) {
      // TODO:
      // Remove , from thousands
      // Parse word numbers if needed
      const num = parseInt(match[1]);
      const unit = getUnit(match[2]);
      parsed[unit] = num;
      const toRemove = match[0];
      timeString = timeString.substring(toRemove.length);
    } else {
      console.log(`No match in ${timeString}`);
      break;
    }
  }

  return parsed;
}

async function handleClockCommand({ type, action, time }) {
  console.log(`Handling ${action} for ${type} with time: ${time}`);

  // Simulate handling the clock command
  if (type === 'timer') {
    if (action === 'set') {
      if (!time) {
        return "You didn't tell me how long!";
      }

      const parsedTime = parseTimerString(time);
      const totalSeconds =
        parsedTime.hours * 3600 + parsedTime.minutes * 60 + parsedTime.seconds;
      if (totalSeconds <= 0) {
        return 'Invalid time specified for the timer.';
      }

      const triggerTimeStamp = Date.now() + totalSeconds * 1000;

      // Load existing timers or create a new object
      let timers = {};
      if (fs.existsSync(CLOCK_FILE)) {
        timers = JSON.parse(fs.readFileSync(CLOCK_FILE, 'utf-8')).timers;
      }

      timers[triggerTimeStamp] = {
        // TODO: Human friendly name
        id: triggerTimeStamp,
        type: 'timer',
        triggerTimeStamp,
      };

      // Save timer to disk
      fs.writeFileSync(CLOCK_FILE, JSON.stringify(timers, null, 2));

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
            `${parsedTime[unit]} ${unit}${parsedTime[unit] > 1 ? 's' : ''}`,
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

module.exports = {
  parseClock,
  handleClockCommand,
  CLOCK_REGEX,
  parseTimerString,
};
