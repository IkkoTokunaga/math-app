import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { loadNotoSansJpBoldFonts } from "@/lib/og-font";

export const APP_ICON_TITLE = "けいさん";

async function loadMascotDataUrl(): Promise<string> {
  const data = await readFile(join(process.cwd(), "public/mascot.png"));
  return `data:image/png;base64,${data.toString("base64")}`;
}

async function loadKleeOneFont(): Promise<
  Array<{ name: string; data: ArrayBuffer; weight: 600; style: "normal" }> | null
> {
  try {
    const filePath = join(
      process.cwd(),
      "node_modules/@fontsource/klee-one/files/klee-one-japanese-600-normal.woff",
    );
    const data = await readFile(filePath);
    return [
      {
        name: "Klee One",
        data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
        weight: 600,
        style: "normal",
      },
    ];
  } catch {
    return null;
  }
}

async function loadAppIconFonts() {
  const kleeFonts = await loadKleeOneFont();
  if (kleeFonts) {
    return { fonts: kleeFonts, fontFamily: "Klee One" };
  }

  const notoFonts = await loadNotoSansJpBoldFonts();
  return { fonts: notoFonts, fontFamily: "Noto Sans JP" };
}

function getIconLayout(size: number) {
  const frame = Math.max(2, Math.round(size * 0.03));
  const padding = Math.round(size * 0.06);
  const titleSize = Math.max(8, Math.round(size * 0.14));
  const titleGap = Math.round(size * 0.03);
  const mascotHeight = Math.round(size * 0.62);

  return { frame, padding, titleSize, titleGap, mascotHeight };
}

function AppIconElement({
  size,
  mascotDataUrl,
  fontFamily,
}: {
  size: number;
  mascotDataUrl: string;
  fontFamily: string;
}) {
  const { frame, padding, titleSize, titleGap, mascotHeight } = getIconLayout(size);

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(175deg, #152820 0%, #1a2e24 40%, #1f352a 100%)",
        fontFamily,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          width: size - padding * 2,
          height: size - padding * 2,
          padding: `${Math.round(padding * 0.7)}px ${padding}px ${padding}px`,
          borderRadius: Math.round(size * 0.08),
          border: `${frame}px solid #a67c52`,
          background: "linear-gradient(165deg, #345848 0%, #2a4538 45%, #1f3a2e 100%)",
          boxShadow: "inset 0 0 24px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            fontSize: titleSize,
            fontWeight: 600,
            color: "#f0ebe0",
            lineHeight: 1,
            marginBottom: titleGap,
          }}
        >
          {APP_ICON_TITLE}
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "flex-end",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <img
            src={mascotDataUrl}
            alt=""
            width={Math.round(mascotHeight * 0.5)}
            height={mascotHeight}
            style={{
              objectFit: "contain",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export async function createAppIconResponse(size: number) {
  const [{ fonts, fontFamily }, mascotDataUrl] = await Promise.all([
    loadAppIconFonts(),
    loadMascotDataUrl(),
  ]);

  return new ImageResponse(
    <AppIconElement size={size} mascotDataUrl={mascotDataUrl} fontFamily={fontFamily} />,
    {
      width: size,
      height: size,
      fonts,
    },
  );
}
