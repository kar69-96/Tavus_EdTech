import "server-only";
import { put } from "@vercel/blob";

export async function uploadToBlob(
  path: string,
  body: Buffer | Blob | ReadableStream | string,
  contentType: string,
): Promise<string> {
  const blob = await put(path, body, {
    access: "public",
    contentType,
    allowOverwrite: true,
  });
  return blob.url;
}
