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

async function handleClockCommand({ type, action, time }) {
  console.log(`Handling ${action} for ${type} with time: ${time}`);

  // TODO: Save to a file or DB to persist across restarts

  // Simulate handling the clock command
  if (type === 'timer') {
    if (action === 'set') {
      return `Timer set for ${time || 'a duration you need to specify'}.`;
    } else if (action === 'cancel') {
      return 'Timer cancelled.';
    }
  } else if (type === 'alarm') {
    if (action === 'set') {
      return `Alarm set for ${time || 'a time you need to specify'}.`;
    } else if (action === 'cancel') {
      return 'Alarm cancelled.';
    }
  }

  return `Unknown command: ${action} for ${type}.`;
}

module.exports = { parseClock, handleClockCommand, CLOCK_REGEX };
