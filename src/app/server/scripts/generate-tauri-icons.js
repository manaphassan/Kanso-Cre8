const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal PNG generator for Tauri desktop packaging icons
function createSolidPng(width, height, r, g, b, a = 255) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA color type
  ihdr.writeUInt8(0, 10); // deflate
  ihdr.writeUInt8(0, 11); // filter standard
  ihdr.writeUInt8(0, 12); // interlace none
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with filter byte 0 per scanline
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowBytes);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const px = rowOffset + 1 + x * 4;
      // Draw dark background with #38BDF8 accent ring
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const radius = width * 0.35;
      const thickness = Math.max(2, width * 0.05);

      if (Math.abs(dist - radius) <= thickness) {
        rawData[px] = 56;   // R (#38BDF8)
        rawData[px + 1] = 189; // G
        rawData[px + 2] = 248; // B
        rawData[px + 3] = 255; // A
      } else {
        rawData[px] = 9;   // R (#09090B)
        rawData[px + 1] = 9;
        rawData[px + 2] = 11;
        rawData[px + 3] = 255;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Standard CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createIco(pngBuffers) {
  // Simple ICO container embedding PNG images
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(pngBuffers.length, 4); // Image count

  let offset = 6 + (16 * pngBuffers.length);
  const dirEntries = [];
  const imageBodies = [];

  for (const { width, height, data } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(data.length, 8); // byte size
    entry.writeUInt32LE(offset, 12); // offset
    dirEntries.push(entry);
    imageBodies.push(data);
    offset += data.length;
  }

  return Buffer.concat([header, ...dirEntries, ...imageBodies]);
}

const iconsDir = path.resolve(__dirname, '../../src-tauri/icons');
fs.mkdirSync(iconsDir, { recursive: true });

const png32 = createSolidPng(32, 32, 9, 9, 11);
const png128 = createSolidPng(128, 128, 9, 9, 11);
const png256 = createSolidPng(256, 256, 9, 9, 11);

fs.writeFileSync(path.join(iconsDir, '32x32.png'), png32);
fs.writeFileSync(path.join(iconsDir, '128x128.png'), png128);
fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), png256);

const icoData = createIco([
  { width: 32, height: 32, data: png32 },
  { width: 128, height: 128, data: png128 },
  { width: 256, height: 256, data: png256 }
]);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoData);
// For macOS icns, write placeholder binary so Tauri bundler finds the path
fs.writeFileSync(path.join(iconsDir, 'icon.icns'), png256);

console.log('[Tauri Icons] Successfully generated all desktop icons in:', iconsDir);
