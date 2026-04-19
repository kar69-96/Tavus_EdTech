"use client";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface UploadedDoc {
  id: string;
  filename: string;
}

interface UploadZoneProps {
  sessionId: string;
  onUploaded: (doc: UploadedDoc) => void;
}

const ACCEPTED = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
};

export function UploadZone({ sessionId, onUploaded }: UploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (files: File[]) => {
      setError(null);
      setUploading(true);
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        form.append("sessionId", sessionId);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(`Failed to upload ${file.name}: ${body.error ?? res.statusText}`);
        } else {
          const data = await res.json();
          onUploaded({ id: data.id, filename: data.filename });
        }
      }
      setUploading(false);
    },
    [sessionId, onUploaded],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: 50 * 1024 * 1024,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-[--fg-2] bg-[--ink-1]"
            : "border-[--chrome-lo] hover:border-[--fg-2]"
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-[--fg-2] text-xs font-pixel">
          {uploading ? "UPLOADING…" : isDragActive ? "DROP IT" : "DROP NOTES / PDF / DOCX / TXT"}
        </p>
      </div>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
