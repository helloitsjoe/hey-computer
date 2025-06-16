const Ollama = require('ollama').Ollama;
const { Readable } = require('node:stream');

const ollama = new Ollama({ host: 'http://192.168.59.111:11434' });

async function chat(prompt, stream = true) {
  const response = await ollama.chat({
    model: 'gemma3:1b',
    messages: [
      {
        role: 'system',
        content:
          'Keep responses to less than 30 words. Avoid markdown, just respond in plain text.',
      },
      { role: 'user', content: prompt },
    ],
    stream,
    // temperature: 0.7,
    // maxTokens: 1000,
  });

  if (!stream) {
    return { message: response?.message?.content };
  }

  const streamRes = Readable.from(response);

  return { stream: streamRes };
}

module.exports = { chat };
