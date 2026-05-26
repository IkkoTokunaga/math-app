import type { Metadata, Viewport } from "next";
import "@fontsource/klee-one/400.css";
import "@fontsource/klee-one/600.css";
import { AppLoadingGate } from "@/components/AppLoadingGate";
import { BgmVisibilityLayer } from "@/components/BgmVisibilityLayer";
import { ButtonSoundLayer } from "@/components/ButtonSoundLayer";
import { KeypadSoundLayer } from "@/components/KeypadSoundLayer";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#1a2e24",
};

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  appleWebApp: {
    capable: true,
    title: "けいさん",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <AppLoadingGate>
          <BgmVisibilityLayer />
          <KeypadSoundLayer />
          <ButtonSoundLayer />
          {children}
        </AppLoadingGate>
      </body>
    </html>
  );
}
