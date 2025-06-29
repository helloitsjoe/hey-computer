const http = require('http');
const url = require('url');
const { initVoice } = require('./voice');
const { chat } = require('./llm');
const { log } = require('./logging');
const { speak } = require('./tts');
const { Language } = require('./settings');
const { SKIP_WAKE } = require('./utils');

const voice = initVoice();

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

    res.writeHead(200, {
      'Transfer-Encoding': 'chunked',
      'Content-Type': 'application/json',
      'X-Response-Type': 'stream',
    });

    let acc = '';

    speechResponse.stream.on('data', (chunk) => {
      const { content } = chunk.message;
      acc += content;
      log('content', content);
      res.write(content);
    });

    speechResponse.stream.on('end', () => {
      log('ending...');
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
