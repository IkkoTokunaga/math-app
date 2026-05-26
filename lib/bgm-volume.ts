export const BGM_VOLUME = 0.05;
export const BGM_VOLUME_MOBILE = 0.02;
export const SFX_VOLUME = 0.8;

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(pointer: coarse) and (max-width: 768px)").matches;
}

export function getBgmVolume(): number {
  return isMobileViewport() ? BGM_VOLUME_MOBILE : BGM_VOLUME;
}
