"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadZone } from "@/components/onboarding/UploadZone";
import { useSession } from "@/lib/store";

interface UploadedDoc {
  id: string;
  filename: string;
}

export default function OnboardPage() {
  const router = useRouter();
  const { sessionId: prevSessionId, setSessionId, reset } = useSession();

  const [tempSessionId] = useState(() => crypto.randomUUID());
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startSession() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: tempSessionId,
          docIds: docs.map((d) => d.id),
          prevSessionId: prevSessionId ?? undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to start session");
      const { sessionId } = await res.json();
      reset();
      setSessionId(sessionId);
      router.push(`/session/${sessionId}`);
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[--ink-0] flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-[family-name:var(--font-pixel-font)] text-[--fg-0]">
            NEW SESSION
          </h2>
          <p className="text-[--fg-2] text-xs">
            upload your notes to get started
          </p>
        </div>

        <UploadZone
          sessionId={tempSessionId}
          onUploaded={(doc) => setDocs((prev) => [...prev, doc])}
        />

        {docs.length > 0 && (
          <ul className="space-y-1">
            {docs.map((doc) => (
              <li key={doc.id} className="text-xs text-[--fg-1] flex items-center gap-2">
                <span className="text-[--fg-2]">✓</span> {doc.filename}
              </li>
            ))}
          </ul>
        )}

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button
          onClick={startSession}
          disabled={loading}
          className="w-full py-3 text-[10px] font-[family-name:var(--font-pixel-font)] bg-[--fg-2] text-[--ink-0] rounded hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {loading ? "GENERATING TUTORIAL…" : "START SESSION →"}
        </button>
      </div>
    </main>
  );
}
