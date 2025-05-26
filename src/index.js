const path = require('path');
const {
  Cheetah,
  CheetahActivationLimitReachedError,
} = require('@picovoice/cheetah-node');
const { PvRecorder } = require('@picovoice/pvrecorder-node');

const MODEL_PATH = path.join(process.cwd(), 'models', 'cheetah_params.pv');
const ACCESS_KEY = process.env.ACCESS_KEY;

// if (process.env.SHOW_AUDIO_DEVICES === 'true') {
const devices = PvRecorder.getAvailableDevices();
for (let i = 0; i < devices.length; i++) {
  console.log(`index: ${i}, device name: ${devices[i]}`);
}
// }

let isDone = false;

async function run() {
  const cheetah = new Cheetah(ACCESS_KEY, {
    modelPath: MODEL_PATH,
    endpointDurationSec: 3,
    // libraryPath: libraryFilePath, // TODO: Is this needed? https://github.com/Picovoice/cheetah/tree/master/lib
    // enableAutomaticPunctuation: !disableAutomaticPunctuation,
  });

  const recorder = new PvRecorder(
    cheetah.frameLength,
    process.env.AUDIO_DEVICE_INDEX || 1,
  );
  recorder.start();

  console.log(`Listening on: ${recorder.getSelectedDevice()}...`);

  while (!isDone) {
    const pcm = await recorder.read();
    try {
      const [partialTranscript, isEndpoint] = cheetah.process(pcm);
      process.stdout.write(partialTranscript);
      if (isEndpoint === true) {
        const finalTranscript = cheetah.flush();
        process.stdout.write(`${finalTranscript}\n`);
        isDone = true;
      }
    } catch (err) {
      if (err instanceof CheetahActivationLimitReachedError) {
        console.error(`AccessKey '${ACCESS_KEY}' reached processing limit.`);
      } else {
        console.error(err);
      }
      isDone = true;
    }
  }

  recorder.stop();
  recorder.release();
  cheetah.release();
  process.exit();
}

run();
