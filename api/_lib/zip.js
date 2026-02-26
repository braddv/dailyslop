const zlib = require('zlib');

function extractFirstFileFromZip(buffer) {
  const LOCAL_FILE_HEADER = 0x04034b50;
  const sig = buffer.readUInt32LE(0);
  if (sig !== LOCAL_FILE_HEADER) {
    throw new Error('Invalid zip file');
  }

  const compression = buffer.readUInt16LE(8);
  const compressedSize = buffer.readUInt32LE(18);
  const fileNameLength = buffer.readUInt16LE(26);
  const extraLength = buffer.readUInt16LE(28);
  const dataStart = 30 + fileNameLength + extraLength;
  const compressed = buffer.slice(dataStart, dataStart + compressedSize);

  if (compression === 0) return compressed.toString('utf8');
  if (compression === 8) return zlib.inflateRawSync(compressed).toString('utf8');
  throw new Error(`Unsupported zip compression method: ${compression}`);
}

module.exports = { extractFirstFileFromZip };
