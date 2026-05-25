// Generate a 1024×1024 solid-color PNG (Inkstone accent blue) without
// any third-party deps. Used to bootstrap `npx tauri icon` when the
// project ships without a real brand asset yet.
//
//   node scripts/gen-icon.mjs src-tauri/icons/source.png
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;
const COLOR = [0x25, 0x63, 0xeb, 0xff]; // RGBA — Inkstone accent

function crc32Table() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
}
const TABLE = crc32Table();
function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = (TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const tBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([tBuf, data])), 0);
  return Buffer.concat([len, tBuf, data, crcBuf]);
}

const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // color type: truecolor + alpha
// 10,11,12 default 0

const stride = 1 + W * 4;
const raw = Buffer.alloc(H * stride);
for (let y = 0; y < H; y++) {
  const off = y * stride;
  raw[off] = 0; // filter: none
  for (let x = 0; x < W; x++) {
    const p = off + 1 + x * 4;
    raw[p] = COLOR[0];
    raw[p + 1] = COLOR[1];
    raw[p + 2] = COLOR[2];
    raw[p + 3] = COLOR[3];
  }
}
const idat = deflateSync(raw, { level: 9 });

const png = Buffer.concat([
  sig,
  chunk("IHDR", ihdr),
  chunk("IDAT", idat),
  chunk("IEND", Buffer.alloc(0)),
]);

const out = process.argv[2] ?? "icon.png";
writeFileSync(out, png);
console.log(`wrote ${out} (${png.length} bytes, ${W}x${H} RGBA)`);
