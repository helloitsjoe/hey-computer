const { sentenceCase } = require('../utils');

const WEATHER_REGEX =
  /^(?:what's|what is|what are|what will) the (?:high|low|high and low)?\s*(weather|forecast|weather forecast|temperatures?|temps?) (?:for |going to |gonna )?(?:be )?(?:on )?(today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|this evening|this weekend|this week)(?: in )?(.*)/i;

const Weather = {
  DAILY: 'daily',
  HOURLY: 'hourly',
  GRIDPOINT: 'gridpoint',
};

const isTempRequest = (type) => type === 'temperature';

function parseWeather(transcript) {
  const match = transcript.match(WEATHER_REGEX);

  if (!match) {
    return {};
  }

  let typeRaw = match[1].toLowerCase(); // 'today' or 'tomorrow' or 'this week'
  let period = match[2].toLowerCase(); // 'today' or 'tomorrow' or 'this week'
  const location = match[3].toLowerCase();

  if (period === 'this evening') {
    period = 'tonight';
  }

  let type = 'weather';
  if (typeRaw.includes('temp')) {
    type = 'temperature';
  }

  // TODO: location
  return { type, period, location };
}

function getWeatherUrl(type = Weather.DAILY) {
  const baseUrl = 'https://api.weather.gov/gridpoints/BOX/68,90';
  return {
    [Weather.DAILY]: `${baseUrl}/forecast`,
    [Weather.HOURLY]: `${baseUrl}/forecast/hourly`,
    [Weather.GRIDPOINT]: baseUrl,
  }[type];
}

function getWeatherForDay(weatherProperties, day = 'Today') {
  const lowerRequested = day.toLowerCase();
  const { periods } = weatherProperties;

  const exact = periods.find(
    ({ name }) => name.toLowerCase() === lowerRequested,
  );
  if (exact) return exact;

  const firstPeriodLower = periods[0].name.toLowerCase();
  if (
    lowerRequested === 'today' &&
    (firstPeriodLower === 'tonight' || firstPeriodLower === 'this afternoon')
  ) {
    return periods[0];
  }

  if (lowerRequested === 'tomorrow') {
    const tonightIndex = periods.findIndex(({ name }) => name === 'Tonight');
    return periods[tonightIndex + 1];
  }

  const guessIndex = periods.findIndex(
    ({ name }) => name.toLowerCase() === `${lowerRequested} night`,
  );
  return periods[guessIndex - 1];
}

function getHighLowTempsForToday(weatherProperties) {
  // TODO: Support requests for any day this week with gridpoint maxTemperature/minTemperature
  let high = 0;
  let low = Infinity;
  for (const { temperature } of weatherProperties.periods) {
    if (temperature < low) {
      low = temperature;
    }
    if (temperature > high) {
      high = temperature;
    }
  }
  return { high, low };
}

async function handleWeatherCommand({ type, period = 'today' } = {}) {
  // const lat = 42.37;
  // const long = -71.17;
  // const latLongUrl = `https://api.weather.gov/points/${lat},${long}`
  // const forecastHourlyUrl =
  //   'https://api.weather.gov/gridpoints/BOX/68,90/forecast/hourly';
  // const forecastGridDataUrl = 'https://api.weather.gov/gridpoints/BOX/68,90';

  let weatherProperties = null;
  console.log('type', type);
  const endpoint = isTempRequest(type) ? Weather.HOURLY : Weather.DAILY;

  try {
    const res = await fetch(getWeatherUrl(endpoint));
    if (!res.ok) {
      throw new Error(res.statusText);
    }
    const weatherResponse = await res.json();

    weatherProperties = weatherResponse?.properties;

    console.log(' weather', weatherProperties);
    if (!weatherProperties) {
      throw new Error('Weather response was empty!', weatherResponse);
    }
  } catch (err) {
    console.error('Error fetching weather:', err);
    return { message: `There was an error fetching weather: ${err.message}` };
  }

  if (isTempRequest(type)) {
    const { high, low } = getHighLowTempsForToday(weatherProperties);
    return {
      message: `${sentenceCase(period)} will have a high of ${high} and a low of ${low}`,
    };
  } else {
    const weatherToday = getWeatherForDay(weatherProperties, period);

    if (!weatherToday) {
      return { message: `I couldn't find weather for ${period}` };
    }

    const { name, temperature, shortForecast } = weatherToday;

    return {
      message: `${name} will be around ${temperature}, ${shortForecast}`,
    };
  }
}

module.exports = { parseWeather, handleWeatherCommand, WEATHER_REGEX };
