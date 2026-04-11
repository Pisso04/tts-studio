import { NextRequest, NextResponse } from "next/server";
import { readFile, readdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string; segment: string }> }
) {
  const { jobId, segment } = await params;
  const filePath = path.join(
    process.cwd(),
    "jobs",
    jobId,
    "output",
    segment
  );

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }

  const buffer = await readFile(filePath);
  const ext = segment.split(".").pop();
  const contentType = ext === "mp3" ? "audio/mpeg" : "audio/wav";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${segment}"`,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string; segment: string }> }
) {
  const { jobId, segment } = await params;
  if (segment === "list") {
    const outputDir = path.join(process.cwd(), "jobs", jobId, "output");
    if (!existsSync(outputDir)) {
      return NextResponse.json({ segments: [] });
    }
    const files = await readdir(outputDir);
    return NextResponse.json({ segments: files.sort() });
  }
  return NextResponse.json({ error: "Non supporté" }, { status: 400 });
}
