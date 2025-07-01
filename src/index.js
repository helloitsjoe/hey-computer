const http = require('http');
const url = require('url');
const { initVoice } = require('./voice');
const { chat } = require('./llm');
const { log } = require('./logging');
const { speak } = require('./tts');
const { Language } = require('./settings');
const { SKIP_WAKE } = require('./utils');
const { executeCommand } = require('./commands');
const { clockEmitter, initSavedTimers } = require('./clock');

const voice = initVoice();

initSavedTimers();

const server = http.createServer(async (req, res) => {
  // Handle CORS from browser from localhost:3211
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3211');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Expose-Headers', 'X-Response-Type');

  if (req.url.startsWith('/sse')) {
    console.log('Creating SSE connection');
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    });

    res.write('data: {"message": "CONNECTED"}\n\n');

    if (!SKIP_WAKE) {
      voice.listenForWake(() => {
        console.log('Waking the kraken...');
        // TODO: Avoid this back-and-forth by sending voice text to FE?
        res.write('data: {"message": "AWAKEN"}\n\n');
      });
    }

    clockEmitter.on('trigger-timer', ({ name }) => {
      console.log(`Timer finished at ${new Date().toISOString()}`);
      const message = `data: {"message":"TIMER","data":{"name":"${name}"}}\n\n`;
      console.log(`Sending ${message}`);
      res.write(message);
    });

    clockEmitter.on('stop-timer', () => {
      console.log(`Stopping timer`);
      res.write('data: {"message":"TIMER_OFF"}\n\n');
    });

    req.on('close', () => {
      res.end();
    });
  } else if (req.url.startsWith('/llm')) {
    log('Streaming...');

    // Example: http://localhost:3000/llm?prompt=foo
    const parsedUrl = url.parse(req.url, true);
    const prompt = parsedUrl.query?.prompt;
    const speechResponse = await chat({
      prompt,
      language: Language.get(),
      stream: true,
    });

    if (!speechResponse.stream) {
      // Something went wrong, just send json response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      speak(speechResponse);
      res.end(JSON.stringify(speechResponse));
      return;
    }

    let acc = '';
    let headersWritten = false;

    speechResponse.stream.on('data', (chunk) => {
      const { content } = chunk.message;
      log('content', content);

      acc += content;

      // LLM will respond with JSON if it tries to correct near-matches to commands.
      // In that case we want to skip streaming and just respond when the stream ends
      if (!acc.startsWith('{')) {
        if (!headersWritten) {
          res.writeHead(200, {
            'Transfer-Encoding': 'chunked',
            'Content-Type': 'application/json',
            'X-Response-Type': 'stream',
          });
          headersWritten = true;
        }

        res.write(content);
      }
    });

    speechResponse.stream.on('end', async () => {
      log('ending...');

      if (acc.startsWith('{')) {
        // type unused for now
        const { /* type, */ message } = JSON.parse(acc);
        const response = await executeCommand(message);
        console.log('response', response);

        speak({ message: response.message });
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'X-Response-Type': 'stream',
        });
        return res.end(JSON.stringify(response));
      }

      res.end();

      speak({ message: acc });
      log(prompt, { filePrefix: 'chat' });
      // Log chat to disk after sending
      acc.split('\n').forEach((line) => {
        log(`line, ${line}`, { filePrefix: 'chat' });
      });
    });
  } else if (req.url === '/voice') {
    const speechResponse = await voice.listenForSpeech();
    if (!speechResponse) {
      console.log(
        'No result from command, something went wrong. Did isAwake get set false too early?',
      );
      return res.end(JSON.stringify({ message: 'Something went wrong' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    // Don't repeat the user's chat question
    if (speechResponse.type !== 'stream-boomerang') {
      speak(speechResponse);
    }
    res.end(JSON.stringify(speechResponse));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(3000, 'localhost', () => {
  log('Server is running at http://localhost:3000/voice');
});

process.on('beforeExit', () => {
  voice.shutdown();
});
