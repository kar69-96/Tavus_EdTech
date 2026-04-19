import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/db/sessions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session?.tutorial_blob_url) {
    return NextResponse.json({ error: "Tutorial not found" }, { status: 404 });
  }

  const res = await fetch(session.tutorial_blob_url);
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch tutorial" }, { status: 502 });
  }

  const tutorial = await res.json();
  return NextResponse.json(tutorial);
}
