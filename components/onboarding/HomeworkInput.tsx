"use client";

interface HomeworkInputProps {
  value: string;
  onChange: (v: string) => void;
}

export function HomeworkInput({ value, onChange }: HomeworkInputProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-pixel text-[--fg-2]">
        HOMEWORK PROBLEM (optional)
      </label>
      <textarea
        rows={4}
        className="w-full bg-[--ink-1] border border-[--chrome-lo] rounded px-3 py-2 text-sm text-[--fg-0] placeholder:text-[--fg-2] focus:outline-none focus:border-[--fg-2] resize-none"
        placeholder="Paste the specific question or topic you're stuck on…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={2000}
      />
    </div>
  );
}
