const DOG_REGEX =
  /^i (just )?((fed|gave|said) (olive|all of)\s*(her )?(itch )?(food|medicine|meds|medication)?)$/i;

function parseHappyDog(transcript) {
  const match = transcript.match(DOG_REGEX);

  if (!match) {
    return {};
  }

  const med = ['meds', 'medicine', 'medication'];
  const type = med.find((word) => transcript.includes(word)) ? 'med' : 'feed';

  return { type };
}

async function handleDog({ type }) {
  const res = await fetch(`http://localhost:3211/${type}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Error: ${res.status}`);
  }

  const { fed, med } = await res.json();

  console.log('Doggy info:', JSON.stringify({ fed, med }));

  return { message: 'She appreciates it!', type: 'dog', data: { fed, med } };
}

module.exports = { parseHappyDog, handleDog, DOG_REGEX };
