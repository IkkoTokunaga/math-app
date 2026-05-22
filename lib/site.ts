export const SITE_NAME = "たしざん れんしゅう";
export const SITE_DESCRIPTION =
  "小学生向け足し算練習アプリ。レベル別の問題で、楽しくたしざんの力をつけよう。";
export const PRODUCTION_SITE_URL = "https://math.ikk-dev.jp";

export function getSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) {
    return new URL(explicit);
  }

  if (process.env.VERCEL_ENV === "preview") {
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) {
      return new URL(`https://${vercelUrl}`);
    }
  }

  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    return new URL(PRODUCTION_SITE_URL);
  }

  return new URL("http://localhost:3000");
}
