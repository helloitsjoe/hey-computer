const path = require('path');
const {
  Cheetah,
  CheetahActivationLimitReachedError,
} = require('@picovoice/cheetah-node');
const { PvRecorder } = require('@picovoice/pvrecorder-node');

const MODEL_PATH = path.join(process.cwd(), 'models', 'cheetah_params.pv');
const ACCESS_KEY = process.env.ACCESS_KEY;

if (process.env.SHOW_AUDIO_DEVICES === 'true') {
  const devices = PvRecorder.getAvailableDevices();
  for (let i = 0; i < devices.length; i++) {
    console.log(`index: ${i}, device name: ${devices[i]}`);
  }
  process.exit();
}

let isInterrupted = false;

async function run() {
  const cheetah = new Cheetah(ACCESS_KEY, {
    modelPath: MODEL_PATH,
    // libraryPath: libraryFilePath,
    endpointDurationSec: 3,
    // enableAutomaticPunctuation: !disableAutomaticPunctuation,
  });

  const recorder = new PvRecorder(
    cheetah.frameLength,
    process.env.AUDIO_DEVICE_INDEX || 0,
  );
  recorder.start();

  console.log(`Using device: ${recorder.getSelectedDevice()}`);

  console.log('Listening...');

  while (!isInterrupted) {
    const pcm = await recorder.read();
    try {
      const [partialTranscript, isEndpoint] = cheetah.process(pcm);
      process.stdout.write(partialTranscript);
      if (isEndpoint === true) {
        const finalTranscript = cheetah.flush();
        process.stdout.write(`${finalTranscript}\n`);
      }
    } catch (err) {
      if (err instanceof CheetahActivationLimitReachedError) {
        console.error(
          `AccessKey '${ACCESS_KEY}' has reached it's processing limit.`,
        );
      } else {
        console.error(err);
      }
      isInterrupted = true;
    }
  }
}

run();
