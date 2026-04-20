export function chunkText(
  text: string,
  options: { size?: number; overlap?: number } = {},
): string[] {
  const { size = 500, overlap = 50 } = options;
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length === 0) return [];
  if (words.length <= size) return [words.join(" ")];

  const chunks: string[] = [];
  let i = 0;

  while (i < words.length) {
    chunks.push(words.slice(i, i + size).join(" "));
    i += size - overlap;
  }

  return chunks;
}
