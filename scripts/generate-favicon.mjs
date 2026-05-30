import sharp from "sharp";
import { join } from "node:path";

const inputPath = join(process.cwd(), "public/mascot.png");
const outputPath = join(process.cwd(), "app/favicon.ico");

async function run() {
  await sharp(inputPath)
    .resize(32, 32)
    .png()
    .toFile(outputPath);
  console.log(`Generated favicon at ${outputPath}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
