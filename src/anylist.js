const AnyList = require('anylist');
const { getCategory, smartSplit } = require('./groceries');

const EMAIL = process.env.ANYLIST_EMAIL;
const PASSWORD = process.env.ANYLIST_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Please set EMAIL and PASSWORD environment variables.');
  process.exit(1);
}

function preprocessAnylist(transcript) {
  // Match items in the transcript e.g. "add milk to the grocery list"
  const regex = /(?:add|had)?\s+(.+?)\s+to\s+(?:the|my)\s+grocery list/i;
  const match = transcript.match(regex);
  console.log('Transcript:', transcript);
  console.log('Match:', match);
  if (match) {
    return match[1].trim(); // Return the item(s) to be added
  }
}

const titleCase = (name) =>
  name.replace(/\b(\w)/g, (match) => match.toUpperCase());

async function addToList(itemsRaw) {
  console.log(itemsRaw);

  const items = smartSplit(itemsRaw.trim());
  console.log('Items:', items);

  const any = new AnyList({ email: EMAIL, password: PASSWORD });
  await any.login();

  await any.getLists(); // Need to load lists into memory first
  const groceries = any.getListByName('Grocery List');

  // TODO: Check if item already exists (checked) in the list, just uncheck if it does

  const itemsToAdd = items.map((name) => {
    return any.createItem({
      name: titleCase(name.trim()),
      categoryMatchId: getCategory(name),
    });
  });

  await Promise.all(
    itemsToAdd.map(async (item) => {
      try {
        console.log(
          `Adding item: ${item.name}, category: ${item._categoryMatchId}`,
        );

        const addedItem = await groceries.addItem(item);
        // eslint-disable-next-line no-unused-vars
        const { _client, _protobuf, _uid, ...itemData } = addedItem;
        console.log('Added item:', itemData._name, itemData._categoryMatchId);
        return addedItem;
      } catch (error) {
        console.error(`Failed to add item "${item.name}":`, error);
        return null; // Skip this item on error
      }
    }),
  );

  any.teardown();
}

module.exports = {
  preprocessAnylist,
  addToList,
};
