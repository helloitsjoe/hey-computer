const { chat } = require('./index');

(async function main() {
  try {
    const prompt = process.argv[2];
    const response = await chat(prompt);
    if (!response.stream) {
      console.log('Generated text:', response);
    }

    console.log('response.stream', response.stream);
    // response.stream.pipe(process.stdout);
    response.stream.on('data', (chunk) => {
      process.stdout.write(chunk.message.content);
    });

    // console.log('response.stream', response.stream);
    response.stream.on('end', () => {
      process.stdout.write('\n');
      process.stdout.end();
    });
  } catch (error) {
    console.error('Error in main function:', error);
  }
})();
