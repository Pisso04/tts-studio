"use client";

import { useRef, useState } from "react";

type Props = {
  label: string;
  accept: string;
  icon: string;
  file: File | null;
  onFile: (f: File) => void;
  hint: string;
};

export default function UploadZone({ label, accept, icon, file, onFile, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all
        ${dragging ? "border-indigo-400 bg-indigo-950" : "border-gray-700 bg-gray-900 hover:border-gray-500"}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <div className="text-3xl mb-2">{icon}</div>
      <p className="font-medium text-sm text-gray-200">{label}</p>
      {file ? (
        <p className="mt-1 text-xs text-indigo-400 truncate max-w-full">{file.name}</p>
      ) : (
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
}
