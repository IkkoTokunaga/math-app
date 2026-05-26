"use client";

export function waitForAudioReady(
  audio: HTMLAudioElement,
  timeoutMs = 5000,
): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const done = () => {
      cleanup();
      resolve();
    };

    const timer = window.setTimeout(done, timeoutMs);
    const cleanup = () => {
      window.clearTimeout(timer);
      audio.removeEventListener("canplaythrough", done);
      audio.removeEventListener("error", done);
    };

    audio.addEventListener("canplaythrough", done, { once: true });
    audio.addEventListener("error", done, { once: true });
  });
}
