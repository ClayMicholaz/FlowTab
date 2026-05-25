import { spawn } from "child_process";
import path from "path";

// Note: the IMAP poller is implemented in `scripts/imapPoller.js` and executed
// as a child process by the route below so native IMAP deps aren't bundled by
// the Next.js build.

export async function GET() {
  // Spawn the standalone poller script to avoid bundling native IMAP deps.
  try {
    const script = path.resolve(process.cwd(), "scripts", "imapPoller.js");
    const child = spawn(process.execPath, [script], { env: process.env });

    let out = "";
    let errOut = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (errOut += d.toString()));

    const code = await new Promise((res) => child.on("close", res));
    if (code !== 0) {
      const payload = { ok: false, error: errOut || "poller failed" };
      if (process.env.DEBUG_POLL_VERBOSE === "true") payload._out = out;
      return new Response(JSON.stringify(payload), { status: 500 });
    }

    return new Response(out || JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    const payload = { ok: false, error: String(err) };
    if (process.env.DEBUG_POLL_VERBOSE === "true")
      payload.stack = err && err.stack ? err.stack : null;
    return new Response(JSON.stringify(payload), { status: 500 });
  }
}

export async function POST() {
  return GET();
}
