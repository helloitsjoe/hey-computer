const fs = require('fs');
const path = require('path');

const DEFAULT_LOG_DIR = path.join(process.env.HOME, '.logs', 'hey-computer');
const DEFAULT_LOG_FILE = path.join(DEFAULT_LOG_DIR, '0.log');
const DEFAULT_LOG_LEVEL = 'info';

function maybeRenameFiles() {
  const originalFile = DEFAULT_LOG_FILE;

  if (fs.existsSync(originalFile)) {
    const fileSize = fs.statSync(originalFile).size;

    if (fileSize > 5 * 1024 * 1024) {
      // Step 1: Shift existing files in reverse order (from 5.log down to 0.log)
      for (let i = 5; i >= 0; i--) {
        const src = `${i}.log`;
        const dest = `${i + 1}.log`;

        if (fs.existsSync(src)) {
          fs.renameSync(src, dest);
        }
      }
      console.log(`Log files rotated.`);
    }
  }
}

function formatLogEntry(level, message) {
  const timestamp = new Date().toISOString();
  return `${timestamp} [${level.toUpperCase()}] ${message}\n`;
}

function log(message, level = DEFAULT_LOG_LEVEL) {
  // Define log levels in order of severity
  const levels = ['debug', 'info', 'warn', 'error'];

  if (!levels.includes(level)) {
    throw new Error('Invalid log level:', level);
  }

  const logEntry = formatLogEntry(level, message);

  try {
    fs.appendFileSync(DEFAULT_LOG_FILE, logEntry);
  } catch (err) {
    console.error('Error writing to log file:', err);
  }

  maybeRenameFiles();
}

module.exports = { log };
