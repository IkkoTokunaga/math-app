import { NextRequest, NextResponse } from "next/server";
import { getProgressData } from "@/lib/progress";
import { parseOperation } from "@/lib/operations";

export async function GET(request: NextRequest) {
  const playerId = request.nextUrl.searchParams.get("playerId");
  const operation = parseOperation(request.nextUrl.searchParams.get("operation"));

  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }

  try {
    const data = await getProgressData(playerId, operation);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to load progress" }, { status: 500 });
  }
}
