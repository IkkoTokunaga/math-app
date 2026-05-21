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
          background: "linear-gradient(175deg, #152820 0%, #1a2e24 40%, #1f352a 100%)",
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
            borderRadius: "8px",
            border: "8px solid #a67c52",
            background: "linear-gradient(165deg, #345848 0%, #2a4538 45%, #1f3a2e 100%)",
            boxShadow: "inset 0 0 60px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.45)",
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#f0ebe0",
              lineHeight: 1.1,
            }}
          >
            {SITE_NAME}
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 34,
              color: "#b8b0a0",
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
              color: "#f0ebe0",
            }}
          >
            <span>3</span>
            <span style={{ color: "#b8b0a0" }}>+</span>
            <span>5</span>
            <span style={{ color: "#b8b0a0" }}>=</span>
            <span style={{ color: "#fff4a3" }}>?</span>
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
