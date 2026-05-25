import { createClient } from "@supabase/supabase-js";
import { spawn } from "child_process";
import path from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const imapConfigFromEnv = () => ({
  imap: {
    user: process.env.IMAP_USER || process.env.MAILBOX_USER,
    password: process.env.IMAP_PASSWORD || process.env.MAILBOX_PASSWORD,
    host: process.env.IMAP_HOST || process.env.MAILBOX_HOST,
    port: Number(process.env.IMAP_PORT || process.env.MAILBOX_PORT || 993),
    tls: true,
    authTimeout: 30000,
  },
});

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
      return new Response(
        JSON.stringify({ ok: false, error: errOut || "poller failed" }),
        { status: 500 },
      );
    }

    return new Response(out || JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
    });
  }
}

export async function POST() {
  return GET();
}
