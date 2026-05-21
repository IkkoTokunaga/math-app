import { readFile } from "node:fs/promises";
import { join } from "node:path";

const FONT_SUBSET_IDS = [100, 103, 106, 110, 112, 113, 115, 116, 117, 119] as const;

export async function loadNotoSansJpBoldFonts(): Promise<
  Array<{ name: string; data: ArrayBuffer; weight: 700; style: "normal" }>
> {
  const fontDir = join(
    process.cwd(),
    "node_modules/@fontsource/noto-sans-jp/files",
  );

  const fonts = await Promise.all(
    FONT_SUBSET_IDS.map(async (id) => {
      const filePath = join(fontDir, `noto-sans-jp-${id}-700-normal.woff`);
      const data = await readFile(filePath);

      return {
        name: "Noto Sans JP",
        data: data.buffer.slice(
          data.byteOffset,
          data.byteOffset + data.byteLength,
        ),
        weight: 700 as const,
        style: "normal" as const,
      };
    }),
  );

  return fonts;
}
