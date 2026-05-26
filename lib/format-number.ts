export function formatPoints(score: number | null | undefined): string {
  if (score == null) {
    return "—";
  }
  return score.toLocaleString("ja-JP");
}
