"use client";

import { JobParams } from "@/app/page";

type Props = {
  params: JobParams;
  onChange: (p: JobParams) => void;
};

const LANGS = ["fr", "en", "es", "de", "it", "pt", "pl", "tr", "ru", "nl", "cs", "ar", "zh-cn", "ja"];

export default function ParamsPanel({ params, onChange }: Props) {
  const set = (key: keyof JobParams, value: string | boolean) =>
    onChange({ ...params, [key]: value });

  return (
    <div className="bg-gray-900 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="space-y-1">
        <label className="text-xs text-gray-400">Langue</label>
        <select
          value={params.lang}
          onChange={(e) => set("lang", e.target.value)}
          className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700 focus:outline-none focus:border-indigo-500"
        >
          {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Vitesse ({params.speed}x)</label>
        <input
          type="range" min="0.5" max="2.0" step="0.1"
          value={params.speed}
          onChange={(e) => set("speed", e.target.value)}
          className="w-full accent-indigo-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Format</label>
        <div className="flex gap-2">
          {(["mp3", "wav"] as const).map((f) => (
            <button
              key={f}
              onClick={() => set("format", f)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all
                ${params.format === f ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Silence ({params.silence}ms)</label>
        <input
          type="range" min="0" max="1000" step="50"
          value={params.silence}
          onChange={(e) => set("silence", e.target.value)}
          className="w-full accent-indigo-500"
        />
      </div>

      <div className="col-span-2 md:col-span-4 flex items-center gap-3">
        <button
          onClick={() => set("gpu", !params.gpu)}
          className={`relative w-10 h-5 rounded-full transition-all ${params.gpu ? "bg-indigo-600" : "bg-gray-700"}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${params.gpu ? "left-5" : "left-0.5"}`} />
        </button>
        <span className="text-sm text-gray-300">Utiliser le GPU</span>
      </div>
    </div>
  );
}
