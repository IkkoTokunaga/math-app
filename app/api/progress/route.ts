import { NextRequest, NextResponse } from "next/server";
import { getProgressData } from "@/lib/progress";

export async function GET(request: NextRequest) {
  const playerId = request.nextUrl.searchParams.get("playerId");

  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }

  try {
    const data = await getProgressData(playerId);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to load progress" }, { status: 500 });
  }
}
