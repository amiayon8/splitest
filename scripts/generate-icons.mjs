import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const svgPath = path.join(dirname, '..', 'public', 'Splitest.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');

const base64Prefix = 'data:image/png;base64,';
const startIndex = svgContent.indexOf(base64Prefix);

if (startIndex === -1) {
  process.exit(1);
}

const dataStart = startIndex + base64Prefix.length;
const dataEnd = svgContent.indexOf('"', dataStart);
const base64Data = svgContent.substring(dataStart, dataEnd);
const pngBuffer = Buffer.from(base64Data, 'base64');

const publicDir = path.join(dirname, '..', 'public');
const appDir = path.join(dirname, '..', 'app');

fs.writeFileSync(path.join(publicDir, 'icon.png'), pngBuffer);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), pngBuffer);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), pngBuffer);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngBuffer);
fs.writeFileSync(path.join(appDir, 'icon.png'), pngBuffer);
fs.writeFileSync(path.join(appDir, 'apple-icon.png'), pngBuffer);

function createIcoFromPng(pngBuf) {
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0);
  icoHeader.writeUInt16LE(1, 2);
  icoHeader.writeUInt16LE(1, 4);

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(0, 0);
  dirEntry.writeUInt8(0, 1);
  dirEntry.writeUInt8(0, 2);
  dirEntry.writeUInt8(0, 3);
  dirEntry.writeUInt16LE(1, 4);
  dirEntry.writeUInt16LE(32, 6);
  dirEntry.writeUInt32LE(pngBuf.length, 8);
  dirEntry.writeUInt32LE(22, 12);

  return Buffer.concat([icoHeader, dirEntry, pngBuf]);
}

const icoBuffer = createIcoFromPng(pngBuffer);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
