import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function loadNotoSansJpBoldFonts(): Promise<
  Array<{ name: string; data: ArrayBuffer; weight: 700; style: "normal" }>
> {
  const filePath = join(
    process.cwd(),
    "node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-700-normal.woff",
  );
  const data = await readFile(filePath);

  return [
    {
      name: "Noto Sans JP",
      data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
      weight: 700,
      style: "normal",
    },
  ];
}
