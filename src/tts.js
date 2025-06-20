const path = require('path');
const tiktoken = require('tiktoken');
const { PvSpeaker } = require('@picovoice/pvspeaker-node');
const {
  Orca,
  OrcaActivationLimitReachedError,
} = require('@picovoice/orca-node');

const ACCESS_KEY = process.env.ACCESS_KEY;
const modelPath = path.join(
  process.cwd(),
  'models',
  'orca_params_en_female.pv',
);
const showAudioDevices = true;
const audioWaitChunks = 0;
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

async function speak(text) {
  // let accessKey = program['access_key'];
  // let modelFilePath = program['model_file_path'];
  // let libraryFilePath = program['library_file_path'];
  // let text = program['text_to_stream'];
  // let tokensPerSeconds = program['tokens_per_second'];
  // let audioWaitChunks = program['audio_wait_chunks'];
  // let bufferSizeSecs = Number(program['buffer_size_secs']);
  // let deviceIndex = Number(program['audio_device_index']);
  // let showAudioDevices = program['show_audio_devices'];
  let deviceIndex = 0;

  const modelFilePrefix = 'orca_params_';
  const langCodeIdx =
    modelPath.indexOf(modelFilePrefix) + modelFilePrefix.length;
  const language = modelPath.substring(langCodeIdx, langCodeIdx + 2);

  if (showAudioDevices) {
    const devices = PvSpeaker.getAvailableDevices();
    for (let i = 0; i < devices.length; i++) {
      console.log(`index: ${i}, device name: ${devices[i]}`);
      if (devices[i].includes('Built-in Audio Digital Stereo (HDMI)')) {
        deviceIndex = i;
        console.log(`Using ${devices[i]}`);
      }
    }
    // return;
  }

  // if (audioWaitChunks === undefined || audioWaitChunks === null) {
  //   audioWaitChunks = 0;
  //   if (os.platform() === 'linux') {
  //     const machine = linuxMachine();
  //     if (machine.includes('cortex')) {
  //       audioWaitChunks = 1;
  //     }
  //   }
  // }

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

    process.stdout.write('\nSimulated text stream: ');

    let timeFirstAudioAvailable = null;
    const tokens = tokenizeText(text, language);

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

speak('Hello. My name is moomoo mcmufflebutt');

module.exports = { speak };
