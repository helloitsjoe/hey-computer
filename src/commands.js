const { ANYLIST_REGEX, preprocessAnylist, addToList } = require('./anylist');
const { MBTA_REGEX, getNextBus } = require('./mbta');
const {
  STOP_REGEX,
  CLOCK_REGEX,
  parseClock,
  handleClockCommand,
} = require('./clock');
const {
  WEATHER_REGEX,
  parseWeather,
  handleWeatherCommand,
} = require('./weather');
const { SETTINGS_REGEX, updateSettings } = require('./settings');
const { DOG_REGEX, parseHappyDog, handleDog } = require('./happy-dog');

async function executeCommand(rawTranscript) {
  const transcript = rawTranscript.trim();
  if (!transcript || typeof transcript !== 'string') {
    console.error('Invalid transcript provided:', transcript);
    return { message: "Sorry, I didn't catch that" };
  }

  switch (true) {
    case SETTINGS_REGEX.test(transcript): {
      return updateSettings(transcript);
    }
    case ANYLIST_REGEX.test(transcript): {
      const { items, list } = preprocessAnylist(transcript);
      return await addToList(items, list);
    }
    case MBTA_REGEX.test(transcript): {
      return getNextBus(transcript);
    }
    case DOG_REGEX.test(transcript): {
      const { type } = parseHappyDog(transcript);
      return await handleDog({ type });
    }
    case STOP_REGEX.test(transcript):
    case CLOCK_REGEX.test(transcript): {
      const { type, action, time } = parseClock(transcript);
      return await handleClockCommand({ type, action, time });
    }
    case WEATHER_REGEX.test(transcript): {
      const { type, period, location } = parseWeather(transcript);
      return await handleWeatherCommand({ type, period, location });
    }
    default: {
      // `stream` response triggers client llm stream request
      return { message: transcript, type: 'stream-boomerang' };
    }
  }
}

module.exports = { executeCommand };
