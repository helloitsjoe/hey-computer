const Ollama = require('ollama').Ollama;
const { Readable } = require('node:stream');

const HOST = '192.168.59.111';

const ollama = new Ollama({ host: `http://${HOST}:11434` });

async function chat(prompt, stream = true) {
  const response = await ollama.chat({
    model: 'gemma3',
    messages: [
      {
        role: 'system',
        content:
          'Keep responses to less than 30 words. Avoid markdown, just respond in plain text. Speak like master Yoda from Star Wars, using strange word order.',
      },
      { role: 'user', content: prompt },
    ],
    stream,
    // temperature: 0.7,
    // maxTokens: 1000,
  });

  if (!response) {
    return { message: "I'm having trouble chatting right now." };
  }

  if (!stream) {
    return { message: response?.message?.content };
  }

  const streamRes = Readable.from(response);

  return { stream: streamRes };
}

module.exports = { chat };
