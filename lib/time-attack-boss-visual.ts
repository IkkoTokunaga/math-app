import type { Level } from "@/lib/questions";

/** Lv1–8 鬼はベース PNG + CSS 色変化。Lv9 閻魔は紫、Lv10 閻魔は赤肌・黒オーラ */
export function getBossImageSrc(level: Level): string {
  return level >= 9 ? "/enma.png" : "/oni.png";
}

export function getBossImageClass(level: Level): string {
  if (level >= 10) {
    return "time-attack-oni-score__image--enma-black";
  }
  if (level >= 9) {
    return "time-attack-oni-score__image--enma";
  }
  return `time-attack-oni-score__image--lv${level}`;
}
