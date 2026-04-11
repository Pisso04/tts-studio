import { NextRequest } from "next/server";
import { createReadStream, existsSync, statSync } from "fs";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const logFile = path.join(process.cwd(), "jobs", jobId, "progress.log");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let offset = 0;
      let finished = false;

      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      const poll = async () => {
        if (!existsSync(logFile)) {
          setTimeout(poll, 500);
          return;
        }

        const size = statSync(logFile).size;
        if (size > offset) {
          const buf = Buffer.alloc(size - offset);
          const fd = await import("fs").then((fs) =>
            fs.openSync(logFile, "r")
          );
          const { readSync, closeSync } = await import("fs");
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
