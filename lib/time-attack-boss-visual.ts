import type { Level } from "@/lib/questions";

/** Lv1–9 鬼はベース PNG + CSS 色変化、Lv10 閻魔は専用画像 */
export function getBossImageSrc(level: Level): string {
  return level >= 10 ? "/enma.png" : "/oni.png";
}

export function getBossImageClass(level: Level): string {
  if (level >= 10) {
    return "time-attack-oni-score__image--enma";
  }
  return `time-attack-oni-score__image--lv${level}`;
}
