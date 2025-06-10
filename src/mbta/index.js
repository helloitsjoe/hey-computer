const MBTA_REGEX = /^(when is|when's) (my|the) (next )?bus( coming)?/i;

async function getNextBus(transcript) {
  console.log('NextBus not yet implemented');
  return transcript;
}

module.exports = { getNextBus, MBTA_REGEX };
