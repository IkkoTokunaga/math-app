import { ImageResponse } from "next/og";
import { loadNotoSansJpBoldFonts } from "@/lib/og-font";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const alt = SITE_NAME;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const fonts = await loadNotoSansJpBoldFonts();

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%)",
          fontFamily: "Noto Sans JP",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "960px",
            padding: "48px 64px",
            borderRadius: "48px",
            background: "white",
            boxShadow: "0 24px 60px rgba(14, 116, 144, 0.12)",
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 1.1,
            }}
          >
            {SITE_NAME}
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 34,
              color: "#0369a1",
              lineHeight: 1.5,
              textAlign: "center",
            }}
          >
            {SITE_DESCRIPTION}
          </div>
          <div
            style={{
              marginTop: 48,
              display: "flex",
              alignItems: "center",
              gap: 24,
              fontSize: 72,
              fontWeight: 700,
              color: "#0284c7",
            }}
          >
            <span>3</span>
            <span style={{ color: "#64748b" }}>+</span>
            <span>5</span>
            <span style={{ color: "#64748b" }}>=</span>
            <span style={{ color: "#cbd5e1" }}>?</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    },
  );
}
