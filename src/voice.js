const path = require('path');
const { Cheetah, CheetahErrors } = require('@picovoice/cheetah-node');
const { PvRecorder } = require('@picovoice/pvrecorder-node');
const { Porcupine, BuiltinKeyword } = require('@picovoice/porcupine-node');
const { executeCommand } = require('./commands');

const { CheetahActivationLimitReachedError } = CheetahErrors;

const modelPath = path.join(process.cwd(), 'models');

const PORCUPINE_MODEL_PATH = path.join(modelPath, 'porcupine_params.pv');
const CHEETAH_MODEL_PATH = path.join(modelPath, 'cheetah_params.pv');
const ACCESS_KEY = process.env.ACCESS_KEY;
const AUDIO_DEVICE_INDEX = process.env.AUDIO_DEVICE_INDEX;
const SKIP_PORCUPINE = process.env.SKIP_PORCUPINE;

let isAwake = false;

function getDeviceIndex() {
  const preferredDevices = {
    'MacBook Air Microphone': true,
    'Yeti X Analog Stereo': true,
  };

  const devices = PvRecorder.getAvailableDevices();

  for (let i = 0; i < devices.length; i++) {
    console.log(`index: ${i}, device name: ${devices[i]}`);
    if (devices[i] in preferredDevices) {
      return i;
    }
  }

  return Number(AUDIO_DEVICE_INDEX) || 0;
}

/**
 * Listens for the wake word using Porcupine and then starts
 */
async function listenForWake(cb) {
  const deviceIndex = getDeviceIndex();

  const porcupine = getPorcupine();
  const cheetah = getCheetah();

  const frameLength = cheetah.frameLength || porcupine.frameLength;

  const recorder = new PvRecorder(frameLength, deviceIndex);
  recorder.start();

  console.log(`Listening for wake word on: ${recorder.getSelectedDevice()}...`);

  while (!isAwake) {
    const pcm = await recorder.read();
    try {
      const keywordIndex = porcupine.process(pcm);
      if (keywordIndex >= 0) {
        console.log('Wake word detected!');
        isAwake = true;
        await cb(recorder, cheetah);
      }
    } catch (err) {
      console.error(err);
    }
  }

  recorder.stop();
  recorder.release();
  cheetah.release();
  process.exit();
}

/**
 * Runs the Cheetah speech-to-text engine after the wake word is detected.
 *
 * @param {PvRecorder} recorder - The recorder instance to use for audio input.
 */
async function listenForSpeech(recorder, cheetah) {
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

        console.log('Processing command:', transcript);
        const result = await executeCommand(transcript);
        console.log('Command executed successfully.');
        console.log('Result:', result);

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
}

let _porcupine = null;
let _cheetah = null;

function getPorcupine() {
  if (SKIP_PORCUPINE) {
    console.log('Skipping Porcupine wake word detection.');
    return {
      // Mock Porcupine for testing or skipping
      process: () => 1,
    };
  }
  if (!_porcupine) {
    console.log('Initializing Porcupine...');
    _porcupine = new Porcupine(
      ACCESS_KEY,
      [BuiltinKeyword.COMPUTER],
      [0.5], // sensitivity
      PORCUPINE_MODEL_PATH,
      // TODO: libraryFilePath, // path to the Porcupine library file if needed
    );
  }

  return _porcupine;
}

function getCheetah() {
  if (!_cheetah) {
    console.log('Initializing Cheetah...');
    _cheetah = new Cheetah(ACCESS_KEY, {
      modelPath: CHEETAH_MODEL_PATH,
      // endpointDurationSec: 3, // Default is 1 second
      // enableAutomaticPunctuation: !disableAutomaticPunctuation,
    });
  }

  return _cheetah;
}

module.exports = {
  listenForWake,
  listenForSpeech,
};
