import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

async function loadMascotDataUrl(): Promise<string> {
  const data = await readFile(join(process.cwd(), "public/mascot.png"));
  return `data:image/png;base64,${data.toString("base64")}`;
}

function AppIconElement({
  size,
  mascotDataUrl,
}: {
  size: number;
  mascotDataUrl: string;
}) {
  // 顔をやや大きく見せつつ、頭全体（髪含む）が収まる倍率
  const imageWidth = Math.round(size * 1.35);
  const imageHeight = Math.round(size * 2.7);

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        alignItems: "flex-start",
        justifyContent: "center",
        background: "linear-gradient(175deg, #152820 0%, #1a2e24 40%, #1f352a 100%)",
      }}
    >
      <img
        src={mascotDataUrl}
        alt=""
        width={imageWidth}
        height={imageHeight}
        style={{
          objectFit: "contain",
        }}
      />
    </div>
  );
}

export async function createAppIconResponse(size: number) {
  const mascotDataUrl = await loadMascotDataUrl();

  return new ImageResponse(<AppIconElement size={size} mascotDataUrl={mascotDataUrl} />, {
    width: size,
    height: size,
  });
}
