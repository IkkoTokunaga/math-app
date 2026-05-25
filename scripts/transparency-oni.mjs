import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const inputPath = join(process.cwd(), "public/oni.png");
const outputPath = inputPath;

function isStrictCheckerboard(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min > 8) {
    return false;
  }
  if (max >= 235) {
    return true;
  }
  return max >= 160 && max <= 190;
}

function isExteriorBackgroundPixel(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min > 12) {
    return false;
  }
  if (max >= 235) {
    return true;
  }
  return max >= 160 && max <= 234;
}

const input = await readFile(inputPath);
const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const pixelCount = width * height;

for (let index = 0; index < pixelCount; index += 1) {
  data[index * 4 + 3] = 255;
}

const isExteriorBackground = new Uint8Array(pixelCount);
const visited = new Uint8Array(pixelCount);
const queue = [];

function trySeedExterior(x, y) {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return;
  }
  const index = y * width + x;
  if (visited[index]) {
    return;
  }
  visited[index] = 1;
  const offset = index * 4;
  if (!isExteriorBackgroundPixel(data[offset], data[offset + 1], data[offset + 2])) {
    return;
  }
  isExteriorBackground[index] = 1;
  queue.push([x, y]);
}

for (let x = 0; x < width; x += 1) {
  trySeedExterior(x, 0);
  trySeedExterior(x, height - 1);
}
for (let y = 0; y < height; y += 1) {
  trySeedExterior(0, y);
  trySeedExterior(width - 1, y);
}

while (queue.length > 0) {
  const [x, y] = queue.pop();
  trySeedExterior(x + 1, y);
  trySeedExterior(x - 1, y);
  trySeedExterior(x, y + 1);
  trySeedExterior(x, y - 1);
}

function findForegroundSeed() {
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const maxRadius = Math.max(width, height);

  for (let radius = 0; radius < maxRadius; radius += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (const dy of [-radius, radius]) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (x < 0 || y < 0 || x >= width || y >= height) {
          continue;
        }
        const index = y * width + x;
        if (!isStrictCheckerboard(data[index * 4], data[index * 4 + 1], data[index * 4 + 2])) {
          return [x, y];
        }
      }
    }
    for (let dy = -radius + 1; dy <= radius - 1; dy += 1) {
      for (const dx of [-radius, radius]) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (x < 0 || y < 0 || x >= width || y >= height) {
          continue;
        }
        const index = y * width + x;
        if (!isStrictCheckerboard(data[index * 4], data[index * 4 + 1], data[index * 4 + 2])) {
          return [x, y];
        }
      }
    }
  }

  throw new Error("Could not find foreground seed pixel");
}

const isForeground = new Uint8Array(pixelCount);
const foregroundQueue = [];
const [seedX, seedY] = findForegroundSeed();

function tryAddForeground(x, y) {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return;
  }
  const index = y * width + x;
  if (isForeground[index] || isExteriorBackground[index]) {
    return;
  }
  const offset = index * 4;
  if (isStrictCheckerboard(data[offset], data[offset + 1], data[offset + 2])) {
    return;
  }
  isForeground[index] = 1;
  foregroundQueue.push([x, y]);
}

tryAddForeground(seedX, seedY);
while (foregroundQueue.length > 0) {
  const [x, y] = foregroundQueue.pop();
  tryAddForeground(x + 1, y);
  tryAddForeground(x - 1, y);
  tryAddForeground(x, y + 1);
  tryAddForeground(x, y - 1);
}

function averageForegroundNeighborColor(x, y) {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (const [nx, ny] of [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ]) {
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
      continue;
    }
    const index = ny * width + nx;
    if (!isForeground[index]) {
      continue;
    }
    const offset = index * 4;
    r += data[offset];
    g += data[offset + 1];
    b += data[offset + 2];
    count += 1;
  }
  if (count === 0) {
    return null;
  }
  return [
    Math.round(r / count),
    Math.round(g / count),
    Math.round(b / count),
  ];
}

for (let pass = 0; pass < 24; pass += 1) {
  let changed = false;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (isExteriorBackground[index] || isForeground[index]) {
        continue;
      }
      const offset = index * 4;
      if (!isStrictCheckerboard(data[offset], data[offset + 1], data[offset + 2])) {
        continue;
      }
      const fill = averageForegroundNeighborColor(x, y);
      if (!fill) {
        continue;
      }
      data[offset] = fill[0];
      data[offset + 1] = fill[1];
      data[offset + 2] = fill[2];
      isForeground[index] = 1;
      changed = true;
    }
  }
  if (!changed) {
    break;
  }
}

let removed = 0;
for (let index = 0; index < pixelCount; index += 1) {
  if (isForeground[index]) {
    data[index * 4 + 3] = 255;
    continue;
  }
  data[index * 4 + 3] = 0;
  removed += 1;
}

await sharp(data, {
  raw: {
    width,
    height,
    channels: 4,
  },
})
  .png()
  .toFile(outputPath);

console.log(`Kept ${pixelCount - removed} foreground pixels, removed ${removed} in ${outputPath}`);
