const ollama = require('ollama').default;

async function generateText(prompt) {
  try {
    const response = await ollama.chat({
      model: 'gemma3',
      messages: [{ role: 'user', content: prompt }],
      // temperature: 0.7,
      // maxTokens: 1000,
    });
    return response.message.content;
  } catch (error) {
    console.error('Error generating text:', error);
    throw error;
  }
}

module.exports = { generateText };
