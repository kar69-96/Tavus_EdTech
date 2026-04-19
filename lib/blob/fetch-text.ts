import "server-only";
import { parsePdf } from "../parser/pdf";
import { parseDocx } from "../parser/docx";

export async function fetchBlobText(
  blobUrl: string,
  contentType: string,
  maxChars = 3000,
): Promise<string> {
  const res = await fetch(blobUrl);
  if (!res.ok) throw new Error(`Failed to fetch blob: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());

  let text: string;
  if (contentType === "application/pdf" || blobUrl.endsWith(".pdf")) {
    text = await parsePdf(buffer);
  } else if (
    contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    blobUrl.endsWith(".docx")
  ) {
    text = await parseDocx(buffer);
  } else {
    text = buffer.toString("utf-8");
  }

  return text.slice(0, maxChars);
}
