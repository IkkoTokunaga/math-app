import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Docker / WSL ではファイル監視が届きにくいことがある
  ...(isDev && {
    experimental: {
      // Turbopack の開発キャッシュで CSS が古いまま残るのを防ぐ
      turbopackFileSystemCacheForDev: false,
    },
  }),
  async headers() {
    if (!isDev) {
      return [];
    }

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
