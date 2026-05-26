import { createAppIconResponse } from "@/lib/app-icon";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default async function AppleIcon() {
  return createAppIconResponse(180);
}
