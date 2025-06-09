const AnyList = require('anylist');
const { getCategory, smartSplit } = require('./groceries');

const EMAIL = process.env.ANYLIST_EMAIL;
const PASSWORD = process.env.ANYLIST_PASSWORD;

const titleCase = (name) =>
  name.replace(/\b(\w)/g, (match) => match.toUpperCase());

function preprocessAnylist(transcript) {
  // Remove any leading/trailing whitespace and normalize spaces
  transcript = transcript.trim().replace(/\s+/g, ' ');
  // Remove any leading "add" or "please add" phrases
  transcript = transcript.replace(/^(add|please add)\s+/i, '');
  // Match items in the transcript e.g. "add milk to the grocery list"
  const regex = /(.+?)\s+to\s+(?:the|my)\s+grocery list/i;
  const match = transcript.match(regex);
  console.log('Transcript:', transcript);
  console.log('Match:', match);
  if (!match) {
    return;
  }

  const itemsRaw = match[1].trim(); // Return the item(s) to be added

  return smartSplit(itemsRaw.trim());
}

function getItemsToAddOrUncheck(any, groceries, itemNames) {
  const existingItems = [];
  const newItems = [];

  for (const name of itemNames) {
    const existing = groceries.getItemByName(titleCase(name));

    if (existing) {
      console.log(`Found existing item: ${titleCase(name)}`);
      existingItems.push(existing);
    } else {
      console.log(`Adding new item: ${titleCase(name)}`);
      newItems.push(
        any.createItem({
          name: titleCase(name.trim()),
          categoryMatchId: getCategory(name),
        }),
      );
    }
  }

  return { existingItems, newItems };
}

async function addToList(items) {
  if (!EMAIL || !PASSWORD) {
    console.error('Please set EMAIL and PASSWORD environment variables.');
    process.exit(1);
  }

  const any = new AnyList({ email: EMAIL, password: PASSWORD });
  await any.login();

  await any.getLists(); // Need to load lists into memory first
  const groceries = any.getListByName('Grocery List');

  const { existingItems, newItems } = getItemsToAddOrUncheck(
    any,
    groceries,
    items,
  );

  // Uncheck any existing items that match the names
  const uncheckPromises = existingItems.map(async (existing) => {
    if (existing.checked === false) {
      console.log(`Item "${existing.name}" is already unchecked, skipping.`);
      return; // Skip if already unchecked
    }

    try {
      console.log(`Unchecking item: ${existing.name}`);
      existing.checked = false;
      await existing.save();
    } catch (error) {
      console.error(`Failed to uncheck item "${existing.name}":`, error);
    }
  });

  const newPromises = newItems.map(async (item) => {
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
  });

  await Promise.all([...uncheckPromises, ...newPromises]);

  any.teardown();
}

module.exports = {
  preprocessAnylist,
  addToList,
};
