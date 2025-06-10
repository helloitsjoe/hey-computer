const WEATHER_REGEX =
  /^(?:what's|what is) the weather\s*(today|tomorrow|this week)(?: in )?(.*)/i;

function parseWeather(transcript) {
  const match = transcript.match(WEATHER_REGEX);

  if (!match) {
    return {};
  }

  const period = match[1].toLowerCase(); // 'today' or 'tomorrow' or 'this week'
  const location = match[2].toLowerCase(); // 'today' or 'tomorrow' or 'this week'

  return { period, location };
}

async function handleWeatherCommand({ period, location }) {
  return `Weather for ${location || 'your location'} for ${period} is not yet implemented.`;
}

module.exports = { parseWeather, handleWeatherCommand, WEATHER_REGEX };
