const { generateText } = require('./index');

(async function main() {
  try {
    const prompt = process.argv[2];
    const response = await generateText(prompt);
    console.log('Generated text:', response);
  } catch (error) {
    console.error('Error in main function:', error);
  }
})();
