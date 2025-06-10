const { addToList, preprocessAnylist } = require('./index');

const DRY_RUN = process.env.DRY_RUN !== 'false';

function main() {
  const transcript = process.argv[2];
  if (!transcript) {
    console.error('Please provide a transcript as a command line argument.');
    process.exit(1);
  }

  const { items, list } = preprocessAnylist(transcript);

  console.log('Items to add:', items);
  console.log('List:', list);

  if (!items) {
    console.error('No items found in the transcript.');
    process.exit(1);
  }

  if (DRY_RUN) {
    console.warn('DRY_RUN is enabled. Set DRY_RUN=false to update your list.');
    console.log('These items would be added to the list:');
    console.log(items);
    return;
  }

  addToList(items, list)
    .then(() => {
      console.log('Items added successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error adding items:', error);
      process.exit(1);
    });
}

main();
