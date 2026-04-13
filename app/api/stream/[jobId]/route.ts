import { NextRequest } from "next/server";
import { existsSync, statSync, openSync, readSync, closeSync } from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const colabUrl = req.nextUrl.searchParams.get("colabUrl");
  const encoder = new TextEncoder();

  // ── Mode Colab : polling du /status Flask ──
  if (colabUrl) {
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: string) =>
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));

        let lastDone = 0;
        let finished = false;

        const poll = async () => {
          try {
            const res = await fetch(`${colabUrl}/status/${jobId}`);
            const job = await res.json();

            if (job.total && job.total > 0) {
              send(`TOTAL:${job.total}`);
            }

            send(`STATUS:${job.status}`);

            // Envoyer les nouveaux segments
            const segments: string[] = job.segments || [];
            for (let i = lastDone; i < segments.length; i++) {
              send(`DONE:${i + 1}:${segments[i]}`);
            }
            lastDone = segments.length;

            if (job.status === "finished") {
              finished = true;
              controller.close();
              return;
            }
          } catch {
            send("ERROR:Impossible de joindre le serveur Colab");
            controller.close();
            return;
          }

          if (!finished) setTimeout(poll, 1500);
        };

        poll();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // ── Mode Local : lecture du progress.log ──
  const logFile = path.join(process.cwd(), "jobs", jobId, "progress.log");

  const stream = new ReadableStream({
    async start(controller) {
      let offset = 0;
      let finished = false;

      const send = (data: string) =>
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));

      const poll = () => {
        if (!existsSync(logFile)) {
          setTimeout(poll, 500);
          return;
        }

        const size = statSync(logFile).size;
        if (size > offset) {
          const buf = Buffer.alloc(size - offset);
          const fd = openSync(logFile, "r");
          readSync(fd, buf, 0, size - offset, offset);
          closeSync(fd);
          offset = size;

          const lines = buf.toString("utf-8").split("\n").filter(Boolean);
          for (const line of lines) {
            send(line);
            if (line === "STATUS:finished" || line.startsWith("ERROR:")) {
              finished = true;
            }
          }
        }

        if (finished) {
          controller.close();
        } else {
          setTimeout(poll, 800);
        }
      };

      poll();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
