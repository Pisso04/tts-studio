"use client";

import { SegmentResult } from "@/app/page";

type Props = {
  segments: SegmentResult[];
  format: string;
};

export default function ResultsPanel({ segments, format }: Props) {
  const getUrl = (seg: SegmentResult) => {
    const base = `/api/download/${seg.jobId}/${seg.name}`;
    return seg.colabUrl ? `${base}?colabUrl=${encodeURIComponent(seg.colabUrl)}` : base;
  };

  const downloadAll = () => {
    segments.forEach((seg) => {
      const a = document.createElement("a");
      a.href = getUrl(seg);
      a.download = seg.name;
      a.click();
    });
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-white">🎧 Segments générés ({segments.length})</h2>
        {segments.length > 1 && (
          <button
            onClick={downloadAll}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition-all"
          >
            ⬇ Tout télécharger
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {segments.map((seg) => (
          <div
            key={seg.name}
            className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2"
          >
            <span className="text-xs text-gray-500 font-mono w-20 shrink-0">
              {seg.name.replace(`segment_`, "#").replace(`.${format}`, "")}
            </span>

            <audio
              controls
              src={getUrl(seg)}
              className="flex-1 h-8"
              style={{ minWidth: 0 }}
            />

            <a
              href={getUrl(seg)}
              download={seg.name}
              className="text-indigo-400 hover:text-indigo-300 text-xs shrink-0 transition-all"
            >
              ⬇
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
