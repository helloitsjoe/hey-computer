const path = require('path');

const SAVE_DIR =
  process.env.SAVE_DIR ?? path.join(process.env.HOME, '.hey-computer');
const SKIP_WAKE = process.env.SKIP_WAKE === 'true';

module.exports = { SAVE_DIR, SKIP_WAKE };
