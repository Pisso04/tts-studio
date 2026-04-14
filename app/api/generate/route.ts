import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { spawn } from "child_process";
import { v4 as uuidv4 } from "uuid";
import path from "path";

function getPythonCmd(): string {
  const candidates = ["python3", "python"];
  for (const cmd of candidates) {
    try {
      const { execSync } = require("child_process");
      execSync(`${cmd} --version`, { stdio: "ignore" });
      return cmd;
    } catch {
      continue;
    }
  }
  return "python3";
}

// ── Mode Colab : proxy vers le serveur Flask ngrok ──
async function generateColab(formData: FormData, colabUrl: string) {
  try {
    const engine = (formData.get("engine") as string) || "coqui";
    const fd = new FormData();
    fd.append("json", formData.get("json") as Blob);
    fd.append("format", formData.get("format") as string);
    fd.append("silence", formData.get("silence") as string);

    if (engine === "voxtral") {
      fd.append("voice", (formData.get("voice") as string) || "fr_female_1");
    } else {
      fd.append("reference", formData.get("reference") as Blob);
      fd.append("lang", formData.get("lang") as string);
      fd.append("speed", formData.get("speed") as string);
    }

    const res = await fetch(`${colabUrl}/generate`, { method: "POST", body: fd });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Colab error ${res.status}: ${text}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ jobId: data.jobId, mode: "colab", colabUrl });
  } catch (e: any) {
    return NextResponse.json({ error: `Impossible de joindre Colab: ${e.message}` }, { status: 502 });
  }
}

// ── Mode Local : subprocess Python ──
async function generateLocal(formData: FormData) {
  const jsonFile = formData.get("json") as File;
  const audioFile = formData.get("reference") as File;
  const lang = (formData.get("lang") as string) || "fr";
  const speed = (formData.get("speed") as string) || "1.0";
  const format = (formData.get("format") as string) || "mp3";
  const silence = (formData.get("silence") as string) || "300";
  const gpu = formData.get("gpu") === "true";

  const jobId = uuidv4();
  const jobDir = path.join(process.cwd(), "jobs", jobId);
  const outputDir = path.join(jobDir, "output");
  const logFile = path.join(jobDir, "progress.log");

  await mkdir(outputDir, { recursive: true });

  const jsonPath = path.join(jobDir, "input.json");
  const refExt = audioFile.name.split(".").pop();
  const refPath = path.join(jobDir, `reference.${refExt}`);

  await writeFile(jsonPath, Buffer.from(await jsonFile.arrayBuffer()));
  await writeFile(refPath, Buffer.from(await audioFile.arrayBuffer()));
  await writeFile(logFile, "");

  const args = [
    path.join(process.cwd(), "lib", "tts.py"),
    jsonPath,
    "-r", refPath,
    "-o", outputDir,
    "-l", logFile,
    "-s", speed,
    "-f", format,
    "--silence", silence,
    "--lang", lang,
  ];
  if (gpu) args.push("--gpu");

  const pythonCmd = getPythonCmd();
  const child = spawn(pythonCmd, args, { detached: true, stdio: "ignore" });
  child.unref();

  return NextResponse.json({ jobId, mode: "local" });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const colabUrl = formData.get("colabUrl") as string;

  if (colabUrl && colabUrl.startsWith("http")) {
    return generateColab(formData, colabUrl.replace(/\/$/, ""));
  }

  return generateLocal(formData);
}
