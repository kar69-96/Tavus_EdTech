import { NextRequest, NextResponse } from "next/server";
import { listDocsBySession } from "@/lib/db/documents";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const docs = await listDocsBySession(sessionId);
  return NextResponse.json(docs);
}
