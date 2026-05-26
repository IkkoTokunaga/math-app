import { join } from "node:path";
import sharp from "sharp";

/** Width relative to icon canvas; smaller = more zoom out */
const MASCOT_WIDTH_SCALE = 1.15;

function createBackgroundSvg(size: number): Buffer {
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stop-color="#152820"/>
        <stop offset="40%" stop-color="#1a2e24"/>
        <stop offset="100%" stop-color="#1f352a"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#bg)"/>
  </svg>`;
  return Buffer.from(svg);
}

export async function createAppIconResponse(size: number) {
  const mascotPath = join(process.cwd(), "public/mascot.png");
  const mascotDisplayWidth = Math.round(size * MASCOT_WIDTH_SCALE);

  const resizedMascot = await sharp(mascotPath)
    .resize(mascotDisplayWidth)
    .png()
    .toBuffer();

  const { width: mascotWidth = mascotDisplayWidth, height: mascotHeight = mascotDisplayWidth } =
    await sharp(resizedMascot).metadata();

  const visibleHeight = Math.min(mascotHeight, size);
  const mascotTop = await sharp(resizedMascot)
    .extract({ left: 0, top: 0, width: mascotWidth, height: visibleHeight })
    .png()
    .toBuffer();

  const background = await sharp(createBackgroundSvg(size)).png().toBuffer();
  const left = Math.round((size - mascotWidth) / 2);

  const png = await sharp(background)
    .composite([{ input: mascotTop, left, top: 0 }])
    .png()
    .toBuffer();

  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
}
