const Ollama = require('ollama').Ollama;
const { Readable } = require('node:stream');

const HOST = '192.168.59.110'; // MB Pro
// const HOST = '192.168.59.111'; // MB Air

const ollama = new Ollama({ host: `http://${HOST}:11434` });

const personas = {
  normal: 'a helpful assistant.',
  danza:
    "Tony Maselli from the 80s sitcom Who's the Boss. You should refer to the user as Angela and say 'ay oh, oh ay!' as part of your responses.",
  yoda: 'master Yoda from Star Wars. Speak using strange word order',
  snarky:
    "frustrated. You're annoyed by everything but deep down you're very helpful. Avoid the word 'ugh'.",
};

const PERSONA = 'normal';

async function chat(prompt, stream = true) {
  const response = await ollama
    .chat({
      model: 'gemma3',
      messages: [
        {
          role: 'system',
          content: `Keep responses to less than 30 words. Avoid markdown, just respond in plain text. Your personality is ${personas[PERSONA]}.`,
        },
        { role: 'user', content: prompt },
      ],
      stream,
      // temperature: 0.7,
      // maxTokens: 1000,
    })
    .catch((err) => {
      console.error('Error fetching chat:', err);
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
