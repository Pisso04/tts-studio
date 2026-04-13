"use client";

import { useState, useRef, useCallback } from "react";
import UploadZone from "@/components/UploadZone";
import ParamsPanel from "@/components/ParamsPanel";
import ProgressPanel from "@/components/ProgressPanel";
import ResultsPanel from "@/components/ResultsPanel";

export type JobParams = {
  lang: string;
  speed: string;
  format: "wav" | "mp3";
  silence: string;
  gpu: boolean;
  colabUrl: string;
};

export type SegmentResult = {
  name: string;
  jobId: string;
  index: number;
  colabUrl?: string;
};

export type LogLine =
  | { type: "total"; total: number }
  | { type: "status"; value: string }
  | { type: "segment"; current: number; total: number }
  | { type: "done"; index: number; file: string }
  | { type: "warn"; message: string }
  | { type: "error"; message: string };

export default function Home() {
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [params, setParams] = useState<JobParams>({
    lang: "fr",
    speed: "1.0",
    format: "mp3",
    silence: "300",
    gpu: false,
    colabUrl: "",
  });

  const [jobId, setJobId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [segments, setSegments] = useState<SegmentResult[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "finished" | "error">("idle");

  const esRef = useRef<EventSource | null>(null);

  const parseLine = useCallback((line: string, currentTotal: number): LogLine | null => {
    if (line.startsWith("TOTAL:")) return { type: "total", total: parseInt(line.split(":")[1]) };
    if (line.startsWith("STATUS:")) return { type: "status", value: line.split(":")[1] };
    if (line.startsWith("SEGMENT:")) {
      const [cur, tot] = line.split(":")[1].split("/").map(Number);
      return { type: "segment", current: cur, total: tot || currentTotal };
    }
    if (line.startsWith("DONE:")) {
      const parts = line.split(":");
      return { type: "done", index: parseInt(parts[1]), file: parts[2] };
    }
    if (line.startsWith("WARN:")) return { type: "warn", message: line.slice(5) };
    if (line.startsWith("ERROR:")) return { type: "error", message: line.slice(6) };
    return null;
  }, []);

  const startGeneration = async () => {
    if (!jsonFile || !audioFile) return;

    setLogs([]);
    setSegments([]);
    setStatus("loading");
    setTotal(0);

    const fd = new FormData();
    fd.append("json", jsonFile);
    fd.append("reference", audioFile);
    fd.append("lang", params.lang);
    fd.append("speed", params.speed);
    fd.append("format", params.format);
    fd.append("silence", params.silence);
    fd.append("gpu", String(params.gpu));
    if (params.colabUrl) fd.append("colabUrl", params.colabUrl);

    const res = await fetch("/api/generate", { method: "POST", body: fd });
    const { jobId: id, error } = await res.json();

    if (error) {
      setStatus("error");
      return;
    }

    setJobId(id);
    setStatus("running");

    let runningTotal = 0;

    const colabParam = params.colabUrl ? `?colabUrl=${encodeURIComponent(params.colabUrl)}` : "";
    const es = new EventSource(`/api/stream/${id}${colabParam}`);
    esRef.current = es;

    es.onmessage = (e) => {
      const parsed = parseLine(e.data, runningTotal);
      if (!parsed) return;

      if (parsed.type === "total") {
        runningTotal = parsed.total;
        setTotal(parsed.total);
      }

      if (parsed.type === "status" && parsed.value === "finished") {
        setStatus("finished");
        es.close();
      }

      if (parsed.type === "status" && parsed.value === "loading") {
        setStatus("loading");
      }

      if (parsed.type === "status" && parsed.value === "ready") {
        setStatus("running");
      }

      if (parsed.type === "done") {
        setSegments((prev) => [
          ...prev,
          { name: parsed.file, jobId: id, index: parsed.index, colabUrl: params.colabUrl },
        ]);
      }

      if (parsed.type === "error") {
        setStatus("error");
        es.close();
      }

      setLogs((prev) => [...prev, parsed]);
    };

    es.onerror = () => {
      if (status !== "finished") setStatus("error");
      es.close();
    };
  };

  const canStart = jsonFile && audioFile && status !== "running" && status !== "loading";

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-white">🎙️ TTS Studio</h1>
          <p className="text-gray-400 text-sm">Génération audio par clonage vocal avec Coqui XTTS v2</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UploadZone
            label="Fichier JSON"
            accept=".json"
            icon="📄"
            file={jsonFile}
            onFile={setJsonFile}
            hint="Liste de segments texte"
          />
          <UploadZone
            label="Audio de référence"
            accept=".mp3,.wav,.m4a,.ogg"
            icon="🎤"
            file={audioFile}
            onFile={setAudioFile}
            hint="3 à 10 secondes recommandé"
          />
        </div>

        <ParamsPanel params={params} onChange={setParams} />

        <button
          onClick={startGeneration}
          disabled={!canStart}
          className="w-full py-3 rounded-xl font-semibold text-lg transition-all
            bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500
            disabled:cursor-not-allowed cursor-pointer"
        >
          {status === "loading" ? "⏳ Chargement du modèle..." :
           status === "running" ? "🔄 Génération en cours..." :
           status === "finished" ? "✅ Terminé — Relancer" :
           "🚀 Lancer la génération"}
        </button>

        {status !== "idle" && (
          <ProgressPanel logs={logs} total={total} status={status} />
        )}

        {segments.length > 0 && (
          <ResultsPanel segments={segments} format={params.format} />
        )}
      </div>
    </main>
  );
}
