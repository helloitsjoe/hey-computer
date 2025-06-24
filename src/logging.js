const fs = require('fs');
const path = require('path');
const { SAVE_DIR } = require('./utils');

const DEFAULT_LOG_DIR = path.join(SAVE_DIR, 'logs');
const DEFAULT_LOG_PREFIX = 'main';
const DEFAULT_LOG_LEVEL = 'info';
const MB_PER_FILE = 5;
const MAX_FILES = 20;

fs.mkdirSync(DEFAULT_LOG_DIR, { recursive: true });

function getFileFromPrefix(prefix) {
  return path.join(DEFAULT_LOG_DIR, `${prefix}-0.log`);
}

function maybeRenameFiles(prefix = DEFAULT_LOG_PREFIX) {
  const originalFile = getFileFromPrefix(prefix);

  if (fs.existsSync(originalFile)) {
    const fileSize = fs.statSync(originalFile).size;

    if (fileSize > MB_PER_FILE * 1024 * 1024) {
      // Step 1: Shift existing files in reverse order (from 5.log down to 0.log)
      for (let i = MAX_FILES; i >= 0; i--) {
        const src = `${prefix}-${i}.log`;
        const dest = `${prefix}-${i + 1}.log`;

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

function log(
  message,
  { level = DEFAULT_LOG_LEVEL, filePrefix = DEFAULT_LOG_PREFIX } = {},
) {
  const file = getFileFromPrefix(filePrefix);
  // Define log levels in order of severity
  const levels = ['debug', 'info', 'warn', 'error'];

  if (!levels.includes(level)) {
    throw new Error('Invalid log level:', level);
  }

  const logEntry = formatLogEntry(level, message);

  try {
    // TODO: handle multiple args (use createLogger)
    console[level](message);
    fs.appendFileSync(file, logEntry);
  } catch (err) {
    console.error('Error writing to log file:', err);
  }

  maybeRenameFiles(filePrefix);
}

module.exports = { log };
