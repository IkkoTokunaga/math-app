import { createAppIconResponse } from "@/lib/app-icon";

export async function GET() {
  return createAppIconResponse(512);
}
