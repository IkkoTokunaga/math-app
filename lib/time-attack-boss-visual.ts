import type { Level } from "@/lib/questions";
import { DEFAULT_OPERATION, type Operation } from "@/lib/operations";

type OniLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const ONI_SHADOW = "drop-shadow(0 4px 12px rgb(0 0 0 / 0.35))";

const SUBTRACTION_ONI_LEVEL_FILTERS: Record<OniLevel, string> = {
  1: `${ONI_SHADOW} sepia(0.85) hue-rotate(190deg) saturate(2.8) brightness(1.06)`,
  2: `${ONI_SHADOW} sepia(0.85) hue-rotate(100deg) saturate(2.9) brightness(1.05)`,
  3: `${ONI_SHADOW} sepia(0.9) hue-rotate(35deg) saturate(3) brightness(1.08)`,
  4: `${ONI_SHADOW} sepia(0.9) hue-rotate(5deg) saturate(2.8) brightness(1.06)`,
  5: `${ONI_SHADOW} sepia(0.95) hue-rotate(325deg) saturate(3) brightness(1.04)`,
  6: `${ONI_SHADOW} sepia(0.85) hue-rotate(285deg) saturate(2.8) brightness(1.05)`,
  7: `${ONI_SHADOW} sepia(0.9) hue-rotate(245deg) saturate(2.6) brightness(1)`,
  8: `${ONI_SHADOW} sepia(0.95) hue-rotate(205deg) saturate(2.4) brightness(0.88)`,
};

/** Lv1–8 鬼は演算別 PNG。Lv9 閻魔は enma.png、Lv10 閻魔は enma-lv10.png */
export function getBossImageSrc(
  level: Level,
  operation: Operation = DEFAULT_OPERATION,
): string {
  if (level >= 10) {
    return "/enma-lv10.png";
  }
  if (level >= 9) {
    return "/enma.png";
  }
  return operation === "subtraction" ? "/oni-subtraction.png" : "/oni.png";
}

/** 足し算 TA 用: 従来の CSS クラスで Lv 別 tint */
export function getBossImageClass(level: Level): string {
  if (level >= 10) {
    return "time-attack-oni-score__image--enma-black";
  }
  if (level >= 9) {
    return "time-attack-oni-score__image--enma";
  }
  return `time-attack-oni-score__image--lv${level}`;
}

function getSubtractionBossImageFilter(level: Level): string {
  return SUBTRACTION_ONI_LEVEL_FILTERS[level as OniLevel];
}

export type BossImageStyle = {
  filter: string;
  "--oni-tint": string;
};

export type BossImagePresentation = {
  src: string;
  className: string;
  style?: BossImageStyle;
};

/** 撃破演出のアニメーション keyframes が参照する CSS 変数（引き算 TA Lv1–8 の inline filter 用） */
export function getBossImageStyle(
  level: Level,
  operation: Operation = DEFAULT_OPERATION,
): BossImageStyle | undefined {
  if (operation !== "subtraction" || level >= 9) {
    return undefined;
  }
  const filter = getSubtractionBossImageFilter(level);
  return {
    filter,
    "--oni-tint": filter,
  };
}

export function getBossImagePresentation(
  level: Level,
  operation: Operation = DEFAULT_OPERATION,
): BossImagePresentation {
  const variantClass =
    operation === "subtraction"
      ? "time-attack-oni-score__image--subtraction"
      : "time-attack-oni-score__image--addition";
  const useCssLevelTint = operation === "addition" || level >= 9;
  const levelClass = useCssLevelTint ? getBossImageClass(level) : "";
  const className = ["time-attack-oni-score__image", variantClass, levelClass]
    .filter(Boolean)
    .join(" ");
  const style = getBossImageStyle(level, operation);

  return {
    src: getBossImageSrc(level, operation),
    className,
    ...(style ? { style } : {}),
  };
}

/** @deprecated Tests only — use getSubtractionBossImageFilter via getBossImageStyle */
export function getBossImageFilter(level: Level): string {
  return getSubtractionBossImageFilter(level);
}
