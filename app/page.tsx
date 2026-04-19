import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[--ink-0] flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-[family-name:var(--font-pixel-font)] text-[--fg-0] tracking-wide">
        PAL
      </h1>
      <p className="text-[--fg-2] text-sm max-w-md text-center leading-relaxed">
        your personal ai tutor — upload your notes, paste a problem, and get a
        custom walkthrough with live diagrams.
      </p>
      <Link
        href="/onboard"
        className="px-6 py-3 text-[10px] font-[family-name:var(--font-pixel-font)] bg-[--fg-2] text-[--ink-0] rounded hover:opacity-90 transition-opacity"
      >
        START SESSION →
      </Link>
    </main>
  );
}
