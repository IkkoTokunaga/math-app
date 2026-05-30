"use client";

/**
 * Media Session API のメタデータを更新します。
 * モバイルブラウザなどのバックグラウンド/ロック画面コントロールでの表示をカスタマイズします。
 */
export function updateMediaSessionMetadata(title: string) {
  if (typeof window !== "undefined" && "mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title,
      artist: "けいさん",
      album: "けいさん",
      artwork: [
        { src: "/icons/icon-192", sizes: "192x192", type: "image/png" },
        { src: "/icons/icon-512", sizes: "512x512", type: "image/png" },
      ],
    });
    navigator.mediaSession.playbackState = "playing";
  }
}

/**
 * Media Session API のメタデータをクリアします。
 */
export function clearMediaSessionMetadata() {
  if (typeof window !== "undefined" && "mediaSession" in navigator) {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = "none";
  }
}

/**
 * Media Session API の再生状態を一時停止に更新します。
 */
export function pauseMediaSessionPlaybackState() {
  if (typeof window !== "undefined" && "mediaSession" in navigator) {
    navigator.mediaSession.playbackState = "paused";
  }
}
