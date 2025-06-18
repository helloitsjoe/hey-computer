const MBTA = require('mbta-client');

const MBTA_REGEX =
  /^(when is|when's|how long until) (my|the) (next )?bus( coming| comes)?/i;

const STOP = 2056;
const PREDICTIONS_LIMIT = 4;

async function fetchData() {
  const mbta = new MBTA(process.env.MBTA_KEY);
  const route = 71;
  const waitStart = 3;
  const waitLength = 6;

  try {
    const rawPred = await mbta.fetchPredictions({
      stop: STOP,
      // direction_id: route.direction,
      sort: 'departure_time',
      include: ['stop', 'route', 'vehicle'],
    });

    console.log(`Fetched live data`);
    console.log('predictions', rawPred);

    // const allPreds = predictions.map((rawPred, i) => {
    if (!rawPred) {
      throw new Error('No predictions');
    }

    // const { waitStart, waitLength, route, morning, customName } = routes[i];
    const { selectDepartures, selectIncluded } = mbta;

    // TODO: Figure out some good defaults to fall back to,
    // in case of missing data/included info

    // Filter out other routes for the same stop
    const routeData = rawPred.data.filter(
      (ea) => !route || ea.relationships.route.data.id === route.toString(),
    );
    const pred = { data: routeData };
    // const arrivals = selectArrivals(pred, { convertTo: 'min' });
    const departures = selectDepartures(pred, { convertTo: 'min' });
    const includedStop = selectIncluded(rawPred, 'stop');
    const includedRoute = selectIncluded(rawPred, 'route');
    const includedVehicles = selectIncluded(rawPred, 'vehicle');
    const ids = includedVehicles.map((v) => v.id).join(',');

    let vehicleCoords = [];
    try {
      const vehicles = await mbta.fetchVehicles({ id: ids });
      vehicleCoords = vehicles.data.map((v) => ({
        lat: v.attributes.latitude,
        long: v.attributes.longitude,
      }));
    } catch (err) {
      console.error('Could not fetch vehicles:', err);
    }

    if (!includedStop.length || !includedRoute.length) {
      return {
        // id,
        // morning,
        direction: '',
        vehicleCoords,
        // customName,
        // for debugging
        _pastDepartMins: departures.filter((min) => min <= 2),
        _predictions: rawPred,
        _filtered: routeData,
      };
    }

    const stopName = includedStop[0].attributes.name;
    const routeAttrs = includedRoute[0].attributes;
    const directionIdx =
      routeData.length > 0 && routeData[0].attributes.direction_id;

    const {
      direction_destinations: dirDestinations,
      direction_names: dirNames,
      color,
      text_color: textColor,
    } = routeAttrs;

    // Either set direction as the destination or
    // generic Inbound/Outbound, or fall back to empty string
    const direction =
      dirDestinations[directionIdx] || dirNames[directionIdx] || '';

    const departMins = departures
      .filter((min) => min >= 1 && min < 60)
      .slice(0, PREDICTIONS_LIMIT);

    const isWalkable = departMins.some(
      (mins) => mins >= waitStart && mins <= waitStart + waitLength,
    );

    return {
      // id,
      color,
      // morning,
      stopName,
      direction,
      textColor,
      isWalkable,
      // customName,
      departMins,
      vehicleCoords,
      // for debugging
      _pastDepartMins: departures.filter((min) => min <= 2),
      _predictions: rawPred,
      _filtered: routeData,
    };
  } catch (e) {
    console.error('Error during fetch:', e);
    const { message, stack } = e;
    return { error: { message, stack } };
  }
}

function formatMins(mins) {
  const last = mins.pop();
  if (mins.length === 0) {
    return `${last}`;
  }

  return `${mins.join(', ')} and ${last}`;
}

async function getNextBus() {
  const { departMins, error, vehicleCoords } = await fetchData();

  if (error) {
    return { message: "I'm having trouble fetching MBTA information." };
  }

  return {
    message: `${formatMins(departMins)} mins`,
    type: 'map',
    data: { vehicleCoords },
  };
}

module.exports = { getNextBus, MBTA_REGEX, formatMins };
