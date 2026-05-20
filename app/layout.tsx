import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "たしざん れんしゅう",
  description: "小学生向け足し算練習アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
