const http = require('http');
const url = require('url');
const { init, listenForSpeech } = require('./voice');
const { chat } = require('./llm');
const { log } = require('./logging');

async function main() {
  return await init((recorder, cheetah) => {
    return listenForSpeech(recorder, cheetah);
  });
}

// TODO: This is super weird, I should refactor this to just use promises instead of callbacks
(async () => {
  if (process.env.SKIP_WAKE === 'true') {
    console.log('Skipping wake word detection, creating server instead.');
    const { recorder, cheetah } = await init((recorder, cheetah) => {
      return { recorder, cheetah };
    });

    const server = http.createServer(async (req, res) => {
      // Handle CORS from browser from localhost:3211
      res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3211');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
      res.setHeader('Access-Control-Expose-Headers', 'X-Response-Type');

      if (req.url.startsWith('/llm')) {
        console.log('Streaming...');

        // Example: http://localhost:3000/llm?prompt=foo
        const parsedUrl = url.parse(req.url, true);
        const prompt = parsedUrl.query?.prompt;
        const speechResponse = await chat(prompt);

        if (!speechResponse.stream) {
          // Something went wrong, just send json response
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'X-Response-Type': 'json',
          });
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
          acc += chunk.message.content;
          console.log('content', chunk.message.content);
          res.write(chunk.message.content);
        });

        speechResponse.stream.on('end', () => {
          console.log('ending...');
          res.end();

          // Log chat to disk after sending
          acc.split('\n').forEach((line) => {
            console.log('line', line);
            log(line);
          });
        });
      } else if (req.url === '/voice') {
        const speechResponse = await listenForSpeech(recorder, cheetah);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'X-Response-Type': 'json',
        });
        res.end(JSON.stringify(speechResponse));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    server.listen(3000, 'localhost', () => {
      console.log('Server is running at http://localhost:3000/voice');
    });
  } else {
    console.log('Initializing voice module with wake word detection...');
    main().catch((err) => {
      console.error('Error initializing voice module:', err);
      process.exit(1);
    });
  }
})().catch((err) => {
  console.error('Error in main execution:', err);
  process.exit(1);
});
