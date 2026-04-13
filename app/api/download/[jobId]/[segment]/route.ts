import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string; segment: string }> }
) {
  const { jobId, segment } = await params;
  const colabUrl = req.nextUrl.searchParams.get("colabUrl");

  // ── Mode Colab : proxy du fichier depuis Flask ──
  if (colabUrl) {
    const res = await fetch(`${colabUrl}/download/${jobId}/${segment}`);
    if (!res.ok) return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
    const buffer = await res.arrayBuffer();
    const ext = segment.split(".").pop();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": ext === "mp3" ? "audio/mpeg" : "audio/wav",
        "Content-Disposition": `attachment; filename="${segment}"`,
      },
    });
  }

  // ── Mode Local ──
  const filePath = path.join(process.cwd(), "jobs", jobId, "output", segment);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }
  const buffer = await readFile(filePath);
  const ext = segment.split(".").pop();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": ext === "mp3" ? "audio/mpeg" : "audio/wav",
      "Content-Disposition": `attachment; filename="${segment}"`,
    },
  });
}
