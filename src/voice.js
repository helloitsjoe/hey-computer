const path = require('path');
const { Cheetah, CheetahErrors } = require('@picovoice/cheetah-node');
const { PvRecorder } = require('@picovoice/pvrecorder-node');
// const { Porcupine, BuiltinKeyword } = require('@picovoice/porcupine-node');
const Bumblebee = require('bumblebee-hotword-node');
const { preprocessAnylist, addToList } = require('./anylist');

const { CheetahActivationLimitReachedError } = CheetahErrors;

const modelPath = path.join(process.cwd(), 'models');

// const PORCUPINE_MODEL_PATH = path.join(modelPath, 'porcupine_params.pv');
const CHEETAH_MODEL_PATH = path.join(modelPath, 'cheetah_params.pv');
const ACCESS_KEY = process.env.ACCESS_KEY;
const AUDIO_DEVICE_INDEX = process.env.AUDIO_DEVICE_INDEX;

let isAwake = false;

function getDeviceIndex() {
  const preferredDevices = {
    'Yeti X Analog Stereo': true,
    'MacBook Air Microphone': true,
  };

  const devices = PvRecorder.getAvailableDevices();
  let preferredIndex = 0;
  for (let i = 0; i < devices.length; i++) {
    console.log(`index: ${i}, device name: ${devices[i]}`);
    if (devices[i] in preferredDevices) {
      preferredIndex = i;
    }
  }

  return AUDIO_DEVICE_INDEX ? Number(AUDIO_DEVICE_INDEX) : preferredIndex;
}

/**
 * Listens for the wake word using Porcupine and then starts
 */
async function listenForWake() {
  const deviceIndex = getDeviceIndex();

  const bumblebee = new Bumblebee();
  bumblebee.setSensitivity(0.5);
  bumblebee.addHotword('bumblebee');

  // const porcupine = new Porcupine(
  //   ACCESS_KEY,
  //   [BuiltinKeyword.COMPUTER],
  //   [0.5], // sensitivity
  //   PORCUPINE_MODEL_PATH,
  //   // TODO: libraryFilePath, // path to the Porcupine library file if needed
  // );

  // const recorder = new PvRecorder(porcupine.frameLength, deviceIndex);
  const recorder = new PvRecorder(512, deviceIndex);
  recorder.start();

  console.log(`Listening for wake word on: ${recorder.getSelectedDevice()}...`);

  bumblebee.on('hotword', function (hotword) {
    console.log('Hotword Detected:', hotword);
    run(recorder);
  });

  bumblebee.start();

  // while (!isAwake) {
  //   const pcm = await recorder.read();
  //   try {
  //     const keywordIndex = porcupine.process(pcm);
  //     if (keywordIndex >= 0) {
  //       console.log('Wake word detected!');
  //       isAwake = true;
  //       await run(recorder);
  //     }
  //   } catch (err) {
  //     console.error(err);
  //   }
  // }

  recorder.stop();
  recorder.release();
  // process.exit();
}

/**
 * Runs the Cheetah speech-to-text engine after the wake word is detected.
 *
 * @param {PvRecorder} recorder - The recorder instance to use for audio input.
 */
async function run(recorder) {
  const cheetah = new Cheetah(ACCESS_KEY, {
    modelPath: CHEETAH_MODEL_PATH,
    // endpointDurationSec: 3, // Default is 1 second
    // enableAutomaticPunctuation: !disableAutomaticPunctuation,
  });

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

  cheetah.release();
}

module.exports = {
  listenForWake,
  run,
};
