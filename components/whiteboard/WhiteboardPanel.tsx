"use client";

interface WhiteboardPanelProps {
  url: string | null;
}

export function WhiteboardPanel({ url }: WhiteboardPanelProps) {
  if (!url) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[--fg-2] font-pixel text-[9px]">
        WHITEBOARD READY
      </div>
    );
  }

  return (
    <iframe
      key={url}
      src={url}
      sandbox="allow-scripts"
      className="w-full h-full border-0 rounded"
      title="PAL Whiteboard"
    />
  );
}
