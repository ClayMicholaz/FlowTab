#!/usr/bin/env node
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// load .env.local if present
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment",
  );
  process.exit(2);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  try {
    console.log("Querying latest transactions...");
    const { data: txs, error: txErr } = await supabase
      .from("transactions")
      .select("id, user_id, amount, external_id, transaction_date, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (txErr) {
      console.error("Error fetching transactions:", txErr);
    } else {
      console.log("Transactions:", JSON.stringify(txs, null, 2));
    }

    console.log("\nQuerying latest mailboxes...");
    const { data: mbs, error: mbErr } = await supabase
      .from("mailboxes")
      .select("id, user_id, username, host, port, last_checked, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (mbErr) {
      console.error("Error fetching mailboxes:", mbErr);
    } else {
      console.log("Mailboxes:", JSON.stringify(mbs, null, 2));
    }
  } catch (err) {
    console.error(err);
  }
}

main();
