const { listenForWake, listenForSpeech } = require('./voice');

(async function main() {
  await listenForWake((recorder, cheetah) => {
    return listenForSpeech(recorder, cheetah);
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
