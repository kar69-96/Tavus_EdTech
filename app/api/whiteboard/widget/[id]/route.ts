import { NextRequest, NextResponse } from "next/server";
import { getWhiteboardByIdForSession } from "@/lib/db/whiteboards";
import { canServeWhiteboardToSession } from "@/lib/whiteboard/access";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return new NextResponse("Missing sessionId", { status: 400 });
  }

  const row = await getWhiteboardByIdForSession(id, sessionId);
  if (!canServeWhiteboardToSession(row, sessionId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (row.html) {
    return new NextResponse(row.html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    });
  }

  if (row.blob_url) {
    try {
      const res = await fetch(row.blob_url);
      if (res.ok) {
        const html = await res.text();
        return new NextResponse(html, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "private, no-store",
          },
        });
      }
    } catch {
      /* fall through */
    }
  }

  return new NextResponse("Not found", { status: 404 });
}
