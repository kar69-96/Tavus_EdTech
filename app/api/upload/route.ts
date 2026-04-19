import { NextRequest, NextResponse } from "next/server";
import { uploadToBlob } from "@/lib/blob/upload";
import { insertDoc } from "@/lib/db/documents";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const sessionId = form.get("sessionId") as string | null;

  if (!file || !sessionId) {
    return NextResponse.json({ error: "file and sessionId are required" }, { status: 400 });
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds 50 MB limit" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const blobUrl = await uploadToBlob(
    `uploads/${sessionId}/${file.name}`,
    buffer,
    file.type || "application/octet-stream",
  );

  const doc = await insertDoc({
    session_id: sessionId,
    filename: file.name,
    content_type: file.type || "application/octet-stream",
    blob_url: blobUrl,
  });

  return NextResponse.json({ id: doc.id, blob_url: blobUrl, filename: file.name });
}
