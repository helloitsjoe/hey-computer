const { listenForWake } = require('./voice');

(async function main() {
  await listenForWake();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
