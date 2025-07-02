const path = require('path');
const tiktoken = require('tiktoken');
const { PvSpeaker } = require('@picovoice/pvspeaker-node');
const {
  Orca,
  OrcaActivationLimitReachedError,
} = require('@picovoice/orca-node');
const { Language, globalSkipSpeech } = require('../settings');

const ACCESS_KEY = process.env.ACCESS_KEY;
const audioWaitChunks = 0; // Maybe 1 for bluetooth?
const bufferSizeSecs = 20;
const tokensPerSeconds = 15;

// TODO: Detect response language

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms * 1000));
}

function splitText(text, language) {
  // TODO: Update once Orca supports passing in partial bytes
  if (language === 'ko' || language === 'ja') {
    return text.split('');
  } else {
    const textDecoder = new TextDecoder();
    const encoder = tiktoken.encoding_for_model('gpt-4');
    const tokensRaw = Array.from(encoder.encode(text), (e) =>
      textDecoder.decode(encoder.decode([e])),
    );
    encoder.free();
    return tokensRaw;
  }
}

function tokenizeText(text, language) {
  const CUSTOM_PRON_PATTERN = /\{(.*?\|.*?)}/g;
  const CUSTOM_PRON_PATTERN_NO_WHITESPACE = /\{(.*?\|.*?)}(?!\s)/g;

  text = text.replace(CUSTOM_PRON_PATTERN_NO_WHITESPACE, '{$1} ');
  let customPronunciations = text.match(CUSTOM_PRON_PATTERN) || [];
  customPronunciations = new Set(customPronunciations);

  const tokensRaw = splitText(text, language);

  let customPron = '';
  const tokensWithCustomPronunciations = [];

  tokensRaw.forEach((token, i) => {
    let inCustomPron = false;
    customPronunciations.forEach((pron) => {
      const inCustomPronGlobal = customPron.length > 0;
      const currentMatch = !inCustomPronGlobal
        ? token.trim()
        : customPron + token;
      if (pron.startsWith(currentMatch)) {
        customPron += !inCustomPronGlobal ? token.trim() : token;
        inCustomPron = true;
      }
    });

    if (!inCustomPron) {
      if (customPron !== '') {
        tokensWithCustomPronunciations.push(
          i !== 0 ? ` ${customPron}` : customPron,
        );
        customPron = '';
      }
      tokensWithCustomPronunciations.push(token);
    }
  });

  return tokensWithCustomPronunciations;
}

const deviceMatches = ['JBL', 'Built-in Audio Digital Stereo (HDMI)']; // 'Yeti' as backup

async function speak({ message, skipSpeech }) {
  if (globalSkipSpeech || skipSpeech || !message) {
    return;
  }
  const modelFile = `orca_params_${Language.get()}_female.pv`;
  const modelPath = path.join(process.cwd(), 'models', modelFile);
  let deviceIndex = null;

  const modelFilePrefix = 'orca_params_';
  const langCodeIdx =
    modelPath.indexOf(modelFilePrefix) + modelFilePrefix.length;
  const language = modelPath.substring(langCodeIdx, langCodeIdx + 2);

  const devices = PvSpeaker.getAvailableDevices();
  for (let i = 0; i < devices.length; i++) {
    console.log(`index: ${i}, device name: ${devices[i]}`);
  }

  for (const potentialMatch of deviceMatches) {
    for (let i = 0; i < devices.length; i++) {
      // Devices are in priority order, if a device has been picked skip the rest
      if (deviceIndex === null && devices[i].includes(potentialMatch)) {
        deviceIndex = i;
        console.log(`Using ${devices[i]}`);
      }
    }
  }

  try {
    const orca = new Orca(ACCESS_KEY, {
      modelPath,
      // libraryPath: libraryFilePath,
    });
    console.log(`\nOrca version: ${orca.version}`);
    const stream = orca.streamOpen();

    let speaker = null;

    try {
      const bitsPerSample = 16;
      speaker = new PvSpeaker(orca.sampleRate, bitsPerSample, {
        bufferSizeSecs,
        deviceIndex,
      });
      speaker.start();
    } catch (e) {
      console.error(
        "\nNote: External package '@picovoice/pvspeaker-node' failed to initialize." +
          ' Orca will generate the pcm, but it will not be played to your speakers.',
      );
      console.error(e);
    }

    let pcmBuffer = [];
    let numAudioChunks = 0;
    let isStartedPlaying = false;

    let timeFirstAudioAvailable = null;
    const tokens = tokenizeText(message, language);

    const startTime = performance.now();
    for (const token of tokens) {
      process.stdout.write(token);
      const pcm = stream.synthesize(token);
      if (pcm !== null) {
        if (timeFirstAudioAvailable === null) {
          timeFirstAudioAvailable = (
            (performance.now() - startTime) /
            1000
          ).toFixed(2);
        }
        pcmBuffer.push(...pcm);
        numAudioChunks++;
      }

      if (
        pcmBuffer.length > 0 &&
        speaker !== null &&
        (isStartedPlaying || numAudioChunks >= audioWaitChunks)
      ) {
        const arrayBuffer = new Int16Array(pcmBuffer).buffer;
        const written = speaker.write(arrayBuffer);
        pcmBuffer = pcmBuffer.slice(written);
        isStartedPlaying = true;
      }

      await sleep(1 / tokensPerSeconds);
    }

    const flushedPcm = stream.flush();
    if (flushedPcm !== null) {
      if (timeFirstAudioAvailable === null) {
        timeFirstAudioAvailable = (
          (performance.now() - startTime) /
          1000
        ).toFixed(2);
      }
      pcmBuffer.push(...flushedPcm);
    }
    const elapsedTime = ((performance.now() - startTime) / 1000).toFixed(2);

    console.log(`\n\nTime to finish text stream: ${elapsedTime} seconds`);
    console.log(
      `Time to receive first audio: ${timeFirstAudioAvailable} seconds after text stream started`,
    );
    console.log('\nWaiting for audio to finish...');

    if (speaker !== null) {
      const arrayBuffer = new Int16Array(pcmBuffer).buffer;
      speaker.flush(arrayBuffer);
      speaker.stop();
      speaker.release();
    }
    stream.close();
    orca.release();
    console.log('Audio finished');
  } catch (err) {
    if (err instanceof OrcaActivationLimitReachedError) {
      console.error(
        `AccessKey '${ACCESS_KEY}' has reached it's processing limit.`,
      );
    } else {
      console.error(err);
    }
  }
}

module.exports = { speak };
