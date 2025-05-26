function preprocessAnylist(transcript) {
  // Match items in the transcript e.g. "add milk to the grocery list"
  const regex = /(?:add|had)?\s+(.+?)\s+to\s+(?:the|my)\s+grocery list/i;
  const match = transcript.match(regex);
  console.log('Transcript:', transcript);
  console.log('Match:', match);
  if (match) {
    return match[1].trim(); // Return the item to be added
  }
}

function addToList(items) {
  console.log(items);
}

module.exports = {
  preprocessAnylist,
  addToList,
};
