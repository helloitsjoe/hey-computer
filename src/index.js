const path = require('path');
const { Cheetah, CheetahErrors } = require('@picovoice/cheetah-node');
const { PvRecorder } = require('@picovoice/pvrecorder-node');
const { Porcupine, BuiltinKeyword } = require('@picovoice/porcupine-node');
const { preprocessAnylist, addToList } = require('./anylist');

const { CheetahActivationLimitReachedError } = CheetahErrors;

const modelPath = path.join(process.cwd(), 'models');

const PORCUPINE_MODEL_PATH = path.join(modelPath, 'porcupine_params.pv');
const CHEETAH_MODEL_PATH = path.join(modelPath, 'cheetah_params.pv');
const ACCESS_KEY = process.env.ACCESS_KEY;
const AUDIO_DEVICE_INDEX = process.env.AUDIO_DEVICE_INDEX || 1;

let isAwake = false;

function showDevices() {
  const devices = PvRecorder.getAvailableDevices();
  for (let i = 0; i < devices.length; i++) {
    console.log(`index: ${i}, device name: ${devices[i]}`);
  }
}

/**
 * Listens for the wake word "computer" using Porcupine and then starts
 */
async function listenForWake() {
  showDevices();

  const porcupine = new Porcupine(
    ACCESS_KEY,
    [BuiltinKeyword.COMPUTER],
    [0.5], // sensitivity
    PORCUPINE_MODEL_PATH,
    // TODO: libraryFilePath, // path to the Porcupine library file if needed
  );

  const recorder = new PvRecorder(porcupine.frameLength, AUDIO_DEVICE_INDEX);
  recorder.start();

  console.log(`Listening for wake word on: ${recorder.getSelectedDevice()}...`);

  while (!isAwake) {
    const pcm = await recorder.read();
    try {
      const keywordIndex = porcupine.process(pcm);
      if (keywordIndex >= 0) {
        console.log('Wake word detected!');
        isAwake = true;
        await run(recorder);
      }
    } catch (err) {
      console.error(err);
    }
  }

  recorder.stop();
  recorder.release();
  process.exit();
}

/**
 * Runs the Cheetah speech-to-text engine after the wake word is detected.
 *
 * @param {PvRecorder} recorder - The recorder instance to use for audio input.
 */
async function run(recorder) {
  const cheetah = new Cheetah(ACCESS_KEY, {
    modelPath: CHEETAH_MODEL_PATH,
    endpointDurationSec: 3,
    // libraryPath: libraryFilePath, // TODO: Is this needed? https://github.com/Picovoice/cheetah/tree/master/lib
    // enableAutomaticPunctuation: !disableAutomaticPunctuation,
  });

  // const recorder = new PvRecorder(cheetah.frameLength, AUDIO_DEVICE_INDEX);
  // recorder.start();
  console.log(`Listening for speech on: ${recorder.getSelectedDevice()}...`);

  let transcript = '';

  while (isAwake) {
    const pcm = await recorder.read();
    try {
      const [partialTranscript, isEndpoint] = cheetah.process(pcm);
      transcript += partialTranscript;
      process.stdout.write(partialTranscript);
      if (isEndpoint === true) {
        const finalTranscript = cheetah.flush();
        transcript += finalTranscript;
        process.stdout.write(`${finalTranscript}\n`);

        const items = preprocessAnylist(transcript);
        await addToList(items);

        isAwake = false;
        transcript = '';
      }
    } catch (err) {
      if (err instanceof CheetahActivationLimitReachedError) {
        console.error(`AccessKey '${ACCESS_KEY}' reached processing limit.`);
      } else {
        console.error(err);
      }
      isAwake = false;
      transcript = '';
    }
  }

  console.log('Going back to sleep...');

  // recorder.stop();
  // recorder.release();
  cheetah.release();
  // process.exit();
}

(async function main() {
  await listenForWake();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
