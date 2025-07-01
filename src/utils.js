const path = require('path');

const SAVE_DIR =
  process.env.SAVE_DIR ?? path.join(process.env.HOME, '.hey-computer');
const SKIP_WAKE = process.env.SKIP_WAKE === 'true';

const sentenceCase = (str) => `${str[0].toUpperCase()}${str.substring(1)}`;

module.exports = { SAVE_DIR, SKIP_WAKE, sentenceCase };
