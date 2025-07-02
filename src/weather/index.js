const { sentenceCase } = require('../utils');

const WEATHER_REGEX =
  /^(?:what's|what is) the (?:weather |forecast |weather forecast )(?:for |going to be |gonna be )?(?:on )?(today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|this evening|this weekend|this week)(?: in )?(.*)/i;

const Weather = {
  DAILY: 'daily',
  HOURLY: 'hourly',
  GRIDPOINT: 'gridpoint',
};

function parseWeather(transcript) {
  const match = transcript.match(WEATHER_REGEX);

  if (!match) {
    return {};
  }

  let period = match[1].toLowerCase(); // 'today' or 'tomorrow' or 'this week'
  const location = match[2].toLowerCase();

  if (period === 'this evening') {
    period = 'tonight';
  }

  // TODO: location
  return { period, location };
}

function getWeatherUrl(type = Weather.DAILY) {
  const baseUrl = 'https://api.weather.gov/gridpoints/BOX/68,90';
  return {
    [Weather.DAILY]: `${baseUrl}/forecast`,
    [Weather.HOURLY]: `${baseUrl}/forecast/hourly`,
    [Weather.GRIDPOINT]: baseUrl,
  }[type];
}

function getWeatherForDay(weather, requested = 'Today') {
  const lowerRequested = requested.toLowerCase();

  const exact = weather.find(
    (period) => period.name.toLowerCase() === lowerRequested,
  );
  if (exact) return exact;

  if (lowerRequested === 'today' && weather[0].name === 'Tonight') {
    return weather[0];
  }

  if (lowerRequested === 'tomorrow') {
    const tonightIndex = weather.findIndex(
      (period) => period.name === 'Tonight',
    );
    return weather[tonightIndex + 1];
  }

  const guessIndex = weather.findIndex(
    (period) => period.name.toLowerCase() === `${lowerRequested} night`,
  );
  return weather[guessIndex - 1];
}

async function handleWeatherCommand({ period = 'today' } = {}) {
  // const lat = 42.37;
  // const long = -71.17;
  // const latLongUrl = `https://api.weather.gov/points/${lat},${long}`
  // const forecastHourlyUrl =
  //   'https://api.weather.gov/gridpoints/BOX/68,90/forecast/hourly';
  // const forecastGridDataUrl = 'https://api.weather.gov/gridpoints/BOX/68,90';

  let weather = null;
  try {
    const res = await fetch(getWeatherUrl(Weather.DAILY));
    if (!res.ok) {
      throw new Error(res.statusText);
    }
    const weatherResponse = await res.json();
    weather = weatherResponse?.properties?.periods;
    console.log(' weather', weather);
    if (!weather) {
      throw new Error('Weather response was empty!', weatherResponse);
    }
  } catch (err) {
    console.error('Error fetching weather:', err);
    return { message: `There was an error fetching weather: ${err.message}` };
  }

  const weatherToday = getWeatherForDay(weather, period);

  if (!weatherToday) {
    return { message: `I couldn't find weather for ${period}` };
  }

  const { name, temperature, shortForecast } = weatherToday;

  return {
    message: `${name} will be around ${temperature}, ${shortForecast}`,
  };
}

module.exports = { parseWeather, handleWeatherCommand, WEATHER_REGEX };
