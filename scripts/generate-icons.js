import { writeFileSync, mkdirSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function createPng(width, height, drawFn) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = createIHDR(width, height);
  const idat = createIDAT(width, height, drawFn);
  const iend = createIEND();
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc >>>= 1;
      }
    }
  }
  return (crc ^ -1) >>> 0;
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type);
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function createIHDR(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;
  data[9] = 2;
  data[10] = 0;
  data[11] = 0;
  data[12] = 0;
  return createChunk('IHDR', data);
}

function createIDAT(width, height, drawFn) {
  const raw = Buffer.alloc(height * (1 + width * 3));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = drawFn(x, y, width, height);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
    }
  }
  const zlib = require('zlib');
  return createChunk('IDAT', zlib.deflateSync(raw));
}

function createIEND() {
  return createChunk('IEND', Buffer.alloc(0));
}

function drawIcon(x, y, w, h) {
  const bg = [37, 99, 235];
  const white = [255, 255, 255];

  const margin = Math.floor(w * 0.15);
  const innerX = margin;
  const innerY = margin;
  const innerW = w - margin * 2;
  const innerH = h - margin * 2;
  const radius = Math.max(1, Math.floor(w * 0.08));
  const lensR = Math.max(1, Math.floor(w * 0.18));
  const lensCX = Math.floor(w / 2);
  const lensCY = Math.floor(h / 2);

  const inBorder = x >= innerX && x < innerX + innerW && y >= innerY && y < innerY + innerH;
  const inLens = (x - lensCX) ** 2 + (y - lensCY) ** 2 <= lensR ** 2;

  if (inLens) return white;
  if (inBorder) return white;
  return bg;
}

const iconsDir = 'src/icons';
try { mkdirSync(iconsDir, { recursive: true }); } catch {}

writeFileSync(`${iconsDir}/icon16.png`, createPng(16, 16, drawIcon));
writeFileSync(`${iconsDir}/icon48.png`, createPng(48, 48, drawIcon));
writeFileSync(`${iconsDir}/icon128.png`, createPng(128, 128, drawIcon));

console.log('Icons generated successfully.');
