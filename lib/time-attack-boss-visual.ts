import type { Level } from "@/lib/questions";

const ONI_SHADOW = "drop-shadow(0 4px 12px rgb(0 0 0 / 0.35))";

const ONI_LEVEL_FILTERS: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, string> = {
  1: `${ONI_SHADOW} sepia(0.85) hue-rotate(190deg) saturate(2.8) brightness(1.06)`,
  2: `${ONI_SHADOW} sepia(0.85) hue-rotate(100deg) saturate(2.9) brightness(1.05)`,
  3: `${ONI_SHADOW} sepia(0.9) hue-rotate(35deg) saturate(3) brightness(1.08)`,
  4: `${ONI_SHADOW} sepia(0.9) hue-rotate(5deg) saturate(2.8) brightness(1.06)`,
  5: `${ONI_SHADOW} sepia(0.95) hue-rotate(325deg) saturate(3) brightness(1.04)`,
  6: `${ONI_SHADOW} sepia(0.85) hue-rotate(285deg) saturate(2.8) brightness(1.05)`,
  7: `${ONI_SHADOW} sepia(0.9) hue-rotate(245deg) saturate(2.6) brightness(1)`,
  8: `${ONI_SHADOW} sepia(0.95) hue-rotate(205deg) saturate(2.4) brightness(0.88)`,
};

/** Lv1–8 鬼は oni.png + フィルター。Lv9–10 閻魔は enma.png */
export function getBossImageSrc(level: Level): string {
  return level >= 9 ? "/enma.png" : "/oni.png";
}

export function getBossImageFilter(level: Level): string {
  if (level >= 10) {
    return `${ONI_SHADOW} sepia(0.55) hue-rotate(308deg) saturate(2.4) brightness(0.96) contrast(1.12) drop-shadow(0 0 16px rgb(0 0 0 / 0.9)) drop-shadow(0 0 32px rgb(0 0 0 / 0.75)) drop-shadow(0 0 52px rgb(0 0 0 / 0.55)) drop-shadow(0 0 76px rgb(0 0 0 / 0.38))`;
  }
  if (level >= 9) {
    return `${ONI_SHADOW} sepia(0.35) hue-rotate(255deg) saturate(2.2) brightness(1.02) drop-shadow(0 0 10px rgb(147 51 234 / 0.45))`;
  }
  return ONI_LEVEL_FILTERS[level];
}

export type BossImageStyle = {
  filter: string;
  "--oni-tint": string;
};

/** 撃破演出のアニメーション keyframes が参照する CSS 変数 */
export function getBossImageStyle(level: Level): BossImageStyle {
  const filter = getBossImageFilter(level);
  return {
    filter,
    "--oni-tint": filter,
  };
}
