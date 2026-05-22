const CORRECT_COMMENTS = [
  "すごい！",
  "やったね！",
  "その調子！",
  "いいね！",
  "かんぺき！",
  "すばらしい！",
  "できたね！",
  "さすが！",
  "ナイス！",
  "うまい！",
] as const;

export const SESSION_COMPLETE_MASCOT_COMMENT = "おつかれさまでした";

export function pickRandomMascotComment(): string {
  return CORRECT_COMMENTS[Math.floor(Math.random() * CORRECT_COMMENTS.length)]!;
}
