"use client";

import { useEffect, useRef } from "react";
import { LogLine } from "@/app/page";

type Props = {
  logs: LogLine[];
  total: number;
  status: string;
};

export default function ProgressPanel({ logs, total, status }: Props) {
  const logsRef = useRef<HTMLDivElement>(null);

  const doneCount = logs.filter((l) => l.type === "done").length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  const statusLabel = {
    loading: "⏳ Chargement du modèle XTTS v2...",
    running: `🔄 Génération en cours... (${doneCount}/${total})`,
    finished: "✅ Génération terminée !",
    error: "❌ Une erreur est survenue",
  }[status] ?? "";

  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-300">{statusLabel}</span>
        {total > 0 && <span className="text-indigo-400 font-mono">{progress}%</span>}
      </div>

      {total > 0 && (
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div
        ref={logsRef}
        className="h-40 overflow-y-auto font-mono text-xs space-y-0.5 text-gray-400 bg-gray-950 rounded-lg p-3"
      >
        {logs.map((log, i) => {
          if (log.type === "total") return <p key={i} className="text-blue-400">📄 {log.total} segments à traiter</p>;
          if (log.type === "status") return <p key={i} className="text-yellow-400">⚙ {log.value}</p>;
          if (log.type === "segment") return <p key={i} className="text-gray-300">━━ Segment {log.current}/{log.total}</p>;
          if (log.type === "done") return <p key={i} className="text-green-400">✅ {log.file}</p>;
          if (log.type === "warn") return <p key={i} className="text-orange-400">⚠ {log.message}</p>;
          if (log.type === "error") return <p key={i} className="text-red-400">❌ {log.message}</p>;
          return null;
        })}
        {(status === "loading" || status === "running") && (
          <p className="text-gray-600 animate-pulse">▌</p>
        )}
      </div>
    </div>
  );
}
