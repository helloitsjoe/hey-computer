const Ollama = require('ollama').Ollama;
const { Readable } = require('node:stream');
const { Language } = require('../settings');
const { getSystemPrompt } = require('./system-prompt');

const MODEL = 'gemma3';
const OLLAMA_HOST = `http://${process.env.HOST}:11434`;

const ollama = new Ollama({ host: OLLAMA_HOST });

const personas = {
  normal: 'a helpful assistant.',
  danza:
    "Tony Maselli from the 80s sitcom Who's the Boss. You should refer to the user as Angela and say 'ay oh, oh ay!' as part of your responses.",
  yoda: 'master Yoda from Star Wars. Speak using strange word order',
  snarky:
    "frustrated. You're annoyed by everything but deep down you're very helpful. Avoid the word 'ugh'.",
};

const PERSONA = 'normal';

function getLanguagePrompt(lang = Language.EN) {
  // TODO: Replace with getValue
  const requestedLanguage = {
    [Language.EN]: '',
    [Language.IT]: 'Italian',
    [Language.JA]: 'Japanese',
  }[lang];

  if (!requestedLanguage) {
    return '';
  }

  return `Please respond only in ${requestedLanguage}. IMPORTANT: DO NOT include any English in your response.`;
}

async function isAvailable() {
  try {
    const res = await fetch(OLLAMA_HOST);
    console.log('res', res);
    return res.ok;
  } catch (err) {
    console.error(err);
    return false;
  }
}

async function chat({ prompt, language, stream = true }) {
  const ok = await isAvailable();
  if (!ok) {
    console.log('Chat unavailable');
    return { message: "I'm having trouble chatting right now." };
  }
  console.log('Chat is available');
  const userPrompt = `${prompt} ${getLanguagePrompt(language)}`;
  console.log('userPrompt', userPrompt);

  const response = await ollama
    .chat({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: getSystemPrompt({ persona: personas[PERSONA] }),
        },
        { role: 'user', content: userPrompt },
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

module.exports = { chat, isAvailable };
