import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { spawn } from "child_process";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { existsSync } from "fs";

function getPythonCmd(): string {
  // Sur Windows, python3 peut s'appeler python
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

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const jsonFile = formData.get("json") as File;
  const audioFile = formData.get("reference") as File;
  const lang = (formData.get("lang") as string) || "fr";
  const speed = (formData.get("speed") as string) || "1.0";
  const format = (formData.get("format") as string) || "mp3";
  const silence = (formData.get("silence") as string) || "300";
  const gpu = formData.get("gpu") === "true";

  if (!jsonFile || !audioFile) {
    return NextResponse.json({ error: "Fichiers manquants" }, { status: 400 });
  }

  const jobId = uuidv4();
  const jobDir = path.join(process.cwd(), "jobs", jobId);
  const outputDir = path.join(jobDir, "output");
  const logFile = path.join(jobDir, "progress.log");

  await mkdir(outputDir, { recursive: true });

  const jsonPath = path.join(jobDir, "input.json");
  const refPath = path.join(jobDir, `reference.${audioFile.name.split(".").pop()}`);

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

  return NextResponse.json({ jobId });
}
