import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const inputPath = join(process.cwd(), "public/mascot.png");
const outputPath = join(process.cwd(), "public/mascot-subtraction.png");

/** 赤系（スーツ）を水色 #87CEEB に置換 */
function isRedClothing(r, g, b, a) {
  if (a < 128) {
    return false;
  }
  return r > 130 && g < 95 && b < 95 && r - Math.max(g, b) > 60;
}

const input = await readFile(inputPath);
const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const a = data[i + 3];
  if (!isRedClothing(r, g, b, a)) {
    continue;
  }
  data[i] = 135;
  data[i + 1] = 206;
  data[i + 2] = 235;
}

await sharp(data, {
  raw: {
    width: info.width,
    height: info.height,
    channels: 4,
  },
})
  .png()
  .toFile(outputPath);

console.log(`Wrote ${outputPath}`);
